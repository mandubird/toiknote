/**
 * analyze-toeic-image — OpenAI GPT-4o mini 이미지 분석 (서버사이드)
 *
 * POST /functions/v1/analyze-toeic-image
 * Body: {
 *   imageUrl?: string,
 *   imageBase64?: string,  // data:image/jpeg;base64,... 또는 순수 base64
 *   mode?: 'quick' | 'detail',  // 기본 'quick'
 *   selectedQuestions?: Array<{ question_number?: number, part?: string, passage_group_id?: string | null }>
 * }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

/** 1단계: 선택 화면용 최소 필드만 (빠른 응답) */
const SYSTEM_PROMPT_QUICK = `당신은 토익(TOEIC) 이미지에서 문제 목록만 빠르게 추출하는 AI입니다.

먼저 이미지에서 보이는 모든 문제 번호(숫자)를 탐지해 question_number에 넣으세요.
문제 번호가 보이면 반드시 번호 범위로 파트를 결정하세요 (텍스트만으로 파트 추정 금지).

토익 파트 번호 기준:
- 1~6 → Part 1 (LC), 7~31 → Part 2, 32~70 → Part 3, 71~100 → Part 4,
- 101~130 → Part 5, 131~146 → Part 6, 147~200 → Part 7 (RC)

**question 필드는 이미지 원문 앞 40자 이내로만 짧게 요약해 넣으세요 (번역 금지, 영어 그대로).**
같은 지문을 공유하는 문제는 같은 passage_group_id (예: pg_147_148)로 묶으세요.

응답은 반드시 JSON만:
{
  "questions": [
    {
      "question_number": 147,
      "part": "Part 7",
      "lcOrRc": "RC",
      "question": "원문 앞 40자 이내",
      "passage_group_id": null
    }
  ]
}
다른 말 없이 JSON만 출력하세요.`

const USER_PROMPT_QUICK = `이 토익 이미지에서 보이는 모든 문제를 위 형식으로만 빠르게 추출해 주세요.`

/** 2단계: 기존 전체 필드 */
const SYSTEM_PROMPT_DETAIL = `당신은 토익(TOEIC) 오답 노트를 위한 AI입니다.
사용자가 찍은 토익 문제/지문 이미지를 분석해서 아래 JSON 형식으로만 답하세요.

먼저 이미지에서 보이는 모든 문제 번호(숫자)를 탐지해서 각 문제별로 question_number 필드를 채우세요.
문제 번호가 보이는 경우, 반드시 문제 번호 범위로 파트를 결정하고, 텍스트 내용으로만 파트를 추정하지 마세요.

토익 파트 번호 기준:
- 1~6번 → Part 1 (LC)
- 7~31번 → Part 2 (LC)
- 32~70번 → Part 3 (LC)
- 71~100번 → Part 4 (LC)
- 101~130번 → Part 5 (RC)
- 131~146번 → Part 6 (RC)
- 147~200번 → Part 7 (RC)

문제 번호가 전혀 보이지 않을 때에만 텍스트 내용으로 파트를 추정해도 됩니다.

**중요: question, options 필드는 반드시 이미지 원문 그대로 유지하세요. 절대 번역하지 마세요.**
예) 이미지가 영어면 question과 options도 영어 그대로 작성.

**options 규칙: 이미지에 실제로 보이는 보기만 넣으세요. 절대 보기를 만들어내지 마세요.**
- 보기가 2개(a, b)만 보이면 options에 A와 B만 넣고 C, D는 넣지 마세요.
- 보기가 4개(a, b, c, d) 보이면 A~D 모두 넣으세요.
- 이미지에 없는 보기를 추가하거나 다른 문제의 보기를 섞지 마세요.

tags, explanation, grammarCategory, grammarSubType, passageType, questionType 등 분류/해설 필드만 한국어로 작성하세요.
영어 단어나 로마자 표기는 분류 필드에서만 사용하지 말고, "관계대명사", "현재완료", "부정사"처럼 한국어 표현으로 통일하세요.

이미지 안에 여러 문제가 있으면, 각 문제를 questions 배열의 원소로 모두 반환하세요.
questions 배열 안의 **모든** 원소에 대해 question, answer, explanation, tags, difficulty를 빠짐없이 채워야 합니다.
특히 Part 7에서 147번/148번처럼 여러 문제가 한 지문을 공유하더라도,
147번과 148번 각각에 대해 고유한 question, answer, explanation, tags를 작성해야 하며
첫 번째 문제에만 채우고 나머지 문제는 비워 두면 안 됩니다.
같은 지문을 공유하는 문제들은 같은 passage_group_id로 묶으세요 (예: 147번/148번이면 "pg_147_148").

응답 JSON 형식:
{
  "questions": [
    {
      "question_number": 147,
      "part": "Part 7",
      "lcOrRc": "LC" 또는 "RC",
      "question": "문제 텍스트...",
      "answer": "",   // 반드시 빈 문자열("")로 두세요. 정답은 사용자가 직접 선택합니다.
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "explanation": "정답 해설",
      "tags": ["관계대명사", "현재완료"],
      "difficulty": 1,
      "part1ImageTrapType": null,
      "part1KeywordMissed": null,
      "part1PassiveVoiceError": null,
      "questionPattern": null,
      "answerType": null,
      "part3QuestionType": null,
      "part3SetPosition": null,
      "part3PreviewRead": null,
      "part3ConcentrationDrop": null,
      "part4LectureType": null,
      "part4QuestionType": null,
      "part4NoteTaking": null,
      "grammarCategory": null,
      "grammarSubType": null,
      "part6BlankType": null,
      "part6ContextFailReason": null,
      "passageType": null,
      "questionType": null,
      "rereadCount": null,
      "passage_group_id": null,
      "keyVocabulary": null
    }
  ]
}

다른 말 없이 반드시 JSON만 출력하세요.`

const USER_PROMPT_DETAIL = `이 토익 문제 이미지를 분석해서 위에서 정의한 JSON 형식으로만 답해 주세요.
- 이미지 안에 보이는 모든 문제 번호를 찾아서 question_number에 넣어 주세요.
- 문제 번호가 보이는 경우, 반드시 번호 범위로 part와 lcOrRc를 결정하세요.
- 문제가 여러 개면 questions 배열에 모두 넣고, 같은 지문을 공유하면 passage_group_id로 묶어 주세요.
- 각 문제에 대해 part, lcOrRc, question, answer, explanation, tags, difficulty를 채우고,
  가능한 경우 파트별 세부 필드(문법/질문유형/재독횟수 등)도 채워 주세요.
해당 안 되는 필드는 null 또는 생략해도 됩니다.

특히 tags, grammarCategory, grammarSubType, passageType, questionType, questionPattern, answerType 등
모든 분류 관련 텍스트는 반드시 한국어(한글)로만 작성하세요.`

function buildImageUrlForOpenAI(imageUrl: string | undefined, imageBase64: string | undefined): string | null {
  if (imageBase64 && String(imageBase64).trim()) {
    const s = String(imageBase64).trim()
    if (s.startsWith('data:')) return s
    return `data:image/jpeg;base64,${s}`
  }
  if (imageUrl && String(imageUrl).trim()) return String(imageUrl).trim()
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonRes({ error: 'Method not allowed' }, 405)
  }

  // 게이트웨이 verify_jwt=false(config.toml)일 때: 여기서 반드시 로그인 사용자만 허용
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonRes({ error: '로그인이 필요해요.' }, 401)
  }

  const sbUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const sbAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (!sbUrl || !sbAnon) {
    console.error('analyze-toeic-image: SUPABASE_URL / SUPABASE_ANON_KEY 없음')
    return jsonRes({ error: '서버 설정 오류' }, 500)
  }

  const supabaseAuth = createClient(sbUrl, sbAnon, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: authData, error: authErr } = await supabaseAuth.auth.getUser()
  if (authErr || !authData?.user) {
    console.error('analyze-toeic-image getUser:', authErr)
    return jsonRes({ error: '인증에 실패했어요. 다시 로그인해 주세요.' }, 401)
  }

  try {
    const body = await req.json().catch(() => ({}))
    const imageUrlForBody = body?.imageUrl as string | undefined
    const imageBase64 = body?.imageBase64 as string | undefined
    const mode: 'quick' | 'detail' = body?.mode === 'detail' ? 'detail' : 'quick'
    const selectedQuestions = body?.selectedQuestions

    const urlForVision = buildImageUrlForOpenAI(imageUrlForBody, imageBase64)
    if (!urlForVision) {
      return jsonRes({ error: 'imageUrl 또는 imageBase64가 필요해요.' }, 400)
    }

    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY 환경변수가 없음')
      return jsonRes({ error: '서버 설정 오류 (OPENAI_API_KEY 미설정)' }, 500)
    }

    const isQuick = mode === 'quick'
    let systemPrompt = isQuick ? SYSTEM_PROMPT_QUICK : SYSTEM_PROMPT_DETAIL
    let userText = isQuick ? USER_PROMPT_QUICK : USER_PROMPT_DETAIL

    if (!isQuick && Array.isArray(selectedQuestions) && selectedQuestions.length > 0) {
      // system prompt의 "모두 반환" 지시를 "선택된 것만" 으로 교체
      systemPrompt = systemPrompt.replace(
        '이미지 안에 여러 문제가 있으면, 각 문제를 questions 배열의 원소로 모두 반환하세요.\nquestions 배열 안의 **모든** 원소에 대해 question, answer, explanation, tags, difficulty를 빠짐없이 채워야 합니다.\n특히 Part 7에서 147번/148번처럼 여러 문제가 한 지문을 공유하더라도,\n147번과 148번 각각에 대해 고유한 question, answer, explanation, tags를 작성해야 하며\n첫 번째 문제에만 채우고 나머지 문제는 비워 두면 안 됩니다.\n같은 지문을 공유하는 문제들은 같은 passage_group_id로 묶으세요 (예: 147번/148번이면 "pg_147_148").',
        `이미지에 여러 문제가 있더라도 반드시 아래 지정된 문제들만 분석하세요. 지정되지 않은 문제는 questions 배열에 절대 포함하지 마세요. questions 배열 길이는 반드시 지정된 문제 수와 동일해야 합니다.`
      )
      userText = `이 이미지에서 아래 문제 목록에 해당하는 문제들만 분석해 주세요. 목록에 없는 문제는 무시하세요.

분석할 문제 목록:
${JSON.stringify(selectedQuestions)}

각 문제에 대해 part, lcOrRc, question, answer, explanation, tags, difficulty를 채우고 가능한 파트별 세부 필드도 채워 주세요.
모든 분류 텍스트(tags, grammarCategory 등)는 반드시 한국어로 작성하세요.`
    }

    const maxTokens = isQuick ? 1024 : 4096

    const openaiRes = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              { type: 'image_url', image_url: { url: urlForVision } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: maxTokens,
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.json().catch(() => ({}))
      console.error('OpenAI API 오류:', openaiRes.status, err)
      return jsonRes(
        { error: (err as any)?.error?.message || `OpenAI API 오류 (${openaiRes.status})` },
        502
      )
    }

    const data = await openaiRes.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) {
      return jsonRes({ error: 'AI 분석 결과를 받지 못했어요.' }, 502)
    }

    return jsonRes({ content, mode })
  } catch (err) {
    console.error('analyze-toeic-image 예외:', err)
    return jsonRes({ error: '서버 오류가 발생했어요.' }, 500)
  }
})

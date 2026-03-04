const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = `당신은 토익(TOEIC) 오답 노트를 위한 AI입니다.
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
      "question_number": 147,           // 숫자, 없으면 null
      "part": "Part 7",                 // "Part 1" ~ "Part 7" 중 하나
      "lcOrRc": "LC" 또는 "RC",         // Part 1~4는 LC, Part 5~7은 RC
      "question": "문제 텍스트...",
      "answer": "정답 (예: A, B, C, D)",
      "explanation": "정답 해설",
      "tags": ["관계대명사", "현재완료"], // 핵심 태그, 3개 이하
      "difficulty": 1 | 2 | 3,          // 1=쉬움, 2=보통, 3=어려움

      // 파트별 세부 분류 (해당 파트일 때만 채우고, 아니면 null 또는 생략)
      "part1ImageTrapType": "...",
      "part1KeywordMissed": "...",
      "part1PassiveVoiceError": true 또는 false,

      "questionPattern": "...",
      "answerType": "...",

      "part3QuestionType": "...",
      "part3SetPosition": 1 | 2 | 3,
      "part3PreviewRead": true 또는 false,
      "part3ConcentrationDrop": true 또는 false,

      "part4LectureType": "...",
      "part4QuestionType": "...",
      "part4NoteTaking": true 또는 false,

      "grammarCategory": "...",
      "grammarSubType": "...",

      "part6BlankType": "...",
      "part6ContextFailReason": "...",

      "passageType": "...",
      "questionType": "...",
      "rereadCount": 0 이상 정수 또는 null,

      "passage_group_id": "pg_147_148"  // 같은 지문 세트인 문제끼리 동일한 ID 사용
    }
  ]
}

다른 말 없이 반드시 JSON만 출력하세요.`

const USER_PROMPT = `이 토익 문제 이미지를 분석해서 위에서 정의한 JSON 형식으로만 답해 주세요.
- 이미지 안에 보이는 모든 문제 번호를 찾아서 question_number에 넣어 주세요.
- 문제 번호가 보이는 경우, 반드시 번호 범위로 part와 lcOrRc를 결정하세요.
- 문제가 여러 개면 questions 배열에 모두 넣고, 같은 지문을 공유하면 passage_group_id로 묶어 주세요.
- 각 문제에 대해 part, lcOrRc, question, answer, explanation, tags, difficulty를 채우고,
  가능한 경우 파트별 세부 필드(문법/질문유형/재독횟수 등)도 채워 주세요.
해당 안 되는 필드는 null 또는 생략해도 됩니다.`

/**
 * 이미지 URL을 GPT-4o mini로 분석해 오답 정보 + 세부 분류 JSON 반환
 */
export async function analyzeToeicImage(imageUrl) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API 키가 설정되지 않았어요. .env.local을 확인해 주세요.')

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: USER_PROMPT },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API 오류 (${response.status})`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('AI 분석 결과를 받지 못했어요.')

  let parsed
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('AI 분석 결과 형식이 올바르지 않아요.')
  }

  const safeStr = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null)

  // v4.25: 복수 문제 지원 - 항상 questions 배열로 정규화
  const rawQuestions = Array.isArray(parsed.questions)
    ? parsed.questions
    : parsed.part || parsed.question
      ? [parsed]
      : []

  if (!rawQuestions.length) {
    throw new Error('이미지에서 토익 문제를 찾지 못했어요.')
  }

  const normalizeQuestionNumber = (q) => {
    if (typeof q.question_number === 'number') return q.question_number
    if (typeof q.questionNumber === 'number') return q.questionNumber
    if (typeof q.question_number === 'string' && /^\d+$/.test(q.question_number)) return parseInt(q.question_number, 10)
    if (typeof q.questionNumber === 'string' && /^\d+$/.test(q.questionNumber)) return parseInt(q.questionNumber, 10)
    return null
  }

  const questions = rawQuestions.map((q) => {
    const questionNumber = normalizeQuestionNumber(q)

    // 번호 기반 파트/LC·RC 결정 (버그 1-A)
    let partNumFromNumber = null
    if (questionNumber != null && questionNumber >= 1 && questionNumber <= 200) {
      partNumFromNumber = inferPartFromQuestionNumber(questionNumber)
    }

    const rawPartStr = String(q.part ?? 'Part 5').trim()
    const partNumFromText = parsePartNumber(rawPartStr)
    const partNum = partNumFromNumber ?? partNumFromText
    const partStr = `Part ${partNum}`

    const lcOrRcFromModel = q.lcOrRc === 'LC' || q.lcOrRc === 'RC' ? q.lcOrRc : null
    const lcOrRc =
      lcOrRcFromModel ||
      (partNum >= 1 && partNum <= 4
        ? 'LC'
        : 'RC')

    const difficulty = [1, 2, 3].includes(Number(q.difficulty)) ? Number(q.difficulty) : 2

    return {
      part: partStr,
      partNumber: partNum,
      lcOrRc,
      questionNumber,
      passageGroupId: safeStr(q.passage_group_id || q.passageGroupId),
      question: String(q.question ?? '').trim(),
      answer: String(q.answer ?? '').trim(),
      explanation: String(q.explanation ?? '').trim(),
      tags: Array.isArray(q.tags) ? q.tags.map((t) => String(t).trim()).filter(Boolean) : [],
      difficulty,
      // STEP 3: 세부 분류 (Part 5 / 7 / 2)
      grammarCategory: safeStr(q.grammarCategory),
      grammarSubType: safeStr(q.grammarSubType),
      passageType: safeStr(q.passageType),
      questionType: safeStr(q.questionType),
      questionPattern: safeStr(q.questionPattern),
      answerType: safeStr(q.answerType),
      // v4.01 전파트 (Part 1/3/4/6/7 재독)
      part1ImageTrapType: safeStr(q.part1ImageTrapType),
      part1KeywordMissed: safeStr(q.part1KeywordMissed),
      part1PassiveVoiceError:
        q.part1PassiveVoiceError === true || q.part1PassiveVoiceError === 'true'
          ? true
          : q.part1PassiveVoiceError === false || q.part1PassiveVoiceError === 'false'
            ? false
            : undefined,
      part3QuestionType: safeStr(q.part3QuestionType),
      part3SetPosition: [1, 2, 3].includes(Number(q.part3SetPosition))
        ? Number(q.part3SetPosition)
        : null,
      part3PreviewRead:
        q.part3PreviewRead === true || q.part3PreviewRead === 'true'
          ? true
          : q.part3PreviewRead === false || q.part3PreviewRead === 'false'
            ? false
            : undefined,
      part3ConcentrationDrop:
        q.part3ConcentrationDrop === true || q.part3ConcentrationDrop === 'true'
          ? true
          : q.part3ConcentrationDrop === false || q.part3ConcentrationDrop === 'false'
            ? false
            : undefined,
      part4LectureType: safeStr(q.part4LectureType),
      part4QuestionType: safeStr(q.part4QuestionType),
      part4NoteTaking:
        q.part4NoteTaking === true || q.part4NoteTaking === 'true'
          ? true
          : q.part4NoteTaking === false || q.part4NoteTaking === 'false'
            ? false
            : undefined,
      part6BlankType: safeStr(q.part6BlankType),
      part6ContextFailReason: safeStr(q.part6ContextFailReason),
      rereadCount:
        typeof q.rereadCount === 'number' && q.rereadCount >= 0
          ? q.rereadCount
          : typeof q.rereadCount === 'string' && /^\d+$/.test(q.rereadCount)
            ? parseInt(q.rereadCount, 10)
            : null,
    }
  })

  return { questions }
}

function parsePartNumber(partStr) {
  const match = String(partStr || '').match(/(\d+)/)
  const n = match ? parseInt(match[1], 10) : 5
  return n >= 1 && n <= 7 ? n : 5
}

// v4.25: 문제 번호 기반 파트 매핑 (버그 1-A)
function inferPartFromQuestionNumber(num) {
  if (num >= 1 && num <= 6) return 1
  if (num >= 7 && num <= 31) return 2
  if (num >= 32 && num <= 70) return 3
  if (num >= 71 && num <= 100) return 4
  if (num >= 101 && num <= 130) return 5
  if (num >= 131 && num <= 146) return 6
  if (num >= 147 && num <= 200) return 7
  return 5
}

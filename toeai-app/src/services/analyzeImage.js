const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = `당신은 토익(TOEIC) 오답 노트를 위한 AI입니다.
사용자가 찍은 토익 문제/지문 이미지를 분석해서 아래 JSON 형식으로만 답하세요.

공통 필수:
- part: "Part 1" ~ "Part 7" 중 하나 (이미지 내용으로 판단)
- lcOrRc: "LC" 또는 "RC" (Part 1~4는 LC, Part 5~7은 RC)
- question: 문제 지문 또는 질문 텍스트 전체 (OCR로 읽은 내용)
- answer: 정답 번호 또는 문자 (예: "A", "B", "42" 등)
- explanation: 정답 해설 (왜 그 답인지 간단히)
- tags: 핵심 문법/어휘 태그 배열 (예: ["관계대명사", "현재완료"], 한글, 3개 이하)
- difficulty: 1 | 2 | 3 (1=쉬움, 2=보통, 3=어려움)

파트별 세부 분류 (해당 파트일 때만 채우고, 해당 없으면 null):
- Part 1 (사진): part1ImageTrapType ("동작함정" | "위치함정" | "유사발음" | "수동태함정"), part1KeywordMissed (놓친 키워드 텍스트), part1PassiveVoiceError (boolean)
- Part 2 (질의응답): questionPattern ("의문사질문" | "일반의문문" | "부정의문문" | "선택의문문" | "제안/요청" | "평서문"), answerType ("직접답변" | "우회답변" | "부정응답")
- Part 3 (대화): part3QuestionType ("주제" | "세부정보" | "추론" | "의도파악" | "다음행동" | "화자직업"), part3SetPosition (1|2|3, 세트 내 문제 순서), part3PreviewRead (boolean, 선지 미리 읽음), part3ConcentrationDrop (boolean, 3번 문제 오답 시 집중력 저하 추정)
- Part 4 (담화): part4LectureType ("공지" | "안내방송" | "광고" | "회의" | "전화메시지" | "뉴스" | "소개"), part4QuestionType ("주제" | "세부정보" | "추론" | "의도파악" | "다음행동"), part4NoteTaking (boolean)
- Part 5 (문법): grammarCategory (예: "시제", "수일치", "관계대명사", "전치사", "접속사", "분사", "가정법", "비교급", "어휘"), grammarSubType (예: "현재완료", "과거시제 구분")
- Part 6 (문맥): part6BlankType ("문장삽입" | "문법" | "어휘" | "연결어"), part6ContextFailReason ("앞문장미이해" | "전체흐름미파악" | "연결어선택오류")
- Part 7 (독해): passageType ("단일지문" | "이중지문" | "삼중지문"), questionType ("사실확인" | "추론" | "어휘" | "의도파악" | "문장삽입"), rereadCount (지문 재읽은 횟수, 0 이상 정수 또는 null)

다른 말 없이 반드시 JSON만 출력하세요.`

const USER_PROMPT = `이 토익 문제 이미지를 분석해서 part, lcOrRc, question, answer, explanation, tags, difficulty를 JSON으로 추출해 주세요.
파트에 맞게 세부 분류도 넣어 주세요.
- Part 1: part1ImageTrapType, part1KeywordMissed, part1PassiveVoiceError
- Part 2: questionPattern, answerType
- Part 3: part3QuestionType, part3SetPosition(1~3), part3PreviewRead, part3ConcentrationDrop
- Part 4: part4LectureType, part4QuestionType, part4NoteTaking
- Part 5: grammarCategory, grammarSubType
- Part 6: part6BlankType, part6ContextFailReason
- Part 7: passageType, questionType, rereadCount(재읽기 횟수, 추정 가능하면 숫자)
해당 안 되면 해당 필드는 null 또는 빼도 됨.`

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

  const partStr = String(parsed.part ?? 'Part 5').trim()
  const partNum = parsePartNumber(partStr)
  const lcOrRc =
    parsed.lcOrRc === 'LC' || parsed.lcOrRc === 'RC'
      ? parsed.lcOrRc
      : partNum >= 1 && partNum <= 4
        ? 'LC'
        : 'RC'
  const difficulty = [1, 2, 3].includes(Number(parsed.difficulty)) ? Number(parsed.difficulty) : 2

  const safeStr = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null)

  return {
    part: partStr,
    partNumber: partNum,
    lcOrRc,
    question: String(parsed.question ?? '').trim(),
    answer: String(parsed.answer ?? '').trim(),
    explanation: String(parsed.explanation ?? '').trim(),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t).trim()).filter(Boolean) : [],
    difficulty,
    // STEP 3: 세부 분류 (Part 5 / 7 / 2)
    grammarCategory: safeStr(parsed.grammarCategory),
    grammarSubType: safeStr(parsed.grammarSubType),
    passageType: safeStr(parsed.passageType),
    questionType: safeStr(parsed.questionType),
    questionPattern: safeStr(parsed.questionPattern),
    answerType: safeStr(parsed.answerType),
    // v4.01 전파트 (Part 1/3/4/6/7 재독)
    part1ImageTrapType: safeStr(parsed.part1ImageTrapType),
    part1KeywordMissed: safeStr(parsed.part1KeywordMissed),
    part1PassiveVoiceError: parsed.part1PassiveVoiceError === true || parsed.part1PassiveVoiceError === 'true' ? true : (parsed.part1PassiveVoiceError === false || parsed.part1PassiveVoiceError === 'false' ? false : undefined),
    part3QuestionType: safeStr(parsed.part3QuestionType),
    part3SetPosition: [1, 2, 3].includes(Number(parsed.part3SetPosition)) ? Number(parsed.part3SetPosition) : null,
    part3PreviewRead: parsed.part3PreviewRead === true || parsed.part3PreviewRead === 'true' ? true : (parsed.part3PreviewRead === false || parsed.part3PreviewRead === 'false' ? false : undefined),
    part3ConcentrationDrop: parsed.part3ConcentrationDrop === true || parsed.part3ConcentrationDrop === 'true' ? true : (parsed.part3ConcentrationDrop === false || parsed.part3ConcentrationDrop === 'false' ? false : undefined),
    part4LectureType: safeStr(parsed.part4LectureType),
    part4QuestionType: safeStr(parsed.part4QuestionType),
    part4NoteTaking: parsed.part4NoteTaking === true || parsed.part4NoteTaking === 'true' ? true : (parsed.part4NoteTaking === false || parsed.part4NoteTaking === 'false' ? false : undefined),
    part6BlankType: safeStr(parsed.part6BlankType),
    part6ContextFailReason: safeStr(parsed.part6ContextFailReason),
    rereadCount: typeof parsed.rereadCount === 'number' && parsed.rereadCount >= 0 ? parsed.rereadCount : (typeof parsed.rereadCount === 'string' && /^\d+$/.test(parsed.rereadCount) ? parseInt(parsed.rereadCount, 10) : null),
  }
}

function parsePartNumber(partStr) {
  const match = String(partStr || '').match(/(\d+)/)
  const n = match ? parseInt(match[1], 10) : 5
  return n >= 1 && n <= 7 ? n : 5
}

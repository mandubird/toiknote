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

파트별 세부 분류 (해당 파트일 때만 채우고, 해당 없으면 null 또는 빈 문자열):
- Part 5 (문법): grammarCategory (예: "시제", "수일치", "관계대명사", "전치사", "접속사", "분사", "가정법", "비교급", "어휘"), grammarSubType (예: "현재완료", "과거시제 구분", "주격/목적격")
- Part 7 (독해): passageType ("단일지문" | "이중지문" | "삼중지문"), questionType ("사실확인" | "추론" | "어휘" | "의도파악" | "문장삽입")
- Part 2 (질의응답): questionPattern ("의문사질문" | "일반의문문" | "부정의문문" | "선택의문문" | "제안/요청" | "평서문"), answerType ("직접답변" | "우회답변" | "부정응답")

다른 말 없이 반드시 JSON만 출력하세요.`

const USER_PROMPT = `이 토익 문제 이미지를 분석해서 part, lcOrRc, question, answer, explanation, tags, difficulty를 JSON으로 추출해 주세요.
그리고 파트에 맞게 세부 분류도 넣어 주세요.
- Part 5면 grammarCategory, grammarSubType
- Part 7이면 passageType, questionType
- Part 2면 questionPattern, answerType
(해당 안 되면 해당 필드는 null 또는 빼도 됨)`

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
  }
}

function parsePartNumber(partStr) {
  const match = String(partStr || '').match(/(\d+)/)
  const n = match ? parseInt(match[1], 10) : 5
  return n >= 1 && n <= 7 ? n : 5
}

/**
 * analyzeToeicImage — Supabase Edge Function을 통한 서버사이드 OpenAI 분석
 *
 * @param {string | { imageUrl?: string, imageBase64?: string }} input  Storage URL 또는 base64 포함 객체
 * @param {'quick'|'detail'} [mode='quick']
 * @param {Array|null} [selectedQuestions]  mode=detail 일 때 선택된 문제(퀵 결과 객체) — 서버에 전달
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ questions: Array }>}
 */
import { supabase } from '../lib/supabase'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

/**
 * Edge Function 호출용 access_token — 갱신 성공 시 새 토큰, 실패 시 기존 세션 토큰(방금 로그인한 직후 등)
 */
async function getAccessTokenForFunctions() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return null
  const { data: ref, error } = await supabase.auth.refreshSession()
  if (!error && ref?.session?.access_token) return ref.session.access_token
  return session.access_token
}

function slimSelectedForDetailApi(q) {
  if (!q || typeof q !== 'object') return {}
  return {
    question_number: q.questionNumber ?? q.question_number ?? null,
    part: q.part ?? null,
    passage_group_id: q.passageGroupId ?? q.passage_group_id ?? null,
  }
}

export async function analyzeToeicImage(input, mode = 'quick', selectedQuestions = null, options = {}) {
  const { signal } = options
  const imageUrl = typeof input === 'string' ? input : input?.imageUrl
  const imageBase64 = typeof input === 'object' && input ? input.imageBase64 : null

  const body = {
    mode: mode === 'detail' ? 'detail' : 'quick',
    imageUrl: imageUrl || undefined,
    imageBase64: imageBase64 || undefined,
  }
  if (body.mode === 'detail' && Array.isArray(selectedQuestions) && selectedQuestions.length) {
    body.selectedQuestions = selectedQuestions.map(slimSelectedForDetailApi)
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('앱 서버 설정이 빠져 있어요. 관리자에게 문의해 주세요.')
  }

  const accessToken = await getAccessTokenForFunctions()
  if (!accessToken) {
    throw new Error('로그인이 필요합니다. 다시 로그인해 주세요.')
  }

  // supabase.functions.invoke/setAuth 조합보다 fetch로 Authorization·apikey를 고정하는 편이
  // 헤더 덮어쓰기/클라이언트 상태 이슈를 줄임. 게이트웨이는 User JWT + anon apikey 조합을 기대함.
  const fnUrl = `${supabaseUrl}/functions/v1/analyze-toeic-image`
  let res
  try {
    res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    console.error('analyze-toeic-image fetch:', e)
    throw new Error('네트워크 오류로 분석 요청에 실패했어요. 잠시 후 다시 시도해 주세요.')
  }

  const rawText = await res.text()
  let data
  try {
    data = rawText ? JSON.parse(rawText) : null
  } catch {
    console.error('analyze-toeic-image 비JSON 응답:', res.status, rawText?.slice(0, 200))
    throw new Error('사진 분석 서버 응답이 올바르지 않아요. 잠시 후 다시 시도해 주세요.')
  }

  if (!res.ok) {
    const msg = (data && (data.message || data.error || data.msg)) || rawText || `HTTP ${res.status}`
    const flat = String(msg)
    console.error('analyze-toeic-image HTTP 오류:', res.status, flat)
    if (/invalid\s*jwt/i.test(flat)) {
      throw new Error(
        '로그인 토큰을 서버가 인식하지 못했어요. 배포 환경의 VITE_SUPABASE_URL·VITE_SUPABASE_ANON_KEY가 ' +
          '로그인에 쓰는 Supabase 프로젝트와 동일한지 확인해 주세요. 사용자는 사이트 데이터·캐시 삭제 후 다시 로그인해 보세요.',
      )
    }
    throw new Error(flat.includes('non-2xx') ? '사진 분석 서버 오류예요. 잠시 후 다시 시도해 주세요.' : flat)
  }

  if (data?.error) {
    throw new Error(typeof data.error === 'string' ? data.error : '사진 분석에 실패했어요.')
  }

  if (!data?.content) {
    throw new Error('사진 분석 결과를 받지 못했어요.')
  }

  let parsed
  try {
    parsed = JSON.parse(data.content)
  } catch {
    throw new Error('사진 분석 결과 형식이 올바르지 않아요.')
  }

  const rawQuestions = Array.isArray(parsed.questions)
    ? parsed.questions
    : parsed.part || parsed.question
      ? [parsed]
      : []

  if (!rawQuestions.length) {
    throw new Error('이미지에서 토익 문제를 찾지 못했어요.')
  }

  const questions = rawQuestions.map((q) => normalizeOneQuestion(q, mode))

  return { questions }
}

function normalizeOneQuestion(q, mode) {
  const safeStr = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null)

  const normalizeQuestionNumber = (x) => {
    if (typeof x.question_number === 'number') return x.question_number
    if (typeof x.questionNumber === 'number') return x.questionNumber
    if (typeof x.question_number === 'string' && /^\d+$/.test(x.question_number)) return parseInt(x.question_number, 10)
    if (typeof x.questionNumber === 'string' && /^\d+$/.test(x.questionNumber)) return parseInt(x.questionNumber, 10)
    return null
  }

  const questionNumber = normalizeQuestionNumber(q)

  let partNumFromNumber = null
  if (questionNumber != null && questionNumber >= 1 && questionNumber <= 200) {
    partNumFromNumber = inferPartFromQuestionNumber(questionNumber)
  }

  const rawPartStr = String(q.part ?? 'Part 5').trim()
  const partNumFromText = parsePartNumber(rawPartStr)
  const partNum = partNumFromNumber ?? partNumFromText
  const partStr = `Part ${partNum}`

  const lcOrRcFromModel = q.lcOrRc === 'LC' || q.lcOrRc === 'RC' ? q.lcOrRc : null
  const lcOrRc = lcOrRcFromModel || (partNum >= 1 && partNum <= 4 ? 'LC' : 'RC')

  const difficulty = [1, 2, 3].includes(Number(q.difficulty)) ? Number(q.difficulty) : 2

  let questionText = String(q.question ?? '').trim()
  if (mode === 'quick' && questionText.length > 60) {
    questionText = questionText.slice(0, 60) + '…'
  }

  return {
    part: partStr,
    partNumber: partNum,
    lcOrRc,
    questionNumber,
    passageGroupId: safeStr(q.passage_group_id || q.passageGroupId),
    options: q.options && typeof q.options === 'object' ? q.options : null,
    question: questionText,
    answer: String(q.answer ?? '').trim(),
    explanation: String(q.explanation ?? '').trim(),
    tags: Array.isArray(q.tags) ? q.tags.map((t) => String(t).trim()).filter(Boolean) : [],
    difficulty,
    grammarCategory: safeStr(q.grammarCategory),
    grammarSubType: safeStr(q.grammarSubType),
    passageType: safeStr(q.passageType),
    questionType: safeStr(q.questionType),
    questionPattern: safeStr(q.questionPattern),
    answerType: safeStr(q.answerType),
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
    keyVocabulary: Array.isArray(q.keyVocabulary) && q.keyVocabulary.length > 0
      ? q.keyVocabulary.map((v) => String(v).trim()).filter(Boolean).slice(0, 2)
      : null,
  }
}

function parsePartNumber(partStr) {
  const match = String(partStr || '').match(/(\d+)/)
  const n = match ? parseInt(match[1], 10) : 5
  return n >= 1 && n <= 7 ? n : 5
}

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

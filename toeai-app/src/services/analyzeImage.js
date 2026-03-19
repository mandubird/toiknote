/**
 * analyzeToeicImage — Supabase Edge Function을 통한 서버사이드 OpenAI 분석
 *
 * 브라우저에서 직접 OpenAI API를 호출하지 않고 Edge Function을 경유합니다.
 * - iOS Safari "Load failed" 오류 방지
 * - OpenAI API 키 클라이언트 노출 차단
 */
import { supabase } from '../lib/supabase'

/**
 * 이미지 URL을 Edge Function(analyze-toeic-image)으로 전송해
 * GPT-4o mini 분석 결과를 반환합니다.
 *
 * @param {string} imageUrl  Supabase Storage public URL
 * @returns {Promise<{ questions: Array }>}
 */
export async function analyzeToeicImage(imageUrl) {
  const { data, error } = await supabase.functions.invoke('analyze-toeic-image', {
    body: { imageUrl },
  })

  if (error) {
    console.error('analyze-toeic-image Edge Function 오류:', error)
    throw new Error(error.message || '사진 분석에 실패했어요.')
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

  const safeStr = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null)

  // 항상 questions 배열로 정규화
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
      (partNum >= 1 && partNum <= 4 ? 'LC' : 'RC')

    const difficulty = [1, 2, 3].includes(Number(q.difficulty)) ? Number(q.difficulty) : 2

    return {
      part: partStr,
      partNumber: partNum,
      lcOrRc,
      questionNumber,
      passageGroupId: safeStr(q.passage_group_id || q.passageGroupId),
      options:
        q.options && typeof q.options === 'object' ? q.options : null,
      question: String(q.question ?? '').trim(),
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
  })

  return { questions }
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

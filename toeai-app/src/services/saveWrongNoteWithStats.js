import { supabase } from '../lib/supabase'

const PENDING_STORAGE_KEY = 'toeai_pending_wrong_answers'

// LC 오답 원인 키워드 — AnalysisConfirmModal의 PART_TAG_OPTIONS와 동기화
const LC_ERROR_REASONS = new Set([
  '발음혼동', '우회답변', '집중력분산', '속도못따라감',
  '선택지오해', '노트테이킹실패', '어휘몰라서',
])

/**
 * LC 파트(1~4) 오답에서 사용자가 선택한 오류 원인을 lc_error_logs 테이블에 저장
 * @param {string} userId
 * @param {number} partNumber
 * @param {string[]} userSelectedTags
 * @param {string|null} wrongAnswerId
 */
async function saveLcErrorLog(userId, partNumber, userSelectedTags, wrongAnswerId) {
  if (partNumber < 1 || partNumber > 4) return
  const reasons = (userSelectedTags || []).filter((t) => LC_ERROR_REASONS.has(t))
  if (!reasons.length) return

  const rows = reasons.map((reason) => ({
    user_id:         userId,
    wrong_answer_id: wrongAnswerId ?? null,
    part_number:     partNumber,
    lc_error_reason: reason,
  }))

  const { error } = await supabase.from('lc_error_logs').insert(rows)
  if (error) console.warn('lc_error_logs 저장 실패 (비필수):', error)
}

function parsePartNumber(partStr) {
  if (typeof partStr === 'number' && partStr >= 1 && partStr <= 7) return partStr
  const match = String(partStr || '').match(/(\d+)/)
  const n = match ? parseInt(match[1], 10) : 5
  return n >= 1 && n <= 7 ? n : 5
}

function getLcOrRc(part, partNumber, lcOrRc) {
  if (lcOrRc === 'LC' || lcOrRc === 'RC') return lcOrRc
  const num = partNumber ?? parsePartNumber(part)
  return num >= 1 && num <= 4 ? 'LC' : 'RC'
}

/**
 * @param {string} userId
 * @param {object} data - 기본 필드 + STEP3 세부: grammarCategory, grammarSubType, passageType, questionType, questionPattern, answerType
 */
export async function saveWrongNoteWithStats(userId, data) {
  const partNumber = data.partNumber ?? parsePartNumber(data.part)
  const lcOrRc = getLcOrRc(data.part, partNumber, data.lcOrRc)
  const difficulty = [1, 2, 3].includes(Number(data.difficulty)) ? Number(data.difficulty) : 2
  const tags = Array.isArray(data.tags) ? data.tags : []
  const imageUrl = data.imageUrl || ''

  try {
    const { data: noteId, error } = await supabase.rpc('save_wrong_note_with_stats', {
      p_part: data.part || `Part ${partNumber}`,
      p_part_number: partNumber,
      p_lc_or_rc: lcOrRc,
      p_question: data.question || '',
      p_answer: data.answer || '',
      p_explanation: data.explanation || '',
      p_tags: tags,
      p_difficulty: difficulty,
      p_source_image_url: imageUrl,
      p_image_url: imageUrl,
      p_grammar_category: data.grammarCategory ?? null,
      p_grammar_sub_type: data.grammarSubType ?? null,
      p_passage_type: data.passageType ?? null,
      p_question_type: data.questionType ?? null,
      p_question_pattern: data.questionPattern ?? null,
      p_answer_type: data.answerType ?? null,
      p_user_selected_tags: Array.isArray(data.userSelectedTags) ? data.userSelectedTags : [],
      p_timeout_flag: Boolean(data.timeoutFlag),
      p_solving_time: data.solvingTime != null && data.solvingTime >= 0 ? Number(data.solvingTime) : null,
      // v4.01 전파트
      p_part1_image_trap_type: data.part1ImageTrapType ?? null,
      p_part1_keyword_missed: data.part1KeywordMissed ?? null,
      p_part1_passive_voice_error: data.part1PassiveVoiceError != null ? Boolean(data.part1PassiveVoiceError) : null,
      p_part3_question_type: data.part3QuestionType ?? null,
      p_part3_set_position: data.part3SetPosition >= 1 && data.part3SetPosition <= 3 ? data.part3SetPosition : null,
      p_part3_preview_read: data.part3PreviewRead != null ? Boolean(data.part3PreviewRead) : null,
      p_part3_concentration_drop: data.part3ConcentrationDrop != null ? Boolean(data.part3ConcentrationDrop) : null,
      p_part4_lecture_type: data.part4LectureType ?? null,
      p_part4_question_type: data.part4QuestionType ?? null,
      p_part4_note_taking: data.part4NoteTaking != null ? Boolean(data.part4NoteTaking) : null,
      p_part6_blank_type: data.part6BlankType ?? null,
      p_part6_context_fail_reason: data.part6ContextFailReason ?? null,
      p_reread_count: data.rereadCount != null && data.rereadCount >= 0 ? Number(data.rereadCount) : null,
    })

    if (error) throw error

    // LC 오류 원인 로그 저장 (비필수 — 실패해도 저장 성공으로 처리)
    const wrongAnswerId = typeof noteId === 'string' ? noteId : null
    saveLcErrorLog(userId, partNumber, data.userSelectedTags, wrongAnswerId)

    return { success: true }
  } catch (err) {
    const item = { userId, ...data, failedAt: Date.now() }
    const pending = getPendingWrongAnswers()
    pending.push(item)
    try {
      localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending))
    } catch (e) {
      console.error('로컬 임시 저장 실패:', e)
    }
    return { success: false, error: err?.message || '저장에 실패했어요.', pendingKey: PENDING_STORAGE_KEY }
  }
}

export function getPendingWrongAnswers() {
  try {
    const raw = localStorage.getItem(PENDING_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

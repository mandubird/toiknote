import { supabase } from '../lib/supabase'

const PENDING_STORAGE_KEY = 'toeai_pending_wrong_answers'

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
 * @param {{ imageUrl: string, part: string, partNumber?: number, lcOrRc?: string, question: string, answer: string, explanation: string, tags: string[], difficulty?: number }} data
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
    })

    if (error) throw error
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

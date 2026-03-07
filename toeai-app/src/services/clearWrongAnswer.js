import { supabase } from '../lib/supabase'

/**
 * 오답 클리어 토글 (마스터 표시/해제)
 * @param {string} id - wrong_answers.id
 * @param {boolean} cleared - true: 클리어, false: 해제
 * @returns {Promise<{ clearedAt: Date|null }>}
 */
export async function toggleClearWrongAnswer(id, cleared) {
  const clearedAt = cleared ? new Date().toISOString() : null
  const { error } = await supabase
    .from('wrong_answers')
    .update({ cleared_at: clearedAt })
    .eq('id', id)

  if (error) throw error
  return { clearedAt: clearedAt ? new Date(clearedAt) : null }
}

/**
 * 특정 주차(start~end)에 클리어한 오답 수 조회
 * @param {string} userId
 * @param {Date} weekStart
 * @param {Date} weekEnd
 * @returns {Promise<number>}
 */
export async function countClearedThisWeek(userId, weekStart, weekEnd) {
  const { count, error } = await supabase
    .from('wrong_answers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('cleared_at', weekStart.toISOString())
    .lte('cleared_at', weekEnd.toISOString())

  if (error) return 0
  return count || 0
}

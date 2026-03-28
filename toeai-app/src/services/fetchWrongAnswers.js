import { supabase } from '../lib/supabase'

/**
 * 오답 개수만 조회 (코칭 홈 분기 등 — 전체 SELECT 불필요)
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function fetchWrongAnswerCount(userId) {
  if (!userId) return 0
  const { count, error } = await supabase
    .from('wrong_answers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    console.error('fetchWrongAnswerCount', error)
    return 0
  }
  return count ?? 0
}

/**
 * @param {string} userId
 * @returns {Promise<Array<{ id: string, part: string, question: string, answer: string, explanation: string, tags: string[], imageUrl: string, createdAt: Date, partNumber: number, lcOrRc: string, difficulty: number }>>}
 */
export async function fetchWrongAnswers(userId) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('wrong_answers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('fetchWrongAnswers', error)
    return []
  }

  return (data || []).map((d) => {
    const partNumber = d.part_number >= 1 && d.part_number <= 7 ? d.part_number : 5
    const lcOrRc = d.lc_or_rc === 'LC' ? 'LC' : d.lc_or_rc === 'RC' ? 'RC' : partNumber <= 4 ? 'LC' : 'RC'
    const tags = Array.isArray(d.tags) ? d.tags : typeof d.tags === 'object' && d.tags !== null ? [] : []
    return {
      id: d.id,
      part: d.part || `Part ${partNumber}`,
      partNumber,
      lcOrRc,
      question: d.question || '',
      answer: d.answer || '',
      explanation: d.explanation || '',
      tags,
      imageUrl: d.image_url || d.source_image_url || '',
      difficulty: [1, 2, 3].includes(Number(d.difficulty)) ? Number(d.difficulty) : 2,
      createdAt: d.created_at ? new Date(d.created_at) : new Date(),
      clearedAt: d.cleared_at ? new Date(d.cleared_at) : null,
    }
  })
}

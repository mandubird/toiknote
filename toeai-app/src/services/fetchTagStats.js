import { supabase } from '../lib/supabase'

const DEFAULT_PART_COUNTS = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }

/**
 * @param {string} userId
 * @returns {Promise<{ tagCounts: Record<string,number>, partCounts: Record<string,number>, lcWrong: number, rcWrong: number, totalWrong: number }>}
 */
export async function fetchTagStats(userId) {
  if (!userId) {
    return {
      tagCounts: {},
      partCounts: { ...DEFAULT_PART_COUNTS },
      lcWrong: 0,
      rcWrong: 0,
      totalWrong: 0,
    }
  }
  const { data, error } = await supabase
    .from('tag_stats')
    .select('tag_counts, part_counts, lc_wrong, rc_wrong, total_wrong')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('fetchTagStats', error)
    return { tagCounts: {}, partCounts: { ...DEFAULT_PART_COUNTS }, lcWrong: 0, rcWrong: 0, totalWrong: 0 }
  }

  const partCounts = { ...DEFAULT_PART_COUNTS }
  if (data?.part_counts && typeof data.part_counts === 'object') {
    Object.entries(data.part_counts).forEach(([k, v]) => {
      const n = parseInt(k, 10)
      if (n >= 1 && n <= 7) partCounts[n] = Number(v) || 0
    })
  }

  return {
    tagCounts: data?.tag_counts && typeof data.tag_counts === 'object' ? data.tag_counts : {},
    partCounts,
    lcWrong: Number(data?.lc_wrong) || 0,
    rcWrong: Number(data?.rc_wrong) || 0,
    totalWrong: Number(data?.total_wrong) || 0,
  }
}

/**
 * @param {{ lcWrong: number, rcWrong: number }} stats
 * @param {number} lcTotal
 * @param {number} rcTotal
 */
export function calculateEstimatedScore(stats, lcTotal = 100, rcTotal = 100) {
  const lcAccuracy = 1 - (stats.lcWrong / lcTotal)
  const rcAccuracy = 1 - (stats.rcWrong / rcTotal)
  const lcScore = Math.round(Math.max(0, Math.min(1, lcAccuracy)) * 495)
  const rcScore = Math.round(Math.max(0, Math.min(1, rcAccuracy)) * 495)
  return lcScore + rcScore
}

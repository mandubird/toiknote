import { supabase } from '../lib/supabase'
import { fetchTagStats } from './fetchTagStats'
import { getScoreRange } from './diagnosisService'

/**
 * v4.03: 진단 결과 저장 (LC/RC/Part5,6,7 추정)
 * overall_score = rc + lc, weakest_part = part5/6/7 중 최소 점수 파트
 * @param {string} userId
 * @returns {Promise<{ id: string, overall_score: number, weakest_part: number }>}
 */
export async function saveDiagnosticResult(userId) {
  if (!userId) throw new Error('로그인이 필요해요.')

  const tagStats = await fetchTagStats(userId)
  const lcWrong = tagStats.lcWrong || 0
  const rcWrong = tagStats.rcWrong || 0
  const partCounts = tagStats.partCounts || {}

  const lcScore = Math.round(Math.max(0, 1 - lcWrong / 100) * 495)
  const rcScore = Math.round(Math.max(0, 1 - rcWrong / 100) * 495)
  const overall = lcScore + rcScore

  const p5 = partCounts[5] || 0
  const p6 = partCounts[6] || 0
  const p7 = partCounts[7] || 0
  const rcTotal = p5 + p6 + p7 || 1
  const part5Score = Math.round((1 - p5 / rcTotal) * 495)
  const part6Score = Math.round((1 - p6 / rcTotal) * 495)
  const part7Score = Math.round((1 - p7 / rcTotal) * 495)
  const parts = [
    { part: 5, score: part5Score },
    { part: 6, score: part6Score },
    { part: 7, score: part7Score },
  ]
  const weakest = parts.sort((a, b) => a.score - b.score)[0]?.part ?? 7

  const { data, error } = await supabase
    .from('diagnostic_results')
    .insert({
      user_id: userId,
      rc_score: rcScore,
      lc_score: lcScore,
      part5_score: part5Score,
      part6_score: part6Score,
      part7_score: part7Score,
      overall_score: overall,
      weakest_part: weakest,
    })
    .select('id, overall_score, weakest_part, created_at')
    .single()
  if (error) throw error

  const scoreRange = getScoreRange(overall)
  await supabase
    .from('users')
    .update({
      diagnostic_completed_at: data?.created_at ?? new Date().toISOString(),
      score_range: scoreRange,
    })
    .eq('id', userId)

  return {
    id: data.id,
    overall_score: overall,
    weakest_part: weakest,
    rc_score: rcScore,
    lc_score: lcScore,
    part5_score: part5Score,
    part6_score: part6Score,
    part7_score: part7Score,
  }
}

/**
 * 최신 진단 결과 1건 (진단 완료 여부 = 이 결과 존재 여부)
 * @param {string} userId
 */
export async function getLatestDiagnostic(userId) {
  if (!userId) return null
  const { data } = await supabase
    .from('diagnostic_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

/**
 * 진단 완료 여부 → Week1 접근 가능 여부
 * @param {string} userId
 */
export async function isDiagnosticCompleted(userId) {
  const d = await getLatestDiagnostic(userId)
  return !!d
}

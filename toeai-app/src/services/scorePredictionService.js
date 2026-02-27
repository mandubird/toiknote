import { supabase } from '../lib/supabase'
import { getWeeklyReports } from './programService'
import { fetchTagStats, calculateEstimatedScore } from './fetchTagStats'
import { fetchSegmentStats } from './fetchSegmentStats'

/**
 * v4.04: Part7 시간 패널티 (1문제 평균 75초 기준)
 * @param {number|null} avgPart7Seconds
 * @returns {number} 0 | 10 | 20 | 30
 */
function getPart7TimePenalty(avgPart7Seconds) {
  if (avgPart7Seconds == null || avgPart7Seconds <= 75) return 0
  if (avgPart7Seconds <= 90) return 10
  if (avgPart7Seconds <= 110) return 20
  return 30
}

/**
 * v4.03/v4.04: 점수 예측 = (LC/RC 기반 추정) - Part7 시간 패널티 → score_prediction 저장
 * 노출: Week4+ & Pro 전용
 * @param {string} userId
 * @returns {Promise<{ predicted_score: number, confidence_rate: number }|null>}
 */
export async function updateScorePrediction(userId) {
  if (!userId) return null

  const reports = await getWeeklyReports(userId)
  const recent3 = reports.slice(-3)
  if (recent3.length === 0) return null

  const [tagStats, segmentStats] = await Promise.all([
    fetchTagStats(userId),
    fetchSegmentStats(userId),
  ])
  const baseScore = calculateEstimatedScore(tagStats, 100, 100)
  const part7Penalty = getPart7TimePenalty(segmentStats?.avgPart7TimeSeconds ?? null)
  const predicted = Math.round(baseScore - part7Penalty)
  const clamped = Math.max(0, Math.min(990, predicted))

  const avgEndScore = recent3.reduce((s, r) => s + (r.estimated_score_end || 0), 0) / recent3.length
  const trend = recent3.length >= 2
    ? (recent3[recent3.length - 1].estimated_score_end || 0) - (recent3[0].estimated_score_end || 0)
    : 0
  const confidence = Math.min(100, 50 + recent3.length * 15 + (trend > 0 ? 10 : 0))

  await supabase.from('score_prediction').upsert(
    {
      user_id: userId,
      predicted_score: clamped,
      confidence_rate: confidence,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  return { predicted_score: clamped, confidence_rate: confidence }
}

/**
 * 점수 예측 조회 (Week4+ Pro만 노출)
 * @param {string} userId
 */
export async function getScorePrediction(userId) {
  if (!userId) return null
  const { data } = await supabase.from('score_prediction').select('*').eq('user_id', userId).maybeSingle()
  return data
}

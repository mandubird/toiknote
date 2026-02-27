import { supabase } from '../lib/supabase'
import { getWeeklyReports } from './programService'
import { fetchTagStats, calculateEstimatedScore } from './fetchTagStats'

/**
 * v4.03: 점수 예측 계산 (최근 3주 평균 정확도 + 추세) → score_prediction 저장
 * 노출: Week4+ & Pro 전용
 * @param {string} userId
 * @returns {Promise<{ predicted_score: number, confidence_rate: number }>}
 */
export async function updateScorePrediction(userId) {
  if (!userId) return null

  const reports = await getWeeklyReports(userId)
  const recent3 = reports.slice(-3)
  if (recent3.length === 0) return null

  const tagStats = await fetchTagStats(userId)
  const currentEstimated = calculateEstimatedScore(tagStats, 100, 100)
  const avgEndScore = recent3.reduce((s, r) => s + (r.estimated_score_end || 0), 0) / recent3.length
  const trend = recent3.length >= 2
    ? (recent3[recent3.length - 1].estimated_score_end || 0) - (recent3[0].estimated_score_end || 0)
    : 0
  const predicted = Math.round(avgEndScore + trend * 0.3)
  const clamped = Math.max(0, Math.min(990, predicted))
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

/**
 * v4.24: user_tag_stats 기반 약점 랭킹 (weakness_score)
 */
import { supabase } from '../lib/supabase'

const TIME_BENCHMARKS = {
  P7: 90,
  P5: 60,
  P6: 60,
  RC: 60,
  LC: 30,
  META: 0,
}

/**
 * 풀이 1건 반영 후 weakness_score 재계산 및 upsert
 * @param {string} userId
 * @param {string} tagId
 * @param {boolean} isCorrect
 * @param {number} solveTimeSeconds
 */
export async function updateUserTagStats(userId, tagId, isCorrect, solveTimeSeconds) {
  const { data: tag, error: tagErr } = await supabase
    .from('tag_master')
    .select('weight, depth, part, category, frequency_weight')
    .eq('id', tagId)
    .single()

  if (tagErr || !tag) return

  const { data: existing } = await supabase
    .from('user_tag_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('tag_id', tagId)
    .maybeSingle()

  const prevAttempt = existing?.attempt_count ?? 0
  const prevCorrect = existing?.correct_count ?? 0
  const prevAvgTime = existing?.average_time_seconds ?? 0

  const newAttempt = prevAttempt + 1
  const newCorrect = prevCorrect + (isCorrect ? 1 : 0)
  const newAvgTime = (prevAvgTime * prevAttempt + solveTimeSeconds) / newAttempt
  const accuracyRate = newCorrect / newAttempt

  const partKey = tag.part || tag.category
  const benchmark = TIME_BENCHMARKS[partKey] ?? 60
  let timePenalty = 0
  if (benchmark > 0) {
    if (newAvgTime > benchmark * 1.2) timePenalty = 0.2
    else if (newAvgTime > benchmark) timePenalty = 0.1
  }

  const lastAttempted = existing?.last_attempted_at ? new Date(existing.last_attempted_at) : null
  const within30Days = lastAttempted && (Date.now() - lastAttempted.getTime()) < 30 * 24 * 60 * 60 * 1000
  const effectiveWeight = within30Days ? tag.weight * 1.2 : tag.weight
  // #1 비출 문법 우선순위: frequency_weight 곱해서 출제빈도 반영
  const frequencyWeight = tag.frequency_weight ?? 1.0

  const weaknessScore =
    (1 - accuracyRate) * effectiveWeight * frequencyWeight + timePenalty + (tag.depth * 0.05)

  await supabase.from('user_tag_stats').upsert(
    {
      user_id: userId,
      tag_id: tagId,
      attempt_count: newAttempt,
      correct_count: newCorrect,
      average_time_seconds: Math.round(newAvgTime * 100) / 100,
      weakness_score: Math.round(weaknessScore * 1000) / 1000,
      last_attempted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,tag_id' }
  )
}

/**
 * 약점 Top10 (attempt_count >= 3, weakness_score 내림차순)
 * @param {string} userId
 * @returns {Promise<Array<{ tagId: string, tagCode: string, tagName: string, category: string, part: string, weaknessScore: number, accuracyRate: number, attemptCount: number, averageTime: number }>>}
 */
export async function getTop10WeakTags(userId) {
  const { data, error } = await supabase
    .from('user_tag_stats')
    .select(
      'weakness_score, attempt_count, correct_count, average_time_seconds, tag_master!tag_id(id, tag_code, tag_name, category, part, frequency_weight, depth)'
    )
    .eq('user_id', userId)
    .gte('attempt_count', 3)
    .order('weakness_score', { ascending: false })
    .limit(10)

  if (error || !data) return []

  return data.map((row) => {
    const tag = row.tag_master || {}
    const attemptCount = row.attempt_count || 0
    const correctCount = row.correct_count || 0
    const accuracyRate = attemptCount > 0 ? correctCount / attemptCount : 0
    const avgTime = row.average_time_seconds ?? 0
    // 시간 압박 여부: 파트별 기준 대비 20% 초과
    const TIME_BENCHMARKS = { P7: 90, P5: 60, P6: 60, RC: 60, LC: 30, META: 0 }
    const benchmark = TIME_BENCHMARKS[tag.part ?? 'RC'] ?? 60
    const hasTimePressure = benchmark > 0 && avgTime > benchmark * 1.2
    return {
      tagId: tag.id,
      tagCode: tag.tag_code ?? '',
      tagName: tag.tag_name ?? '',
      category: tag.category ?? '',
      part: tag.part ?? '',
      weaknessScore: row.weakness_score ?? 0,
      accuracyRate: Math.round(accuracyRate * 10000) / 10000,
      attemptCount,
      averageTime: avgTime,
      frequencyWeight: tag.frequency_weight ?? 1.0,
      depth: tag.depth ?? 1,
      hasTimePressure,
    }
  })
}

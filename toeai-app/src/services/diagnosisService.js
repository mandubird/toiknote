import { supabase } from '../lib/supabase'
import { fetchTagStats, calculateEstimatedScore } from './fetchTagStats'
import { getUserProfile } from './userProfile'

/**
 * 점수로 구간 라벨 반환 (v4.04: 600-700, 700-800, 800-900, 900+)
 * @param {number} score
 * @returns {'600-700'|'700-800'|'800-900'|'900+'}
 */
export function getScoreRange(score) {
  const s = Number(score) || 0
  if (s >= 900) return '900+'
  if (s >= 800) return '800-900'
  if (s >= 700) return '700-800'
  return '600-700'
}

/**
 * 태그 가중치 기반 패널티 계산 (wrong_answers + tag_weights)
 * @param {string} userId
 * @returns {Promise<{ totalPenalty: number, weightedTags: Record<string, number> }>}
 */
export async function calculateWeightedTagPenalty(userId) {
  if (!userId) return { totalPenalty: 0, weightedTags: {} }

  const [
    { data: user },
    { data: wrongList },
    { data: weights },
  ] = await Promise.all([
    supabase.from('users').select('current_score').eq('id', userId).maybeSingle(),
    supabase.from('wrong_answers').select('part_number, tags, difficulty').eq('user_id', userId),
    supabase.from('tag_weights').select('part, tag_name, score_impact_weight, difficulty_weight, score_range_weight'),
  ])

  const score = Number(user?.current_score) || 0
  const scoreRange = getScoreRange(score)
  const weightMap = {}
  ;(weights || []).forEach((w) => {
    const key = `${w.part}-${w.tag_name}`
    weightMap[key] = {
      base: Number(w.score_impact_weight) || 1,
      difficulty: (w.difficulty_weight && typeof w.difficulty_weight === 'object') ? w.difficulty_weight : { 1: 0.8, 2: 1, 3: 1.4 },
      scoreRange: (w.score_range_weight && typeof w.score_range_weight === 'object') ? w.score_range_weight : {},
    }
  })

  let totalPenalty = 0
  const tagCount = {}

  ;(wrongList || []).forEach((row) => {
    const part = Number(row.part_number) || 0
    const difficulty = Math.min(3, Math.max(1, Number(row.difficulty) || 2))
    const tags = Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? [row.tags] : [])
    tags.forEach((tag) => {
      const key = `${part}-${tag}`
      const w = weightMap[key]
      if (!w) {
        if (!tagCount[tag]) tagCount[tag] = 0
        tagCount[tag]++
        totalPenalty += 5
        return
      }
      const d = w.difficulty[difficulty.toString()] ?? 1
      const r = w.scoreRange[scoreRange] ?? 1
      const finalWeight = w.base * d * r
      totalPenalty += finalWeight * 5
      if (!tagCount[tag]) tagCount[tag] = 0
      tagCount[tag]++
    })
  })

  return { totalPenalty: Math.round(totalPenalty), weightedTags: tagCount }
}

/**
 * 파트별 정답률 (accuracy_stats 뷰)
 * @param {string} userId
 */
export async function getUserAccuracyStats(userId) {
  if (!userId) return []
  const { data } = await supabase.from('accuracy_stats').select('*').eq('user_id', userId)
  return data || []
}

/**
 * 점수 구간별 약점 패턴 조회
 * @param {string} scoreRange
 */
export async function getScoreBandPattern(scoreRange) {
  const { data } = await supabase
    .from('score_band_patterns')
    .select('*')
    .eq('score_range', scoreRange)
    .maybeSingle()
  return data
}

/**
 * 약점 진단: 구간 패턴 + 사용자 실제 약점 매칭
 * @param {string} userId
 */
export async function diagnoseUserWeakness(userId) {
  if (!userId) return null

  const [profile, tagStats, accuracyRows] = await Promise.all([
    getUserProfile(userId),
    fetchTagStats(userId),
    getUserAccuracyStats(userId),
  ])
  const estimated = profile.currentScore > 0 ? profile.currentScore : calculateEstimatedScore(tagStats, 100, 100)
  const scoreRange = getScoreRange(estimated)
  const pattern = await getScoreBandPattern(scoreRange)
  const bandPattern = pattern?.common_weaknesses || {}
  const parts = bandPattern.parts && typeof bandPattern.parts === 'object' ? bandPattern.parts : {}

  const accuracyByPart = {}
  ;(accuracyRows || []).forEach((r) => {
    accuracyByPart[r.part] = {
      accuracy_rate: Number(r.accuracy_rate),
      total_solved: Number(r.total_solved),
      wrong_count: Number(r.wrong_count),
    }
  })

  const matchedWeaknesses = []
  Object.entries(parts).forEach(([partStr, info]) => {
    const part = parseInt(partStr, 10)
    const acc = accuracyByPart[part]
    const rate = acc ? acc.accuracy_rate : null
    const partWrong = tagStats.partCounts[part] || 0
    const isWeak = rate != null ? rate < 70 : partWrong > 0
    if (isWeak) {
      matchedWeaknesses.push({
        part,
        patternWeakness: info.weakness,
        priority: info.priority ?? 99,
        userAccuracy: rate,
        confirmed: true,
      })
    }
  })

  matchedWeaknesses.sort((a, b) => a.priority - b.priority)

  const actualWeakParts = Object.entries(tagStats.partCounts || {})
    .filter(([, v]) => Number(v) > 0)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .slice(0, 5)
    .map(([p]) => parseInt(p, 10))

  const actualWeakTags = Object.entries(tagStats.tagCounts || {})
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .slice(0, 5)
    .map(([t]) => t)

  return {
    scoreRange,
    bandPattern,
    actualWeakParts,
    actualWeakTags,
    matchedWeaknesses,
    recommendedStrategy: pattern?.recommended_strategy ?? null,
    expectedImprovement: pattern?.avg_improvement_60days ?? null,
  }
}

/**
 * 종합 진단 (점수 구간 + 약점 + 가중치 패널티 + 권장 전략)
 * @param {string} userId
 */
export async function performCompleteDiagnosis(userId) {
  if (!userId) return null

  const [diagnosis, weightedPenalty, profile] = await Promise.all([
    diagnoseUserWeakness(userId),
    calculateWeightedTagPenalty(userId),
    getUserProfile(userId),
  ])
  if (!diagnosis) return null

  const tagStats = await fetchTagStats(userId)
  const estimated = profile?.currentScore > 0 ? profile.currentScore : calculateEstimatedScore(tagStats, 100, 100)

  const result = {
    userId,
    currentScore: profile?.currentScore,
    estimatedScore: estimated,
    targetScore: profile?.targetScore,
    scoreRange: diagnosis.scoreRange,
    scoreBandPattern: diagnosis.bandPattern,
    weakParts: diagnosis.actualWeakParts,
    weakTags: diagnosis.actualWeakTags,
    weightedTagPenalty: weightedPenalty,
    primaryWeakness: diagnosis.bandPattern?.primary ?? null,
    secondaryWeaknesses: Array.isArray(diagnosis.bandPattern?.secondary) ? diagnosis.bandPattern.secondary : [],
    confirmedWeaknesses: diagnosis.matchedWeaknesses,
    recommendedStrategy: diagnosis.recommendedStrategy,
    expectedImprovement: diagnosis.expectedImprovement,
    diagnosedAt: new Date().toISOString(),
  }

  await supabase.from('score_analytics').upsert(
    {
      user_id: userId,
      priority_focus: result.primaryWeakness,
      expected_improvement: result.expectedImprovement,
      last_analyzed_at: result.diagnosedAt,
    },
    { onConflict: 'user_id' }
  )

  return result
}

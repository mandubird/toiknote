/**
 * v4.2: 700→900 전용 가중치 기반 점수 예측
 * - Part별 가중치, 태그 약점 패널티, Part7 시간 패널티 (50분 기준)
 */

import { supabase } from '../lib/supabase'

/** Part별 기본 가중치 (v4.2 명세) */
export const PART_WEIGHTS = {
  1: 1.0,
  2: 1.0,
  3: 1.1,
  4: 1.1,
  5: 1.2,
  6: 1.1,
  7: 1.4,
}

const PART_WEIGHT_SUM = Object.values(PART_WEIGHTS).reduce((a, b) => a + b, 0)

/** 파트별 오답 수로 정확도 추정 (파트당 가정 총 문항 30) */
const DEFAULT_PART_TOTAL = 30

/**
 * part_counts(오답 수) → 파트별 정확도 0~1
 * @param {Record<number,number>} partCounts
 */
export function getPartAccuracyFromCounts(partCounts) {
  const acc = {}
  for (let part = 1; part <= 7; part++) {
    const wrong = partCounts[part] ?? 0
    acc[part] = Math.max(0, Math.min(1, 1 - wrong / DEFAULT_PART_TOTAL))
  }
  return acc
}

/**
 * 가중 정확도 계산 (v4.2)
 * @param {Record<number,number>} partAccuracy - 1~7 키, 0~1 값
 */
export function calculateWeightedAccuracy(partAccuracy) {
  let weightedSum = 0
  for (let part = 1; part <= 7; part++) {
    const acc = partAccuracy[part] ?? 0
    weightedSum += acc * (PART_WEIGHTS[part] ?? 1)
  }
  return weightedSum / PART_WEIGHT_SUM
}

/**
 * 태그별 오답률 → 약점 패널티 (오답률 40% 이상만, v4.2)
 * @param {Record<string,number>} tagCounts - 태그별 오답 수
 * @param {number} totalWrong
 * @param {Record<string,number>} tagWeightMap - tag_name → weight
 */
export function calculateWeakTagPenalty(tagCounts, totalWrong, tagWeightMap) {
  if (!totalWrong || totalWrong <= 0) return 0
  let penalty = 0
  Object.entries(tagCounts || {}).forEach(([tag, count]) => {
    const wrongRate = count / totalWrong
    if (wrongRate < 0.4) return
    const weight = tagWeightMap[tag] ?? 1.0
    penalty += wrongRate * weight * 5
  })
  return Math.round(penalty)
}

/**
 * Part7 평균 시간(분) 기준 시간 패널티 (v4.2: 50분 기준)
 * @param {number|null} part7AvgMinutes - Part7 평균 소요 시간(분)
 * @param {number} benchmarkMinutes
 * @returns {number} 0 또는 음수
 */
export function getTimePenaltyV42(part7AvgMinutes, benchmarkMinutes = 50) {
  if (part7AvgMinutes == null || part7AvgMinutes <= benchmarkMinutes) return 0
  const timeExcess = (part7AvgMinutes - benchmarkMinutes) / benchmarkMinutes
  if (timeExcess < 0.05) return -10
  if (timeExcess < 0.1) return -20
  if (timeExcess >= 0.2) return -35
  return Math.round(-10 - timeExcess * 250)
}

/**
 * tag_weights 테이블에서 tag_name → weight 맵 (score_impact_weight 사용)
 */
export async function getTagWeightMap() {
  const { data } = await supabase.from('tag_weights').select('tag_name, score_impact_weight')
  const map = {}
  ;(data || []).forEach((row) => {
    map[row.tag_name] = Number(row.score_impact_weight) || 1.0
  })
  return map
}

/**
 * v4.2 가중치 적용 예상 점수 계산
 * @param {string} userId
 * @param {{ tagCounts: Record<string,number>, partCounts: Record<string,number>, totalWrong: number }} tagStats - fetchTagStats 결과
 * @param {number|null} part7AvgMinutes - Part7 평균 시간(분). null이면 segmentStats에서 초→분 변환 또는 0
 * @returns {Promise<{ estimatedScore: number, baseScore: number, weakTagPenalty: number, timePenalty: number, weightedAccuracy: number }>}
 */
export async function calculateEstimatedScoreV42(userId, tagStats, part7AvgMinutes = null) {
  const partAccuracy = getPartAccuracyFromCounts(tagStats?.partCounts || {})
  const weightedAccuracy = calculateWeightedAccuracy(partAccuracy)
  const baseScore = weightedAccuracy * 990

  const tagWeightMap = await getTagWeightMap()
  const weakTagPenalty = calculateWeakTagPenalty(
    tagStats?.tagCounts || {},
    tagStats?.totalWrong || 1,
    tagWeightMap
  )

  const timePenalty = getTimePenaltyV42(part7AvgMinutes)
  const estimatedScore = Math.round(Math.max(0, Math.min(990, baseScore - weakTagPenalty + timePenalty)))

  return {
    estimatedScore,
    baseScore: Math.round(baseScore),
    weakTagPenalty,
    timePenalty,
    weightedAccuracy,
  }
}

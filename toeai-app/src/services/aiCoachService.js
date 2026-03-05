/**
 * v4.24: AI 코치 케이스 분기 + 멘트 생성 (LLM 호출은 stub, 실제 연동 시 교체)
 */
import { getTop10WeakTags } from './tagStatsService'

/**
 * @param {Object} input
 * @param {number} input.accuracyChange
 * @param {number} input.part7TimeChange
 * @returns {'accuracy_down_time_up'|'accuracy_up_time_down'|'accuracy_up_time_up'|'accuracy_down_time_down'|'stable'}
 */
export function detectCoachCase(input) {
  const accDown = input.accuracyChange < -2
  const accUp = input.accuracyChange > 2
  const timeUp = input.part7TimeChange > 5
  const timeDown = input.part7TimeChange < -5
  if (accDown && timeUp) return 'accuracy_down_time_up'
  if (accUp && timeDown) return 'accuracy_up_time_down'
  if (accUp && timeUp) return 'accuracy_up_time_up'
  if (accDown && timeDown) return 'accuracy_down_time_down'
  return 'stable'
}

const CASE_MESSAGES = {
  accuracy_down_time_up: '정확도가 소폭 하락했고 Part7 풀이 시간이 늘었어요. 이번 주는 시간을 재면서 풀어보고, 틀린 문제는 반드시 복기하세요.',
  accuracy_up_time_down: '정확도 상승과 시간 단축 모두 좋은 흐름이에요. 이번 주 난이도를 조금 올려서 도전해보세요.',
  accuracy_up_time_up: '정확도는 올랐지만 풀이 시간이 늘었어요. 정확도 유지하면서 속도 연습을 추가해보세요.',
  accuracy_down_time_down: '시간은 줄었지만 정확도가 떨어졌어요. 서두르지 말고 정확한 이해를 먼저 다지세요.',
  stable: '큰 변화 없이 유지 중이에요. 이번 주는 약점 태그 1~2개만 집중해서 반복해보세요.',
}

/**
 * 4블록 형식 코치 멘트 (현재는 케이스별 고정 문구, LLM 연동 시 교체)
 * @param {Object} input
 * @param {string} input.userId
 * @param {number} input.weekNumber
 * @param {number} input.accuracyChange
 * @param {number} input.part7TimeChange
 * @param {number} input.predictedScore
 * @param {number} input.predictedScoreChange
 * @returns {Promise<string>}
 */
export async function generateAICoachComment(input) {
  const caseKey = detectCoachCase(input)
  const top3 = await getTop10WeakTags(input.userId).then((r) => r.slice(0, 3))
  const tagNames = top3.map((t) => t.tagName).join(', ') || '미분류'

  const block1 = `이번 주 예상 점수 ${input.predictedScore}점 (${input.predictedScoreChange >= 0 ? '+' : ''}${input.predictedScoreChange}), 정확도 변화 ${input.accuracyChange >= 0 ? '+' : ''}${input.accuracyChange}%, Part7 시간 변화 ${input.part7TimeChange >= 0 ? '+' : ''}${input.part7TimeChange}초.`
  const block2 = `집중할 약점: ${tagNames}.`
  const block3 = CASE_MESSAGES[caseKey]
  const block4 = caseKey === 'accuracy_down_time_up' ? '시간 압박보다 정확한 읽기를 우선하세요.' : '꾸준한 반복이 점수를 올립니다.'

  return [block1, block2, block3, block4].join('\n\n')
}

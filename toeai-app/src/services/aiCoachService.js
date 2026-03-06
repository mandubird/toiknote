/**
 * v4.24: AI 코치 케이스 분기 + 멘트 생성
 */
import { getTop10WeakTags } from './tagStatsService'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

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

const CASE_TONE = {
  accuracy_down_time_up: '정확도 하락 + 시간 증가. 경고 톤으로 원인 진단과 교정 방향을 짚어줘.',
  accuracy_up_time_down: '정확도 상승 + 시간 단축. 긍정 톤으로 다음 난이도 도전을 권유해.',
  accuracy_up_time_up: '정확도 상승했지만 시간이 늘었음. 균형 톤으로 속도 연습을 추천해.',
  accuracy_down_time_down: '시간은 줄었지만 정확도 하락. 서두름 경계 톤으로 정확도 우선을 강조해.',
  stable: '큰 변화 없음. 중립 톤으로 약점 태그 집중을 권유해.',
}

/**
 * 4블록 형식 코치 멘트 (OpenAI gpt-4o-mini)
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

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    return fallbackComment(input, caseKey, tagNames)
  }

  const prompt = `너는 토익 전문 AI 코치다. 학습자의 이번 주 데이터를 보고 4블록 피드백을 작성해라.

데이터:
- 주차: ${input.weekNumber}주차
- 예상 점수: ${input.predictedScore}점 (전주 대비 ${input.predictedScoreChange >= 0 ? '+' : ''}${input.predictedScoreChange}점)
- 정확도 변화: ${input.accuracyChange >= 0 ? '+' : ''}${input.accuracyChange}%
- Part7 풀이 시간 변화: ${input.part7TimeChange >= 0 ? '+' : ''}${input.part7TimeChange}초
- 현재 약점 태그 TOP3: ${tagNames}
- 상황 판단: ${CASE_TONE[caseKey]}

아래 형식으로만 출력해라 (다른 말 없이):
[현재 상태] 점수/정확도/시간 수치를 포함한 한 문장
[약점 포커스] 위 TOP3 태그를 구체적으로 언급하며 이번 주 집중할 방향 한 문장
[이번 주 전략] 구체적 행동 지침 1~2문장
[한 마디] 동기부여 또는 경고 한 문장`

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: '너는 토익 점수 향상 전문 코치다. 요청한 형식 그대로만 출력해라.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    })

    if (!response.ok) throw new Error(`API 오류 (${response.status})`)

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    if (content) return content.trim()
  } catch {
    // API 실패 시 fallback
  }

  return fallbackComment(input, caseKey, tagNames)
}

function fallbackComment(input, caseKey, tagNames) {
  const FALLBACK = {
    accuracy_down_time_up: '정확도가 하락하고 풀이 시간이 늘었어요. 서두르지 말고 정확한 이해를 먼저 다지세요.',
    accuracy_up_time_down: '정확도 상승과 시간 단축 모두 좋은 흐름이에요. 이번 주 난이도를 올려서 도전해보세요.',
    accuracy_up_time_up: '정확도는 올랐지만 풀이 시간이 늘었어요. 정확도를 유지하면서 속도 연습을 추가해보세요.',
    accuracy_down_time_down: '시간은 줄었지만 정확도가 떨어졌어요. 서두르지 말고 정확한 이해를 먼저 다지세요.',
    stable: '큰 변화 없이 유지 중이에요. 이번 주는 약점 태그 1~2개만 집중해서 반복해보세요.',
  }
  return [
    `[현재 상태] ${input.weekNumber}주차 예상 점수 ${input.predictedScore}점, 정확도 ${input.accuracyChange >= 0 ? '+' : ''}${input.accuracyChange}%.`,
    `[약점 포커스] 현재 취약 태그: ${tagNames}.`,
    `[이번 주 전략] ${FALLBACK[caseKey]}`,
    `[한 마디] 꾸준한 반복이 점수를 올립니다.`,
  ].join('\n\n')
}

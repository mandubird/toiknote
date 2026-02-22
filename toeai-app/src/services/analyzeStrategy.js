import { supabase } from '../lib/supabase'
import { fetchTagStats } from './fetchTagStats'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

/**
 * @param {string} userId
 */
export async function analyzeStrategy(userId) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API 키가 설정되지 않았어요.')

  const [tagStatsRes, userRes] = await Promise.all([
    supabase.from('tag_stats').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('users').select('*').eq('id', userId).maybeSingle(),
  ])

  const tagStats = tagStatsRes.data || {}
  const userData = userRes.data || {}

  const totalWrong = Number(tagStats.total_wrong) || 0
  if (totalWrong < 3) throw new Error('오답이 3개 이상 쌓이면 전략 분석을 할 수 있어요.')

  const partCounts = tagStats.part_counts || {}
  const weakParts = Object.entries(partCounts)
    .filter(([, v]) => Number(v) > 0)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .slice(0, 2)
    .map(([p]) => parseInt(p, 10))

  const tagCounts = tagStats.tag_counts || {}
  const weakTags = Object.entries(tagCounts)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .slice(0, 3)
    .map(([t]) => t)

  const currentScore = Number(userData.current_score) || 700
  const targetScore = Number(userData.target_score) || 900
  const lcWrong = Number(tagStats.lc_wrong) || 0
  const rcWrong = Number(tagStats.rc_wrong) || 0

  const prompt = `너는 토익 ${targetScore}점 이상 전문 코치다.
사용자 데이터:
- 현재 점수: ${currentScore}점
- 목표 점수: ${targetScore}점
- 취약 파트: Part ${weakParts.join(', Part ')}
- 취약 태그: ${weakTags.join(', ')}
- LC 오답: ${lcWrong}개, RC 오답: ${rcWrong}개, 총 오답: ${totalWrong}개

${currentScore}점에서 ${targetScore}점으로 올리는 구체적인 전략을 제시하라.
반드시 아래 JSON만 출력하라 (다른 말 없이):
{
  "priorityFocus": "우선 공략 영역 한 문장",
  "dailyPlan": "하루 학습 루틴 (2~3문장)",
  "weeklyGoal": "주간 목표 한 문장",
  "expectedImprovement": "예상 개선 (예: 4주 후 +80점)",
  "specificTips": ["팁1", "팁2", "팁3"]
}`

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a TOEIC score improvement coach. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API 오류 (${response.status})`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('전략 분석 결과를 받지 못했어요.')

  const strategy = JSON.parse(content)

  await supabase.from('score_analytics').upsert(
    {
      user_id: userId,
      priority_focus: strategy.priorityFocus,
      daily_plan: strategy.dailyPlan,
      weekly_goal: strategy.weeklyGoal,
      expected_improvement: strategy.expectedImprovement,
      specific_tips: strategy.specificTips || [],
      last_analyzed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  return strategy
}

import { supabase } from '../lib/supabase'
import { fetchSegmentStats } from './fetchSegmentStats'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

/** RC 권장 시간(분): Part 5 / 6 / 7, 합 75 */
const DEFAULT_RC_MINUTES = { part5: 15, part6: 8, part7: 52 }

/**
 * 오답 비율 기반 RC 시간 배분 및 전략 문장 생성
 */
function computeRcStrategy(partCounts, rcWrong) {
  const p5 = Number(partCounts['5']) || 0
  const p6 = Number(partCounts['6']) || 0
  const p7 = Number(partCounts['7']) || 0
  const rcTotal = p5 + p6 + p7 || 1
  const part7Ratio = p7 / rcTotal
  const part5Ratio = p5 / rcTotal

  if (part7Ratio > 0.5) {
    return {
      rcTimeAllocation: { part5: 13, part6: 7, part7: 55 },
      rcStrategyText: 'Part 7 오답 비율이 높아요. Part 5·6을 25분 내에 끝내고 Part 7에 시간을 더 쓰세요.',
    }
  }
  if (part5Ratio < 0.25 && rcTotal >= 5) {
    return {
      rcTimeAllocation: { part5: 12, part6: 8, part7: 55 },
      rcStrategyText: 'Part 5 강점을 활용해 시간을 줄이고, Part 7에 집중하세요.',
    }
  }
  return {
    rcTimeAllocation: { ...DEFAULT_RC_MINUTES },
    rcStrategyText: 'Part 5(15분)·Part 6(8분)·Part 7(52분)을 권장해요. Part 5·6에서 시간 확보 후 Part 7에 충분히 쓰세요.',
  }
}

/**
 * @param {string} userId
 */
export async function analyzeStrategy(userId) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API 키가 설정되지 않았어요.')

  const [tagStatsRes, userRes, segmentStats] = await Promise.all([
    supabase.from('tag_stats').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('users').select('*').eq('id', userId).maybeSingle(),
    fetchSegmentStats(userId),
  ])

  const tagStats = tagStatsRes.data || {}
  const userData = userRes.data || {}
  const partCounts = tagStats.part_counts || {}

  const totalWrong = Number(tagStats.total_wrong) || 0
  if (totalWrong < 3) throw new Error('오답이 3개 이상 쌓이면 전략 분석을 할 수 있어요.')

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

  const rcWrongRatio = totalWrong > 0 ? Math.round((rcWrong / totalWrong) * 100) : 0
  const { rcTimeAllocation, rcStrategyText } = computeRcStrategy(partCounts, rcWrong)

  const weakGrammarTop3 = (segmentStats.part5Grammar || []).slice(0, 3).map((g) => g.name)
  const avgPart7TimeSeconds = segmentStats.avgPart7TimeSeconds ?? null

  const part5GrammarText =
    segmentStats.part5Grammar?.length > 0
      ? segmentStats.part5Grammar
          .slice(0, 5)
          .map((g) => (g.sub ? `${g.name} (세부: ${Object.keys(g.sub).join(', ')})` : g.name))
          .join('; ')
      : ''
  const part7Text =
    [].concat(
      segmentStats.part7Passage?.slice(0, 3).map((p) => `지문:${p.name}`) || [],
      segmentStats.part7QuestionType?.slice(0, 3).map((p) => `질문:${p.name}`) || []
    ).join(', ') || '(없음)'
  const part2Text =
    segmentStats.part2Pattern?.length > 0
      ? segmentStats.part2Pattern
          .slice(0, 3)
          .map((p) => `${p.name}`)
          .join(', ')
      : '(없음)'
  const timeoutText =
    segmentStats.timeoutCount > 0
      ? `시간 부족으로 찍은 비율: ${segmentStats.totalCount ? Math.round((segmentStats.timeoutCount / segmentStats.totalCount) * 100) : 0}%`
      : ''

  const prompt = `너는 토익 ${targetScore}점 이상 전문 코치다.
사용자 데이터:
- 현재 점수: ${currentScore}점
- 목표 점수: ${targetScore}점
- 취약 파트: Part ${weakParts.join(', Part ')}
- 취약 태그: ${weakTags.join(', ')}
- LC 오답: ${lcWrong}개, RC 오답: ${rcWrong}개, 총 오답: ${totalWrong}개 (RC 오답 비율: ${rcWrongRatio}%)
- Part 5 취약 문법 상위: ${weakGrammarTop3.length ? weakGrammarTop3.join(', ') : '(데이터 없음)'}
- Part 5 문법 약점(유형): ${part5GrammarText || '(데이터 없음)'}
- Part 7 지문/질문 유형: ${part7Text}
${avgPart7TimeSeconds != null ? `- Part 7 평균 풀이 시간: ${avgPart7TimeSeconds}초` : ''}
- Part 2 질문 패턴: ${part2Text}
${timeoutText ? `- ${timeoutText}` : ''}

${currentScore}점에서 ${targetScore}점으로 올리는 구체적인 전략을 제시하라.
priorityFocus에는 Part 5 문법이 약하면 "Part 5 문법 - 특히 [세부 유형]" 형태로 세부 문법 약점을 명시하라.
반드시 아래 JSON만 출력하라 (다른 말 없이):
{
  "priorityFocus": "우선 공략 영역 한 문장 (문법 약점이 있으면 세부 유형 포함)",
  "grammarWeaknessSummary": "Part 5 세부 문법 약점 한 줄 요약. 예: 시제 - 특히 현재완료",
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
  strategy.rcTimeAllocation = rcTimeAllocation
  strategy.rcStrategyText = rcStrategyText
  strategy.grammarWeaknessSummary = strategy.grammarWeaknessSummary || ''
  strategy.weakGrammarTop3 = weakGrammarTop3
  strategy.avgPart7TimeSeconds = avgPart7TimeSeconds
  const now = new Date().toISOString()
  strategy.lastAnalyzedAt = now

  await supabase.from('score_analytics').upsert(
    {
      user_id: userId,
      priority_focus: strategy.priorityFocus,
      daily_plan: strategy.dailyPlan,
      weekly_goal: strategy.weeklyGoal,
      expected_improvement: strategy.expectedImprovement,
      specific_tips: strategy.specificTips || [],
      rc_time_allocation: rcTimeAllocation,
      rc_strategy_text: rcStrategyText,
      grammar_weakness_summary: strategy.grammarWeaknessSummary || null,
      weak_grammar_top3: weakGrammarTop3.length ? weakGrammarTop3 : null,
      avg_part7_time: avgPart7TimeSeconds,
      last_analyzed_at: now,
    },
    { onConflict: 'user_id' }
  )

  return strategy
}

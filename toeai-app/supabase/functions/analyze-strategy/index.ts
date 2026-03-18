/**
 * analyze-strategy — OpenAI 기반 전략 분석 (서버사이드)
 *
 * POST /functions/v1/analyze-strategy
 * Body: { userId: string }
 * Headers: Authorization: Bearer {supabase_user_access_token}
 *
 * 필요한 Supabase Secrets:
 *   OPENAI_API_KEY — OpenAI API 키
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — 자동 주입
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const DEFAULT_RC_MINUTES = { part5: 15, part6: 8, part7: 52 }

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

type RcMinutes = { part5: number; part6: number; part7: number }

function computeRcStrategy(partCounts: Record<string, number>, rcWrong: number): {
  rcTimeAllocation: RcMinutes
  rcStrategyText: string
} {
  const p5 = Number(partCounts['5']) || 0
  const p6 = Number(partCounts['6']) || 0
  const p7 = Number(partCounts['7']) || 0
  const rcTotal = p5 + p6 + p7 || 1
  const part7Ratio = p7 / rcTotal
  const part5Ratio = p5 / rcTotal

  if (part7Ratio > 0.5) {
    return {
      rcTimeAllocation: { part5: 13, part6: 7, part7: 55 },
      rcStrategyText:
        'Part 7 오답 비율이 높아요. Part 5·6을 25분 내에 끝내고 Part 7에 시간을 더 쓰세요.',
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
    rcStrategyText:
      'Part 5(15분)·Part 6(8분)·Part 7(52분)을 권장해요. Part 5·6에서 시간 확보 후 Part 7에 충분히 쓰세요.',
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY 환경변수가 없음')
      return jsonRes({ error: '서버 설정 오류 (OPENAI_API_KEY 미설정)' }, 500)
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase service role env가 없음')
      return jsonRes({ error: '서버 설정 오류 (Supabase env 미설정)' }, 500)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return jsonRes({ error: '인증 토큰이 없어요.' }, 401)
    }
    const accessToken = authHeader.replace('Bearer ', '')
    const {
      data: { user: callerUser },
      error: authErr,
    } = await supabase.auth.getUser(accessToken)
    if (authErr || !callerUser) {
      return jsonRes({ error: '인증에 실패했어요.' }, 401)
    }

    const { userId } = await req.json()
    if (!userId) {
      return jsonRes({ error: 'userId가 필요해요.' }, 400)
    }
    if (userId !== callerUser.id) {
      return jsonRes({ error: '본인 데이터만 분석할 수 있어요.' }, 403)
    }

    const [tagStatsRes, userRes, segmentRes] = await Promise.all([
      supabase.from('tag_stats').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('users').select('*').eq('id', userId).maybeSingle(),
      supabase.rpc('get_segment_stats', { p_user_id: userId }).maybeSingle(),
    ])

    const tagStats = tagStatsRes.data || {}
    const userData = userRes.data || {}
    const segmentStats: any = segmentRes.data || {}

    const partCounts: Record<string, number> = tagStats.part_counts || {}
    const totalWrong = Number(tagStats.total_wrong) || 0
    if (totalWrong < 3) {
      return jsonRes({ error: '오답이 3개 이상 쌓이면 전략 분석을 할 수 있어요.' }, 400)
    }

    const weakParts = Object.entries(partCounts)
      .filter(([, v]) => Number(v) > 0)
      .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
      .slice(0, 2)
      .map(([p]) => parseInt(p, 10))

    const tagCounts: Record<string, number> = tagStats.tag_counts || {}
    const weakTags = Object.entries(tagCounts)
      .sort((a, b) => (Number(b[1]) || 0) - (Number(a[1]) || 0))
      .slice(0, 3)
      .map(([t]) => t)

    const currentScore = Number(userData.current_score) || 700
    const targetScore = Number(userData.target_score) || 900
    const lcWrong = Number(tagStats.lc_wrong) || 0
    const rcWrong = Number(tagStats.rc_wrong) || 0

    const rcWrongRatio = totalWrong > 0 ? Math.round((rcWrong / totalWrong) * 100) : 0
    const { rcTimeAllocation, rcStrategyText } = computeRcStrategy(partCounts, rcWrong)

    const weakGrammarTop3 = (segmentStats.part5Grammar || [])
      .slice(0, 3)
      .map((g: any) => g.name)
    const avgPart7TimeSeconds = segmentStats.avgPart7TimeSeconds ?? null

    const part5GrammarText =
      segmentStats.part5Grammar?.length > 0
        ? segmentStats.part5Grammar
            .slice(0, 5)
            .map((g: any) =>
              g.sub ? `${g.name} (세부: ${Object.keys(g.sub).join(', ')})` : g.name,
            )
            .join('; ')
        : ''
    const part7Text =
      []
        .concat(
          (segmentStats.part7Passage || [])
            .slice(0, 3)
            .map((p: any) => `지문:${p.name}`),
          (segmentStats.part7QuestionType || [])
            .slice(0, 3)
            .map((p: any) => `질문:${p.name}`),
        )
        .join(', ') || '(없음)'
    const part2Text =
      segmentStats.part2Pattern?.length > 0
        ? segmentStats.part2Pattern
            .slice(0, 3)
            .map((p: any) => `${p.name}`)
            .join(', ')
        : '(없음)'
    const timeoutText =
      segmentStats.timeoutCount > 0
        ? `시간 부족으로 찍은 비율: ${
            segmentStats.totalCount
              ? Math.round((segmentStats.timeoutCount / segmentStats.totalCount) * 100)
              : 0
          }%`
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
expectedImprovement는 현재 ${currentScore}점과 목표 ${targetScore}점(차이 ${
      targetScore - currentScore
    }점)을 바탕으로 현실적인 개선 폭을 계산하라. 예시 값(+80점 등)을 그대로 쓰지 말고 실제 데이터 기반으로 산출하라.
반드시 아래 JSON만 출력하라 (다른 말 없이):
{
  "priorityFocus": "우선 공략 영역 한 문장 (문법 약점이 있으면 세부 유형 포함)",
  "grammarWeaknessSummary": "Part 5 세부 문법 약점 한 줄 요약. 예: 시제 - 특히 현재완료",
  "dailyPlan": "하루 학습 루틴 (2~3문장)",
  "weeklyGoal": "주간 목표 한 문장",
  "expectedImprovement": "N주 후 +N점 → ${currentScore}+N점 형태로 현재 점수 기반으로 작성. 예시 값을 복사하지 말 것",
  "specificTips": ["팁1", "팁2", "팁3"]
}`

    const openaiRes = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a TOEIC score improvement coach. Respond only with valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1024,
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.json().catch(() => ({}))
      console.error('OpenAI API 오류:', openaiRes.status, err)
      return jsonRes(
        { error: (err as any)?.error?.message || `OpenAI API 오류 (${openaiRes.status})` },
        502,
      )
    }

    const data = await openaiRes.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) {
      return jsonRes({ error: '전략 분석 결과를 받지 못했어요.' }, 502)
    }

    const strategy = JSON.parse(content)
    strategy.rcTimeAllocation = rcTimeAllocation
    strategy.rcStrategyText = rcStrategyText
    strategy.grammarWeaknessSummary = strategy.grammarWeaknessSummary || ''
    strategy.weakGrammarTop3 = weakGrammarTop3
    strategy.avgPart7TimeSeconds = avgPart7TimeSeconds
    const now = new Date().toISOString()
    strategy.lastAnalyzedAt = now

    const { error: upsertErr } = await supabase
      .from('score_analytics')
      .upsert(
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
        { onConflict: 'user_id' },
      )
    if (upsertErr) {
      console.error('score_analytics upsert 오류:', upsertErr)
    }

    return jsonRes({ strategy })
  } catch (err) {
    console.error('analyze-strategy 예외:', err)
    return jsonRes({ error: '서버 오류가 발생했어요.' }, 500)
  }
})


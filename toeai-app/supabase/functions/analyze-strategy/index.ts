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
      supabase.rpc('get_segment_stats', { p_user_id: userId }),
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

    // get_segment_stats에서 세그먼트 데이터 추출
    const weakTypes: Array<{ type: string; count: number }> = segmentStats.weak_types || []
    const timeShortageCount = Number(segmentStats.time_shortage_count) || 0
    const rereadHeavyCount = Number(segmentStats.reread_heavy_count) || 0
    const totalCount = Number(segmentStats.total_count) || totalWrong

    // tip_rules 매칭: 취약 유형 + 패턴 기반 팁 선택
    const matchedTipTexts: string[] = []

    // 1) 취약 유형 기반 팁 (상위 2개 유형)
    for (const wt of weakTypes.slice(0, 2)) {
      const part = weakParts[0] || null
      const { data: typeTips } = await supabase
        .from('tip_rules')
        .select('tip_text')
        .eq('type', wt.type)
        .or(part ? `part.eq.${part},part.is.null` : 'part.is.null')
        .order('priority', { ascending: false })
        .limit(2)
      if (typeTips) matchedTipTexts.push(...typeTips.map((t: any) => t.tip_text))
    }

    // 2) 파트 기반 팁 (유형 매칭 없을 때)
    if (matchedTipTexts.length === 0 && weakParts.length > 0) {
      const { data: partTips } = await supabase
        .from('tip_rules')
        .select('tip_text')
        .eq('part', weakParts[0])
        .is('type', null)
        .is('pattern', null)
        .order('priority', { ascending: false })
        .limit(2)
      if (partTips) matchedTipTexts.push(...partTips.map((t: any) => t.tip_text))
    }

    // 3) 패턴 팁 (시간부족/재독)
    if (timeShortageCount >= 2) {
      const { data: timeTips } = await supabase
        .from('tip_rules')
        .select('tip_text')
        .eq('pattern', 'time_shortage')
        .order('priority', { ascending: false })
        .limit(1)
      if (timeTips) matchedTipTexts.push(...timeTips.map((t: any) => t.tip_text))
    }
    if (rereadHeavyCount >= 2) {
      const { data: rereadTips } = await supabase
        .from('tip_rules')
        .select('tip_text')
        .eq('pattern', 'reread_heavy')
        .order('priority', { ascending: false })
        .limit(1)
      if (rereadTips) matchedTipTexts.push(...rereadTips.map((t: any) => t.tip_text))
    }

    // 중복 제거 후 최대 4개
    const uniqueTips = [...new Set(matchedTipTexts)].slice(0, 4)

    // 미구현 필드 기본값
    const weakGrammarTop3: string[] = weakTags.slice(0, 3)
    const avgPart7TimeSeconds: number | null = null
    const weakTypesText = weakTypes.slice(0, 3).map(wt => wt.type).join(', ') || weakTags.join(', ')

    const timeoutText = timeShortageCount > 0
      ? `시간 부족 오답: ${timeShortageCount}개 (${Math.round(timeShortageCount / totalCount * 100)}%)`
      : ''

    const prompt = `너는 토익 ${targetScore}점 이상 전문 코치다.
사용자 데이터:
- 현재 점수: ${currentScore}점
- 목표 점수: ${targetScore}점
- 취약 파트: Part ${weakParts.join(', Part ')}
- 취약 유형/태그: ${weakTypesText}
- LC 오답: ${lcWrong}개, RC 오답: ${rcWrong}개, 총 오답: ${totalWrong}개 (RC 오답 비율: ${rcWrongRatio}%)
${timeoutText ? `- ${timeoutText}` : ''}
${rereadHeavyCount >= 2 ? `- 지문 재독 많음: ${rereadHeavyCount}회` : ''}

아래 팁 후보들은 사용자 약점 데이터 기반으로 DB에서 선택된 실전 팁이다:
${uniqueTips.length > 0 ? uniqueTips.map((t, i) => `${i + 1}. ${t}`).join('\n') : '(일반 전략 사용)'}

위 데이터와 팁 후보를 활용해 ${currentScore}점에서 ${targetScore}점으로 올리는 전략을 제시하라.
specificTips는 반드시 위 팁 후보 문장을 그대로 쓰거나 더 자연스럽게 다듬어서 사용하라. 일반적인 조언은 쓰지 마라.
expectedImprovement는 현재 ${currentScore}점 기준으로 현실적인 수치를 산출하라.
반드시 아래 JSON만 출력하라 (다른 말 없이):
{
  "priorityFocus": "우선 공략 영역 한 문장",
  "grammarWeaknessSummary": "약점 한 줄 요약",
  "dailyPlan": "하루 학습 루틴 (2~3문장)",
  "weeklyGoal": "주간 목표 한 문장",
  "expectedImprovement": "N주 후 +N점 → ${currentScore}+N점 형태",
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


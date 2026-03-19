/**
 * strategy-priority-cards — 전략 페이지용 "지금 우선 교정할 약점" 카드 생성
 *
 * POST /functions/v1/strategy-priority-cards
 * Body: { userId: string }
 *
 * 필요한 Supabase Secrets:
 *   OPENAI_API_KEY — OpenAI API 키
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

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

interface PriorityCard {
  tag: string
  count: number
  reason: string
  action: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { userId } = await req.json()
    if (!userId) {
      return jsonRes({ error: 'userId가 없어요.' }, 400)
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_URL 또는 SERVICE_ROLE_KEY 없음')
      return jsonRes({ error: '서버 설정 오류 (Supabase 환경변수 미설정)' }, 500)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. 현재 오답 수 조회
    const { count: currentWrongCount, error: wrongCountErr } = await supabase
      .from('wrong_answers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (wrongCountErr) {
      console.error('wrong_answers count 오류:', wrongCountErr)
    }

    const wrongCount = currentWrongCount || 0

    // 오답이 없으면 빈 배열
    if (!wrongCount) {
      return jsonRes({ priority_cards: [] })
    }

    const today = new Date().toISOString().split('T')[0]

    // 2. 오늘 캐시 조회
    const { data: cache, error: cacheErr } = await supabase
      .from('strategy_cache')
      .select('*')
      .eq('user_id', userId)
      .eq('cache_date', today)
      .maybeSingle()

    if (cacheErr) {
      console.error('strategy_cache 조회 오류:', cacheErr)
    }

    if (cache && cache.cards_json && cache.wrong_count === wrongCount) {
      return jsonRes({ priority_cards: cache.cards_json })
    }

    // 3. 최근 오답 상세 조회 (태그/메모용)
    // 스키마에는 memo 없음 — 사용자 메모/해설은 explanation 컬럼 사용
    const { data: wrongAnswers, error: wrongErr } = await supabase
      .from('wrong_answers')
      .select('tags, part, created_at, explanation')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (wrongErr) {
      console.error('wrong_answers 조회 오류:', wrongErr)
      return jsonRes({ error: '오답 데이터를 불러오지 못했어요.' }, 500)
    }

    if (!wrongAnswers || wrongAnswers.length === 0) {
      return jsonRes({ priority_cards: [] })
    }

    // 4. 태그별 집계 + 상위 3개
    const tagSummary: Record<string, number> = {}
    for (const row of wrongAnswers) {
      const tags: string[] = Array.isArray(row.tags) ? row.tags : []
      for (const t of tags) {
        const key = String(t || '').trim()
        if (!key) continue
        tagSummary[key] = (tagSummary[key] || 0) + 1
      }
    }

    const topTags = Object.entries(tagSummary)
      .sort((a, b) => (b[1] || 0) - (a[1] || 0))
      .slice(0, 3)
      .map(([tag, count]) => ({ tag, count }))

    if (!topTags.length) {
      return jsonRes({ priority_cards: [] })
    }

    // 5. OpenAI 호출 (혹은 폴백)
    let cards: PriorityCard[] = []

    if (!OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY 미설정 — 폴백 템플릿 사용')
      cards = topTags.map((t) => getFallbackCard(t.tag, t.count))
    } else {
      const prompt = buildPrompt(
        topTags,
        wrongAnswers.slice(0, 10).map((w: any) => ({
          tags: Array.isArray(w.tags) ? w.tags : [],
          memo: w.explanation ?? null,
        })),
      )

      const openaiRes = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      })

      if (!openaiRes.ok) {
        const err = await openaiRes.json().catch(() => ({}))
        console.error('OpenAI API 오류:', openaiRes.status, err)
        cards = topTags.map((t) => getFallbackCard(t.tag, t.count))
      } else {
        const data = await openaiRes.json()
        const content = data?.choices?.[0]?.message?.content
        if (!content) {
          cards = topTags.map((t) => getFallbackCard(t.tag, t.count))
        } else {
          try {
            const parsed = JSON.parse(content) as { priority_cards?: PriorityCard[] }
            if (Array.isArray(parsed.priority_cards) && parsed.priority_cards.length) {
              cards = parsed.priority_cards.map((c) => ({
                tag: c.tag,
                count: c.count,
                reason: c.reason,
                action: c.action,
              }))
            } else {
              cards = topTags.map((t) => getFallbackCard(t.tag, t.count))
            }
          } catch (e) {
            console.error('priority_cards JSON 파싱 오류:', e)
            cards = topTags.map((t) => getFallbackCard(t.tag, t.count))
          }
        }
      }
    }

    // 6. 캐시 upsert (실패해도 무시)
    await supabase
      .from('strategy_cache')
      .upsert({
        user_id: userId,
        cache_date: today,
        cards_json: cards,
        wrong_count: wrongCount,
      })
      .catch((e) => console.error('strategy_cache upsert 오류:', e))

    return jsonRes({ priority_cards: cards })
  } catch (err) {
    console.error('strategy-priority-cards 예외:', err)
    return jsonRes({ error: '서버 오류가 발생했어요.' }, 500)
  }
})

function getFallbackCard(tag: string, count: number): PriorityCard {
  const fallbacks: Record<string, Omit<PriorityCard, 'tag' | 'count'>> = {
    문장구조: {
      reason: '최근 오답에서 가장 많이 반복된 약점입니다.',
      action: '오늘은 핵심 문장 구조 파악 연습 10문제가 우선입니다.',
    },
    이해: {
      reason: '정답 근거 연결이 약해 반복 실수가 나오고 있습니다.',
      action: '문제 풀이 후 정답 근거를 한 줄로 직접 적어보세요.',
    },
    details: {
      reason: '세부정보 함정 표현에서 반복적으로 흔들리고 있습니다.',
      action: '오늘은 세부정보 문제만 골라 오답 근거까지 체크하세요.',
    },
  }

  const base = fallbacks[tag] ?? {
    reason: '최근 오답에서 반복 패턴이 확인된 약점입니다.',
    action: '오늘 이 영역 문제를 집중해서 보정하세요.',
  }

  return { tag, count, ...base }
}

function buildPrompt(
  topTags: { tag: string; count: number }[],
  recentAnswers: { tags: string[]; memo: string | null }[],
): string {
  const topSummary = topTags.map((t) => `- ${t.tag}: 최근 ${t.count}개 오답`).join('\n')
  const memoSummary = recentAnswers
    .map((w) => `- [${w.tags?.[0] ?? '태그 없음'}] ${w.memo || '메모 없음'}`)
    .join('\n')

  return `
당신은 토익 AI 코치입니다.
아래는 유저의 최근 오답 데이터입니다. 이 데이터를 분석해서 각 약점 태그별 코칭 카드를 생성하세요.

[유저 오답 요약]
${topSummary}

[오답 메모 샘플]
${memoSummary}

[응답 형식 - JSON만 반환]
{
  "priority_cards": [
    {
      "tag": "태그명",
      "count": 오답수,
      "reason": "왜 우선인지 or 어떤 실수 패턴인지 (1문장, 40자 이내)",
      "action": "오늘 구체적으로 뭘 하면 되는지 (1문장, 40자 이내)"
    }
  ]
}

[규칙]
- 모든 카드에 같은 문장 절대 금지. 태그별로 완전히 다른 내용 작성.
- reason: "원인형"(반복 패턴 설명) or "증상형"(어떻게 틀리는지) 중 택1
- action: 항상 "행동형" — 오늘 당장 할 수 있는 구체적 액션
- reason과 action이 서로 보완 관계가 되도록 작성
- JSON 외 다른 텍스트 없이 JSON만 반환
`.trim()
}


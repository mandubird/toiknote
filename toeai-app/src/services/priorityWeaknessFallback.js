/**
 * Edge Function(strategy-priority-cards) 실패 시 클라이언트에서 동일 형태 카드 생성
 * (wrong_answers.tags 집계 — DB 스키마와 동기화)
 */
import { supabase } from '../lib/supabase'

function fallbackCard(tag, count) {
  const fallbacks = {
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

/**
 * @param {string} userId
 * @returns {Promise<Array<{ tag: string, count: number, reason: string, action: string }>>}
 */
export async function buildLocalPriorityCards(userId) {
  if (!userId) return []

  const { data: rows, error } = await supabase
    .from('wrong_answers')
    .select('tags')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !rows?.length) return []

  const tagSummary = {}
  for (const row of rows) {
    const tags = Array.isArray(row.tags) ? row.tags : []
    for (const t of tags) {
      const key = String(t || '').trim()
      if (!key) continue
      tagSummary[key] = (tagSummary[key] || 0) + 1
    }
  }

  const topTags = Object.entries(tagSummary)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0))
    .slice(0, 3)
    .map(([tag, count]) => fallbackCard(tag, count))

  return topTags
}

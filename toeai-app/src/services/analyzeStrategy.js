import { supabase } from '../lib/supabase'

/**
 * Edge Function analyze-strategy를 호출해 서버에서 OpenAI 기반 전략 분석을 수행한다.
 * @param {string} userId
 */
export async function analyzeStrategy(userId) {
  const { data, error } = await supabase.functions.invoke('analyze-strategy', {
    body: { userId },
  })

  // 비-2xx여도 본문에 { error: "..." } 가 올 수 있음
  if (data?.error) {
    throw new Error(typeof data.error === 'string' ? data.error : '전략 분석에 실패했어요.')
  }
  if (error) {
    const hint =
      (data && typeof data === 'object' && data.error && String(data.error)) ||
      error.message ||
      '전략 분석 호출에 실패했어요.'
    throw new Error(hint)
  }
  if (!data) {
    throw new Error('전략 분석 결과를 받지 못했어요.')
  }

  return data.strategy
}

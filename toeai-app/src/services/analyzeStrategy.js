import { supabase } from '../lib/supabase'

/**
 * Edge Function analyze-strategy를 호출해 서버에서 OpenAI 기반 전략 분석을 수행한다.
 * @param {string} userId
 */
export async function analyzeStrategy(userId) {
  // 세션 토큰 명시적으로 포함
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token

  const { data, error } = await supabase.functions.invoke('analyze-strategy', {
    body: { userId },
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  })

  // 비-2xx: FunctionsHttpError의 경우 응답 본문에서 실제 메시지 추출
  if (error) {
    let hint = '전략 분석 호출에 실패했어요.'
    try {
      // Supabase JS v2: error.context 는 Response 객체
      if (error.context && typeof error.context.json === 'function') {
        const body = await error.context.json()
        if (body?.error) hint = String(body.error)
      } else if (data?.error) {
        hint = String(data.error)
      } else if (error.message && error.message !== 'Edge Function returned a non-2xx status code') {
        hint = error.message
      }
    } catch {
      // JSON 파싱 실패 시 fallback
    }
    throw new Error(hint)
  }

  if (data?.error) {
    throw new Error(typeof data.error === 'string' ? data.error : '전략 분석에 실패했어요.')
  }
  if (!data) {
    throw new Error('전략 분석 결과를 받지 못했어요.')
  }

  return data.strategy
}

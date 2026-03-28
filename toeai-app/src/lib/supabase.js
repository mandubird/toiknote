import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or anon key missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

/**
 * Storage·DB 등 API 호출 직전에 호출 — 만료된 access JWT로 나는 Invalid JWT 완화
 */
export async function refreshSupabaseSessionIfPossible() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.refresh_token) return
  await supabase.auth.refreshSession()
}

/** alert용 — Supabase가 던지는 영문 JWT 오류를 한글로 */
export function userFacingSupabaseAuthError(err) {
  const msg = err?.message || err?.error_description || (typeof err === 'string' ? err : '') || ''
  if (/invalid\s*jwt/i.test(String(msg))) {
    return '로그인 세션이 만료됐거나 서버와 맞지 않아요. 새로고침 후 다시 로그인해 주세요.'
  }
  return String(msg).trim() || '요청에 실패했어요. 다시 시도해 주세요.'
}

export default supabase

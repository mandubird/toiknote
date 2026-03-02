/**
 * v4.22: 만료 임박 경고 플래그 설정 (Cron/Edge Function에서 호출용)
 * 매일 오전 9시 등에서 실행 시 D-7/D-3/D-1 대상자 expiry_warning_sent_at 갱신.
 * ⚠️ Supabase Service Role 키로 호출하거나 Edge Function에서 사용하세요.
 */
import { createClient } from '@supabase/supabase-js'

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient - service role client
 */
export async function checkExpiryWarning(supabaseClient) {
  const supabase = supabaseClient
  if (!supabase) throw new Error('Supabase client (service role) required')

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const targets = [7, 3, 1]

  for (const daysLeft of targets) {
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() + daysLeft)
    const dateStr = targetDate.toISOString().split('T')[0]

    const { data: users, error } = await supabase
      .from('users')
      .select('id, program_end_date, expiry_warning_sent_at')
      .eq('program_status', 'active')
      .gte('program_end_date', dateStr + 'T00:00:00Z')
      .lt('program_end_date', dateStr + 'T23:59:59.999Z')

    if (error || !users?.length) continue

    for (const user of users) {
      const lastSent = user.expiry_warning_sent_at ? new Date(user.expiry_warning_sent_at) : null
      const isSameDay = lastSent && lastSent.toISOString().split('T')[0] === todayStr
      if (isSameDay) continue

      await supabase
        .from('users')
        .update({ expiry_warning_sent_at: now.toISOString() })
        .eq('id', user.id)
    }
  }
  return { ok: true }
}

import { supabase } from '../lib/supabase'

const FREE_LIMIT = 5

export function getFreeLimit() {
  return FREE_LIMIT
}

/** @typedef {'free'|'pro'|'elite'} Plan */

/**
 * @param {string} userId
 * @returns {Promise<{ paid: boolean, plan: Plan }>}
 */
export async function getSubscription(userId) {
  if (!userId) return { paid: false, plan: 'free' }
  const { data, error } = await supabase
    .from('subscriptions')
    .select('paid, plan')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.error('getSubscription', error)
    return { paid: false, plan: 'free' }
  }
  const plan = data?.plan === 'pro' || data?.plan === 'elite' ? data.plan : 'free'
  return { paid: !!data?.paid, plan }
}

/**
 * 결제 확정 후 구독 플랜 반영 (Edge Function 또는 관리자에서 호출 권장)
 * @param {string} userId
 * @param {Plan} plan 'pro' | 'elite'
 */
export async function setSubscriptionPlan(userId, plan) {
  if (!userId || (plan !== 'pro' && plan !== 'elite')) return
  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      paid: true,
      plan,
      paid_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

/**
 * @param {string} userId
 * @deprecated setSubscriptionPlan 사용 권장
 */
export async function setSubscriptionPaid(userId) {
  await setSubscriptionPlan(userId, 'pro')
}

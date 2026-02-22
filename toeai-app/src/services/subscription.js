import { supabase } from '../lib/supabase'

const FREE_LIMIT = 5

export function getFreeLimit() {
  return FREE_LIMIT
}

/**
 * @param {string} userId
 * @returns {Promise<{ paid: boolean }>}
 */
export async function getSubscription(userId) {
  if (!userId) return { paid: false }
  const { data, error } = await supabase
    .from('subscriptions')
    .select('paid')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.error('getSubscription', error)
    return { paid: false }
  }
  return { paid: !!data?.paid }
}

/**
 * @param {string} userId
 */
export async function setSubscriptionPaid(userId) {
  if (!userId) return
  await supabase.from('subscriptions').upsert(
    { user_id: userId, paid: true, paid_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  )
}

import { supabase } from '../lib/supabase'

/**
 * @param {string} userId
 * @returns {Promise<{ currentScore: number, targetScore: number, usageCount: number }>}
 */
export async function getUserProfile(userId) {
  if (!userId) return { currentScore: 0, targetScore: 900, usageCount: 0 }
  const { data, error } = await supabase
    .from('users')
    .select('current_score, target_score, usage_count')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.error('getUserProfile', error)
    return { currentScore: 0, targetScore: 900, usageCount: 0 }
  }
  const current = Number(data?.current_score)
  const target = Number(data?.target_score)
  return {
    currentScore: current >= 200 && current <= 990 ? current : 0,
    targetScore: target >= 200 && target <= 990 ? target : 900,
    usageCount: Number(data?.usage_count) || 0,
  }
}

/**
 * @param {string} userId
 * @param {{ currentScore: number, targetScore: number }} data
 */
export async function updateUserProfile(userId, data) {
  const curVal = Number(data.currentScore)
  const current = curVal >= 200 && curVal <= 990 ? curVal : null
  const target = Math.min(990, Math.max(200, Number(data.targetScore) ?? 900))
  const { error } = await supabase.from('users').upsert(
    { id: userId, current_score: current, target_score: target, last_updated: new Date().toISOString() },
    { onConflict: 'id' }
  )
  if (error) throw error
}

import { supabase } from '../lib/supabase'

/**
 * @param {string} userId
 * @returns {Promise<{ currentScore: number, targetScore: number, lcScore: number|null, rcScore: number|null, usageCount: number }>}
 */
export async function getUserProfile(userId) {
  if (!userId) return { currentScore: 0, targetScore: 900, lcScore: null, rcScore: null, usageCount: 0 }
  const { data, error } = await supabase
    .from('users')
    .select('current_score, target_score, lc_score, rc_score, usage_count')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.error('getUserProfile', error)
    return { currentScore: 0, targetScore: 900, lcScore: null, rcScore: null, usageCount: 0 }
  }
  const current = Number(data?.current_score)
  const target  = Number(data?.target_score)
  const lc      = data?.lc_score != null ? Number(data.lc_score) : null
  const rc      = data?.rc_score != null ? Number(data.rc_score) : null
  return {
    currentScore: current >= 200 && current <= 990 ? current : 0,
    targetScore:  target  >= 200 && target  <= 990 ? target  : 900,
    lcScore:      lc != null && lc >= 5 && lc <= 495 ? lc : null,
    rcScore:      rc != null && rc >= 5 && rc <= 495 ? rc : null,
    usageCount:   Number(data?.usage_count) || 0,
  }
}

/**
 * @param {string} userId
 * @param {{ currentScore?: number, targetScore?: number, lcScore?: number|null, rcScore?: number|null }} data
 */
export async function updateUserProfile(userId, data) {
  const curVal = Number(data.currentScore)
  const current = curVal >= 200 && curVal <= 990 ? curVal : null
  const target  = Math.min(990, Math.max(200, Number(data.targetScore) ?? 900))

  const lcVal = data.lcScore != null ? Number(data.lcScore) : null
  const rcVal = data.rcScore != null ? Number(data.rcScore) : null
  const lc = lcVal != null && lcVal >= 5 && lcVal <= 495 ? lcVal : null
  const rc = rcVal != null && rcVal >= 5 && rcVal <= 495 ? rcVal : null

  const { error } = await supabase.from('users').upsert(
    {
      id:            userId,
      current_score: current,
      target_score:  target,
      lc_score:      lc,
      rc_score:      rc,
      last_updated:  new Date().toISOString(),
    },
    { onConflict: 'id' }
  )
  if (error) throw error
}

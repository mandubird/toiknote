/**
 * v4.20: 바이럴 확산 - 추천코드, 공유 보상, 추천 보상
 */
import { supabase } from '../lib/supabase'

const BONUS_RULES = {
  maxBonusDays: 60,
  shareReward: 3,
  shareMaxCount: 3,
  shareDailyLimit: 1,
  referralReward: 7,
  referralBonusAt3: 21,
  referralBonusAt5: 35,
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return `TOKAI-${s}`
}

/**
 * 내 추천 코드 조회 (없으면 생성 후 저장)
 */
export async function getOrCreateReferralCode(userId) {
  if (!userId) return null
  const { data } = await supabase.from('users').select('referral_code').eq('id', userId).maybeSingle()
  if (data?.referral_code) return data.referral_code
  let code = generateCode()
  for (let retry = 0; retry < 5; retry++) {
    const { error } = await supabase.from('users').update({ referral_code: code }).eq('id', userId)
    if (!error) return code
    code = generateCode()
  }
  return null
}

/**
 * 공유 보상 지급 (+3일, 하루 1회·최대 3회)
 */
export async function rewardShareBonus(userId, platform = 'link') {
  if (!userId) throw new Error('로그인이 필요해요.')

  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, program_end_date, bonus_days, share_reward_count')
    .eq('id', userId)
    .single()
  if (userErr || !user) throw new Error('사용자 정보를 불러올 수 없어요.')

  if (user.bonus_days >= BONUS_RULES.maxBonusDays) {
    throw new Error('최대 보너스 한도(60일)에 도달했어요.')
  }
  if (user.share_reward_count >= BONUS_RULES.shareMaxCount) {
    throw new Error('공유 보상은 최대 3회까지 받을 수 있어요.')
  }

  const today = new Date().toISOString().slice(0, 10)
  const { data: todayShare } = await supabase
    .from('share_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('share_type', 'diagnosis_share')
    .gte('created_at', today)
    .limit(1)
    .maybeSingle()
  if (todayShare) throw new Error('오늘은 이미 공유 보상을 받았어요. 내일 다시 시도해 주세요.')

  const rewardDays = BONUS_RULES.shareReward
  const newBonusDays = (user.bonus_days || 0) + rewardDays
  const updates = {
    bonus_days: newBonusDays,
    share_reward_count: (user.share_reward_count || 0) + 1,
    last_shared_at: new Date().toISOString(),
  }
  if (user.program_end_date) {
    const newEndDate = new Date(user.program_end_date)
    newEndDate.setDate(newEndDate.getDate() + rewardDays)
    updates.program_end_date = newEndDate.toISOString()
  }

  await supabase.from('share_logs').insert({
    user_id: userId,
    share_type: 'diagnosis_share',
    platform,
    reward_days: rewardDays,
    rewarded: true,
  })

  await supabase.from('users').update(updates).eq('id', userId)

  const newEndDate = user.program_end_date
    ? (() => {
        const d = new Date(user.program_end_date)
        d.setDate(d.getDate() + rewardDays)
        return d
      })()
    : null

  return {
    success: true,
    rewardDays,
    newEndDate,
    remainingShares: BONUS_RULES.shareMaxCount - (user.share_reward_count || 0) - 1,
  }
}

/**
 * 추천 가입 기록 (가입/첫 방문 시 ref 파라미터로 호출)
 */
export async function recordReferral(referralCode, newUserId) {
  if (!referralCode || !newUserId) return
  const code = String(referralCode).trim().toUpperCase()
  if (!code.startsWith('TOKAI-')) return

  const { data: referrer } = await supabase
    .from('users')
    .select('id')
    .eq('referral_code', code)
    .maybeSingle()
  if (!referrer || referrer.id === newUserId) return

  await supabase.from('users').update({ referred_by: code }).eq('id', newUserId)
  await supabase.from('referral_logs').insert({
    referrer_user_id: referrer.id,
    referred_user_id: newUserId,
    status: 'pending',
  }).then(({ error }) => { if (error && error.code !== '23505') console.error('recordReferral', error) })
}

/**
 * 결제 완료 시 추천인에게 보상 지급
 */
export async function completeReferralReward(newUserId) {
  const { data: log } = await supabase
    .from('referral_logs')
    .select('id, referrer_user_id')
    .eq('referred_user_id', newUserId)
    .eq('status', 'pending')
    .maybeSingle()
  if (!log) return

  const { data: referrer } = await supabase
    .from('users')
    .select('id, program_end_date, bonus_days, referral_count')
    .eq('id', log.referrer_user_id)
    .single()
  if (!referrer) return
  if ((referrer.bonus_days || 0) >= BONUS_RULES.maxBonusDays) return

  let rewardDays = BONUS_RULES.referralReward
  const newCount = (referrer.referral_count || 0) + 1
  if (newCount === 3) rewardDays += BONUS_RULES.referralBonusAt3
  else if (newCount === 5) rewardDays += BONUS_RULES.referralBonusAt5

  const maxAllowed = BONUS_RULES.maxBonusDays - (referrer.bonus_days || 0)
  rewardDays = Math.min(rewardDays, maxAllowed)
  if (rewardDays <= 0) return

  const baseEnd = referrer.program_end_date ? new Date(referrer.program_end_date) : new Date()
  const newEndDate = new Date(baseEnd)
  newEndDate.setDate(newEndDate.getDate() + rewardDays)

  await supabase
    .from('users')
    .update({
      program_end_date: newEndDate.toISOString(),
      bonus_days: (referrer.bonus_days || 0) + rewardDays,
      referral_count: newCount,
    })
    .eq('id', referrer.id)

  await supabase
    .from('referral_logs')
    .update({
      status: 'completed',
      reward_days: rewardDays,
      rewarded_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq('id', log.id)
}

/**
 * 내 추천/공유 통계
 */
export async function getReferralStats(userId) {
  if (!userId) return { referralCode: null, shareRewardCount: 0, referralCount: 0, bonusDays: 0, badgeLevel: 'none' }
  const { data: user } = await supabase
    .from('users')
    .select('referral_code, share_reward_count, referral_count, bonus_days, badge_level')
    .eq('id', userId)
    .maybeSingle()
  return {
    referralCode: user?.referral_code ?? null,
    shareRewardCount: user?.share_reward_count ?? 0,
    referralCount: user?.referral_count ?? 0,
    bonusDays: user?.bonus_days ?? 0,
    badgeLevel: user?.badge_level ?? 'none',
    remainingShares: Math.max(0, BONUS_RULES.shareMaxCount - (user?.share_reward_count ?? 0)),
  }
}

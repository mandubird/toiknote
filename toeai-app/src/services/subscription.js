import { supabase } from '../lib/supabase'

const FREE_LIMIT = 5
const FREE_TRIAL_DAYS = 7

export function getFreeLimit() {
  return FREE_LIMIT
}

export function getFreeTrialDays() {
  return FREE_TRIAL_DAYS
}

/**
 * 무료 체험 상태 조회
 * 첫 오답 등록 시점부터 7일, 최대 5문제
 * @param {string} userId
 * @returns {Promise<{ inTrial: boolean, questionsUsed: number, questionsLeft: number, daysLeft: number, trialExpired: boolean, trialStartedAt: Date|null }>}
 */
export async function getTrialStatus(userId) {
  const empty = { inTrial: false, questionsUsed: 0, questionsLeft: FREE_LIMIT, daysLeft: 0, trialExpired: false, trialStartedAt: null }
  if (!userId) return empty

  const { data, error } = await supabase
    .from('wrong_answers')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getTrialStatus', error)
    return empty
  }

  const questionsUsed = data?.length ?? 0
  const questionsLeft = Math.max(0, FREE_LIMIT - questionsUsed)

  // 오답이 없으면 체험 시작 전 (아직 7일 풀로 남음)
  if (questionsUsed === 0) {
    return { inTrial: true, questionsUsed: 0, questionsLeft: FREE_LIMIT, daysLeft: FREE_TRIAL_DAYS, trialExpired: false, trialStartedAt: null }
  }

  // 첫 오답 등록 시점부터 7일 계산
  const trialStartedAt = new Date(data[0].created_at)
  const trialEndsAt = new Date(trialStartedAt)
  trialEndsAt.setDate(trialEndsAt.getDate() + FREE_TRIAL_DAYS)

  const now = new Date()
  const daysLeft = Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)))

  const timeExpired = daysLeft === 0
  const questionExpired = questionsLeft === 0
  const trialExpired = timeExpired || questionExpired

  return { inTrial: !trialExpired, questionsUsed, questionsLeft, daysLeft, trialExpired, trialStartedAt }
}

/**
 * 플랜별 기간(일수)
 * @type {Record<string, number>}
 */
export const PLAN_DAYS = {
  d15: 15,
  d30: 30,
  d60: 60,
  // 하위 호환: 기존 pro/elite → 30일로 처리
  pro:   30,
  elite: 60,
}

/**
 * 플랜 표시명
 * @type {Record<string, string>}
 */
export const PLAN_LABELS = {
  d15:   '15일 초압축',
  d30:   '30일 집중',
  d60:   '60일 안정',
  pro:   'Pro',
  elite: 'Elite',
  free:  'FREE',
}

/** @typedef {'free'|'d15'|'d30'|'d60'} Plan */

/**
 * 구독 상태 조회 — expires_at 기반 만료 자동 처리
 * @param {string} userId
 * @returns {Promise<{ paid: boolean, plan: Plan, expiresAt: Date|null, daysLeft: number|null }>}
 */
export async function getSubscription(userId) {
  if (!userId) return { paid: false, plan: 'free', expiresAt: null, daysLeft: null }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('paid, plan, expires_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('getSubscription', error)
    return { paid: false, plan: 'free', expiresAt: null, daysLeft: null }
  }

  if (!data?.paid) return { paid: false, plan: 'free', expiresAt: null, daysLeft: null }

  // expires_at 만료 체크
  const expiresAt = data.expires_at ? new Date(data.expires_at) : null
  const now = new Date()
  const isExpired = expiresAt && expiresAt < now

  if (isExpired) return { paid: false, plan: 'free', expiresAt, daysLeft: 0 }

  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)))
    : null

  // 플랜 정규화 (pro/elite 하위 호환)
  const rawPlan = data.plan ?? 'free'
  const plan = ['d15', 'd30', 'd60', 'pro', 'elite'].includes(rawPlan) ? rawPlan : 'free'

  return { paid: true, plan, expiresAt, daysLeft }
}

/**
 * 결제 확정 후 구독 반영 — Edge Function에서 호출 권장
 * 직접 클라이언트에서 호출 시 expires_at 계산 포함
 * @param {string} userId
 * @param {Plan} plan
 */
export async function setSubscriptionPlan(userId, plan) {
  const days = PLAN_DAYS[plan]
  if (!userId || !days) return

  const paidAt   = new Date()
  const expiresAt = new Date(paidAt)
  expiresAt.setDate(expiresAt.getDate() + days)

  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id:    userId,
      paid:       true,
      plan,
      paid_at:    paidAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      updated_at: paidAt.toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

/** @deprecated setSubscriptionPlan('d30') 사용 권장 */
export async function setSubscriptionPaid(userId) {
  await setSubscriptionPlan(userId, 'd30')
}

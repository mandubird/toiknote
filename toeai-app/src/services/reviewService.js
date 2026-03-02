/**
 * v4.21: 후기 작성/승인/보상 및 조회
 */
import { supabase } from '../lib/supabase'

/**
 * 후기 작성 가능 여부 검증
 * @param {string} userId
 * @returns {Promise<{ canWrite: boolean, reason?: string }>}
 */
export async function canWriteReview(userId) {
  if (!userId) return { canWrite: false, reason: '로그인이 필요합니다.' }

  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) return { canWrite: false, reason: '이미 후기를 작성하셨습니다.' }

  const { data: user } = await supabase
    .from('users')
    .select('program_start_date, program_status')
    .eq('id', userId)
    .single()

  if (!user || user.program_status === 'none') {
    return { canWrite: false, reason: '프로그램을 시작한 후 작성 가능합니다.' }
  }

  if (!user.program_start_date) {
    return { canWrite: false, reason: '프로그램을 시작한 후 작성 가능합니다.' }
  }

  const startDate = new Date(user.program_start_date)
  const today = new Date()
  const daysUsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUsed < 14) {
    return {
      canWrite: false,
      reason: `프로그램 시작 후 14일 이상 사용 시 작성 가능합니다. (현재 ${daysUsed}일째)`,
    }
  }

  const { count } = await supabase
    .from('solved_questions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) < 100) {
    return {
      canWrite: false,
      reason: `최소 100문제 이상 풀이 후 작성 가능합니다. (현재 ${count ?? 0}문제)`,
    }
  }

  return { canWrite: true }
}

/**
 * 후기 제출
 * @param {{
 *   userId: string,
 *   nickname: string,
 *   scoreBefore: number | null,
 *   scoreAfter: number | null,
 *   helpfulFeature: string,
 *   content: string,
 *   rating: number
 * }} input
 */
export async function submitReview(input) {
  const { canWrite, reason } = await canWriteReview(input.userId)
  if (!canWrite) throw new Error(reason)

  const { error } = await supabase.from('reviews').insert({
    user_id: input.userId,
    nickname: input.nickname.trim(),
    score_before: input.scoreBefore ?? null,
    score_after: input.scoreAfter ?? null,
    helpful_feature: input.helpfulFeature || null,
    content: input.content.trim(),
    rating: input.rating,
  })

  if (error) throw new Error('후기 저장에 실패했습니다: ' + error.message)
  return {
    success: true,
    message: '후기가 제출되었습니다. 관리자 승인 후 게시됩니다. 승인 시 +5일이 지급됩니다.',
  }
}

const REVIEW_REWARD_DAYS = 5

/**
 * 후기 보상 지급 (관리자 승인 후 호출)
 * @param {string} reviewId
 * @param {string} adminId
 */
export async function rewardReviewBonus(reviewId, adminId) {
  const { data: review, error: reviewErr } = await supabase
    .from('reviews')
    .select('*, users!user_id(id, program_end_date, bonus_days, max_bonus_days)')
    .eq('id', reviewId)
    .single()

  if (reviewErr || !review) throw new Error('후기를 찾을 수 없습니다.')
  if (review.rewarded) throw new Error('이미 보상이 지급된 후기입니다.')
  if (!review.approved) throw new Error('승인되지 않은 후기입니다.')

  const user = review.users
  if (!user) throw new Error('작성자 정보를 찾을 수 없습니다.')

  const bonusDays = user.bonus_days ?? 0
  const maxBonusDays = user.max_bonus_days ?? 60
  if (bonusDays >= maxBonusDays) {
    await supabase.from('reviews').update({ rewarded: true }).eq('id', reviewId)
    return
  }

  const actualReward = Math.min(REVIEW_REWARD_DAYS, maxBonusDays - bonusDays)
  const endDate = user.program_end_date ? new Date(user.program_end_date) : new Date()
  endDate.setDate(endDate.getDate() + actualReward)

  await supabase
    .from('users')
    .update({
      program_end_date: endDate.toISOString(),
      bonus_days: bonusDays + actualReward,
      review_reward_given: true,
    })
    .eq('id', user.id)

  await supabase
    .from('reviews')
    .update({
      rewarded: true,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
}

/**
 * 후기 승인 + 보상 지급
 */
export async function approveReview(reviewId, adminId) {
  const { error } = await supabase
    .from('reviews')
    .update({
      approved: true,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
  if (error) throw new Error(error.message)
  await rewardReviewBonus(reviewId, adminId)
}

/**
 * 후기 거절
 */
export async function rejectReview(reviewId, adminId, reason) {
  const { error } = await supabase
    .from('reviews')
    .update({
      approved: false,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      reject_reason: reason,
    })
    .eq('id', reviewId)
  if (error) throw new Error(error.message)
}

/**
 * 승인된 후기 목록 조회 (공개용)
 * @param {'latest'|'score_gain'|'rating'} sort
 * @param {number} page
 * @param {number} limit
 */
export async function getApprovedReviews(sort = 'latest', page = 1, limit = 12) {
  let query = supabase
    .from('reviews')
    .select('id, nickname, score_before, score_after, helpful_feature, content, rating, created_at, user_id, users!user_id(badge_level)', { count: 'exact' })
    .eq('approved', true)

  if (sort === 'latest') {
    query = query.order('created_at', { ascending: false })
  } else if (sort === 'score_gain') {
    query = query.order('score_after', { ascending: false })
  } else if (sort === 'rating') {
    query = query.order('rating', { ascending: false })
  }

  const from = (page - 1) * limit
  query = query.range(from, from + limit - 1)

  const { data, error, count } = await query
  if (error) throw error

  let list = data ?? []
  if (sort === 'score_gain') {
    list = [...list].sort((a, b) => (b.score_after - b.score_before) - (a.score_after - a.score_before))
  }
  return { data: list, count: count ?? 0 }
}

/**
 * 후기 통계 (평균 별점, 총 개수)
 */
export async function getReviewStats() {
  const { data } = await supabase
    .from('reviews')
    .select('rating')
    .eq('approved', true)
  if (!data?.length) return { avgRating: 0, totalCount: 0 }
  const avgRating = data.reduce((sum, r) => sum + r.rating, 0) / data.length
  return {
    avgRating: Math.round(avgRating * 10) / 10,
    totalCount: data.length,
  }
}

/**
 * 관리자: 미승인 후기 목록
 */
export async function getAdminPendingReviews() {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('approved', false)
    .is('reviewed_at', null)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/**
 * 관리자 여부 확인
 */
export async function isAdminUser(userId) {
  const { data } = await supabase.from('users').select('is_admin').eq('id', userId).single()
  return data?.is_admin === true
}

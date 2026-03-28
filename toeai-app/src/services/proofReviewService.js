/**
 * proof_assets 기반 후기 수집·공개 노출·보상 RPC
 * 스펙: docs/26.03.19_후기시스템_결제전환_cursor_spec.md
 */
import { supabase } from '../lib/supabase'

export const HELPFUL_OPTIONS = [
  '공부 방향이 잡혔다',
  '약점이 명확해졌다',
  'Part7 시간이 줄었다',
  '무엇을 해야 할지 알게 됐다',
  '생각보다 빠르게 올랐다',
  '아직 모르겠다',
]

export const BEST_FEATURE_OPTIONS = [
  '전략 분석',
  '약점 코칭',
  'Part7 코칭',
  '문법 약점',
  '오답 노트',
]

/** v1 후기 수집 Step1 — 최대 3개 */
export const REVIEW_V1_HELPFUL_FEATURES = [
  '약점 TOP3',
  '오늘 할 일 3개',
  '버려야 할 공부',
  '오답 기록 방식',
  '문제 유형 분석',
  '점수 손실 분석',
  '전략 가이드',
  '학습 방향 제시',
  'Part별 약점 분석',
]

export const REVIEW_V1_BEFORE_OPTIONS = [
  '공부 방향이 불명확했다',
  '어디서 점수를 잃는지 몰랐다',
  '문제를 많이 풀어도 점수가 안 올랐다',
  'Part7 시간이 부족했다',
  '오답 정리가 어려웠다',
  '무엇을 공부해야 할지 몰랐다',
]

export const REVIEW_V1_AFTER_OPTIONS = [
  '공부 방향이 명확해졌다',
  '약점이 보이기 시작했다',
  '틀리는 이유가 보인다',
  '시간 관리 전략이 생겼다',
  '오답 복습이 쉬워졌다',
  '아직 잘 모르겠다',
]

/**
 * @returns {Promise<{ should_show: boolean }>}
 */
export async function rpcCheckReviewTrigger() {
  const { data, error } = await supabase.rpc('check_review_trigger')
  if (error) {
    console.warn('[proofReview] check_review_trigger', error)
    return { should_show: false }
  }
  return { should_show: data?.should_show === true }
}

/**
 * @param {string} userId
 */
export async function fetchMyProofReview(userId) {
  if (!userId) return null
  const { data, error } = await supabase
    .from('proof_assets')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'review')
    .maybeSingle()
  if (error) {
    console.warn('[proofReview] fetchMyProofReview', error)
    return null
  }
  return data
}

/**
 * @param {string} assetId
 * @param {1|2} stage
 */
export async function rpcGrantReviewReward(assetId, stage) {
  const { data, error } = await supabase.rpc('grant_review_reward', {
    p_asset_id: assetId,
    p_stage: stage,
  })
  if (error) {
    return { success: false, reason: error.message }
  }
  return data || { success: false, reason: 'empty' }
}

/**
 * 1단계 제출
 * @param {string} userId
 * @param {{ selected: string[], note: string }} payload
 */
export async function submitProofReviewStep1(userId, { selected, note }) {
  const tags = Array.isArray(selected) ? selected : []
  const noteTrim = (note || '').trim()
  const headline =
    noteTrim ||
    (tags.length ? tags.slice(0, 2).join(', ') : '토답 이용 후기')

  const { data: inserted, error: insErr } = await supabase
    .from('proof_assets')
    .insert({
      user_id: userId,
      type: 'review',
      headline,
      content: JSON.stringify({ step1_tags: tags, step1_note: noteTrim }),
      review_stage: 1,
      is_public: false,
      consent_public: false,
    })
    .select('id')
    .single()

  if (insErr) throw new Error(insErr.message || '후기 저장에 실패했습니다.')

  const reward = await rpcGrantReviewReward(inserted.id, 1)
  return { assetId: inserted.id, reward }
}

/**
 * 2단계 제출 (기존 행 UPDATE)
 */
export async function submitProofReviewStep2(userId, assetId, form) {
  const {
    start_score: startScore,
    current_score: currentScore,
    target_score: targetScore,
    usage_days: usageDays,
    best_feature: bestFeature,
    body,
    consent_public: consentPublic,
  } = form

  const bodyTrim = (body || '').trim()
  if (bodyTrim.length < 10) {
    throw new Error('공개 후기는 10자 이상 입력해 주세요.')
  }

  const { error: upErr } = await supabase
    .from('proof_assets')
    .update({
      start_score: startScore,
      current_score: currentScore,
      target_score: targetScore,
      usage_days: usageDays,
      best_feature: bestFeature,
      content: bodyTrim,
      consent_public: !!consentPublic,
      is_public: false,
      approved_at: null,
      review_stage: 2,
    })
    .eq('id', assetId)
    .eq('user_id', userId)
    .eq('type', 'review')

  if (upErr) throw new Error(upErr.message || '저장에 실패했습니다.')

  let reward = { success: false, reason: 'skipped' }
  if (consentPublic) {
    reward = await rpcGrantReviewReward(assetId, 2)
  }

  return { reward }
}

/**
 * v1 4단계 후기 수집 — proof_assets upsert (유저당 review 1행)
 * @param {string} userId
 * @param {{
 *   helpful_features: string[],
 *   before_state: string,
 *   after_change: string,
 *   one_line_review: string,
 *   review_visibility: 'anonymous'|'with_score'|'private',
 *   current_score: number|null,
 *   target_score: number|null,
 * }} payload
 */
export async function submitReviewCollectionV1(userId, payload) {
  if (!userId) throw new Error('로그인이 필요합니다.')

  const helpful = Array.isArray(payload.helpful_features) ? payload.helpful_features.slice(0, 3) : []
  const oneLine = (payload.one_line_review || '').trim()
  if (!oneLine.length || oneLine.length > 80) {
    throw new Error('한 줄 후기는 1~80자로 입력해 주세요.')
  }
  if (!payload.before_state || !payload.after_change) {
    throw new Error('사용 전·후 항목을 선택해 주세요.')
  }
  if (helpful.length === 0) {
    throw new Error('도움이 된 기능을 1개 이상 선택해 주세요.')
  }

  const vis = payload.review_visibility || 'private'
  if (!['anonymous', 'with_score', 'private'].includes(vis)) {
    throw new Error('공개 설정이 올바르지 않습니다.')
  }

  const consentPublic = vis !== 'private'
  const cur = payload.current_score != null ? Number(payload.current_score) : null
  const tgt = payload.target_score != null ? Number(payload.target_score) : null

  const contentMeta = JSON.stringify({
    v1_collection: true,
    helpful_features: helpful,
    before_state: payload.before_state,
    after_change: payload.after_change,
    review_visibility: vis,
  })

  const baseRow = {
    headline: oneLine,
    one_line_review: oneLine,
    helpful_features: helpful,
    before_state: payload.before_state,
    after_change: payload.after_change,
    review_visibility: vis,
    current_score: Number.isFinite(cur) ? cur : null,
    target_score: Number.isFinite(tgt) ? tgt : null,
    consent_public: consentPublic,
    review_stage: 2,
    is_public: false,
    approved_at: null,
    content: contentMeta,
  }

  const existing = await fetchMyProofReview(userId)

  if (existing?.id) {
    const { error: upErr } = await supabase
      .from('proof_assets')
      .update(baseRow)
      .eq('id', existing.id)
      .eq('user_id', userId)
      .eq('type', 'review')

    if (upErr) throw new Error(upErr.message || '저장에 실패했습니다.')

    let reward2 = { success: false, reason: 'skipped' }
    if (consentPublic) {
      reward2 = await rpcGrantReviewReward(existing.id, 2)
    }
    return { assetId: existing.id, rewardStage2: reward2 }
  }

  const { data: inserted, error: insErr } = await supabase
    .from('proof_assets')
    .insert({
      user_id: userId,
      type: 'review',
      ...baseRow,
    })
    .select('id')
    .single()

  if (insErr) throw new Error(insErr.message || '후기 저장에 실패했습니다.')

  const reward1 = await rpcGrantReviewReward(inserted.id, 1)
  let reward2 = { success: false, reason: 'skipped' }
  if (consentPublic) {
    reward2 = await rpcGrantReviewReward(inserted.id, 2)
  }

  return { assetId: inserted.id, rewardStage1: reward1, rewardStage2: reward2 }
}

/** 결제 시트·상단용: 공개 승인된 후기 */
export async function fetchPublicProofReviews(limit = 6, options = {}) {
  let q = supabase
    .from('proof_assets')
    .select(
      'id, headline, start_score, current_score, usage_days, best_feature, content, is_featured, created_at, target_score, main_weakness_tag, review_stage'
    )
    .eq('type', 'review')
    .eq('is_public', true)

  if (options.reviewStage2Only) {
    q = q.eq('review_stage', 2)
  }

  if (options.minTargetScore != null) {
    q = q.gte('target_score', options.minTargetScore - 50)
  }
  if (options.maxTargetScore != null) {
    q = q.lte('target_score', options.maxTargetScore + 50)
  }
  if (options.usageDays != null) {
    q = q.eq('usage_days', options.usageDays)
  }
  if (options.featureLike) {
    q = q.ilike('best_feature', `%${options.featureLike}%`)
  }
  if (options.minStartScore != null) {
    q = q.gte('start_score', options.minStartScore)
  }
  if (options.maxStartScore != null) {
    q = q.lte('start_score', options.maxStartScore)
  }

  q = q
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  const { data, error } = await q
  if (error) {
    console.warn('[proofReview] fetchPublicProofReviews', error)
    return []
  }
  return data ?? []
}

/** 공개 후기 건수 (랜딩/배너 조건용) */
export async function getPublicProofReviewCount() {
  const { count, error } = await supabase
    .from('proof_assets')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'review')
    .eq('is_public', true)

  if (error) return 0
  return count ?? 0
}

/** CTA 맵핑 (스펙 9.1) */
export function getCtaForProofReview(review) {
  const days = review.usage_days ?? 30
  if (days <= 15) return { text: '15일 파이널 압축 시작', planKey: 'd15' }
  if (days <= 30) return { text: '30일 표준 코칭 시작', planKey: 'd30' }
  return { text: '60일 정체 탈출 시작', planKey: 'd60' }
}

// ── 관리자 ─────────────────────────────────────────

export async function getAdminPendingProofReviews() {
  const { data, error } = await supabase
    .from('proof_assets')
    .select('*')
    .eq('type', 'review')
    .eq('review_stage', 2)
    .eq('consent_public', true)
    .is('approved_at', null)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function approveProofReview(assetId) {
  const { error } = await supabase
    .from('proof_assets')
    .update({
      approved_at: new Date().toISOString(),
      is_public: true,
    })
    .eq('id', assetId)
    .eq('consent_public', true)
  if (error) throw new Error(error.message)
}

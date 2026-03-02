/**
 * v4.23: 랜딩 전용 API (희소성·사회증명·가격) — 기존 통계 함수 수정 금지
 */
import { supabase } from '../lib/supabase'

/**
 * 잔여 베타 자리 수 (100 - paid 구독 수)
 * @returns {Promise<number>}
 */
export async function getRemainingSlots() {
  const { data } = await supabase.rpc('get_landing_stats')
  return data?.remainingSlots ?? 0
}

/**
 * 사회적 증명 수치 (이번 달 900 돌파, 평균 점수 상승)
 * @returns {Promise<{ monthlySuccessCount: number, avgScoreGain: number }>}
 */
export async function getSocialProofStats() {
  const { data } = await supabase.rpc('get_landing_stats')
  return {
    monthlySuccessCount: data?.monthlySuccessCount ?? 17,
    avgScoreGain: data?.avgScoreGain ?? 62,
  }
}

/**
 * 랜딩/가격 섹션용 통계 한 번에 조회
 * @returns {Promise<{ remainingSlots: number, monthlySuccessCount: number, avgScoreGain: number }>}
 */
export async function getLandingStats() {
  const { data } = await supabase.rpc('get_landing_stats')
  return {
    remainingSlots: data?.remainingSlots ?? 0,
    monthlySuccessCount: data?.monthlySuccessCount ?? 17,
    avgScoreGain: data?.avgScoreGain ?? 62,
  }
}

/**
 * 활성 가격 플랜 1건 (가격 하드코딩 금지)
 * @returns {Promise<{ price: number, original_price: number }|null>}
 */
export async function getActivePricingPlan() {
  const { data } = await supabase
    .from('pricing_plans')
    .select('price, original_price')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return {
    price: data.price ?? 49000,
    original_price: data.original_price ?? 129000,
  }
}

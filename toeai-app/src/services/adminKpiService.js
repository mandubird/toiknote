/**
 * v4.22: 관리자 KPI 집계 (RPC 호출, is_admin만 전체 데이터 조회)
 */
import { supabase } from '../lib/supabase'

/**
 * @returns {Promise<Object|null>}
 */
export async function getKpiSummary() {
  const { data, error } = await supabase.rpc('get_kpi_summary')
  if (error || !data || data.error) return null
  return {
    todayRevenue: data.todayRevenue ?? 0,
    monthRevenue: data.monthRevenue ?? 0,
    todayPayments: data.todayPayments ?? 0,
    monthPayments: data.monthPayments ?? 0,
    activeUsers: data.activeUsers ?? 0,
    expiredUsers: data.expiredUsers ?? 0,
    completedUsers: data.completedUsers ?? 0,
    totalUsers: data.totalUsers ?? 0,
    totalDiagnoses: data.totalDiagnoses ?? 0,
    totalPayments: data.totalPayments ?? 0,
    diagnosisToPaymentRate: data.diagnosisToPaymentRate ?? 0,
    totalShares: data.totalShares ?? 0,
    totalReferrals: data.totalReferrals ?? 0,
    completedReferrals: data.completedReferrals ?? 0,
    referralConversionRate: data.referralConversionRate ?? 0,
    pendingReviews: data.pendingReviews ?? 0,
    approvedReviews: data.approvedReviews ?? 0,
    avgRating: data.avgRating ?? 0,
    challengerCount: data.challengerCount ?? 0,
    eliteCount: data.eliteCount ?? 0,
    badge900Count: data.badge900Count ?? 0,
  }
}

/**
 * v4.22: 관리자 KPI 대시보드
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getKpiSummary } from '../services/adminKpiService'

export default function AdminKpiDashboard() {
  const [kpi, setKpi] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getKpiSummary()
      .then((data) => setKpi(data))
      .catch(() => setKpi(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-4 flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    )
  }
  if (!kpi) {
    return (
      <div className="p-4 text-gray-600">
        데이터를 불러올 수 없습니다. (관리자만 조회 가능)
      </div>
    )
  }

  const revenuePercent = Math.min(100, (kpi.monthRevenue / 10000000) * 100)

  return (
    <div className="p-4 pb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-6">📊 KPI 대시보드</h2>

      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">💰 매출 현황</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500">오늘 매출</p>
            <p className="text-xl font-bold text-primary-600">{kpi.todayRevenue.toLocaleString()}원</p>
            <p className="text-xs text-gray-400">{kpi.todayPayments}건</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500">이번 달 매출</p>
            <p className="text-xl font-bold text-primary-600">{kpi.monthRevenue.toLocaleString()}원</p>
            <p className="text-xs text-gray-400">{kpi.monthPayments}건</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500">월 1,000만원 달성률</p>
            <p className="text-xl font-bold text-gray-900">{Math.round(revenuePercent)}%</p>
            <div className="h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full" style={{ width: `${revenuePercent}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">👥 사용자 현황</h3>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <div className="bg-green-50 rounded-xl border border-green-200 p-4">
            <p className="text-xs text-gray-600">활성</p>
            <p className="text-lg font-bold text-green-800">{kpi.activeUsers}명</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4">
            <p className="text-xs text-gray-600">만료</p>
            <p className="text-lg font-bold text-red-800">{kpi.expiredUsers}명</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <p className="text-xs text-gray-600">완료</p>
            <p className="text-lg font-bold text-blue-800">{kpi.completedUsers}명</p>
          </div>
          <div className="bg-gray-100 rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-600">전체</p>
            <p className="text-lg font-bold text-gray-800">{kpi.totalUsers}명</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">🎯 전환 퍼널</h3>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500">진단 완료</p>
              <p className="text-xl font-bold">{kpi.totalDiagnoses}명</p>
            </div>
            <span className="text-gray-400">↓ {kpi.diagnosisToPaymentRate}%</span>
            <div className="rounded-lg bg-primary-50 px-4 py-2">
              <p className="text-xs text-gray-600">결제 전환</p>
              <p className="text-xl font-bold text-primary-700">{kpi.totalPayments}명</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">🔗 바이럴 현황</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">공유 횟수</p>
            <p className="text-lg font-bold">{kpi.totalShares}회</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">추천 가입</p>
            <p className="text-lg font-bold">{kpi.totalReferrals}명</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">추천 → 결제 전환율</p>
            <p className="text-lg font-bold">{kpi.referralConversionRate}%</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📝 후기 현황</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate('/admin/reviews')}
            className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-left hover:bg-amber-100"
          >
            <p className="text-xs text-gray-600">승인 대기</p>
            <p className="text-lg font-bold text-amber-800">{kpi.pendingReviews}건</p>
            <p className="text-xs text-amber-600">클릭하여 처리 →</p>
          </button>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">승인 완료</p>
            <p className="text-lg font-bold">{kpi.approvedReviews}건</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">평균 별점</p>
            <p className="text-lg font-bold">⭐ {kpi.avgRating}</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">🏆 배지 현황</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">🥉 Challenger</p>
            <p className="text-lg font-bold">{kpi.challengerCount}명</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">🥈 Elite</p>
            <p className="text-lg font-bold">{kpi.eliteCount}명</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <p className="text-xs text-gray-600">🥇 900 달성</p>
            <p className="text-lg font-bold text-amber-800">{kpi.badge900Count}명</p>
          </div>
        </div>
      </section>
    </div>
  )
}

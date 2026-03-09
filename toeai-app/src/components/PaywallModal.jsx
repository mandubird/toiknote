import { useState } from 'react'
import { requestPlanPayment, verifyPortonePayment, PLANS } from '../services/portonePayment'

const PLAN_CARDS = [
  { key: 'd15', label: '시험 임박자용', title: '15일 초압축', main: false },
  { key: 'd30', label: '가장 많이 선택', title: '30일 집중',  main: true  },
  { key: 'd60', label: '장기 준비용',   title: '60일 안정',  main: false  },
]

const PaywallModal = ({ open, onClose, userId, userEmail, userDisplayName, onPaymentSuccess }) => {
  const [loading, setLoading] = useState(null)
  const [error, setError]     = useState(null)

  const handlePlanPayment = async (planKey) => {
    if (!userId) return
    setError(null)
    setLoading(planKey)
    try {
      const result = await requestPlanPayment(planKey, {
        customerEmail: userEmail,
        customerName:  userDisplayName,
      })

      // 리다이렉트 모드: PaymentSuccessPage에서 처리
      if (result.redirected) return

      if (!result.success) {
        setError(result.message || '결제에 실패했어요.')
        return
      }

      // 팝업 모드: Edge Function 서버사이드 검증
      const verified = await verifyPortonePayment(result.paymentId, userId, planKey)
      if (verified.success) {
        onPaymentSuccess?.()
        onClose()
      } else {
        setError(verified.message || '결제 검증에 실패했어요.')
      }
    } catch (err) {
      setError(err?.message || '결제 요청에 실패했어요.')
    } finally {
      setLoading(null)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-5 overflow-y-auto">

          <h2 className="text-lg font-bold text-gray-900 mb-1">무료 5회를 모두 사용했어요</h2>
          <p className="text-sm text-gray-500 mb-4">
            유료 플랜에서 <strong className="text-gray-800">무제한 오답 분석 + AI 약점 코치</strong>를 이용하세요.
          </p>

          {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

          {/* 3종 플랜 */}
          <div className="space-y-2.5 mb-4">
            {PLAN_CARDS.map((card) => {
              const info = PLANS[card.key]
              return (
                <button
                  key={card.key}
                  type="button"
                  disabled={!!loading}
                  onClick={() => handlePlanPayment(card.key)}
                  className={`w-full rounded-xl px-4 py-3 text-left transition disabled:opacity-50 ${
                    card.main
                      ? 'bg-primary-600 text-white'
                      : 'border border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-xs font-medium ${card.main ? 'text-primary-100' : 'text-gray-400'}`}>
                        {card.label}
                      </span>
                      <p className="text-sm font-bold mt-0.5">
                        {loading === card.key ? '결제창 열림…' : `${card.title} (${info?.days}일)`}
                      </p>
                    </div>
                    <span className="text-sm font-bold">
                      {info?.amount.toLocaleString()}원
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

export default PaywallModal

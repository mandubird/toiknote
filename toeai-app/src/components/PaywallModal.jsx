import { useState } from 'react'
import { requestPlanPayment, PLANS } from '../services/portonePayment'
import { setSubscriptionPlan } from '../services/subscription'

const PaywallModal = ({ open, onClose, userId, userEmail, userDisplayName, onPaymentSuccess }) => {
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState(null)

  const handlePlanPayment = async (planKey) => {
    if (!userId) return
    setError(null)
    setLoading(planKey)
    try {
      const result = await requestPlanPayment(planKey, {
        customerEmail: userEmail,
        customerName: userDisplayName,
      })
      if (result.success) {
        await setSubscriptionPlan(userId, planKey)
        onPaymentSuccess?.()
        onClose()
      } else {
        setError(result.message || '결제에 실패했어요.')
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
      <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-6 overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-2">무료 5회를 모두 사용했어요</h2>
          <p className="text-sm text-gray-600 mb-3">
            유료 구독 시 <strong>오답 자동 집계 + AI 맞춤 전략 추천</strong>을 이용할 수 있어요.
          </p>
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <div className="space-y-2 mb-4">
            <button
              type="button"
              disabled={!!loading}
              onClick={() => handlePlanPayment('pro')}
              className="w-full py-3 px-4 rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {loading === 'pro' ? '결제창 열림…' : `Pro ${PLANS.pro.amount.toLocaleString()}원/월`}
            </button>
            <button
              type="button"
              disabled={!!loading}
              onClick={() => handlePlanPayment('elite')}
              className="w-full py-3 px-4 rounded-xl border-2 border-primary-600 text-primary-600 font-medium text-sm hover:bg-primary-50 disabled:opacity-50"
            >
              {loading === 'elite' ? '결제창 열림…' : `Elite ${PLANS.elite.amount.toLocaleString()}원/월`}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaywallModal

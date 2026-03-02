import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { setSubscriptionPaid } from '../services/subscription'
import { isDiagnosticCompleted } from '../services/diagnosticService'
import { getProgramPlan } from '../services/programService'
import { startProgramV403 } from '../services/programService'
import { completeReferralReward } from '../services/referralService'

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [status, setStatus] = useState('loading') // loading | success | error

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = searchParams.get('amount')

    if (!paymentKey || !orderId || !amount) {
      setStatus('error')
      return
    }

    const run = async () => {
      if (!user) {
        setStatus('error')
        return
      }
      try {
        // 프로덕션에서는 서버에서 결제 승인 API 호출 후 여기서는 구독만 반영
        await setSubscriptionPaid(user.id)
        // v4.04: 진단 완료 + 프로그램 미시작 상태면 결제 후 8주 프로그램 자동 시작
        const [diagnosticDone, plan] = await Promise.all([
          isDiagnosticCompleted(user.id),
          getProgramPlan(user.id),
        ])
        let finalPlan = plan
        if (diagnosticDone && plan?.status === 'none') {
          await startProgramV403(user.id)
          finalPlan = await getProgramPlan(user.id)
        }
        await completeReferralReward(user.id)
        setStatus('success')
        setTimeout(() => navigate(finalPlan?.status === 'active' ? '/program' : '/', { replace: true }), 2000)
      } catch (err) {
        console.error(err)
        setStatus('error')
      }
    }

    run()
  }, [searchParams, user, navigate])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <div className="animate-spin w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full" />
        <p className="mt-4 text-gray-600">결제를 확인하고 있어요…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <p className="text-gray-800 font-medium">결제 확인에 실패했어요</p>
        <p className="text-sm text-gray-500 mt-2">이미 결제가 완료됐을 수 있어요. 홈에서 다시 시도해 보세요.</p>
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="mt-6 py-2 px-4 bg-primary-600 text-white rounded-lg"
        >
          홈으로
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-lg font-semibold text-gray-900">결제가 완료되었어요</p>
      <p className="text-sm text-gray-500 mt-1">잠시 후 홈으로 이동해요.</p>
    </div>
  )
}

export default PaymentSuccessPage

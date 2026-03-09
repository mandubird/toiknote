/**
 * PaymentSuccessPage — PortOne V2 리다이렉트 결과 처리
 *
 * 성공 URL 파라미터:  ?paymentId={id}&txId={txId}&plan={plan}
 * 실패 URL 파라미터:  ?code={code}&message={message}
 *
 * 처리 순서:
 *   1. URL에서 paymentId / plan 추출
 *   2. verifyPortonePayment (Edge Function) 호출 → 서버사이드 검증 + DB 업데이트
 *   3. completeReferralReward 처리
 *   4. 성공 → /program 이동 / 실패 → 오류 표시
 */
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { verifyPortonePayment } from '../services/portonePayment'
import { completeReferralReward } from '../services/referralService'

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const { user }       = useAuth()
  const [status, setStatus]   = useState('loading') // loading | success | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    // PortOne V2 리다이렉트 파라미터
    const paymentId = searchParams.get('paymentId')
    const plan      = searchParams.get('plan')       // requestPlanPayment가 redirectUrl에 포함
    const code      = searchParams.get('code')       // 결제 실패/취소 시 존재
    const message   = searchParams.get('message')

    // ── 결제 실패/취소 케이스 ──────────────────────
    if (code) {
      setErrorMsg(message || '결제가 취소됐어요.')
      setStatus('error')
      return
    }

    // ── 필수 파라미터 누락 ─────────────────────────
    if (!paymentId || !plan) {
      setErrorMsg('결제 정보를 찾을 수 없어요.')
      setStatus('error')
      return
    }

    // ── 로그인 대기 (AuthContext 초기화 전) ───────
    if (!user) return // user가 세팅되면 재실행

    const run = async () => {
      // Edge Function 결제 검증 + DB 업데이트
      const result = await verifyPortonePayment(paymentId, user.id, plan)
      if (!result.success) {
        setErrorMsg(result.message || '결제 검증에 실패했어요.')
        setStatus('error')
        return
      }

      // 추천인 보상 처리 (실패해도 결제 성공에는 영향 없음)
      try {
        await completeReferralReward(user.id)
      } catch (_) { /* ignore */ }

      setStatus('success')
      // v4.26: 시험일 입력 후 프로그램 시작하도록 ProgramPage로 이동
      setTimeout(() => navigate('/program', { replace: true }), 2000)
    }

    run()
  }, [searchParams, user, navigate])

  // ── 로딩 ───────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <div className="animate-spin w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full" />
        <p className="mt-4 text-gray-600">결제를 확인하고 있어요…</p>
      </div>
    )
  }

  // ── 오류 ───────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="text-gray-800 font-medium">결제 확인에 실패했어요</p>
        <p className="text-sm text-gray-500 mt-2 text-center max-w-xs">{errorMsg}</p>
        <p className="text-xs text-gray-400 mt-1">이미 결제가 완료됐을 수 있어요. 설정에서 구독 현황을 확인해 주세요.</p>
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate('/settings', { replace: true })}
            className="py-2 px-4 border border-primary-600 text-primary-600 rounded-lg text-sm"
          >
            설정 확인
          </button>
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="py-2 px-4 bg-primary-600 text-white rounded-lg text-sm"
          >
            홈으로
          </button>
        </div>
      </div>
    )
  }

  // ── 성공 ───────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-lg font-semibold text-gray-900">결제가 완료됐어요! 🎉</p>
      <p className="text-sm text-gray-500 mt-1">프로그램 시작 화면으로 이동할게요…</p>
    </div>
  )
}

export default PaymentSuccessPage

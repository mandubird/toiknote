/**
 * PaymentSheet — 결제 플랜 선택 바텀 시트
 * Props:
 *   open       : boolean
 *   onClose    : () => void
 *   user       : Supabase user object
 *   onSuccess  : (planKey) => void  — 결제 완료(팝업 모드) 콜백
 */
import { useState, useEffect } from 'react'
import { requestPlanPayment, verifyPortonePayment, PLANS } from '../services/portonePayment'
import PaymentProofReviews from './review/PaymentProofReviews'

const PLAN_CARDS = [
  {
    key:   'd15',
    badge: '시험 임박자용',
    title: '15일 초압축',
    desc:  '시험일까지 시간이 많지 않은 수험생을 위한 단기 압축 플랜',
    main:  false,
  },
  {
    key:   'd30',
    badge: '가장 많이 선택',
    title: '30일 집중',
    desc:  '약점 진단부터 집중 교정까지 가장 균형 있게 사용할 수 있는 추천 플랜',
    main:  true,
  },
  {
    key:   'd60',
    badge: '장기 준비용',
    title: '60일 안정',
    desc:  '시간 여유가 있는 수험생을 위한 안정형 플랜',
    main:  false,
  },
]

const PLAN_BENEFITS = [
  '약점 진단',
  '무제한 오답 분석',
  'D-day 압축 전략',
  '코치 멘트',
  '약점 우선순위 로드맵',
]

const CONSENT_ITEMS = [
  { label: '이용약관에 동의합니다', link: '/terms' },
  { label: '개인정보처리방침에 동의합니다', link: '/privacy' },
  { label: '교환·환불·취소 규정을 확인했습니다', link: '/refund-policy' },
  { label: '디지털 콘텐츠 제공이 결제 후 즉시 시작될 수 있음을 확인했습니다', link: null },
]

export default function PaymentSheet({ open, onClose, user, onSuccess }) {
  const [consents, setConsents]           = useState([false, false, false, false])
  const [paymentLoading, setPaymentLoading] = useState(null)
  const [paymentError, setPaymentError]   = useState(null)
  const [customerPhone, setCustomerPhone] = useState('')

  const allConsented = consents.every(Boolean)

  // 시트 닫힐 때 상태 초기화
  useEffect(() => {
    if (!open) {
      setConsents([false, false, false, false])
      setPaymentError(null)
      setPaymentLoading(null)
      setCustomerPhone('')
    }
  }, [open])

  // 시트 열릴 때 body 스크롤 잠금
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const toggleConsent = (i) =>
    setConsents((prev) => prev.map((v, idx) => (idx === i ? !v : v)))

  const phoneValid = (() => {
    const v = customerPhone.trim()
    if (!v) return false
    return /^01[0-9]-?\d{3,4}-?\d{4}$/.test(v.replace(/\s+/g, ''))
  })()

  const handlePlanPayment = async (planKey) => {
    if (!user || paymentLoading) return
    setPaymentError(null)
    setPaymentLoading(planKey)
    try {
      const result = await requestPlanPayment(planKey, {
        customerEmail: user.email,
        customerName:  user.user_metadata?.full_name || undefined,
        customerPhone,
      })

      if (result.redirected) return  // 리다이렉트 모드 → PaymentSuccessPage에서 처리

      if (!result.success) {
        setPaymentError(result.message || '결제에 실패했어요.')
        return
      }

      const verified = await verifyPortonePayment(result.paymentId, user.id, planKey)
      if (verified.success) {
        onSuccess?.(planKey)
        onClose()
      } else {
        setPaymentError(verified.message || '결제 검증에 실패했어요.')
      }
    } catch (err) {
      setPaymentError(err?.message || '결제 요청에 실패했어요.')
    } finally {
      setPaymentLoading(null)
    }
  }

  if (!open) return null

  return (
    <>
      {/* 백드롭 */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* 시트 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* 핸들 + 헤더 */}
        <div className="flex-shrink-0 pt-3 pb-2 px-4 border-b border-gray-100">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">플랜 선택</h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <PaymentProofReviews />

          {/* 에러 */}
          {paymentError && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{paymentError}</p>
          )}

          {/* 공통 혜택 */}
          <div className="bg-primary-50 rounded-xl p-3">
            <p className="text-xs font-semibold text-primary-800 mb-1.5">모든 플랜 공통 혜택</p>
            <div className="space-y-1">
              {PLAN_BENEFITS.map((b) => (
                <p key={b} className="text-xs text-primary-700">✔ {b}</p>
              ))}
            </div>
          </div>

          {/* 동의 체크박스 */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">결제 전 동의 (4가지 모두 확인해 주세요)</p>
            {CONSENT_ITEMS.map((item, i) => (
              <label
                key={i}
                className="flex items-start gap-2 py-1.5 cursor-pointer"
                onClick={() => toggleConsent(i)}
              >
                <div className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition ${
                  consents[i] ? 'bg-primary-600 border-primary-600' : 'border-gray-400 bg-white'
                }`}>
                  {consents[i] && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-xs text-gray-700 leading-relaxed">
                  {item.label}
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="ml-1 text-primary-600 underline"
                    >
                      보기
                    </a>
                  )}
                </span>
              </label>
            ))}
            {!allConsented && (
              <p className="text-xs text-amber-600 mt-1">위 항목을 모두 확인해야 결제할 수 있어요.</p>
            )}
          </div>

          {/* 휴대폰 번호 (KG이니시스 V2 필수) */}
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-700 mb-1.5">휴대폰 번호</p>
            <p className="text-[11px] text-gray-500 mb-2">KG이니시스 V2 일반 결제는 구매자 휴대폰 번호가 필수예요.</p>
            <input
              type="tel"
              inputMode="tel"
              placeholder="010-1234-5678"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {!phoneValid && customerPhone.trim() !== '' && (
              <p className="text-[11px] text-red-600 mt-1">휴대폰 번호 형식을 확인해 주세요.</p>
            )}
          </div>

          {/* 플랜 카드 */}
          <div className="space-y-3 pb-4">
            {PLAN_CARDS.map((card) => {
              const planInfo = PLANS[card.key]
              return (
                <div
                  key={card.key}
                  className={`rounded-xl border-2 p-4 ${
                    card.main
                      ? 'border-primary-600 bg-primary-50 shadow-sm'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      card.main ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {card.badge}
                    </span>
                    <span className={`text-base font-bold ${card.main ? 'text-primary-700' : 'text-gray-800'}`}>
                      {planInfo?.amount.toLocaleString()}원
                    </span>
                  </div>
                  <p className={`text-sm font-semibold mb-1 ${card.main ? 'text-primary-900' : 'text-gray-900'}`}>
                    {card.title} ({planInfo?.days}일)
                  </p>
                  <p className="text-xs text-gray-500 mb-3">{card.desc}</p>
                  <button
                    type="button"
                    disabled={!!paymentLoading || !allConsented || !phoneValid}
                    onClick={() => handlePlanPayment(card.key)}
                    className={`w-full py-2.5 rounded-lg text-sm font-semibold transition ${
                      card.main
                        ? 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50'
                        : 'border border-primary-600 text-primary-600 hover:bg-primary-50 disabled:opacity-50'
                    }`}
                  >
                    {paymentLoading === card.key ? '결제창 열림…' : `${card.title} 시작`}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * PortOne V2 결제 요청 + 서버사이드 검증
 *
 * 흐름:
 *   [모바일/리다이렉트]  requestPlanPayment → PortOne → /payment/success?paymentId=&plan=
 *                         → PaymentSuccessPage → verifyPortonePayment (Edge Function)
 *   [데스크톱/팝업]      requestPlanPayment → 팝업 응답 → verifyPortonePayment (Edge Function)
 *
 * 필요 환경 변수 (.env.local):
 *   VITE_PORTONE_STORE_ID    — admin.portone.io → 내 식별코드 → 상점 아이디
 *   VITE_PORTONE_CHANNEL_KEY — 채널 관리 → 채널 키
 *
 * Supabase Secrets (Edge Function에서 사용):
 *   PORTONE_API_SECRET       — admin.portone.io → V2 API 시크릿
 */
import PortOne from '@portone/browser-sdk/v2'
import { supabase } from '../lib/supabase'

const STORE_ID    = import.meta.env.VITE_PORTONE_STORE_ID    || ''
const CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY || ''

export const PLANS = {
  d15: { amount: 39900, days: 15, name: '토답 15일 초압축 플랜', label: '시험 임박자용' },
  d30: { amount: 49900, days: 30, name: '토답 30일 집중 플랜',  label: '가장 많이 선택' },
  d60: { amount: 79900, days: 60, name: '토답 60일 안정 플랜',  label: '장기 준비용' },
}

// ──────────────────────────────────────────────────────────
// 1. 결제 요청 (PortOne V2 requestPayment)
// ──────────────────────────────────────────────────────────
/**
 * PortOne V2 결제 요청
 * - 모바일: 리다이렉트 → /payment/success?paymentId=…&plan=…
 * - 데스크톱: 팝업 응답 반환
 *
 * @param {'pro'|'elite'} plan
 * @param {{ customerName?: string, customerEmail?: string }} [options]
 * @returns {Promise<{ success: boolean, paymentId?: string, txId?: string,
 *                     redirected?: boolean, message?: string }>}
 */
export async function requestPlanPayment(plan, options = {}) {
  if (!STORE_ID || !CHANNEL_KEY) {
    return {
      success: false,
      message: '결제 설정이 없어요. (VITE_PORTONE_STORE_ID, VITE_PORTONE_CHANNEL_KEY)',
    }
  }
  const config = PLANS[plan]
  if (!config) return { success: false, message: '잘못된 요금제예요.' }

  const paymentId =
    `toeodap_${plan}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  try {
    const response = await PortOne.requestPayment({
      storeId:     STORE_ID,
      channelKey:  CHANNEL_KEY,
      paymentId,
      orderName:   config.name,
      totalAmount: config.amount,
      currency:    'KRW',
      payMethod:   'CARD',
      customer: {
        fullName: options.customerName,
        email:    options.customerEmail,
      },
      // 리다이렉트 모드(모바일 등)에서 성공 시 이동할 URL
      // plan을 쿼리로 함께 전달 → PaymentSuccessPage에서 Edge Function 검증에 사용
      redirectUrl: `${window.location.origin}/payment/success?plan=${plan}`,
    })

    // 리다이렉트 모드: 페이지가 이동해 response가 null/undefined
    if (!response) {
      return { success: false, redirected: true }
    }

    // 팝업 모드: 결제 실패/취소
    if (response?.code) {
      return { success: false, message: response.message || '결제가 취소됐어요.' }
    }

    // 팝업 모드: 결제 성공 → 호출측이 verifyPortonePayment 호출
    return {
      success:   true,
      paymentId: response.paymentId,
      txId:      response.txId,
    }
  } catch (err) {
    console.error('requestPlanPayment 오류:', err)
    const msg =
      err?.message || err?.code
        ? `${err.code ?? ''}: ${err.message ?? ''}`.trim().replace(/^:\s*/, '')
        : '결제 요청에 실패했어요.'
    return { success: false, message: msg }
  }
}

// ──────────────────────────────────────────────────────────
// 2. 서버사이드 결제 검증 (Supabase Edge Function 호출)
// ──────────────────────────────────────────────────────────
/**
 * Edge Function (verify-portone-payment)을 호출해 결제를 서버에서 검증하고
 * subscriptions / payments 테이블을 업데이트한다.
 *
 * @param {string} paymentId  포트원 paymentId
 * @param {string} userId     Supabase auth user.id
 * @param {'pro'|'elite'} plan
 * @returns {Promise<{ success: boolean, plan?: string, expiresAt?: string, message?: string }>}
 */
export async function verifyPortonePayment(paymentId, userId, plan) {
  try {
    const { data, error } = await supabase.functions.invoke('verify-portone-payment', {
      body: { paymentId, userId, plan },
    })

    if (error) {
      console.error('verifyPortonePayment Edge Function 오류:', error)
      return { success: false, message: error.message || '결제 검증에 실패했어요.' }
    }

    if (!data?.success) {
      return { success: false, message: data?.error || '결제 검증에 실패했어요.' }
    }

    return { success: true, plan: data.plan, expiresAt: data.expiresAt }
  } catch (err) {
    console.error('verifyPortonePayment 예외:', err)
    return { success: false, message: '결제 검증 요청에 실패했어요.' }
  }
}

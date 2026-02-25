/**
 * 포트원 V2 결제 요청 (Pro / Elite)
 * 결제 성공 시 호출측에서 setSubscriptionPlan(userId, plan) 호출 필요.
 * 운영 환경에서는 웹훅 또는 Edge Function으로 결제 검증 후 DB 갱신 권장.
 */
import PortOne from '@portone/browser-sdk/v2'

const STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID || ''
const CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY || ''

const PLANS = {
  pro: { amount: 9900, name: '토답 Pro 1개월' },
  elite: { amount: 19900, name: '토답 Elite 1개월' },
}

/**
 * @param {'pro'|'elite'} plan
 * @param {{ customerName?: string, customerEmail?: string }} [options]
 * @returns {Promise<{ success: boolean, paymentId?: string, txId?: string, message?: string }>}
 */
export async function requestPlanPayment(plan, options = {}) {
  if (!STORE_ID || !CHANNEL_KEY) {
    return { success: false, message: '결제 설정이 없어요. (VITE_PORTONE_STORE_ID, VITE_PORTONE_CHANNEL_KEY)' }
  }
  const config = PLANS[plan]
  if (!config) return { success: false, message: '잘못된 요금제예요.' }

  const paymentId = `toeodap_${plan}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  try {
    const response = await PortOne.requestPayment({
      storeId: STORE_ID,
      channelKey: CHANNEL_KEY,
      paymentId,
      orderName: config.name,
      totalAmount: config.amount,
      currency: 'KRW',
      payMethod: 'CARD',
      customer: {
        fullName: options.customerName,
        email: options.customerEmail,
      },
    })

    if (response?.code) {
      return { success: false, message: response.message || '결제가 실패했어요.' }
    }
    return {
      success: true,
      paymentId: response?.paymentId,
      txId: response?.txId,
    }
  } catch (err) {
    console.error('requestPlanPayment', err)
    const msg = err?.message || err?.code ? `${err.code}: ${err.message}` : '결제 요청에 실패했어요.'
    return { success: false, message: msg }
  }
}

export { PLANS }

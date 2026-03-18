/**
 * verify-portone-payment — PortOne V2 서버사이드 결제 검증
 *
 * POST /functions/v1/verify-portone-payment
 * Body: { paymentId: string, userId: string, plan: 'pro' | 'elite' }
 * Headers: Authorization: Bearer {supabase_user_access_token}
 *
 * 필요한 Supabase Secrets (대시보드 → Project Settings → Edge Functions → Secrets):
 *   PORTONE_API_SECRET    — 포트원 V2 REST API 시크릿 (admin.portone.io → 내 식별코드)
 *   SUPABASE_URL          — 자동 주입
 *   SUPABASE_SERVICE_ROLE_KEY — 자동 주입
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── 환경 변수 ──────────────────────────────────
const PORTONE_API_SECRET       = Deno.env.get('PORTONE_API_SECRET') ?? ''
const SUPABASE_URL             = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// ── 플랜별 결제 금액 / 기간 (portonePayment.js PLANS와 동기화 필수) ──
const PLAN_CONFIG: Record<string, { amount: number; days: number }> = {
  d15: { amount: 29900, days: 15 },
  d30: { amount: 49900, days: 30 },
  d60: { amount: 79900, days: 60 },
  // 하위 호환
  pro:   { amount: 9900,  days: 30 },
  elite: { amount: 19900, days: 60 },
}

// ── CORS ──────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// ─────────────────────────────────────────────
serve(async (req) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    // 1. 요청 파싱
    const { paymentId, userId, plan } = await req.json()

    if (!paymentId || !userId || !plan) {
      return jsonRes({ error: '필수 파라미터(paymentId, userId, plan)가 없어요.' }, 400)
    }
    if (!PLAN_CONFIG[plan]) {
      return jsonRes({ error: `알 수 없는 플랜: ${plan}` }, 400)
    }

    // 2. Supabase 클라이언트 (service_role — RLS 우회)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 3. 호출자 인증 검증 (JWT로 실제 로그인 유저 확인)
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return jsonRes({ error: '인증 토큰이 없어요.' }, 401)
    }
    const accessToken = authHeader.replace('Bearer ', '')
    const { data: { user: callerUser }, error: authErr } =
      await supabase.auth.getUser(accessToken)

    if (authErr || !callerUser) {
      return jsonRes({ error: '인증에 실패했어요.' }, 401)
    }
    // 요청자와 userId가 일치해야 함 (타인 결제 위장 방지)
    if (callerUser.id !== userId) {
      return jsonRes({ error: '본인 결제만 검증할 수 있어요.' }, 403)
    }

    // 4. 중복 처리 방지 — 이미 검증된 paymentId이면 바로 성공 반환
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('status')
      .eq('payment_id', paymentId)
      .maybeSingle()

    if (existingPayment?.status === 'paid') {
      return jsonRes({ success: true, plan, alreadyVerified: true })
    }

    // 5. PortOne V2 REST API — 결제 조회
    if (!PORTONE_API_SECRET) {
      console.error('PORTONE_API_SECRET 환경변수가 없음')
      return jsonRes({ error: '서버 설정 오류 (PORTONE_API_SECRET 미설정)' }, 500)
    }

    const portoneRes = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: `PortOne ${PORTONE_API_SECRET}` } }
    )

    if (!portoneRes.ok) {
      console.error('PortOne API 오류', portoneRes.status, await portoneRes.text())
      return jsonRes({ error: '포트원 결제 조회에 실패했어요.' }, 502)
    }

    const payment = await portoneRes.json()

    // 6. 상태 검증
    if (payment.status !== 'PAID') {
      // 실패/취소 결제 기록 저장
      await supabase.from('payments').upsert(
        { user_id: userId, payment_id: paymentId, plan,
          amount: payment.amount?.total ?? 0, status: 'failed',
          portone_raw: payment, updated_at: new Date().toISOString() },
        { onConflict: 'payment_id' }
      )
      return jsonRes({ error: `결제가 완료되지 않았어요. (status: ${payment.status})` }, 400)
    }

    // 7. 금액 검증 (위변조 방지)
    const planConf       = PLAN_CONFIG[plan]
    const expectedAmount = planConf.amount
    const actualAmount   = payment.amount?.total ?? 0
    if (actualAmount !== expectedAmount) {
      console.error(`금액 불일치: expected=${expectedAmount}, actual=${actualAmount}`)
      return jsonRes({ error: '결제 금액이 일치하지 않아요.' }, 400)
    }

    // 8. subscriptions 업데이트 — 플랜별 일수 기반 expires_at 계산
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + planConf.days)

    const { error: subErr } = await supabase.from('subscriptions').upsert(
      {
        user_id:    userId,
        paid:       true,
        plan,
        payment_id: paymentId,
        paid_at:    new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    if (subErr) {
      console.error('subscriptions upsert 오류:', subErr)
      return jsonRes({ error: '구독 정보 업데이트에 실패했어요.' }, 500)
    }

    // 9. payments 기록
    await supabase.from('payments').upsert(
      {
        user_id:     userId,
        payment_id:  paymentId,
        plan,
        amount:      actualAmount,
        status:      'paid',
        portone_raw: payment,
        updated_at:  new Date().toISOString(),
      },
      { onConflict: 'payment_id' }
    )

    // 10. orders 기록 (목표 달성형 KPI용)
    const { error: orderErr } = await supabase.from('orders').insert({
      user_id:   userId,
      plan_type: plan,
      amount:    actualAmount,
      paid_at:   new Date().toISOString(),
    })
    if (orderErr) {
      console.error('orders insert 오류:', orderErr)
      // orders는 KPI용이라 실패해도 결제 성공 자체는 유지
    }

    // 11. users 플랜 정보 업데이트 (plan_type, plan_started_at)
    const { error: userErr } = await supabase
      .from('users')
      .update({
        plan_type:       plan,
        plan_started_at: new Date().toISOString(),
      })
      .eq('id', userId)
    if (userErr) {
      console.error('users plan 업데이트 오류:', userErr)
      // 마찬가지로 결제 성공에는 영향 주지 않음
    }

    return jsonRes({ success: true, plan, expiresAt: expiresAt.toISOString() })

  } catch (err) {
    console.error('verify-portone-payment 예외:', err)
    return jsonRes({ error: '서버 오류가 발생했어요.' }, 500)
  }
})

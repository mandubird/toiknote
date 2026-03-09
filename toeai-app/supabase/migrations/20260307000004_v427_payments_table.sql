-- v4.27: PortOne V2 결제 검증 — payments 감사 테이블 + subscriptions 추적 컬럼
-- Supabase Edge Function (verify-portone-payment)이 service_role 키로 INSERT/UPDATE

-- ──────────────────────────────────────────────
-- 1. payments 감사 테이블 (결제 원장)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id    TEXT        NOT NULL UNIQUE,   -- 포트원 paymentId
  plan          TEXT        NOT NULL CHECK (plan IN ('pro', 'elite')),
  amount        INT         NOT NULL,           -- 실제 결제 금액 (원)
  status        TEXT        NOT NULL DEFAULT 'pending',  -- pending | paid | failed
  portone_raw   JSONB,                          -- 포트원 API 응답 원문
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_user_id_idx   ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS payments_payment_id_idx ON public.payments(payment_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 본인 결제 내역만 조회 가능
DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
CREATE POLICY "payments_select_own" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE  public.payments           IS '포트원 V2 결제 원장 (Edge Function이 service_role로 기록)';
COMMENT ON COLUMN public.payments.payment_id IS '포트원 V2 paymentId (toeodap_{plan}_{ts}_{rand})';
COMMENT ON COLUMN public.payments.portone_raw IS '포트원 GET /payments/{id} 응답 원문 (검증용)';

-- ──────────────────────────────────────────────
-- 2. subscriptions 추적 컬럼 추가
-- ──────────────────────────────────────────────
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_id  TEXT,            -- 가장 최근 포트원 paymentId
  ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ,     -- 구독 만료일 (paid_at + 1개월)
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN public.subscriptions.payment_id IS '가장 최근 포트원 paymentId';
COMMENT ON COLUMN public.subscriptions.expires_at IS '구독 만료일 — Edge Function이 paid_at + 1개월로 세팅';

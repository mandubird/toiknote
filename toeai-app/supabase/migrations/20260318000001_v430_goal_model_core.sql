-- v4.30: 목표 달성형 모델 핵심 스키마
-- 1) users 확장: plan_type, plan_started_at, activated_at
-- 2) orders: 결제 내역
-- 3) 코칭/후기/KPI용 로그 테이블(coaching_logs, proof_assets, dm_logs)

-- 1) users 컬럼 확장
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plan_type TEXT,
  ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.plan_type       IS '15일/30일/60일 등 현재 이용 플랜 타입 (예: d15, d30, d60)';
COMMENT ON COLUMN public.users.plan_started_at IS '현재 플랜 시작 시각 (결제 직후)';
COMMENT ON COLUMN public.users.activated_at    IS '결제 후 온보딩 핵심 3단계(약점 TOP3, 오늘 할 일 3개, 오답 1개 이상) 완료 시각';

-- 2) orders: 결제 내역 및 플랜 구매 기록
CREATE TABLE IF NOT EXISTS public.orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type   TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  paid_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'orders_select_own'
  ) THEN
    CREATE POLICY "orders_select_own" ON public.orders
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'orders_insert_own'
  ) THEN
    CREATE POLICY "orders_insert_own" ON public.orders
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 3) coaching_logs: 코칭 화면 진입 이력 (7일 사용률 집계)
CREATE TABLE IF NOT EXISTS public.coaching_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.coaching_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coaching_logs' AND policyname = 'coaching_logs_select_own'
  ) THEN
    CREATE POLICY "coaching_logs_select_own" ON public.coaching_logs
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coaching_logs' AND policyname = 'coaching_logs_insert_own'
  ) THEN
    CREATE POLICY "coaching_logs_insert_own" ON public.coaching_logs
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 4) proof_assets: 후기/증거 자산 (랜딩/운영용)
CREATE TABLE IF NOT EXISTS public.proof_assets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,       -- 'review' | 'before_after' | 'insight'
  content    TEXT,
  image_url  TEXT,
  is_public  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.proof_assets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'proof_assets' AND policyname = 'proof_assets_select_own'
  ) THEN
    CREATE POLICY "proof_assets_select_own" ON public.proof_assets
      FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'proof_assets' AND policyname = 'proof_assets_insert_own'
  ) THEN
    CREATE POLICY "proof_assets_insert_own" ON public.proof_assets
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 5) dm_logs: DM 발송 이력 (운영용)
CREATE TABLE IF NOT EXISTS public.dm_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage      INTEGER NOT NULL,         -- 1: 활성화 유도, 2: 실행 유도, 3: 후기 요청
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note       TEXT
);

ALTER TABLE public.dm_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dm_logs' AND policyname = 'dm_logs_select_own'
  ) THEN
    CREATE POLICY "dm_logs_select_own" ON public.dm_logs
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dm_logs' AND policyname = 'dm_logs_insert_own'
  ) THEN
    CREATE POLICY "dm_logs_insert_own" ON public.dm_logs
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


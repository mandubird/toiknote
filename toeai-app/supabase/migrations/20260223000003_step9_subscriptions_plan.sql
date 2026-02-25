-- STEP 9: 결제 연동 — 구독 플랜(Pro/Elite) 저장
-- subscriptions에 plan 컬럼 추가

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'elite'));

COMMENT ON COLUMN public.subscriptions.plan IS '구독 플랜: free | pro | elite';

-- 기존 paid=true 행은 pro로 통일
UPDATE public.subscriptions SET plan = 'pro' WHERE paid = TRUE AND plan = 'free';

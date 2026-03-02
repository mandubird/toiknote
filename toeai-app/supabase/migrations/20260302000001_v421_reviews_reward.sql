-- v4.21: 후기 시스템 + 후기 보상 구조
-- 1) users 확장 (is_admin, review_reward_given)
-- 2) reviews 테이블 + RLS
-- 3) pricing_plans 베타가 row

-- 1) users 확장
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS review_reward_given BOOLEAN DEFAULT FALSE;

-- 2) reviews 테이블
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  score_before INT CHECK (score_before IS NULL OR (score_before >= 200 AND score_before <= 990)),
  score_after  INT CHECK (score_after  IS NULL OR (score_after  >= 200 AND score_after  <= 990)),
  helpful_feature TEXT,
  content TEXT NOT NULL CHECK (char_length(content) >= 200),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  approved BOOLEAN DEFAULT FALSE,
  rewarded BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES public.users(id),
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON public.reviews(approved);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_unique ON public.reviews(user_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_approved" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_select_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_admin_all" ON public.reviews;

CREATE POLICY "reviews_select_approved" ON public.reviews FOR SELECT USING (approved = TRUE);
CREATE POLICY "reviews_insert_own" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_select_own" ON public.reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reviews_admin_all" ON public.reviews FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- 3) pricing_plans 베타가
INSERT INTO public.pricing_plans (plan_name, price, original_price, currency, is_active)
VALUES ('8week_beta', 49000, 129000, 'KRW', true)
ON CONFLICT (plan_name) DO NOTHING;

UPDATE public.pricing_plans SET is_active = false WHERE plan_name = '8week_program';

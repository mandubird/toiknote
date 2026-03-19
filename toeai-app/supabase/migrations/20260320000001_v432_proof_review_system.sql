-- v4.32: 후기 시스템( proof_assets 확장 ) + 보상 RPC + 트리거 RPC + review_rewards
-- 스펙: docs/26.03.19_후기시스템_결제전환_cursor_spec.md

-- ── 1) proof_assets 컬럼 확장 ─────────────────────────────────────────
ALTER TABLE public.proof_assets
  ADD COLUMN IF NOT EXISTS headline           TEXT,
  ADD COLUMN IF NOT EXISTS start_score        INTEGER,
  ADD COLUMN IF NOT EXISTS current_score      INTEGER,
  ADD COLUMN IF NOT EXISTS target_score       INTEGER,
  ADD COLUMN IF NOT EXISTS usage_days         INTEGER,
  ADD COLUMN IF NOT EXISTS best_feature       TEXT,
  ADD COLUMN IF NOT EXISTS main_weakness_tag  TEXT,
  ADD COLUMN IF NOT EXISTS review_stage       INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reward_granted     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reward_type        TEXT,
  ADD COLUMN IF NOT EXISTS consent_public     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_featured        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_at        TIMESTAMPTZ;

COMMENT ON COLUMN public.proof_assets.review_stage IS '1: 헤드라인만 | 2: 전체 후기';
COMMENT ON COLUMN public.proof_assets.approved_at IS '운영자 승인 시각 — NULL이면 미승인, 공개 시 필수';

-- 유저당 type=review 행 1개 (앱에서 1단계→2단계는 UPDATE)
CREATE UNIQUE INDEX IF NOT EXISTS proof_assets_one_review_per_user
  ON public.proof_assets (user_id)
  WHERE type = 'review';

-- ── 2) RLS: 본인 UPDATE + 관리자 조회/승인 ─────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'proof_assets' AND policyname = 'proof_assets_update_own'
  ) THEN
    CREATE POLICY "proof_assets_update_own" ON public.proof_assets
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'proof_assets' AND policyname = 'proof_assets_admin_select'
  ) THEN
    CREATE POLICY "proof_assets_admin_select" ON public.proof_assets
      FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = TRUE)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'proof_assets' AND policyname = 'proof_assets_admin_update'
  ) THEN
    CREATE POLICY "proof_assets_admin_update" ON public.proof_assets
      FOR UPDATE
      USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = TRUE)
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = TRUE)
      );
  END IF;
END $$;

-- ── 3) review_rewards ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.review_rewards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id    UUID REFERENCES public.proof_assets(id) ON DELETE SET NULL,
  reward_step INTEGER NOT NULL,
  days_added  INTEGER NOT NULL,
  given_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, reward_step)
);

CREATE INDEX IF NOT EXISTS review_rewards_user_idx ON public.review_rewards (user_id);

ALTER TABLE public.review_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_rewards_own" ON public.review_rewards;
CREATE POLICY "review_rewards_own" ON public.review_rewards
  FOR SELECT USING (auth.uid() = user_id);

-- ── 4) RPC: 후기 요청 팝업 트리거 (1단계 미작성자만) ───────────────────
CREATE OR REPLACE FUNCTION public.check_review_trigger()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_wrong_count INTEGER;
  v_strategy_count INTEGER;
  v_days_since_payment INTEGER;
  v_coaching_days INTEGER;
  v_exam_d14 BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN '{"should_show": false}'::JSONB;
  END IF;

  -- 이미 후기 행이 있으면(1단계라도 완료) 자동 팝업 없음 — 2단계는 앱에서 별도 유도
  IF EXISTS (
    SELECT 1 FROM public.proof_assets
    WHERE user_id = v_user_id AND type = 'review'
  ) THEN
    RETURN '{"should_show": false}'::JSONB;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_wrong_count
  FROM public.wrong_answers WHERE user_id = v_user_id;

  SELECT COUNT(*)::INTEGER INTO v_strategy_count
  FROM public.strategy_cache WHERE user_id = v_user_id;

  SELECT EXTRACT(DAY FROM (NOW() - MIN(s.paid_at)))::INTEGER INTO v_days_since_payment
  FROM public.subscriptions s
  WHERE s.user_id = v_user_id AND s.paid = TRUE AND s.paid_at IS NOT NULL;

  SELECT COUNT(DISTINCT (cl.created_at::DATE))::INTEGER INTO v_coaching_days
  FROM public.coaching_logs cl
  WHERE cl.user_id = v_user_id;

  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = v_user_id
      AND u.exam_date IS NOT NULL
      AND u.exam_date >= CURRENT_DATE
      AND (u.exam_date - CURRENT_DATE) <= 14
  ) INTO v_exam_d14;

  IF (COALESCE(v_wrong_count, 0) >= 10)
     OR (COALESCE(v_strategy_count, 0) >= 2)
     OR (v_days_since_payment IS NOT NULL AND v_days_since_payment BETWEEN 5 AND 7)
     OR (COALESCE(v_coaching_days, 0) >= 3)
     OR v_exam_d14
  THEN
    RETURN '{"should_show": true}'::JSONB;
  END IF;

  RETURN '{"should_show": false}'::JSONB;
END;
$$;

REVOKE ALL ON FUNCTION public.check_review_trigger() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_review_trigger() TO authenticated;

-- ── 5) RPC: 보상 지급 (구독 expires_at 연장) ───────────────────────────
CREATE OR REPLACE FUNCTION public.grant_review_reward(
  p_asset_id UUID,
  p_stage INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_days INTEGER;
  v_reward_type TEXT;
  v_already_rewarded BOOLEAN;
  v_new_expires TIMESTAMPTZ;
  v_consent BOOLEAN;
  v_updated INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN '{"success": false, "reason": "not_authenticated"}'::JSONB;
  END IF;

  IF p_stage NOT IN (1, 2) THEN
    RETURN '{"success": false, "reason": "invalid_stage"}'::JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.proof_assets pa
    WHERE pa.id = p_asset_id AND pa.user_id = v_user_id AND pa.type = 'review'
  ) THEN
    RETURN '{"success": false, "reason": "asset_not_found"}'::JSONB;
  END IF;

  IF p_stage = 2 THEN
    SELECT consent_public INTO v_consent
    FROM public.proof_assets
    WHERE id = p_asset_id AND user_id = v_user_id;

    IF NOT COALESCE(v_consent, FALSE) THEN
      RETURN '{"success": false, "reason": "consent_required_for_stage2"}'::JSONB;
    END IF;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.review_rewards
    WHERE user_id = v_user_id AND reward_step = p_stage
  ) INTO v_already_rewarded;

  IF v_already_rewarded THEN
    RETURN '{"success": false, "reason": "already_rewarded"}'::JSONB;
  END IF;

  v_days := CASE p_stage WHEN 1 THEN 3 WHEN 2 THEN 5 ELSE 0 END;
  v_reward_type := CASE p_stage WHEN 1 THEN '3days' WHEN 2 THEN '5days' ELSE NULL END;

  UPDATE public.subscriptions
  SET
    expires_at = GREATEST(COALESCE(expires_at, NOW()), NOW()) + (v_days || ' days')::INTERVAL,
    updated_at = NOW()
  WHERE user_id = v_user_id AND paid = TRUE;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN '{"success": false, "reason": "no_paid_subscription"}'::JSONB;
  END IF;

  SELECT expires_at INTO v_new_expires
  FROM public.subscriptions
  WHERE user_id = v_user_id;

  INSERT INTO public.review_rewards (user_id, asset_id, reward_step, days_added)
  VALUES (v_user_id, p_asset_id, p_stage, v_days);

  UPDATE public.proof_assets
  SET reward_granted = TRUE, reward_type = v_reward_type
  WHERE id = p_asset_id AND user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'days_added', v_days,
    'reward_type', v_reward_type,
    'new_expires_at', v_new_expires
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_review_reward(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_review_reward(UUID, INTEGER) TO authenticated;

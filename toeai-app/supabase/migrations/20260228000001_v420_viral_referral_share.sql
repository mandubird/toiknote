-- v4.20: 바이럴 확산 - users 확장, referral_logs, share_logs

-- 1) users 확장
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by TEXT DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS share_reward_count INT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_count INT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bonus_days INT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS max_bonus_days INT DEFAULT 60;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS badge_level TEXT DEFAULT 'none';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_shared_at TIMESTAMPTZ DEFAULT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_badge_level_check') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_badge_level_check
    CHECK (badge_level IN ('none', 'challenger', 'elite', '900'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code) WHERE referral_code IS NOT NULL;

-- 2) referral_logs
CREATE TABLE IF NOT EXISTS public.referral_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  reward_days INT DEFAULT NULL,
  rewarded_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_referral_logs_referrer ON public.referral_logs(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_logs_referred ON public.referral_logs(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_logs_status ON public.referral_logs(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_unique ON public.referral_logs(referrer_user_id, referred_user_id);

ALTER TABLE public.referral_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referral_logs_select_own_referrer" ON public.referral_logs;
DROP POLICY IF EXISTS "referral_logs_select_own_referred" ON public.referral_logs;
DROP POLICY IF EXISTS "referral_logs_insert_own" ON public.referral_logs;
CREATE POLICY "referral_logs_select_own_referrer" ON public.referral_logs FOR SELECT USING (auth.uid() = referrer_user_id);
CREATE POLICY "referral_logs_select_own_referred" ON public.referral_logs FOR SELECT USING (auth.uid() = referred_user_id);
CREATE POLICY "referral_logs_insert_own" ON public.referral_logs FOR INSERT WITH CHECK (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

-- 3) share_logs
CREATE TABLE IF NOT EXISTS public.share_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL DEFAULT 'diagnosis_share' CHECK (share_type IN ('diagnosis_share', 'achievement_share', 'badge_share')),
  platform TEXT DEFAULT NULL CHECK (platform IS NULL OR platform IN ('kakao', 'instagram', 'twitter', 'facebook', 'link')),
  reward_days INT DEFAULT NULL,
  rewarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_logs_user_id ON public.share_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_share_logs_created_at ON public.share_logs(created_at);
-- 하루 1회 제한은 앱(rewardShareBonus)에서 today 조회로 적용. (created_at::date) 인덱스는 타임존으로 인해 IMMUTABLE 아님)

ALTER TABLE public.share_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "share_logs_select_own" ON public.share_logs;
DROP POLICY IF EXISTS "share_logs_insert_own" ON public.share_logs;
CREATE POLICY "share_logs_select_own" ON public.share_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "share_logs_insert_own" ON public.share_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

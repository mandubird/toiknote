-- v4.03: Stage1 진단 결과 + Stage3 점수 예측 + weekly_reports 확장
-- 1) diagnostic_results (진단 완료 시 1건 저장, 최신 기준 Week1 해제)
CREATE TABLE IF NOT EXISTS public.diagnostic_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rc_score INT NOT NULL DEFAULT 0 CHECK (rc_score >= 0 AND rc_score <= 495),
  lc_score INT NOT NULL DEFAULT 0 CHECK (lc_score >= 0 AND lc_score <= 495),
  part5_score INT DEFAULT NULL CHECK (part5_score IS NULL OR (part5_score >= 0 AND part5_score <= 495)),
  part6_score INT DEFAULT NULL,
  part7_score INT DEFAULT NULL,
  overall_score INT NOT NULL DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 990),
  weakest_part INT DEFAULT NULL CHECK (weakest_part IS NULL OR (weakest_part >= 5 AND weakest_part <= 7)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_results_user_id ON public.diagnostic_results(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_results_created_at ON public.diagnostic_results(user_id, created_at DESC);

ALTER TABLE public.diagnostic_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "diagnostic_results_select_own" ON public.diagnostic_results;
DROP POLICY IF EXISTS "diagnostic_results_insert_own" ON public.diagnostic_results;
CREATE POLICY "diagnostic_results_select_own" ON public.diagnostic_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "diagnostic_results_insert_own" ON public.diagnostic_results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2) users: 진단 완료 시점 (최초 1회만 갱신해도 됨, 또는 진단 유무는 diagnostic_results 존재로 판단)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS diagnostic_completed_at TIMESTAMPTZ DEFAULT NULL;

-- 3) score_prediction (Week4+ 노출, Pro 전용)
CREATE TABLE IF NOT EXISTS public.score_prediction (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  predicted_score INT NOT NULL DEFAULT 0 CHECK (predicted_score >= 0 AND predicted_score <= 990),
  confidence_rate NUMERIC DEFAULT NULL CHECK (confidence_rate IS NULL OR (confidence_rate >= 0 AND confidence_rate <= 100)),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.score_prediction ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "score_prediction_select_own" ON public.score_prediction;
DROP POLICY IF EXISTS "score_prediction_insert_own" ON public.score_prediction;
DROP POLICY IF EXISTS "score_prediction_update_own" ON public.score_prediction;
CREATE POLICY "score_prediction_select_own" ON public.score_prediction FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "score_prediction_insert_own" ON public.score_prediction FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "score_prediction_update_own" ON public.score_prediction FOR UPDATE USING (auth.uid() = user_id);

-- 4) weekly_reports (없으면 생성 후) 확장: completion_rate, ai_feedback
CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week INT NOT NULL CHECK (week >= 1 AND week <= 8),
  accuracy_change NUMERIC DEFAULT NULL,
  part7_time_change INT DEFAULT NULL,
  weak_tags_improvement JSONB DEFAULT '{}',
  estimated_score_start INT DEFAULT NULL,
  estimated_score_end INT DEFAULT NULL,
  score_improvement INT DEFAULT NULL,
  next_week_strategy TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week)
);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_user_id ON public.weekly_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week ON public.weekly_reports(week);
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "weekly_reports_select_own" ON public.weekly_reports;
DROP POLICY IF EXISTS "weekly_reports_insert_own" ON public.weekly_reports;
DROP POLICY IF EXISTS "weekly_reports_update_own" ON public.weekly_reports;
CREATE POLICY "weekly_reports_select_own" ON public.weekly_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "weekly_reports_insert_own" ON public.weekly_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weekly_reports_update_own" ON public.weekly_reports FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.weekly_reports ADD COLUMN IF NOT EXISTS completion_rate NUMERIC DEFAULT NULL;
ALTER TABLE public.weekly_reports ADD COLUMN IF NOT EXISTS ai_feedback TEXT DEFAULT NULL;
ALTER TABLE public.weekly_reports ADD COLUMN IF NOT EXISTS wrong_reduction_rate NUMERIC DEFAULT NULL;
ALTER TABLE public.weekly_reports ADD COLUMN IF NOT EXISTS wrong_reduction_count INT DEFAULT NULL;
ALTER TABLE public.weekly_reports ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT DEFAULT NULL;

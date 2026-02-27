-- v4.02: 주차 스냅샷 + weekly_reports 고가 필드
-- 1) weekly_snapshots
CREATE TABLE IF NOT EXISTS public.weekly_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week INT NOT NULL CHECK (week >= 1 AND week <= 8),
  snapshot_date TIMESTAMPTZ NOT NULL,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('week_start', 'week_end')),
  total_solved INT DEFAULT NULL,
  total_wrong INT DEFAULT NULL,
  total_correct INT DEFAULT NULL,
  accuracy_rate NUMERIC DEFAULT NULL,
  part_accuracy JSONB DEFAULT '{}',
  part_avg_time JSONB DEFAULT '{}',
  tag_wrong_counts JSONB DEFAULT '{}',
  estimated_score INT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_snapshots_user_week ON public.weekly_snapshots(user_id, week);
CREATE INDEX IF NOT EXISTS idx_weekly_snapshots_type ON public.weekly_snapshots(snapshot_type);

ALTER TABLE public.weekly_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weekly_snapshots_select_own" ON public.weekly_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "weekly_snapshots_insert_own" ON public.weekly_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2) weekly_reports 컬럼 확장 (오답 감소율 등)
ALTER TABLE public.weekly_reports ADD COLUMN IF NOT EXISTS wrong_reduction_rate NUMERIC DEFAULT NULL;
ALTER TABLE public.weekly_reports ADD COLUMN IF NOT EXISTS wrong_reduction_count INT DEFAULT NULL;
ALTER TABLE public.weekly_reports ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT DEFAULT NULL;

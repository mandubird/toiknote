-- v4.04: DB 확장 & 미구현 기능
-- 1) users.score_range
-- 2) program_status 'completed'
-- 3) pricing_plans
-- 4) weekly_report_files
-- 5) program_templates 900+

-- 1) users.score_range (진단 완료 시 고정, 재진단 시에만 갱신)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS score_range VARCHAR(20) DEFAULT NULL;

-- 허용값 제약 (선택: 적용 시 600-700, 700-800, 800-900, 900+ 만 허용)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_score_range_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_score_range_check
      CHECK (score_range IS NULL OR score_range IN ('600-700', '700-800', '800-900', '900+'));
  END IF;
END $$;

-- 2) program_status에 'completed' 추가 (기존 CHECK 제거 후 재생성)
DO $$
DECLARE
  cname TEXT;
BEGIN
  FOR cname IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%program_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', cname);
  END LOOP;
  ALTER TABLE public.users
    ADD CONSTRAINT users_program_status_check
    CHECK (program_status IN ('none', 'active', 'expired', 'completed'));
END $$;

-- 3) pricing_plans
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT NOT NULL UNIQUE,
  price INT NOT NULL CHECK (price >= 0),
  original_price INT DEFAULT NULL CHECK (original_price IS NULL OR original_price >= 0),
  currency TEXT NOT NULL DEFAULT 'KRW',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pricing_plans_read_all" ON public.pricing_plans FOR SELECT USING (true);

INSERT INTO public.pricing_plans (plan_name, price, original_price, currency, is_active)
VALUES ('8week_program', 99000, 129000, 'KRW', true)
ON CONFLICT (plan_name) DO NOTHING;

-- 4) weekly_report_files (PDF Storage URL 저장)
CREATE TABLE IF NOT EXISTS public.weekly_report_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week INT NOT NULL CHECK (week >= 1 AND week <= 8),
  file_url TEXT DEFAULT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week)
);

CREATE INDEX IF NOT EXISTS idx_weekly_report_files_user_week ON public.weekly_report_files(user_id, week);
ALTER TABLE public.weekly_report_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weekly_report_files_select_own" ON public.weekly_report_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "weekly_report_files_insert_own" ON public.weekly_report_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weekly_report_files_update_own" ON public.weekly_report_files FOR UPDATE USING (auth.uid() = user_id);

-- 5) program_templates 900+ (8주)
-- program_templates 테이블이 존재하는 경우에만 시드 데이터를 넣는다.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'program_templates'
  ) THEN
    INSERT INTO public.program_templates (target_range, week, focus_tags, focus_parts, daily_task_count, strategy_text) VALUES
    ('900+', 1, ARRAY['Part7 시간압축', '고난도 문법'], ARRAY[5, 7], 25, 'Part7 시간 압축 + Part5 고난도'),
    ('900+', 2, ARRAY['함정 유형 제거', '삼중지문'], ARRAY[7], 20, '함정 유형 제거·삼중지문 속도'),
    ('900+', 3, ARRAY['오답 패턴 제거', 'Paraphrasing'], ARRAY[7], 18, '오답 패턴 제거·Paraphrasing'),
    ('900+', 4, ARRAY['Part7 시간압축', '추론'], ARRAY[7], 15, 'Part7 시간 압축·추론 정확도'),
    ('900+', 5, ARRAY['LC 함정', 'Part2/3'], ARRAY[2, 3], 28, 'LC 함정 유형 제거'),
    ('900+', 6, ARRAY['실수 제로', '시간 관리'], ARRAY[1, 2, 3, 4, 5, 6, 7], 35, '실수 제로·전체 시간 관리'),
    ('900+', 7, ARRAY['모의고사 실전'], ARRAY[1, 2, 3, 4, 5, 6, 7], 40, '실전 시뮬레이션'),
    ('900+', 8, ARRAY['최종 점검', '900+ 유지'], ARRAY[5, 7], 20, '900+ 돌파 최종 점검')
    ON CONFLICT (target_range, week) DO NOTHING;
  END IF;
END $$;

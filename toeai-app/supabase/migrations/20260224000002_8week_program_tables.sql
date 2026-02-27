-- 8주 프로그램: users 확장 + program_templates, user_program_plans, weekly_reports
-- 전 파트 DB 기반 점수 구간 루틴·주간 리포트용

-- 1) users에 프로그램 상태 필드 추가
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS program_status TEXT DEFAULT 'none' CHECK (program_status IN ('none', 'active', 'expired'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS program_start_date TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS program_end_date TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_week INT DEFAULT 0 CHECK (current_week >= 0 AND current_week <= 8);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_week_update TIMESTAMPTZ DEFAULT NULL;

-- 2) program_templates (점수 구간별 8주 템플릿)
CREATE TABLE IF NOT EXISTS public.program_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_range TEXT NOT NULL,
  week INT NOT NULL CHECK (week >= 1 AND week <= 8),
  focus_tags TEXT[] DEFAULT '{}',
  focus_parts INT[] DEFAULT '{}',
  daily_task_count INT NOT NULL DEFAULT 20,
  strategy_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(target_range, week)
);

CREATE INDEX IF NOT EXISTS idx_program_templates_target_range ON public.program_templates(target_range);
CREATE INDEX IF NOT EXISTS idx_program_templates_week ON public.program_templates(week);

ALTER TABLE public.program_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "program_templates_read_all" ON public.program_templates FOR SELECT USING (true);

-- 샘플 데이터 (700-800, 800-900 구간)
INSERT INTO public.program_templates (target_range, week, focus_tags, focus_parts, daily_task_count, strategy_text) VALUES
('700-800', 1, ARRAY['시제', '수일치'], ARRAY[5], 20, 'Part 5 기초 문법 완성 주차'),
('700-800', 2, ARRAY['관계대명사', '접속사'], ARRAY[5, 6], 25, 'Part 5/6 연계 훈련 주차'),
('700-800', 3, ARRAY['단일지문', '추론'], ARRAY[7], 15, 'Part 7 단일지문 속도 향상'),
('700-800', 4, ARRAY['이중지문', 'Paraphrasing'], ARRAY[7], 12, 'Part 7 복수지문 집중'),
('700-800', 5, ARRAY['Part2 우회답변', 'Part3 상황파악'], ARRAY[2, 3], 30, 'LC 약점 보완 주차'),
('700-800', 6, ARRAY['Part4 의도파악', 'Part7 시간단축'], ARRAY[4, 7], 20, 'LC 고난도 + Part 7 속도'),
('700-800', 7, ARRAY['전체 파트 균형'], ARRAY[5, 6, 7], 30, '실전 모의고사 집중'),
('700-800', 8, ARRAY['약점 태그 집중'], ARRAY[5, 7], 25, '최종 점검 및 약점 제거'),
('800-900', 1, ARRAY['Part5 고난도', 'Part7 복수지문'], ARRAY[5, 7], 25, '고난도 문법 + 복수지문 전략'),
('800-900', 2, ARRAY['Part7 추론', 'Paraphrasing'], ARRAY[7], 20, 'Part 7 변별력 유형 집중'),
('800-900', 3, ARRAY['시간 단축', '삼중지문'], ARRAY[7], 15, 'Part 7 시간 압박 훈련'),
('800-900', 4, ARRAY['Part2 함정', 'Part3 세부정보'], ARRAY[2, 3], 30, 'LC 만점 전략'),
('800-900', 5, ARRAY['Part4 추론', 'Part6 문맥'], ARRAY[4, 6], 25, 'LC/RC 고난도 연계'),
('800-900', 6, ARRAY['실수 유형', '시간 관리'], ARRAY[5, 6, 7], 30, '실수 제로 훈련'),
('800-900', 7, ARRAY['모의고사 실전'], ARRAY[1, 2, 3, 4, 5, 6, 7], 40, '실전 시뮬레이션'),
('800-900', 8, ARRAY['최종 약점', '멘탈 관리'], ARRAY[5, 7], 20, '900 돌파 마지막 점검')
ON CONFLICT (target_range, week) DO NOTHING;

-- 3) user_program_plans (사용자별 주차 계획·기록)
CREATE TABLE IF NOT EXISTS public.user_program_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week INT NOT NULL CHECK (week >= 1 AND week <= 8),
  focus_tags TEXT[] DEFAULT '{}',
  focus_parts INT[] DEFAULT '{}',
  daily_task_count INT NOT NULL DEFAULT 20,
  strategy_text TEXT DEFAULT '',
  completed_tasks INT DEFAULT 0,
  accuracy_start NUMERIC DEFAULT NULL,
  accuracy_end NUMERIC DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week)
);

CREATE INDEX IF NOT EXISTS idx_user_program_plans_user_id ON public.user_program_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_program_plans_week ON public.user_program_plans(week);

ALTER TABLE public.user_program_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_program_plans_select_own" ON public.user_program_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_program_plans_insert_own" ON public.user_program_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_program_plans_update_own" ON public.user_program_plans FOR UPDATE USING (auth.uid() = user_id);

-- 4) weekly_reports (주간 리포트)
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
CREATE POLICY "weekly_reports_select_own" ON public.weekly_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "weekly_reports_insert_own" ON public.weekly_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weekly_reports_update_own" ON public.weekly_reports FOR UPDATE USING (auth.uid() = user_id);

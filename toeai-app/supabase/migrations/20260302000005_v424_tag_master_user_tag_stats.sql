-- v4.24: tag_master + question_tags(wrong_answers) + user_tag_stats + focus_tag_ids
-- ⚠️ tag_weights 테이블은 유지 (기존 코드 호환). 점진적 전환 시 tag_master 사용.

-- 1) tag_master
CREATE TABLE IF NOT EXISTS public.tag_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_code VARCHAR(10) UNIQUE NOT NULL,
  tag_name VARCHAR(150) NOT NULL,
  category VARCHAR(30) NOT NULL,
  part VARCHAR(10),
  depth INTEGER DEFAULT 1,
  weight NUMERIC DEFAULT 1.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tag_master_category ON public.tag_master(category);
CREATE INDEX IF NOT EXISTS idx_tag_master_part ON public.tag_master(part);
CREATE INDEX IF NOT EXISTS idx_tag_master_code ON public.tag_master(tag_code);

ALTER TABLE public.tag_master ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tag_master_read_all" ON public.tag_master;
CREATE POLICY "tag_master_read_all" ON public.tag_master FOR SELECT USING (true);

-- 시드: 카테고리별 대표 태그 (전체 812개는 CSV/관리자로 추가)
INSERT INTO public.tag_master (tag_code, tag_name, category, part, depth, weight) VALUES
('G-001', 'SV Basic Singular/Plural', 'GRAMMAR', 'P5', 1, 1.0),
('G-031', 'Tense Present Fact', 'GRAMMAR', 'P5', 1, 1.0),
('V-001', 'Vocabulary Basic', 'VOCAB', 'P5', 1, 1.0),
('P5-001', 'Part5 Grammar', 'P5', 'P5', 1, 1.2),
('P6-001', 'Part6 Context', 'P6', 'P6', 1, 1.1),
('P7-001', 'Part7 Single Passage', 'P7', 'P7', 1, 1.4),
('P7-091', 'Trap Similar Word', 'P7', 'P7', 2, 1.5),
('LC-031', 'LC Part2 WH Question', 'LC', 'LC', 1, 1.0),
('M-001', 'Time Over 90s', 'META', NULL, 1, 1.5),
('M-002', 'Rush Guess Pattern', 'META', NULL, 1, 1.5)
ON CONFLICT (tag_code) DO NOTHING;

-- 2) question_tags (question_id = wrong_answers.id, 레거시 호환)
CREATE TABLE IF NOT EXISTS public.question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.wrong_answers(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tag_master(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_tags_question ON public.question_tags(question_id);
CREATE INDEX IF NOT EXISTS idx_question_tags_tag ON public.question_tags(tag_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_question_tag_unique ON public.question_tags(question_id, tag_id);

ALTER TABLE public.question_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "question_tags_select_own" ON public.question_tags;
CREATE POLICY "question_tags_select_own" ON public.question_tags FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.wrong_answers w WHERE w.id = question_id AND w.user_id = auth.uid()));
DROP POLICY IF EXISTS "question_tags_insert_own" ON public.question_tags;
CREATE POLICY "question_tags_insert_own" ON public.question_tags FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.wrong_answers w WHERE w.id = question_id AND w.user_id = auth.uid()));

-- 3) user_tag_stats
CREATE TABLE IF NOT EXISTS public.user_tag_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tag_master(id) ON DELETE CASCADE,
  attempt_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  average_time_seconds NUMERIC DEFAULT 0,
  weakness_score NUMERIC DEFAULT 0,
  last_attempted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tag_stats_user ON public.user_tag_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tag_stats_weakness ON public.user_tag_stats(user_id, weakness_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_tag_stats_tag ON public.user_tag_stats(tag_id);

ALTER TABLE public.user_tag_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_tag_stats_select_own" ON public.user_tag_stats;
CREATE POLICY "user_tag_stats_select_own" ON public.user_tag_stats FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_tag_stats_insert_own" ON public.user_tag_stats;
CREATE POLICY "user_tag_stats_insert_own" ON public.user_tag_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_tag_stats_update_own" ON public.user_tag_stats;
CREATE POLICY "user_tag_stats_update_own" ON public.user_tag_stats FOR UPDATE USING (auth.uid() = user_id);

-- accuracy_rate는 애플리케이션에서 계산 (attempt_count, correct_count 기반). GENERATED 컬럼은 갱신 시 복잡하므로 제외.

-- 4) user_program_plans.focus_tag_ids (테이블이 있을 때만 추가)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_program_plans'
  ) THEN
    ALTER TABLE public.user_program_plans ADD COLUMN IF NOT EXISTS focus_tag_ids UUID[];
  END IF;
END $$;

-- v4.02: 태그 가중치, 정답률 추적, 점수 구간별 약점 패턴
-- 1) tag_weights
CREATE TABLE IF NOT EXISTS public.tag_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part INT NOT NULL CHECK (part >= 1 AND part <= 7),
  tag_name TEXT NOT NULL,
  score_impact_weight NUMERIC DEFAULT 1.0,
  difficulty_weight JSONB DEFAULT '{"1": 0.8, "2": 1.0, "3": 1.4}'::jsonb,
  score_range_weight JSONB DEFAULT '{"600-700": 1.2, "700-800": 1.0, "800-900": 0.9}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tag_weights_part_tag ON public.tag_weights(part, tag_name);
CREATE INDEX IF NOT EXISTS idx_tag_weights_part ON public.tag_weights(part);

ALTER TABLE public.tag_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tag_weights_read_all" ON public.tag_weights FOR SELECT USING (true);

-- Part 1
INSERT INTO public.tag_weights (part, tag_name, score_impact_weight, difficulty_weight, score_range_weight) VALUES
(1, '수동태함정', 1.3, '{"1": 1.0, "2": 1.2, "3": 1.5}'::jsonb, '{"600-700": 1.5, "700-800": 1.2, "800-900": 1.0}'::jsonb),
(1, '위치함정', 1.2, '{"1": 0.9, "2": 1.1, "3": 1.3}'::jsonb, '{"600-700": 1.4, "700-800": 1.1, "800-900": 0.9}'::jsonb),
(1, '유사발음', 1.1, '{"1": 0.8, "2": 1.0, "3": 1.2}'::jsonb, '{"600-700": 1.3, "700-800": 1.0, "800-900": 0.8}'::jsonb)
ON CONFLICT (part, tag_name) DO NOTHING;

-- Part 2,3,4 (대표 태그)
INSERT INTO public.tag_weights (part, tag_name, score_impact_weight, difficulty_weight, score_range_weight) VALUES
(2, '우회답변', 1.3, '{"1": 1.0, "2": 1.2, "3": 1.5}'::jsonb, '{"600-700": 1.2, "700-800": 1.2, "800-900": 1.0}'::jsonb),
(3, '세부정보', 1.2, '{"1": 0.9, "2": 1.1, "3": 1.4}'::jsonb, '{"600-700": 1.1, "700-800": 1.1, "800-900": 1.0}'::jsonb),
(4, '추론', 1.3, '{"1": 1.0, "2": 1.2, "3": 1.5}'::jsonb, '{"600-700": 1.2, "700-800": 1.2, "800-900": 1.2}'::jsonb)
ON CONFLICT (part, tag_name) DO NOTHING;

-- Part 5
INSERT INTO public.tag_weights (part, tag_name, score_impact_weight, difficulty_weight, score_range_weight) VALUES
(5, '시제', 1.4, '{"1": 1.1, "2": 1.3, "3": 1.6}'::jsonb, '{"600-700": 1.6, "700-800": 1.4, "800-900": 1.2}'::jsonb),
(5, '관계대명사', 1.5, '{"1": 1.2, "2": 1.4, "3": 1.7}'::jsonb, '{"600-700": 1.7, "700-800": 1.5, "800-900": 1.3}'::jsonb),
(5, '수일치', 1.3, '{"1": 1.0, "2": 1.2, "3": 1.5}'::jsonb, '{"600-700": 1.5, "700-800": 1.3, "800-900": 1.1}'::jsonb),
(5, '전치사', 1.4, '{"1": 1.0, "2": 1.3, "3": 1.5}'::jsonb, '{"600-700": 1.5, "700-800": 1.3, "800-900": 1.1}'::jsonb),
(5, '접속사', 1.4, '{"1": 1.0, "2": 1.3, "3": 1.5}'::jsonb, '{"600-700": 1.5, "700-800": 1.3, "800-900": 1.1}'::jsonb),
(5, '품사', 1.0, '{"1": 0.8, "2": 1.0, "3": 1.2}'::jsonb, '{"600-700": 1.2, "700-800": 1.0, "800-900": 0.8}'::jsonb),
(5, '어휘', 1.1, '{"1": 0.9, "2": 1.0, "3": 1.3}'::jsonb, '{"600-700": 1.3, "700-800": 1.1, "800-900": 1.0}'::jsonb)
ON CONFLICT (part, tag_name) DO NOTHING;

-- Part 6
INSERT INTO public.tag_weights (part, tag_name, score_impact_weight, difficulty_weight, score_range_weight) VALUES
(6, '문장삽입', 1.3, '{"1": 1.0, "2": 1.2, "3": 1.5}'::jsonb, '{"600-700": 1.4, "700-800": 1.2, "800-900": 1.0}'::jsonb),
(6, '문법', 1.2, '{"1": 0.9, "2": 1.1, "3": 1.4}'::jsonb, '{"600-700": 1.3, "700-800": 1.1, "800-900": 0.9}'::jsonb),
(6, '연결어', 1.3, '{"1": 1.0, "2": 1.2, "3": 1.5}'::jsonb, '{"600-700": 1.4, "700-800": 1.2, "800-900": 1.0}'::jsonb)
ON CONFLICT (part, tag_name) DO NOTHING;

-- Part 7
INSERT INTO public.tag_weights (part, tag_name, score_impact_weight, difficulty_weight, score_range_weight) VALUES
(7, '추론', 1.6, '{"1": 1.2, "2": 1.5, "3": 1.8}'::jsonb, '{"600-700": 1.4, "700-800": 1.6, "800-900": 1.8}'::jsonb),
(7, 'Paraphrasing', 1.5, '{"1": 1.1, "2": 1.4, "3": 1.7}'::jsonb, '{"600-700": 1.3, "700-800": 1.5, "800-900": 1.7}'::jsonb),
(7, '삼중지문', 1.4, '{"1": 1.0, "2": 1.3, "3": 1.6}'::jsonb, '{"600-700": 1.2, "700-800": 1.4, "800-900": 1.6}'::jsonb),
(7, '이중지문', 1.3, '{"1": 1.0, "2": 1.2, "3": 1.5}'::jsonb, '{"600-700": 1.2, "700-800": 1.3, "800-900": 1.4}'::jsonb),
(7, '단일지문', 1.0, '{"1": 0.8, "2": 1.0, "3": 1.2}'::jsonb, '{"600-700": 1.0, "700-800": 0.9, "800-900": 0.8}'::jsonb)
ON CONFLICT (part, tag_name) DO NOTHING;

-- ON CONFLICT requires UNIQUE; we have (part, tag_name) unique index but INSERT doesn't have ON CONFLICT (part, tag_name) - need to use something.
-- Postgres INSERT ... ON CONFLICT DO NOTHING requires unique constraint. Our unique is (part, tag_name). So we need:
-- INSERT ... ON CONFLICT (part, tag_name) DO NOTHING - but that's for unique constraint on (part, tag_name). We have idx_tag_weights_part_tag UNIQUE. So constraint name or column list. In PostgreSQL it's ON CONFLICT (part, tag_name) DO NOTHING.
-- Actually I used ON CONFLICT DO NOTHING which in PostgreSQL means "on any unique violation do nothing". So if we try to insert duplicate (part, tag_name) it will do nothing. But the unique index is on (part, tag_name) - we need to name it. Let me check: CREATE UNIQUE INDEX idx_tag_weights_part_tag ON public.tag_weights(part, tag_name). So conflict is on (part, tag_name). In PostgreSQL ON CONFLICT DO NOTHING without target means ignore any unique violation. So it's valid. But ON CONFLICT (part, tag_name) DO NOTHING is clearer. However there's no UNIQUE constraint, only UNIQUE INDEX - in PostgreSQL unique index supports ON CONFLICT (part, tag_name). Good.

-- 2) solved_questions (정답률 추적)
CREATE TABLE IF NOT EXISTS public.solved_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  part INT NOT NULL CHECK (part >= 1 AND part <= 7),
  question_number INT DEFAULT NULL,
  is_correct BOOLEAN NOT NULL,
  solving_time INT DEFAULT NULL,
  attempt_date TIMESTAMPTZ DEFAULT NOW(),
  session_type TEXT DEFAULT 'practice' CHECK (session_type IN ('mock_test', 'practice', 'review')),
  session_id UUID DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solved_questions_user_id ON public.solved_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_solved_questions_part ON public.solved_questions(part);
CREATE INDEX IF NOT EXISTS idx_solved_questions_attempt_date ON public.solved_questions(attempt_date);

ALTER TABLE public.solved_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solved_questions_select_own" ON public.solved_questions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "solved_questions_insert_own" ON public.solved_questions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3) accuracy_stats 뷰 (파트별 정답률)
DROP VIEW IF EXISTS public.accuracy_stats;
CREATE VIEW public.accuracy_stats AS
SELECT
  user_id,
  part,
  COUNT(*)::int AS total_solved,
  COUNT(*) FILTER (WHERE is_correct = TRUE)::int AS correct_count,
  COUNT(*) FILTER (WHERE is_correct = FALSE)::int AS wrong_count,
  ROUND(
    COUNT(*) FILTER (WHERE is_correct = TRUE)::numeric / NULLIF(COUNT(*), 0) * 100,
    1
  )::numeric AS accuracy_rate,
  ROUND(
    COUNT(*) FILTER (WHERE is_correct = TRUE AND attempt_date >= NOW() - INTERVAL '30 days')::numeric
    / NULLIF(COUNT(*) FILTER (WHERE attempt_date >= NOW() - INTERVAL '30 days'), 0) * 100,
    1
  )::numeric AS accuracy_rate_30d,
  ROUND(AVG(solving_time))::int AS avg_solving_time,
  ROUND(AVG(solving_time) FILTER (WHERE is_correct = TRUE))::int AS avg_time_correct,
  ROUND(AVG(solving_time) FILTER (WHERE is_correct = FALSE))::int AS avg_time_wrong
FROM public.solved_questions
GROUP BY user_id, part;

-- 4) score_band_patterns (점수 구간별 약점 패턴)
CREATE TABLE IF NOT EXISTS public.score_band_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_range TEXT NOT NULL UNIQUE,
  common_weaknesses JSONB NOT NULL DEFAULT '{}',
  recommended_strategy TEXT DEFAULT NULL,
  avg_improvement_60days INT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.score_band_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "score_band_patterns_read_all" ON public.score_band_patterns FOR SELECT USING (true);

INSERT INTO public.score_band_patterns (score_range, common_weaknesses, recommended_strategy, avg_improvement_60days) VALUES
('600-700',
 '{"primary": "문법 기본기 부족", "secondary": ["Part 5 전반", "Part 6 문맥"], "parts": {"5": {"weakness": "시제/수일치/품사", "priority": 1}, "6": {"weakness": "연결어/문장삽입", "priority": 2}, "7": {"weakness": "시간 부족", "priority": 3}}}'::jsonb,
 'Part 5 기초 문법 완성 후 Part 7 속도 향상 집중',
 80),
('700-800',
 '{"primary": "RC 시간 관리", "secondary": ["Part 7 복수지문", "Part 5 고난도"], "parts": {"5": {"weakness": "관계대명사/접속사", "priority": 2}, "7": {"weakness": "이중/삼중지문 시간", "priority": 1}, "2": {"weakness": "우회답변", "priority": 3}}}'::jsonb,
 'Part 7 시간 단축 최우선, Part 5는 정확도 유지',
 60),
('800-900',
 '{"primary": "Part 7 고난도 추론", "secondary": ["실수 제거", "LC 세부정보"], "parts": {"7": {"weakness": "추론/Paraphrasing", "priority": 1}, "5": {"weakness": "실수", "priority": 2}, "3": {"weakness": "세부정보", "priority": 3}}}'::jsonb,
 '실수 제로 + Part 7 추론 집중 + LC 만점 전략',
 40)
ON CONFLICT (score_range) DO UPDATE SET
  common_weaknesses = EXCLUDED.common_weaknesses,
  recommended_strategy = EXCLUDED.recommended_strategy,
  avg_improvement_60days = EXCLUDED.avg_improvement_60days;

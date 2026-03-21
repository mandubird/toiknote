-- v433: 문제유형 2단 + 태그 사전 + 오답-태그 로그 (명세 26.03.21)

-- 1) problem_types
CREATE TABLE IF NOT EXISTS public.problem_types (
  id BIGSERIAL PRIMARY KEY,
  part INT NOT NULL CHECK (part >= 1 AND part <= 7),
  category_level1 TEXT NOT NULL,
  category_level2 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (part, category_level1, category_level2)
);

CREATE INDEX IF NOT EXISTS idx_problem_types_part ON public.problem_types (part);

COMMENT ON TABLE public.problem_types IS '파트별 2단 문제유형 (1차/2차 카테고리)';

-- 2) tag_dictionary
CREATE TABLE IF NOT EXISTS public.tag_dictionary (
  id BIGSERIAL PRIMARY KEY,
  problem_type_id BIGINT NOT NULL REFERENCES public.problem_types (id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (problem_type_id, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_tag_dictionary_problem_type ON public.tag_dictionary (problem_type_id);

COMMENT ON TABLE public.tag_dictionary IS '문제유형별 추천 태그 사전';

-- 3) problem_tag_logs (사용자가 선택한 사전 태그)
CREATE TABLE IF NOT EXISTS public.problem_tag_logs (
  id BIGSERIAL PRIMARY KEY,
  problem_id UUID NOT NULL REFERENCES public.wrong_answers (id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES public.tag_dictionary (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (problem_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_problem_tag_logs_problem ON public.problem_tag_logs (problem_id);

COMMENT ON TABLE public.problem_tag_logs IS '오답 문제에 연결된 선택 태그(사전 기준)';

-- 4) wrong_answers: 선택한 문제유형 FK
ALTER TABLE public.wrong_answers
  ADD COLUMN IF NOT EXISTS problem_type_id BIGINT REFERENCES public.problem_types (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wrong_answers_problem_type ON public.wrong_answers (problem_type_id);

-- 5) RLS
ALTER TABLE public.problem_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_tag_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "problem_types_select_authenticated" ON public.problem_types;
CREATE POLICY "problem_types_select_authenticated"
  ON public.problem_types FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "tag_dictionary_select_authenticated" ON public.tag_dictionary;
CREATE POLICY "tag_dictionary_select_authenticated"
  ON public.tag_dictionary FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "problem_tag_logs_select_own" ON public.problem_tag_logs;
CREATE POLICY "problem_tag_logs_select_own"
  ON public.problem_tag_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wrong_answers wa
      WHERE wa.id = problem_tag_logs.problem_id AND wa.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "problem_tag_logs_insert_own" ON public.problem_tag_logs;
CREATE POLICY "problem_tag_logs_insert_own"
  ON public.problem_tag_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wrong_answers wa
      WHERE wa.id = problem_tag_logs.problem_id AND wa.user_id = auth.uid()
    )
  );

-- 6) save_wrong_note_with_stats: problem_type_id 저장 (인자 수 변경 → 기존 오버로드 제거 후 재생성)
DROP FUNCTION IF EXISTS public.save_wrong_note_with_stats(
  TEXT, INT, TEXT, TEXT, TEXT, TEXT, JSONB, INT, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, BOOLEAN, INT,
  TEXT, TEXT, BOOLEAN, TEXT, INT, BOOLEAN, BOOLEAN,
  TEXT, TEXT, BOOLEAN, TEXT, TEXT, INT
);

CREATE OR REPLACE FUNCTION public.save_wrong_note_with_stats(
  p_part TEXT,
  p_part_number INT,
  p_lc_or_rc TEXT,
  p_question TEXT,
  p_answer TEXT,
  p_explanation TEXT,
  p_tags JSONB,
  p_difficulty INT,
  p_source_image_url TEXT,
  p_image_url TEXT,
  p_grammar_category TEXT DEFAULT NULL,
  p_grammar_sub_type TEXT DEFAULT NULL,
  p_passage_type TEXT DEFAULT NULL,
  p_question_type TEXT DEFAULT NULL,
  p_question_pattern TEXT DEFAULT NULL,
  p_answer_type TEXT DEFAULT NULL,
  p_user_selected_tags JSONB DEFAULT '[]',
  p_timeout_flag BOOLEAN DEFAULT FALSE,
  p_solving_time INT DEFAULT NULL,
  p_part1_image_trap_type TEXT DEFAULT NULL,
  p_part1_keyword_missed TEXT DEFAULT NULL,
  p_part1_passive_voice_error BOOLEAN DEFAULT NULL,
  p_part3_question_type TEXT DEFAULT NULL,
  p_part3_set_position INT DEFAULT NULL,
  p_part3_preview_read BOOLEAN DEFAULT NULL,
  p_part3_concentration_drop BOOLEAN DEFAULT NULL,
  p_part4_lecture_type TEXT DEFAULT NULL,
  p_part4_question_type TEXT DEFAULT NULL,
  p_part4_note_taking BOOLEAN DEFAULT NULL,
  p_part6_blank_type TEXT DEFAULT NULL,
  p_part6_context_fail_reason TEXT DEFAULT NULL,
  p_reread_count INT DEFAULT NULL,
  p_problem_type_id BIGINT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_note_id UUID;
  v_tag_key TEXT;
  v_part_counts JSONB;
  v_tag_counts JSONB;
  v_lc_wrong INT;
  v_rc_wrong INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.wrong_answers (
    user_id, exam_type, part, part_number, lc_or_rc, question, answer, explanation,
    tags, difficulty, source_image_url, image_url,
    grammar_category, grammar_sub_type, passage_type, question_type, question_pattern, answer_type,
    user_selected_tags, timeout_flag, solving_time,
    part1_image_trap_type, part1_keyword_missed, part1_passive_voice_error,
    part3_question_type, part3_set_position, part3_preview_read, part3_concentration_drop,
    part4_lecture_type, part4_question_type, part4_note_taking,
    part6_blank_type, part6_context_fail_reason,
    reread_count,
    problem_type_id
  ) VALUES (
    v_user_id, 'toeic', COALESCE(NULLIF(TRIM(p_part), ''), 'Part ' || p_part_number),
    p_part_number, p_lc_or_rc, COALESCE(p_question, ''), COALESCE(p_answer, ''),
    COALESCE(p_explanation, ''), COALESCE(p_tags, '[]'),
    LEAST(3, GREATEST(1, COALESCE(p_difficulty, 2))),
    COALESCE(p_source_image_url, ''), COALESCE(p_image_url, ''),
    NULLIF(TRIM(p_grammar_category), ''), NULLIF(TRIM(p_grammar_sub_type), ''),
    NULLIF(TRIM(p_passage_type), ''), NULLIF(TRIM(p_question_type), ''),
    NULLIF(TRIM(p_question_pattern), ''), NULLIF(TRIM(p_answer_type), ''),
    COALESCE(p_user_selected_tags, '[]'::jsonb), COALESCE(p_timeout_flag, FALSE),
    (CASE WHEN p_solving_time IS NOT NULL AND p_solving_time >= 0 THEN p_solving_time ELSE NULL END),
    NULLIF(TRIM(p_part1_image_trap_type), ''), NULLIF(TRIM(p_part1_keyword_missed), ''), p_part1_passive_voice_error,
    NULLIF(TRIM(p_part3_question_type), ''), (CASE WHEN p_part3_set_position BETWEEN 1 AND 3 THEN p_part3_set_position ELSE NULL END), p_part3_preview_read, p_part3_concentration_drop,
    NULLIF(TRIM(p_part4_lecture_type), ''), NULLIF(TRIM(p_part4_question_type), ''), p_part4_note_taking,
    NULLIF(TRIM(p_part6_blank_type), ''), NULLIF(TRIM(p_part6_context_fail_reason), ''),
    (CASE WHEN p_reread_count IS NOT NULL AND p_reread_count >= 0 THEN p_reread_count ELSE NULL END),
    (CASE WHEN p_problem_type_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.problem_types pt WHERE pt.id = p_problem_type_id) THEN p_problem_type_id ELSE NULL END)
  )
  RETURNING id INTO v_note_id;

  INSERT INTO public.users (id, usage_count, last_updated)
  VALUES (v_user_id, 1, NOW())
  ON CONFLICT (id) DO UPDATE SET
    usage_count = public.users.usage_count + 1,
    last_updated = NOW();

  v_part_counts := COALESCE((
    SELECT part_counts FROM public.tag_stats WHERE user_id = v_user_id
  ), '{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0}'::jsonb);
  v_part_counts := jsonb_set(
    v_part_counts,
    ARRAY[p_part_number::TEXT],
    to_jsonb(COALESCE((v_part_counts->>p_part_number::TEXT)::INT, 0) + 1)
  );

  v_tag_counts := COALESCE((
    SELECT tag_counts FROM public.tag_stats WHERE user_id = v_user_id
  ), '{}'::jsonb);
  FOR v_tag_key IN SELECT jsonb_array_elements_text(COALESCE(p_tags, '[]'))
  LOOP
    v_tag_key := REPLACE(v_tag_key, '.', '_');
    v_tag_counts := jsonb_set(
      COALESCE(v_tag_counts, '{}'),
      ARRAY[v_tag_key],
      to_jsonb(COALESCE((v_tag_counts->>v_tag_key)::INT, 0) + 1),
      true
    );
  END LOOP;

  v_lc_wrong := 0;
  v_rc_wrong := 0;
  IF p_lc_or_rc = 'LC' THEN v_lc_wrong := 1; ELSE v_rc_wrong := 1; END IF;

  INSERT INTO public.tag_stats (user_id, tag_counts, part_counts, lc_wrong, rc_wrong, total_wrong, last_updated)
  VALUES (v_user_id, v_tag_counts, v_part_counts, v_lc_wrong, v_rc_wrong, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    tag_counts = public.tag_stats.tag_counts || v_tag_counts,
    part_counts = jsonb_set(
      COALESCE(public.tag_stats.part_counts, '{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0}'::jsonb),
      ARRAY[p_part_number::TEXT],
      to_jsonb(COALESCE((public.tag_stats.part_counts->>p_part_number::TEXT)::INT, 0) + 1)
    ),
    lc_wrong = public.tag_stats.lc_wrong + v_lc_wrong,
    rc_wrong = public.tag_stats.rc_wrong + v_rc_wrong,
    total_wrong = public.tag_stats.total_wrong + 1,
    last_updated = NOW();

  RETURN v_note_id;
END;
$$;

-- 새 시그니처 (마지막 인자 BIGINT)
GRANT EXECUTE ON FUNCTION public.save_wrong_note_with_stats(
  TEXT, INT, TEXT, TEXT, TEXT, TEXT, JSONB, INT, TEXT, TEXT,
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, BOOLEAN, INT,
  TEXT, TEXT, BOOLEAN, TEXT, INT, BOOLEAN, BOOLEAN,
  TEXT, TEXT, BOOLEAN, TEXT, TEXT, INT, BIGINT
) TO authenticated;

-- STEP 10: 풀이 시간(solving_time) + score_analytics 확장(weak_grammar, avg_part7, rc_strategy)
-- 누락 기능 보완용

-- 1) wrong_answers에 풀이 시간(초) 추가
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS solving_time INT DEFAULT NULL;
COMMENT ON COLUMN public.wrong_answers.solving_time IS '문제 풀이 시간(초). Part 7 등 시간 분석용';

-- 2) score_analytics 확장
ALTER TABLE public.score_analytics ADD COLUMN IF NOT EXISTS weak_grammar_top3 JSONB DEFAULT NULL;
ALTER TABLE public.score_analytics ADD COLUMN IF NOT EXISTS avg_part7_time NUMERIC DEFAULT NULL;
ALTER TABLE public.score_analytics ADD COLUMN IF NOT EXISTS rc_strategy_text TEXT DEFAULT NULL;
COMMENT ON COLUMN public.score_analytics.weak_grammar_top3 IS 'Part 5 취약 문법 상위 3. 예: ["시제", "관계대명사", "전치사"]';
COMMENT ON COLUMN public.score_analytics.avg_part7_time IS 'Part 7 평균 풀이 시간(초)';
COMMENT ON COLUMN public.score_analytics.rc_strategy_text IS 'RC 시간/전략 한 줄 설명';

-- 3) RPC에 solving_time 인자 추가 (INSERT에만 반영, 기존 시그니처 호환을 위해 마지막에 추가)
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
  p_solving_time INT DEFAULT NULL
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
    user_selected_tags, timeout_flag, solving_time
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
    (CASE WHEN p_solving_time IS NOT NULL AND p_solving_time >= 0 THEN p_solving_time ELSE NULL END)
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

GRANT EXECUTE ON FUNCTION public.save_wrong_note_with_stats(TEXT, INT, TEXT, TEXT, TEXT, TEXT, JSONB, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, BOOLEAN, INT) TO authenticated;

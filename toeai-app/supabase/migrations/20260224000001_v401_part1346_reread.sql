-- v4.01 전파트 통합: Part 1/3/4/6 세부 필드 + Part 7 재독 횟수
-- STEP 10 마이그레이션 실행 후 이 파일을 실행하세요.

-- 1) Part 1 (사진 묘사)
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS part1_image_trap_type TEXT;
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS part1_keyword_missed TEXT;
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS part1_passive_voice_error BOOLEAN DEFAULT NULL;

-- 2) Part 3 (대화문)
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS part3_question_type TEXT;
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS part3_set_position INT DEFAULT NULL;
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS part3_preview_read BOOLEAN DEFAULT NULL;
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS part3_concentration_drop BOOLEAN DEFAULT NULL;

-- 3) Part 4 (담화문)
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS part4_lecture_type TEXT;
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS part4_question_type TEXT;
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS part4_note_taking BOOLEAN DEFAULT NULL;

-- 4) Part 6 (문맥)
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS part6_blank_type TEXT;
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS part6_context_fail_reason TEXT;

-- 5) Part 7 재독 횟수
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS reread_count INT DEFAULT NULL;

COMMENT ON COLUMN public.wrong_answers.part1_image_trap_type IS 'Part 1 함정 유형: 동작함정, 위치함정, 유사발음, 수동태함정';
COMMENT ON COLUMN public.wrong_answers.part3_set_position IS 'Part 3 세트 내 문제 순서 1~3';
COMMENT ON COLUMN public.wrong_answers.reread_count IS 'Part 7 지문 재읽기 횟수 (독해 속도 분석용)';

-- 6) RPC 확장: 기존 19개 인자 + Part 1/3/4/6/7(v4.01) 옵션 인자
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
  p_reread_count INT DEFAULT NULL
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
    reread_count
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
    (CASE WHEN p_reread_count IS NOT NULL AND p_reread_count >= 0 THEN p_reread_count ELSE NULL END)
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

GRANT EXECUTE ON FUNCTION public.save_wrong_note_with_stats(TEXT, INT, TEXT, TEXT, TEXT, TEXT, JSONB, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, BOOLEAN, INT, TEXT, TEXT, BOOLEAN, TEXT, INT, BOOLEAN, BOOLEAN, TEXT, TEXT, BOOLEAN, TEXT, TEXT, INT) TO authenticated;

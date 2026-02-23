-- STEP 3: Part 5 문법 / Part 7 유형 / Part 2 패턴 세부 필드 추가
-- Supabase SQL Editor에서 기존 마이그레이션 실행 후, 이 파일 내용을 순서대로 실행하세요.

-- 1) wrong_answers 테이블에 세부 분석 컬럼 추가 (이미 있으면 무시)
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS grammar_category TEXT;
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS grammar_sub_type TEXT;
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS passage_type TEXT;
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS question_type TEXT;
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS question_pattern TEXT;
ALTER TABLE public.wrong_answers ADD COLUMN IF NOT EXISTS answer_type TEXT;

-- 2) RPC: 기존 인자 + 세부 필드(옵션) 추가
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
  p_answer_type TEXT DEFAULT NULL
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
  v_tag_val INT;
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
    grammar_category, grammar_sub_type, passage_type, question_type, question_pattern, answer_type
  ) VALUES (
    v_user_id, 'toeic', COALESCE(NULLIF(TRIM(p_part), ''), 'Part ' || p_part_number),
    p_part_number, p_lc_or_rc, COALESCE(p_question, ''), COALESCE(p_answer, ''),
    COALESCE(p_explanation, ''), COALESCE(p_tags, '[]'),
    LEAST(3, GREATEST(1, COALESCE(p_difficulty, 2))),
    COALESCE(p_source_image_url, ''), COALESCE(p_image_url, ''),
    NULLIF(TRIM(p_grammar_category), ''), NULLIF(TRIM(p_grammar_sub_type), ''),
    NULLIF(TRIM(p_passage_type), ''), NULLIF(TRIM(p_question_type), ''),
    NULLIF(TRIM(p_question_pattern), ''), NULLIF(TRIM(p_answer_type), '')
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
    v_tag_val := COALESCE((v_tag_counts->>v_tag_key)::INT, 0) + 1;
    v_tag_counts := jsonb_set(COALESCE(v_tag_counts, '{}'), ARRAY[v_tag_key], to_jsonb(v_tag_val), true);
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

GRANT EXECUTE ON FUNCTION public.save_wrong_note_with_stats(TEXT, INT, TEXT, TEXT, TEXT, TEXT, JSONB, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

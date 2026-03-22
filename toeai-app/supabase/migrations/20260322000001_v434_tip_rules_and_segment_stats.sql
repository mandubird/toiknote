-- v434: tip_rules 테이블 + get_segment_stats RPC

-- 1) tip_rules 테이블
CREATE TABLE IF NOT EXISTS public.tip_rules (
  id          BIGSERIAL PRIMARY KEY,
  part        INT,           -- NULL이면 파트 무관
  type        TEXT,          -- 문제유형 (추론, 시제 등). NULL이면 유형 무관
  pattern     TEXT,          -- 특수 패턴 (time_shortage, reread_heavy 등)
  min_count   INT DEFAULT 1, -- 해당 유형 오답 최소 횟수
  tip_text    TEXT NOT NULL,
  priority    INT DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tip_rules IS '약점 유형별 실전 팁 규칙 (rule-based 개인화)';

-- RLS
ALTER TABLE public.tip_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tip_rules_select_authenticated"
  ON public.tip_rules FOR SELECT TO authenticated USING (true);

-- 2) get_segment_stats RPC
-- wrong_answers.tags + problem_tag_logs 기반으로 세그먼트 통계 반환
CREATE OR REPLACE FUNCTION public.get_segment_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_weak_types JSONB;
  v_weak_tags JSONB;
  v_time_shortage_count INT;
  v_reread_heavy_count INT;
  v_total_count INT;
  v_part5_count INT;
  v_part6_count INT;
  v_part7_count INT;
BEGIN
  -- 총 오답 수
  SELECT COUNT(*) INTO v_total_count
  FROM wrong_answers
  WHERE user_id = p_user_id;

  -- 파트별 오답 수
  SELECT
    COUNT(*) FILTER (WHERE part_number = 5),
    COUNT(*) FILTER (WHERE part_number = 6),
    COUNT(*) FILTER (WHERE part_number = 7)
  INTO v_part5_count, v_part6_count, v_part7_count
  FROM wrong_answers
  WHERE user_id = p_user_id;

  -- 취약 문제유형 (problem_tag_logs 우선, 없으면 wrong_answers.tags 폴백)
  SELECT COALESCE(
    (
      SELECT jsonb_agg(jsonb_build_object('type', pt.category_level2, 'count', cnt))
      FROM (
        SELECT pt2.category_level2, COUNT(*) AS cnt
        FROM problem_tag_logs ptl
        JOIN wrong_answers wa ON wa.id = ptl.problem_id
        JOIN tag_dictionary td ON td.id = ptl.tag_id
        JOIN problem_types pt2 ON pt2.id = td.problem_type_id
        WHERE wa.user_id = p_user_id
        GROUP BY pt2.category_level2
        ORDER BY cnt DESC
        LIMIT 5
      ) sub
      JOIN problem_types pt ON pt.category_level2 = sub.category_level2
    ),
    (
      SELECT jsonb_agg(jsonb_build_object('type', tag, 'count', cnt))
      FROM (
        SELECT tag, COUNT(*) AS cnt
        FROM wrong_answers wa
        CROSS JOIN jsonb_array_elements_text(COALESCE(wa.tags, '[]')) AS tag
        WHERE wa.user_id = p_user_id
        GROUP BY tag
        ORDER BY cnt DESC
        LIMIT 5
      ) t
    )
  ) INTO v_weak_types;

  -- 취약 태그 (tag_dictionary 기반)
  SELECT jsonb_agg(jsonb_build_object('tag', td.tag_name, 'count', cnt))
  INTO v_weak_tags
  FROM (
    SELECT ptl.tag_id, COUNT(*) AS cnt
    FROM problem_tag_logs ptl
    JOIN wrong_answers wa ON wa.id = ptl.problem_id
    WHERE wa.user_id = p_user_id
    GROUP BY ptl.tag_id
    ORDER BY cnt DESC
    LIMIT 5
  ) sub
  JOIN tag_dictionary td ON td.id = sub.tag_id;

  -- 시간 부족 오답 수
  SELECT COUNT(*) INTO v_time_shortage_count
  FROM wrong_answers
  WHERE user_id = p_user_id AND timeout_flag = TRUE;

  -- 재독 많은 오답 수 (reread_count >= 2)
  SELECT COUNT(*) INTO v_reread_heavy_count
  FROM wrong_answers
  WHERE user_id = p_user_id AND reread_count >= 2;

  v_result := jsonb_build_object(
    'total_count',          v_total_count,
    'part5_count',          v_part5_count,
    'part6_count',          v_part6_count,
    'part7_count',          v_part7_count,
    'weak_types',           COALESCE(v_weak_types, '[]'::jsonb),
    'weak_tags',            COALESCE(v_weak_tags, '[]'::jsonb),
    'time_shortage_count',  v_time_shortage_count,
    'reread_heavy_count',   v_reread_heavy_count
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_segment_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_segment_stats(UUID) TO service_role;

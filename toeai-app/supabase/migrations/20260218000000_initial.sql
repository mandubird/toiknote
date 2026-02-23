-- 토답 (toeicodap.com) Supabase 스키마: users, wrong_answers, tag_stats, score_analytics, subscriptions

-- users: 사용자별 usage_count, 점수
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_count INT NOT NULL DEFAULT 0,
  current_score INT,
  target_score INT,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- wrong_answers: 오답 노트
CREATE TABLE IF NOT EXISTS public.wrong_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_type TEXT DEFAULT 'toeic',
  part TEXT NOT NULL DEFAULT '',
  part_number INT NOT NULL CHECK (part_number >= 1 AND part_number <= 7),
  lc_or_rc TEXT NOT NULL CHECK (lc_or_rc IN ('LC', 'RC')),
  question TEXT DEFAULT '',
  answer TEXT DEFAULT '',
  explanation TEXT DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]',
  difficulty INT NOT NULL DEFAULT 2 CHECK (difficulty >= 1 AND difficulty <= 3),
  source_image_url TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wrong_answers_user_created ON public.wrong_answers(user_id, created_at DESC);

ALTER TABLE public.wrong_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wrong_answers_select_own" ON public.wrong_answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wrong_answers_insert_own" ON public.wrong_answers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- tag_stats: 사용자별 태그/파트 통계 (1 row per user)
CREATE TABLE IF NOT EXISTS public.tag_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_counts JSONB NOT NULL DEFAULT '{}',
  part_counts JSONB NOT NULL DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":0}',
  lc_wrong INT NOT NULL DEFAULT 0,
  rc_wrong INT NOT NULL DEFAULT 0,
  total_wrong INT NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tag_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tag_stats_select_own" ON public.tag_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tag_stats_insert_own" ON public.tag_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tag_stats_update_own" ON public.tag_stats FOR UPDATE USING (auth.uid() = user_id);

-- score_analytics: 전략 분석 결과 (1 row per user)
CREATE TABLE IF NOT EXISTS public.score_analytics (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  priority_focus TEXT,
  daily_plan TEXT,
  weekly_goal TEXT,
  expected_improvement TEXT,
  specific_tips JSONB DEFAULT '[]',
  last_analyzed_at TIMESTAMPTZ
);

ALTER TABLE public.score_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "score_analytics_select_own" ON public.score_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "score_analytics_insert_own" ON public.score_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "score_analytics_update_own" ON public.score_analytics FOR UPDATE USING (auth.uid() = user_id);

-- subscriptions: 구독(결제) 여부
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMPTZ
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_insert_own" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subscriptions_update_own" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- RPC: 오답 1건 저장 + users.usage_count, tag_stats 원자적 갱신
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
  p_image_url TEXT
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
  v_part_key TEXT;
  v_part_val INT;
  v_part_counts JSONB;
  v_tag_counts JSONB;
  v_lc_wrong INT;
  v_rc_wrong INT;
  v_total INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.wrong_answers (
    user_id, exam_type, part, part_number, lc_or_rc, question, answer, explanation,
    tags, difficulty, source_image_url, image_url
  ) VALUES (
    v_user_id, 'toeic', COALESCE(NULLIF(TRIM(p_part), ''), 'Part ' || p_part_number),
    p_part_number, p_lc_or_rc, COALESCE(p_question, ''), COALESCE(p_answer, ''),
    COALESCE(p_explanation, ''), COALESCE(p_tags, '[]'),
    LEAST(3, GREATEST(1, COALESCE(p_difficulty, 2))),
    COALESCE(p_source_image_url, ''), COALESCE(p_image_url, '')
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
    ARRAY[ p_part_number::TEXT ],
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
  VALUES (
    v_user_id, v_tag_counts, v_part_counts, v_lc_wrong, v_rc_wrong, 1, NOW()
  )
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

GRANT EXECUTE ON FUNCTION public.save_wrong_note_with_stats(TEXT, INT, TEXT, TEXT, TEXT, TEXT, JSONB, INT, TEXT, TEXT) TO authenticated;

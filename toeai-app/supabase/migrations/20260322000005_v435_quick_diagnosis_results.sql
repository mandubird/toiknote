-- v435: quick_diagnosis_results 테이블
-- 초간단 진단 결과 영구 저장 (재진입 시 결과 유지 + result_payload 재렌더링)

CREATE TABLE IF NOT EXISTS public.quick_diagnosis_results (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  current_score integer   NOT NULL,
  target_score  integer   NOT NULL,
  hardest_part  text      NOT NULL,
  result_payload jsonb    NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 사용자별 최신순 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_qdr_user_created
  ON public.quick_diagnosis_results(user_id, created_at DESC);

-- RLS
ALTER TABLE public.quick_diagnosis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qdr_owner" ON public.quick_diagnosis_results
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

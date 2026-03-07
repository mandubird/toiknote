-- v4.26: 오답 클리어(마스터) 기능
-- wrong_answers: 클리어 시점 저장
ALTER TABLE public.wrong_answers
  ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_wrong_answers_cleared_at ON public.wrong_answers(cleared_at)
  WHERE cleared_at IS NOT NULL;

-- weekly_reports: 이 주에 클리어한 문제 수
ALTER TABLE public.weekly_reports
  ADD COLUMN IF NOT EXISTS cleared_count INT DEFAULT NULL;

COMMENT ON COLUMN public.wrong_answers.cleared_at IS '유저가 이 문제를 마스터했다고 표시한 시각. NULL이면 미완료';
COMMENT ON COLUMN public.weekly_reports.cleared_count IS '해당 주차에 클리어한 오답 문제 수';

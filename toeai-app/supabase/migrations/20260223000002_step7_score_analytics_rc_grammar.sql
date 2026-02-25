-- STEP 7: 전략 페이지 강화 — RC 시간 배분, 세부 문법 약점 저장
-- score_analytics에 컬럼 추가 (기존 데이터 유지)

ALTER TABLE public.score_analytics
  ADD COLUMN IF NOT EXISTS rc_time_allocation JSONB,
  ADD COLUMN IF NOT EXISTS grammar_weakness_summary TEXT;

COMMENT ON COLUMN public.score_analytics.rc_time_allocation IS 'RC 파트별 권장 시간(분). 예: {"part5":15,"part6":8,"part7":52}';
COMMENT ON COLUMN public.score_analytics.grammar_weakness_summary IS 'Part 5 세부 문법 약점 요약. 예: 시제 - 특히 현재완료';

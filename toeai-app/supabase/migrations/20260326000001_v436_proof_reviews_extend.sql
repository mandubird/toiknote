-- v4.36: 후기 수집 v1 (스펙: docs/26.03.26_todap_review_collection_spec_v1.md)
-- 프로젝트는 proof_reviews 대신 proof_assets(type='review') 사용 — 동일 의미로 컬럼 확장

ALTER TABLE public.proof_assets
  ADD COLUMN IF NOT EXISTS helpful_features TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS before_state     TEXT,
  ADD COLUMN IF NOT EXISTS after_change     TEXT,
  ADD COLUMN IF NOT EXISTS one_line_review  TEXT,
  ADD COLUMN IF NOT EXISTS review_visibility TEXT DEFAULT 'private';

COMMENT ON COLUMN public.proof_assets.helpful_features IS 'v1: 도움된 기능 chip (최대 3)';
COMMENT ON COLUMN public.proof_assets.before_state IS 'v1: 사용 전 문제 chip';
COMMENT ON COLUMN public.proof_assets.after_change IS 'v1: 사용 후 변화 chip';
COMMENT ON COLUMN public.proof_assets.one_line_review IS 'v1: 한 줄 후기 (최대 80자)';
COMMENT ON COLUMN public.proof_assets.review_visibility IS 'v1: anonymous | with_score | private';

ALTER TABLE public.proof_assets DROP CONSTRAINT IF EXISTS proof_assets_review_visibility_check;
ALTER TABLE public.proof_assets
  ADD CONSTRAINT proof_assets_review_visibility_check
  CHECK (review_visibility IS NULL OR review_visibility IN ('anonymous', 'with_score', 'private'));

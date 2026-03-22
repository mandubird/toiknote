-- v434: users 테이블에 onboarding_weak_part 컬럼 추가
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_weak_part TEXT DEFAULT NULL;

COMMENT ON COLUMN public.users.onboarding_weak_part IS '온보딩 진단 시 선택한 가장 막히는 파트 (LC/RC/Part5/Part7)';

-- v4.26: 시험일 기반 100일 프로젝트
-- users 테이블에 exam_date 컬럼 추가
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS exam_date DATE DEFAULT NULL;

COMMENT ON COLUMN public.users.exam_date IS '유저가 목표로 하는 토익 시험일. 100일 프로젝트 기간 계산 및 D-day 표시에 사용';

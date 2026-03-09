-- v4.28: 명세서 v1.2 반영 — LC 오류 로그 / users LC·RC 점수 / tag_master 그룹 필드

-- ──────────────────────────────────────────────
-- 1. users 테이블: LC·RC 점수 + 현재 압축 모드
-- ──────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS lc_score          INT,          -- 최근 공식 LC 점수 (5~495)
  ADD COLUMN IF NOT EXISTS rc_score          INT,          -- 최근 공식 RC 점수 (5~495)
  ADD COLUMN IF NOT EXISTS current_mode      TEXT DEFAULT 'normal'
    CHECK (current_mode IN ('normal', 'compressed', 'high_compressed', 'survival'));

COMMENT ON COLUMN public.users.lc_score     IS '최근 공식 TOEIC LC 점수 (5~495)';
COMMENT ON COLUMN public.users.rc_score     IS '최근 공식 TOEIC RC 점수 (5~495)';
COMMENT ON COLUMN public.users.current_mode IS 'D-day 기반 압축 모드: normal/compressed/high_compressed/survival';

-- ──────────────────────────────────────────────
-- 2. tag_master 테이블: 화면 그룹명·전략 그룹
-- ──────────────────────────────────────────────
ALTER TABLE public.tag_master
  ADD COLUMN IF NOT EXISTS visible_group_name TEXT,  -- 사용자 화면용 상위 카테고리 (예: "Part5 기초문법")
  ADD COLUMN IF NOT EXISTS strategy_group     TEXT;  -- 전략 분류 (grammar_foundation / vocab / lc_pattern / p7_time 등)

COMMENT ON COLUMN public.tag_master.visible_group_name IS '사용자 화면용 상위 그룹명 (세부 태그를 묶어서 표시)';
COMMENT ON COLUMN public.tag_master.strategy_group     IS '전략 분류: grammar_foundation | vocab | lc_pattern | p7_time | p2_indirect';

-- 기존 태그에 초기값 일괄 세팅 (part/category/depth 기준)
UPDATE public.tag_master SET
  visible_group_name = CASE
    WHEN category = 'grammar' AND depth = 1              THEN 'Part5 기초문법'
    WHEN category = 'grammar' AND depth >= 2             THEN 'Part5 실전문법'
    WHEN category = 'vocabulary'                         THEN 'Part5 어휘'
    WHEN part IN ('Part 2') AND category = 'lc_pattern'  THEN 'Part2 응답패턴'
    WHEN part IN ('Part 1','Part 3','Part 4')            THEN 'LC 듣기전략'
    WHEN part IN ('Part 6')                              THEN 'Part6 빈칸'
    WHEN part IN ('Part 7')                              THEN 'Part7 독해'
    ELSE 'RC 기타'
  END,
  strategy_group = CASE
    WHEN category = 'grammar' AND depth = 1              THEN 'grammar_foundation'
    WHEN category = 'grammar' AND depth >= 2             THEN 'grammar_advanced'
    WHEN category = 'vocabulary'                         THEN 'vocab'
    WHEN part IN ('Part 2')                              THEN 'p2_indirect'
    WHEN part IN ('Part 1','Part 3','Part 4')            THEN 'lc_pattern'
    WHEN part IN ('Part 7')                              THEN 'p7_time'
    ELSE 'other'
  END
WHERE visible_group_name IS NULL;

-- ──────────────────────────────────────────────
-- 3. lc_error_logs 테이블: LC 오답 원인 분류 로그
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lc_error_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wrong_answer_id UUID        REFERENCES public.wrong_answers(id) ON DELETE SET NULL,
  part_number     INT         NOT NULL CHECK (part_number BETWEEN 1 AND 4),
  lc_error_reason TEXT        NOT NULL,  -- 발음혼동 | 우회답변 | 집중력분산 | 속도못따라감 | 선택지오해 | 노트테이킹실패 | 어휘몰라서
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lc_error_logs_user_id     ON public.lc_error_logs(user_id);
CREATE INDEX IF NOT EXISTS lc_error_logs_user_reason ON public.lc_error_logs(user_id, lc_error_reason);

ALTER TABLE public.lc_error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lc_error_logs_select_own" ON public.lc_error_logs;
DROP POLICY IF EXISTS "lc_error_logs_insert_own" ON public.lc_error_logs;

CREATE POLICY "lc_error_logs_select_own" ON public.lc_error_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lc_error_logs_insert_own" ON public.lc_error_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.lc_error_logs IS 'LC 파트(1-4) 오답 원인 수동 선택 로그 — AnalysisConfirmModal에서 사용자가 고른 원인';
COMMENT ON COLUMN public.lc_error_logs.lc_error_reason IS '발음혼동 | 우회답변 | 집중력분산 | 속도못따라감 | 선택지오해 | 노트테이킹실패 | 어휘몰라서';

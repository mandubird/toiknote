-- v4.29: 핵심 약점 체크리스트 (마스터리 보드) — user_mastery_status 테이블

CREATE TABLE IF NOT EXISTS public.user_mastery_status (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mastery_item_code TEXT        NOT NULL,   -- e.g. 'part5_기초문법'
  mastery_item_name TEXT        NOT NULL,   -- e.g. 'Part5 기초문법'
  user_override     TEXT
    CHECK (user_override IN ('uncertain', 'needs_review', 'confident')),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, mastery_item_code)
);

CREATE INDEX IF NOT EXISTS mastery_status_user_id ON public.user_mastery_status(user_id);

ALTER TABLE public.user_mastery_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mastery_select_own" ON public.user_mastery_status;
DROP POLICY IF EXISTS "mastery_insert_own" ON public.user_mastery_status;
DROP POLICY IF EXISTS "mastery_update_own" ON public.user_mastery_status;

CREATE POLICY "mastery_select_own" ON public.user_mastery_status
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "mastery_insert_own" ON public.user_mastery_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "mastery_update_own" ON public.user_mastery_status
  FOR UPDATE USING (auth.uid() = user_id);

COMMENT ON TABLE public.user_mastery_status IS
  '핵심 약점 체크리스트 (마스터리 보드) — 카테고리별 사용자 수동 보정값 저장. auto_score는 user_tag_stats에서 실시간 계산.';

COMMENT ON COLUMN public.user_mastery_status.mastery_item_code IS
  'tag_master.visible_group_name 기반 코드: part5_기초문법, part5_실전문법, part5_어휘, part2_응답패턴, lc_듣기전략, part6_빈칸, part7_독해 등';

COMMENT ON COLUMN public.user_mastery_status.user_override IS
  'confident: 사용자가 "잡았다" 선언 | uncertain: "아직 불안" | needs_review: "다시 봐야 함"';

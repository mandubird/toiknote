-- v4.30: DM 큐 테이블 (D+1/3/7 후보 적재용)
-- 실제 pg_cron 스케줄링은 프로젝트에서 cron 확장을 켠 뒤,
-- 대시보드 또는 별도 스크립트로 설정하는 것을 권장.

-- 1) dm_queue: DM 발송 후보 큐 (운영용)
CREATE TABLE IF NOT EXISTS public.dm_queue (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage      INTEGER NOT NULL,          -- 1: 활성화 유도, 2: 실행 유도, 3: 후기 요청
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dm_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dm_queue' AND policyname = 'dm_queue_select_admin_only'
  ) THEN
    CREATE POLICY "dm_queue_select_admin_only" ON public.dm_queue
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = TRUE)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dm_queue' AND policyname = 'dm_queue_insert_admin_only'
  ) THEN
    CREATE POLICY "dm_queue_insert_admin_only" ON public.dm_queue
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = TRUE)
      );
  END IF;
END $$;

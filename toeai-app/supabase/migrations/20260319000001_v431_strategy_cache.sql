-- v4.31: 전략 우선 약점 카드 캐시(strategy_cache)

CREATE TABLE IF NOT EXISTS public.strategy_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cache_date  DATE NOT NULL,
  cards_json  JSONB NOT NULL,
  wrong_count INTEGER NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, cache_date)
);

ALTER TABLE public.strategy_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'strategy_cache' AND policyname = 'strategy_cache_select_own'
  ) THEN
    CREATE POLICY "strategy_cache_select_own" ON public.strategy_cache
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'strategy_cache' AND policyname = 'strategy_cache_insert_own'
  ) THEN
    CREATE POLICY "strategy_cache_insert_own" ON public.strategy_cache
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'strategy_cache' AND policyname = 'strategy_cache_update_own'
  ) THEN
    CREATE POLICY "strategy_cache_update_own" ON public.strategy_cache
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;


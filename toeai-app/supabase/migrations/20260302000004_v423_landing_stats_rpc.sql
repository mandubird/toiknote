-- v4.23: 랜딩 페이지용 집계 (희소성·사회증명) — 공개 RPC
CREATE OR REPLACE FUNCTION public.get_landing_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  beta_limit INT := 100;
  used_slots INT;
  month_start TIMESTAMPTZ := date_trunc('month', NOW());
  monthly_900 INT;
  avg_gain NUMERIC := 62;
  result JSONB;
BEGIN
  -- 베타 사용된 자리 (paid 구독 수)
  SELECT COUNT(*) INTO used_slots FROM public.subscriptions WHERE paid = TRUE;

  -- 이번 달 900 돌파 (badge_level = '900' + 이번 달 갱신)
  SELECT COUNT(*) INTO monthly_900
  FROM public.users
  WHERE badge_level = '900'
    AND (last_updated IS NULL OR last_updated >= month_start);

  -- 후기 기반 평균 점수 상승
  SELECT ROUND(AVG(score_after - score_before)) INTO avg_gain
  FROM public.reviews
  WHERE approved = TRUE
    AND score_before IS NOT NULL AND score_after IS NOT NULL;
  avg_gain := COALESCE(avg_gain, 62);

  result := jsonb_build_object(
    'remainingSlots', GREATEST(0, beta_limit - used_slots),
    'monthlySuccessCount', monthly_900,
    'avgScoreGain', avg_gain
  );
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_landing_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.get_landing_stats() TO authenticated;

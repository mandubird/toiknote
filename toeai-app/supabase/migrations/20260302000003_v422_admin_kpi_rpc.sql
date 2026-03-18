-- v4.31: 관리자 KPI 집계 RPC — 목표 달성형 모델 스키마(orders, coaching_logs, proof_assets, activated_at) 반영
CREATE OR REPLACE FUNCTION public.get_kpi_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID;
  is_admin BOOLEAN;
  today_date DATE := CURRENT_DATE;
  month_start TIMESTAMPTZ := date_trunc('month', NOW());
  today_start TIMESTAMPTZ := (CURRENT_DATE)::timestamptz;
  today_end   TIMESTAMPTZ := (CURRENT_DATE + 1)::timestamptz;
  today_payments INT := 0;
  month_payments INT := 0;
  today_revenue INT := 0;
  month_revenue INT := 0;
  total_users INT := 0;
  activated_24h INT := 0;
  coaching_users_7d INT := 0;
  total_coaching_users_7d INT := 0;
  proof_count INT := 0;
  result JSONB;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT u.is_admin INTO is_admin FROM public.users u WHERE u.id = uid;
  IF is_admin IS NOT TRUE THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  -- 매출/결제: orders 기반
  SELECT
    COALESCE(COUNT(*), 0),
    COALESCE(SUM(amount), 0)
  INTO today_payments, today_revenue
  FROM public.orders
  WHERE paid_at >= today_start AND paid_at < today_end;

  SELECT
    COALESCE(COUNT(*), 0),
    COALESCE(SUM(amount), 0)
  INTO month_payments, month_revenue
  FROM public.orders
  WHERE paid_at >= month_start;

  -- 전체 유저 수
  SELECT COUNT(*) INTO total_users FROM public.users;

  -- Activation (24h): plan_started_at 기준 24시간 내 activated_at 채워진 유저 수
  SELECT COUNT(*) INTO activated_24h
  FROM public.users u
  WHERE u.plan_started_at IS NOT NULL
    AND u.plan_started_at >= month_start
    AND u.activated_at IS NOT NULL
    AND u.activated_at <= u.plan_started_at + INTERVAL '24 hours';

  -- 7일 사용률: 최근 7일 동안 coaching_logs 3회 이상 진입한 유저 수 / 전체 유저 수
  SELECT COUNT(DISTINCT user_id) INTO coaching_users_7d
  FROM public.coaching_logs
  WHERE created_at >= (CURRENT_DATE - INTERVAL '7 days');

  total_coaching_users_7d := total_users;

  -- 후기(Proof) 생성 수
  SELECT COUNT(*) INTO proof_count
  FROM public.proof_assets;

  result := jsonb_build_object(
    -- 매출/결제
    'todayRevenue', today_revenue,
    'monthRevenue', month_revenue,
    'todayPayments', today_payments,
    'monthPayments', month_payments,

    -- 기존 사용자 지표: program_status 기반 (레거시 유지)
    'activeUsers', (SELECT COUNT(*) FROM public.users WHERE program_status = 'active'),
    'expiredUsers', (SELECT COUNT(*) FROM public.users WHERE program_status = 'expired'),
    'completedUsers', (SELECT COUNT(*) FROM public.users WHERE program_status = 'completed'),
    'totalUsers', total_users,

    -- 진단/결제 전환 (레거시)
    'totalDiagnoses', (SELECT COUNT(*) FROM public.diagnostic_results),
    'totalPayments', month_payments,
    'diagnosisToPaymentRate', CASE WHEN (SELECT COUNT(*) FROM public.diagnostic_results) > 0
      THEN ROUND((month_payments::numeric / (SELECT COUNT(*) FROM public.diagnostic_results)) * 1000) / 10
      ELSE 0 END,

    -- 바이럴
    'totalShares', (SELECT COUNT(*) FROM public.share_logs),
    'totalReferrals', (SELECT COUNT(*) FROM public.referral_logs),
    'completedReferrals', (SELECT COUNT(*) FROM public.referral_logs WHERE status = 'completed'),
    'referralConversionRate', CASE WHEN (SELECT COUNT(*) FROM public.referral_logs) > 0
      THEN ROUND((SELECT COUNT(*) FROM public.referral_logs WHERE status = 'completed')::numeric / (SELECT COUNT(*) FROM public.referral_logs) * 1000) / 10
      ELSE 0 END,

    -- 후기(리뷰) 통계
    'pendingReviews', (SELECT COUNT(*) FROM public.reviews WHERE approved = FALSE),
    'approvedReviews', (SELECT COUNT(*) FROM public.reviews WHERE approved = TRUE),
    'avgRating', CASE WHEN (SELECT COUNT(*) FROM public.reviews WHERE approved = TRUE) > 0
      THEN ROUND((SELECT SUM(rating)::numeric FROM public.reviews WHERE approved = TRUE) / (SELECT COUNT(*) FROM public.reviews WHERE approved = TRUE) * 10) / 10
      ELSE 0 END,

    -- 배지
    'challengerCount', (SELECT COUNT(*) FROM public.users WHERE badge_level = 'challenger'),
    'eliteCount', (SELECT COUNT(*) FROM public.users WHERE badge_level = 'elite'),
    'badge900Count', (SELECT COUNT(*) FROM public.users WHERE badge_level = '900'),

    -- v3 KPI: Activation / 7일 사용률 / Proof
    'activation24hCount', activated_24h,
    'activation24hRate', CASE WHEN total_users > 0
      THEN ROUND((activated_24h::numeric / total_users) * 1000) / 10
      ELSE 0 END,
    'usage7dCount', coaching_users_7d,
    'usage7dRate', CASE WHEN total_coaching_users_7d > 0
      THEN ROUND((coaching_users_7d::numeric / total_coaching_users_7d) * 1000) / 10
      ELSE 0 END,
    'proofCount', proof_count
  );

  RETURN result;
END;
$$;

-- authenticated 사용자만 호출 가능 (함수 내부에서 is_admin 체크)
GRANT EXECUTE ON FUNCTION public.get_kpi_summary() TO authenticated;

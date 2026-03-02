-- v4.22: 관리자 KPI 집계 RPC (RLS 우회, is_admin만 호출 가능)
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
  today_str TEXT;
  unit_price INT := 0;
  today_payments INT := 0;
  month_payments INT := 0;
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

  today_str := to_char(today_date, 'YYYY-MM-DD');

  SELECT COALESCE(price, 0) INTO unit_price
  FROM public.pricing_plans WHERE is_active = TRUE LIMIT 1;

  SELECT COUNT(*) INTO today_payments
  FROM public.subscriptions
  WHERE paid = TRUE AND paid_at >= (today_str || 'T00:00:00Z')::timestamptz
    AND paid_at < (today_str || 'T23:59:59.999Z')::timestamptz;

  SELECT COUNT(*) INTO month_payments
  FROM public.subscriptions
  WHERE paid = TRUE AND paid_at >= month_start;

  result := jsonb_build_object(
    'todayRevenue', today_payments * unit_price,
    'monthRevenue', month_payments * unit_price,
    'todayPayments', today_payments,
    'monthPayments', month_payments,
    'activeUsers', (SELECT COUNT(*) FROM public.users WHERE program_status = 'active'),
    'expiredUsers', (SELECT COUNT(*) FROM public.users WHERE program_status = 'expired'),
    'completedUsers', (SELECT COUNT(*) FROM public.users WHERE program_status = 'completed'),
    'totalUsers', (SELECT COUNT(*) FROM public.users),
    'totalDiagnoses', (SELECT COUNT(*) FROM public.diagnostic_results),
    'totalPayments', month_payments,
    'diagnosisToPaymentRate', CASE WHEN (SELECT COUNT(*) FROM public.diagnostic_results) > 0
      THEN ROUND((month_payments::numeric / (SELECT COUNT(*) FROM public.diagnostic_results)) * 1000) / 10
      ELSE 0 END,
    'totalShares', (SELECT COUNT(*) FROM public.share_logs),
    'totalReferrals', (SELECT COUNT(*) FROM public.referral_logs),
    'completedReferrals', (SELECT COUNT(*) FROM public.referral_logs WHERE status = 'completed'),
    'referralConversionRate', CASE WHEN (SELECT COUNT(*) FROM public.referral_logs) > 0
      THEN ROUND((SELECT COUNT(*) FROM public.referral_logs WHERE status = 'completed')::numeric / (SELECT COUNT(*) FROM public.referral_logs) * 1000) / 10
      ELSE 0 END,
    'pendingReviews', (SELECT COUNT(*) FROM public.reviews WHERE approved = FALSE),
    'approvedReviews', (SELECT COUNT(*) FROM public.reviews WHERE approved = TRUE),
    'avgRating', CASE WHEN (SELECT COUNT(*) FROM public.reviews WHERE approved = TRUE) > 0
      THEN ROUND((SELECT SUM(rating)::numeric FROM public.reviews WHERE approved = TRUE) / (SELECT COUNT(*) FROM public.reviews WHERE approved = TRUE) * 10) / 10
      ELSE 0 END,
    'challengerCount', (SELECT COUNT(*) FROM public.users WHERE badge_level = 'challenger'),
    'eliteCount', (SELECT COUNT(*) FROM public.users WHERE badge_level = 'elite'),
    'badge900Count', (SELECT COUNT(*) FROM public.users WHERE badge_level = '900')
  );
  RETURN result;
END;
$$;

-- authenticated 사용자만 호출 가능 (함수 내부에서 is_admin 체크)
GRANT EXECUTE ON FUNCTION public.get_kpi_summary() TO authenticated;

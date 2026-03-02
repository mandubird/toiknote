-- v4.22: 만료 임박 알림 플래그 (Cron/Edge Function에서 설정, 인앱 배너에서 참조)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expiry_warning_sent_at TIMESTAMPTZ DEFAULT NULL;

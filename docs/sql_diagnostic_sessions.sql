-- diagnostic_sessions 테이블: 무료 진단 스냅샷 저장
-- Supabase SQL Editor에서 실행하세요

create table if not exists diagnostic_sessions (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  current_score int not null,
  target_score  int not null,
  lc_score      int,
  rc_score      int,
  exam_date     date,
  self_reported_weaknesses text[] default '{}',
  study_pattern text,
  score_gap     int,
  weakness_count int,
  created_at    timestamptz default now()
);

-- 인덱스: 사용자별 최신 진단 조회용
create index if not exists idx_diagnostic_sessions_user
  on diagnostic_sessions(user_id, created_at desc);

-- RLS 활성화
alter table diagnostic_sessions enable row level security;

-- 정책: 본인 데이터만 읽기/쓰기
create policy "Users can insert own diagnostic sessions"
  on diagnostic_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can read own diagnostic sessions"
  on diagnostic_sessions for select
  using (auth.uid() = user_id);

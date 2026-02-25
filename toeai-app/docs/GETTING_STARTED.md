# 토답 개발 시작 가이드

## 현재 완료된 것

- **STEP 1** ✅ React + Vite + Tailwind, 하단 탭바, 카메라 버튼, 라우팅
- **STEP 2 대부분** ✅
  - Supabase 클라이언트 연동
  - Google 로그인 (Auth)
  - 이미지 압축 → Storage 업로드
  - GPT 이미지 분석 → 2단계 확인 모달 → RPC로 저장 (`save_wrong_note_with_stats`)
  - 무료 5회 제한 + Paywall 모달
- **통계/전략/설정 페이지** ✅ 기본 UI 및 데이터 연동

## 1. 환경 변수 설정

```bash
cd toeai-app
cp .env.example .env.local
```

`.env.local`에 아래 값을 채우세요.

| 변수 | 설명 | 어디서? |
|------|------|--------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | Supabase 대시보드 → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | anon public 키 | 위와 동일 |
| `VITE_OPENAI_API_KEY` | OpenAI API 키 | platform.openai.com → API Keys |
| `VITE_PAYMENT_URL` | (선택) 결제 페이지 URL | 결제 연동 시 |

## 2. Supabase 설정

1. **프로젝트 생성**  
   [supabase.com](https://supabase.com) → New Project → 리전 선택 후 생성.

2. **SQL 실행 (최초 1회만)**  
   Supabase 프로젝트를 **처음** 만들 때만 하면 됩니다. 이미 한 번 실행했다면 다시 할 필요 없음.  
   대시보드 → SQL Editor에서 아래 순서로 실행:
   - `supabase/migrations/20260218000000_initial.sql` 내용 붙여넣기 → Run
   - `supabase/migrations/20260218000001_storage.sql` 내용 붙여넣기 → Run

3. **Google 로그인**  
   Authentication → Providers → Google → Enable → Client ID / Secret 입력 (Google Cloud Console에서 OAuth 2.0 클라이언트 생성).  
   Redirect URL에 `https://프로젝트참조.supabase.co/auth/v1/callback` 추가.

4. **Storage 버킷**  
   Storage에 `images` 버킷이 있어야 합니다. migration에서 생성되므로, 없으면 버킷 이름 `images`로 생성 후 Public으로 설정.

5. **Redirect URL**  
   Authentication → URL Configuration → Redirect URLs에 로컬 주소 추가:  
   `http://localhost:5173/**` (또는 Vite가 주는 포트)

## 3. 앱 실행

```bash
cd toeai-app
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` (또는 터미널에 표시된 주소)로 접속합니다.

- **설정**에서 Google 로그인 후
- **홈**에서 카메라 버튼 → 사진 선택 → 업로드 → AI 분석 → 확인 모달에서 저장

## 4. 할 일 목록 (배포·도메인)

- [x] Supabase Redirect URL에 **현재 배포 주소** 추가 (예: `https://toiknote.vercel.app/**`) — 적용 완료
- [ ] **나중에 도메인 연결할 때**: Supabase → Authentication → URL Configuration → Redirect URLs에 **새 도메인** 추가  
  예: `https://toeicodap.com/**` (도메인 구매 후 Vercel에 연결한 뒤 한 번만 하면 됨)

---

## 5. 다음 개발 단계 (계획서 기준)

| 단계 | 내용 | 비고 |
|------|------|------|
| **STEP 3** ✅ | GPT 세부 분류 (Part 5 문법, Part 7 유형, Part 2 패턴) | 완료 |
| **STEP 4** ✅ | 2단계 팝업 UI (파트별 세부 태그, "시간 부족으로 찍음") | 완료. **Supabase**에서 `20260223000001_step4_user_tags_timeout.sql` 실행 필요 |
| **STEP 5** | 트랜잭션 저장 정리 | 현재 RPC 사용 중, 필요 시 스키마 확장 |
| **STEP 6** ✅ | 통계 페이지 강화 (Part 5 문법, Part 7 유형, Part 2 패턴, 시간 부족) | 완료 |
| **STEP 7** ✅ | 전략 페이지 (AI 코칭, RC 시간 배분, 세부 문법 약점, 24h 캐시) | 완료. **Supabase**에서 `20260223000002_step7_score_analytics_rc_grammar.sql` 실행 필요 |
| **STEP 8** ✅ | 설정 페이지 (목표 점수 입력) | 완료. 200~990 검증, users 테이블 저장·전략 페이지 반영 |
| **STEP 9** ✅ | 결제 연동 (Pro/Elite) | 완료. **Supabase**에서 `20260223000003_step9_subscriptions_plan.sql` 실행 필요. 포트원 콘솔에서 Store ID·채널 키 발급 후 `.env.local`에 `VITE_PORTONE_STORE_ID`, `VITE_PORTONE_CHANNEL_KEY` 설정 |
| **STEP 10** ✅ | 누락 보완 (풀이 시간, RC 동적 전략, 비율·유료 가리기) | 완료. **Supabase**에서 `20260223000004_step10_solving_time_rc_strategy.sql` 실행 필요 |
| **v4.01** ✅ | 전파트 통합 DB (Part 1/3/4/6 세부 필드, Part 7 재독 횟수) | 완료. **Supabase**에서 `20260224000001_v401_part1346_reread.sql` 실행 필요 |

**참고:** 개발계획서 v4.01부터 `wrong_answers`에 Part 1/3/4/6 세부 컬럼과 Part 7 재독 횟수가 추가되었습니다.

---

**요약:** 지금은 배포 URL만 Redirect에 넣어 두고, **도메인(toeicodap.com 등) 사서 붙이면 그때 Supabase Redirect URLs에 그 주소 한 번 더 추가**하면 됩니다.

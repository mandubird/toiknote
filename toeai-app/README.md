# 토답 - AI 기반 토익 오답노트

사진 한 장으로 끝내는 파트별 자동 오답 정리

## 🚀 기능

- ✅ 모바일 최적화 PWA
- ✅ 하단 탭바 네비게이션 (홈, 통계, 전략, 설정)
- ✅ 중앙 하단 카메라 버튼
- ✅ 이미지 업로드 및 **Supabase** 연동 (구글 로그인, Storage 업로드, 진행률 표시)
- ✅ GPT-4o mini AI 분석 (OCR, 파트/정답/태그 추출, LC/RC·난이도·partNumber 포함, 2단계 확인 후 DB 저장)
- ✅ 오답 저장 시 트랜잭션 (wrong_answers + users + tag_stats 자동 갱신, RPC)
- ✅ 오답 리스트 및 파트/태그 필터링
- ✅ **통계 탭**: Part별·태그 TOP5 차트(recharts), LC vs RC 비율, 추정 점수
- ✅ **전략 탭**: 유료 전용 AI 전략 분석(우선 집중, 일일/주간 계획, 24시간 캐시)
- ✅ **설정**: 현재 점수/목표 점수 입력 및 저장 (전략 분석에 반영)
- ✅ 결제 유도 (무료 5회 → 결제 페이지 연결, 초기세팅비 무료 결제 서비스 사용)

## v2: 전략형 AI 코치

- **분석 확장**: 오답 저장 시 `lcOrRc`(LC/RC), `difficulty`(1·2·3), `partNumber`(1~7) 함께 저장. Part 1~4 → LC, 5~7 → RC.
- **통계**: `tag_stats` 테이블에 태그별·파트별 오답 수, LC/RC 오답 수가 누적되며, 이를 바탕으로 **추정 점수** 계산 및 통계 페이지 차트 표시.
- **전략**: 유료 사용자만 "전략 새로고침"으로 GPT 기반 학습 전략 생성. `score_analytics`에 저장하며, 24시간 동안 캐시하여 재진입 시 바로 표시.
- **점수**: 설정에서 현재 점수/목표 점수(0~990)를 입력해 두면 전략 분석 시 참고됨. `users` 테이블의 `current_score`, `target_score`에 저장.

## 📌 무료 / 유료 구분

**무료 체험에서 제공하는 것**
- OCR → 텍스트 추출
- LC/RC·파트 자동 분류 (Part 1~7)
- 기본 해설 요약

**무료에서 막는 것 (유료 전환 트리거)**
- AI 복습 문제 생성
- 틀린 유형 통계
- "자주 틀리는 포인트 TOP 3"

## 💰 요금 구조

| 구분 | 내용 |
|------|------|
| **무료** | 오답 5문제, 기본 분석만 제공 |
| **유료 (정규)** | 1개월 9,900원 / 2개월 16,900원 ⭐ BEST / 5개월 39,900원 |
| **얼리버드 (초기 한정)** | 첫 달 4,900원 (선착순 100명), 이후 정상 요금 |

## 📦 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

**서버 배포**: Firebase Hosting / Vercel / Netlify 등 배포 방법은 [docs/DEPLOY.md](docs/DEPLOY.md)를 참고하세요.

## 🛠️ 기술 스택

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **차트**: recharts (통계 탭)
- **Routing**: React Router v6
- **PWA**: vite-plugin-pwa
- **Backend**: Supabase (Auth, PostgreSQL, Storage)
- **AI**: OpenAI GPT-4o mini

## 📱 PWA 설치

모바일 브라우저에서 "홈 화면에 추가"를 선택하면 네이티브 앱처럼 사용할 수 있습니다.

## 🔐 환경 변수 설정

`.env.local` 파일 생성 후 다음 내용 추가:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_OPENAI_API_KEY=your_openai_key
VITE_PAYMENT_URL=
```

- **Supabase**: [Supabase](https://supabase.com)에서 프로젝트 생성 후, Authentication → **Sign In / Providers**에서 **Google** 로그인 활성화하고, Settings → API에서 **Project URL**과 **anon public** 키를 복사해 넣으세요. DB/Storage는 `supabase/migrations` SQL을 대시보드 SQL Editor에서 실행하거나 `supabase db push`로 적용하세요.
- **결제**: 초기세팅비 무료인 결제 서비스를 사용합니다. 결제 페이지 URL을 `VITE_PAYMENT_URL`에 넣으면 결제 유도 모달의 [결제하기] 버튼이 해당 주소를 새 탭으로 엽니다. 결제 완료 후 사용자를 `/payment/success`로 리다이렉트하면 구독이 반영되고, 실패 시 `/payment/fail`로 안내하면 됩니다.

## ⚠️ Supabase 설정

- **Authentication**: Supabase 대시보드 → Authentication → **Sign In / Providers**에서 **Google** 활성화 후, 사용할 OAuth 클라이언트 ID/비밀번호를 넣고, **Redirect URL**에 `https://your-project.supabase.co/auth/v1/callback` 및 배포 도메인(예: `https://yourapp.com/**`)을 등록하세요.
- **DB/Storage**: `supabase/migrations` 폴더의 SQL을 Supabase 대시보드 **SQL Editor**에서 순서대로 실행하거나, 로컬에 Supabase CLI 설치 후 `supabase db push`로 적용하세요. RLS 정책이 포함되어 있어 로그인한 사용자만 자신의 데이터에 접근합니다.

---

## 📋 개발 로드맵

- [x] STEP 1: 프로젝트 기초 및 PWA 설정
- [x] STEP 2: Supabase 및 이미지 업로드
- [x] STEP 3: GPT-4o mini OCR 분석 + 2단계 확인 + DB 저장
- [x] Supabase 전환 (Auth, PostgreSQL, Storage, RLS)
- [x] STEP 4: 오답 리스트 + 파트/태그 필터링
- [x] STEP 5: 결제 유도 (무료 5회 제한, 결제 페이지 URL 연동)
- [x] v2: LC/RC·난이도·partNumber 분석 확장, 트랜잭션 저장(wrongAnswers + users + tagStats)
- [x] v2: 통계 탭 (recharts, 추정 점수, LC vs RC)
- [x] v2: 전략 탭 (유료 전용 AI 전략, 24시간 캐시)
- [x] v2: 설정에 현재/목표 점수 입력 및 users 저장

## 📞 문의

support@toeicodap.com

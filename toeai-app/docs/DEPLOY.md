# 토답 서버 배포 가이드 (도메인: toeicodap.com)

웹 앱을 서버에 올려서 누구나 접속할 수 있게 하는 방법입니다.

**추천**: **Vercel**로 배포하고, 호스팅 업체에서 구매한 **본인 도메인**을 Vercel에 연결해 사용합니다.  
→ 지금은 **웹(또는 PWA)** 로 서비스하고, 나중에 앱스토어용 **앱**을 만들 때도 같은 주소를 쓰거나 웹뷰로 감싸면 됩니다. Vercel만으로 웹/PWA/앱 모두 가능합니다.

**배포 순서 요약**: ① Supabase 프로젝트 생성 + 마이그레이션 SQL 실행 + Google 로그인·Redirect URL 설정 → ② GitHub에 코드 푸시 → ③ Vercel에서 저장소 연결 + 환경 변수(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 등) 설정 → ④ 배포 후 Supabase Redirect URLs에 실제 배포 URL 추가.

---

## 1. 배포 전 체크리스트

### 1.1 로컬에서 빌드 확인

```bash
cd toeai-app
npm install
npm run build
```

- `dist/` 폴더가 생성되면 성공입니다.
- `npm run preview` 로 로컬에서 빌드 결과를 확인할 수 있습니다.

### 1.2 환경 변수 (빌드 시점에 포함됨)

배포할 때 **빌드 환경**에 아래 변수를 설정해야 합니다.  
로컬의 `.env.local`은 서버에는 없으므로, 각 호스팅에서 "환경 변수" 또는 "Environment Variables"에 넣어 주세요.

| 변수명 | 설명 |
|--------|------|
| `VITE_SUPABASE_URL` | Supabase Project URL (Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key (Settings → API) |
| `VITE_OPENAI_API_KEY` | OpenAI API Key (서버/프록시 사용 시 별도 보안 고려) |
| `VITE_PAYMENT_URL` | 결제 페이지 URL (선택) |

> ⚠️ **OpenAI API Key**: 지금은 클라이언트에서 직접 호출하므로 빌드에 포함됩니다. 키 노출이 부담되면 나중에 백엔드 프록시를 두고 그쪽에서만 키를 쓰도록 변경하는 것을 권장합니다.

### 1.3 Supabase 설정 (필수)

배포 전에 Supabase에서 다음을 해 두어야 앱이 정상 동작합니다.

- **프로젝트 생성** 후 Settings → API에서 **Project URL**, **anon key** 확보 → 환경 변수에 사용
- **SQL 실행**: `supabase/migrations/` 폴더의 SQL 두 개를 대시보드 **SQL Editor**에서 순서대로 실행 (테이블·RLS·RPC·Storage 버킷 생성)
- **Google 로그인**: Authentication → **Sign In / Providers** → Google 활성화 후, URL Configuration에 **Site URL**·**Redirect URLs**에 배포 주소 추가

자세한 단계는 아래 **§3 Supabase 사전 설정**을 참고하세요.

---

## 2. Vercel로 배포 (권장)

**흐름**: 코드를 **GitHub에 올린 뒤**, Vercel에서 그 **GitHub 저장소를 연결**하면 됩니다. Vercel이 저장소를 감지해 빌드·배포하고, 이후에는 `git push`만 해도 자동으로 다시 배포됩니다.  
**웹 + PWA**는 그대로 제공되고, 나중에 **앱스토어 앱**을 만들 때도 이 Vercel URL을 그대로 쓰거나(웹뷰/캡핑) 별도 앱만 추가하면 됩니다.

### 2.1 사전 준비

1. [GitHub](https://github.com)에 저장소 만들고, 이 프로젝트를 푸시해 둡니다.
2. [Vercel](https://vercel.com) 가입 (GitHub 계정으로 로그인하면 연동이 편합니다.)

### 2.2 Vercel에서 GitHub 저장소 연결

1. Vercel 대시보드 → **Add New** → **Project**
2. **Import Git Repository**에서 방금 올린 **GitHub 저장소** 선택 후 **Import**
3. **Root Directory**: `toeai-app` 로 지정
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. **Environment Variables**: 1.2절의 `VITE_*` 변수들 모두 추가

### 2.3 SPA 라우팅

이 프로젝트에는 이미 `toeai-app/vercel.json`이 있어서 `/payment/success`, `/strategy` 등 모든 경로가 `index.html`로 넘어갑니다. 별도 설정 없이 사용하면 됩니다.

### 2.4 배포

- **GitHub에 연결해 두었으면**: `main`(또는 선택한 브랜치)에 `git push` 할 때마다 Vercel이 자동으로 빌드·배포합니다.
- **수동 배포만 쓰고 싶을 때**: `npm i -g vercel` → `cd toeai-app` → `vercel` (환경 변수는 대시보드에서 설정)

배포 후 기본 URL 예: `https://toeai-app-xxx.vercel.app`

### 2.5 본인 도메인 연결 (호스팅 업체에서 구매한 도메인)

도메인을 다른 업체(가비아, 카페24, Cloudflare 등)에서 샀다면, 그 도메인을 Vercel에 연결할 수 있습니다.

1. **Vercel** → 해당 프로젝트 → **Settings** → **Domains**
2. **Add**에 본인 도메인 입력 (예: `toeicodap.com`)
3. Vercel이 안내하는 대로 **DNS 설정**을 합니다.
   - **A 레코드**: Vercel이 알려주는 IP (예: `76.76.21.21`) → `@` 또는 원하는 서브도메인
   - **CNAME**: `cname.vercel-dns.com` → `www` 등 (Vercel 화면에 나오는 값 사용)
4. DNS 전파 후(몇 분~최대 48시간) Vercel에서 SSL이 자동 발급됩니다.

이후 사용자는 `https://toeicodap.com` 같은 주소로 접속하고, PWA도 이 도메인으로 설치됩니다.  
**Supabase** → Authentication → URL Configuration에서 **Redirect URLs**에 `https://toeicodap.com/**` 를 추가하는 것을 잊지 마세요.

---

## 3. Supabase 사전 설정 (배포 전/후 한 번씩)

백엔드는 **Supabase**를 사용하므로, 배포 전에 Supabase 프로젝트를 준비해 두어야 합니다.

### 3.1 프로젝트 생성

1. [Supabase](https://supabase.com) 로그인 후 **New Project** 생성
2. **Settings** → **API**에서 **Project URL**과 **anon public** 키를 복사해 Vercel(또는 사용하는 호스팅) 환경 변수에 넣습니다.

### 3.2 DB·Storage 마이그레이션

1. 대시보드 **SQL Editor** 열기
2. 프로젝트의 `supabase/migrations/` 안 SQL 파일을 **순서대로** 실행합니다.
   - `20260218000000_initial.sql` (테이블, RLS, RPC)
   - `20260218000001_storage.sql` (Storage 버킷·정책)
3. 에러 없이 완료되면 테이블·Storage 버킷 `images`가 생성됩니다.

### 3.3 Google 로그인

1. **Authentication** → **Sign In / Providers** → **Google** 켜기
2. Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성 후, **Client ID**와 **Client Secret**을 Supabase에 입력
3. **Authentication** → **URL Configuration**:
   - **Site URL**: 배포할 주소 (예: `https://yourapp.vercel.app` 또는 `https://toeicodap.com`)
   - **Redirect URLs**: 위 Site URL + `https://yourapp.vercel.app/**` 형태로 추가 (커스텀 도메인 쓰면 해당 도메인도 추가)

---

## 4. Netlify로 배포 (선택)

Vercel 대신 Netlify를 쓰고 싶을 때입니다. 백엔드는 동일하게 **Supabase**를 사용합니다.

### 4.1 사전 준비

- [Netlify](https://www.netlify.com) 가입
- 프로젝트를 Git 저장소에 올려 둠

### 4.2 프로젝트 설정

1. **Add new site** → **Import an existing project** → 저장소 연결
2. **Base directory**: `toeai-app`
3. **Build command**: `npm run build`
4. **Publish directory**: `toeai-app/dist`
5. **Environment variables**: 1.2절의 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OPENAI_API_KEY`, `VITE_PAYMENT_URL` 추가

### 4.3 SPA 라우팅

`toeai-app/public/` 에 `_redirects` 파일을 만들고 배포에 포함시킵니다.

**toeai-app/public/_redirects** (내용):

```
/*    /index.html   200
```

Vite 빌드 시 `public/` 내용이 `dist/`로 복사되므로, 빌드 후에는 `dist/_redirects`가 생깁니다.

### 4.4 배포

- Git 연동 시 푸시하면 자동 배포됩니다.
- 수동 배포: Netlify CLI로 `netlify deploy --prod` (빌드 결과물 디렉터리: `dist`)

---

## 5. 배포 후 할 일

### 5.1 결제 연동

- **결제 완료 리다이렉트 URL**을 실제 도메인으로 바꿉니다.  
  - 성공: `https://실제도메인/payment/success?paymentKey=...&orderId=...&amount=...`
  - 실패: `https://실제도메인/payment/fail`
- 결제 서버(또는 결제 대행사)에서 위 URL로만 리다이렉트하도록 설정합니다.

### 5.2 Supabase Redirect URL

- Supabase 대시보드 → **Authentication** → **URL Configuration**
- **Site URL**을 배포 도메인으로 설정 (예: `https://yourapp.com`). **Redirect URLs**에 필요한 도메인을 추가합니다.

### 5.3 PWA

- HTTPS로 서비스되면 "홈 화면에 추가"로 앱처럼 설치할 수 있습니다.
- 커스텀 도메인을 쓰면 해당 도메인으로 설치됩니다.

### 5.4 나중에 앱스토어 앱을 낼 때

- **지금**: Vercel에 올린 웹 = 그대로 **웹** + **PWA**(홈 화면에 추가).
- **나중에**: 같은 URL을 쓰는 **앱**을 만들 수 있습니다.
  - 예: Capacitor, TWA(Trusted Web Activity) 등으로 웹뷰 앱을 만들면, 앱 안에서는 동일한 Vercel(또는 본인 도메인) 주소를 로드합니다.
  - 서버는 그대로 Vercel만 쓰면 되고, 앱은 “웹을 감싼 패키지”만 추가하면 됩니다.

---

## 6. 요약

| 구분 | 내용 |
|------|------|
| **백엔드** | **Supabase** (Auth, PostgreSQL, Storage). 배포 전에 Supabase 프로젝트 생성 + 마이그레이션 SQL 실행 + Google 로그인·Redirect URL 설정 필요. |
| **프론트 배포** | **Vercel 권장** (Git 푸시 자동 배포, 본인 도메인 연결). 또는 Netlify 등 다른 정적 호스팅 사용 가능. |
| **환경 변수** | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OPENAI_API_KEY`, `VITE_PAYMENT_URL` (선택). 배포 플랫폼 대시보드에서 설정. |
| **도메인** | 호스팅 업체에서 구매한 도메인은 Vercel **Settings → Domains**에서 연결. Supabase **Redirect URLs**에 해당 도메인 추가. |

이 문서는 프로젝트 루트의 `README.md`와 함께 참고하면 됩니다.

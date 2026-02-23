# GitHub + Vercel 연결 가이드

## 1. GitHub 저장소 만들고 푸시 (최초 1회)

아래는 터미널에서 **Toe_AI 폴더**를 연 뒤 실행하는 순서입니다.

### 1-1. Git 초기화 및 첫 커밋 (이미 되어 있으면 1-2로)

```bash
cd /Users/gimmingyu/Desktop/2025/Toe_AI
git init
git add .
git commit -m "Initial commit: 토오AI (Supabase + Vite)"
```

### 1-2. GitHub에서 새 저장소 생성

1. [GitHub](https://github.com/new) 접속 후 로그인
2. **Repository name**: 예) `Toe_AI` 또는 `toeai-app`
3. **Public** 선택
4. **Create repository** 클릭 (README, .gitignore 추가 안 해도 됨)

### 1-3. 로컬과 연결 후 푸시

GitHub에서 저장소를 만든 뒤 나오는 안내 중 **"…push an existing repository from the command line"** 아래 명령어를 사용합니다.  
저장소: **https://github.com/mandubird/toiknote**

```bash
cd /Users/gimmingyu/Desktop/2025/Toe_AI
git remote add origin https://github.com/mandubird/toiknote.git
git branch -M main
git push -u origin main
```

이미 remote를 추가한 적이 있다면:

```bash
cd /Users/gimmingyu/Desktop/2025/Toe_AI
git remote set-url origin https://github.com/mandubird/toiknote.git
git push -u origin main
```

---

## 2. Vercel에서 배포하기

### 2-1. Vercel에 GitHub 연결

1. [Vercel](https://vercel.com) 로그인 (GitHub 계정으로 로그인 권장)
2. **Add New…** → **Project**
3. **Import Git Repository**에서 방금 푸시한 **GitHub 저장소** 선택 후 **Import**

### 2-2. 프로젝트 설정

1. **Root Directory**: **Edit** 클릭 후 `toeai-app` 입력 (저장소 루트가 Toe_AI일 때)
2. **Build Command**: `npm run build` (기본값 유지)
3. **Output Directory**: `dist` (기본값 유지)
4. **Environment Variables**에서 아래 변수 추가:

   | Name | Value |
   |------|--------|
   | `VITE_SUPABASE_URL` | Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
   | `VITE_OPENAI_API_KEY` | OpenAI API 키 |
   | `VITE_PAYMENT_URL` | (선택) 결제 페이지 URL |

5. **Deploy** 클릭

### 2-3. 배포 후 Supabase 설정

배포가 끝나면 Vercel이 **배포 URL**을 줍니다 (예: `https://toeai-app-xxx.vercel.app`).

1. **Supabase** 대시보드 → **Authentication** → **URL Configuration**
2. **Site URL**을 위 Vercel URL로 설정 (또는 커스텀 도메인)
3. **Redirect URLs**에 `https://toeai-app-xxx.vercel.app/**` 추가

이후 코드 수정 후 `git push` 하면 Vercel이 자동으로 다시 배포합니다.

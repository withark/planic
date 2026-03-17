# NextAuth / Google 로그인 환경 변수

## 필수 환경 변수

| 변수명 | 설명 | 예시 값 |
|--------|------|---------|
| `NEXTAUTH_URL` | 앱의 canonical URL (운영 도메인 기준 고정). **코드에서 변경 금지.** | `https://www.planic.cloud` |
| `NEXTAUTH_SECRET` | 세션 암호화용 시크릿. 32자 이상 권장. | `openssl rand -base64 32` 로 생성 |
| `GOOGLE_CLIENT_ID` | Google Cloud Console > 사용자 인증 정보 > OAuth 2.0 클라이언트 ID | `123456-xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | 위 클라이언트의 비밀번호 | `GOCSPX-xxxxxxxx` |

## 로컬 개발

`.env.local` 예시:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-min-32-characters-long-here
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

Google Cloud Console에서 "승인된 리디렉션 URI"에 다음을 등록:

- 개발: `http://localhost:3000/api/auth/callback/google`
- 운영: `https://www.planic.cloud/api/auth/callback/google`

## Vercel 설정

1. Vercel 대시보드 → 프로젝트 선택 → **Settings** → **Environment Variables**
2. 아래 이름으로 추가 (이름을 정확히 맞춤):

| Vercel 변수 이름 | 값 |
|------------------|-----|
| `NEXTAUTH_URL` | 운영: `https://www.planic.cloud` (고정). Preview 등: 해당 배포 URL |
| `NEXTAUTH_SECRET` | 32자 이상 랜덤 문자열 |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 |

3. **Production / Preview / Development** 에서 필요한 환경에 체크 후 Save.
4. 재배포 후 로그인 동작 확인.

## 환경 변수 누락 시 증상 (참고)

| 변수 | 누락 시 대표 증상 |
|------|-------------------|
| `NEXTAUTH_URL` | 콜백 후 리다이렉트 오류, 세션 쿠키 도메인 불일치 |
| `NEXTAUTH_SECRET` | 세션 암호화 실패, NextAuth 경고/에러 |
| `GOOGLE_CLIENT_ID` | Google 로그인 버튼 클릭 시 "client_id is required" 등 OAuth 에러 |
| `GOOGLE_CLIENT_SECRET` | Google 인증 후 콜백 단계에서 토큰 교환 실패 |

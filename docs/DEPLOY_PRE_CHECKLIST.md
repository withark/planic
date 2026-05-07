# 배포 직전 수동 체크리스트 (Planic)

실제 Vercel 배포 버튼을 누르기 **전에** 담당자가 순서대로 확인합니다.  
이 저장소는 **Supabase를 사용하지 않으며**, DB는 **Neon Postgres (`DATABASE_URL`)** 입니다.

---

## 검수 상태 스냅샷 (자동 검증 기준)

| 구분 | 상태 |
|------|------|
| **FAIL (빌드/타입 실패)** | **0** — `npm run typecheck`, `npm run build` 통과 전제 |
| **핵심 WARNING (제품·인증·데이터 플로우)** | **처리됨** — 예: 작업 이력 API 실패 vs 빈 목록 구분 등 |
| **잔여 WARNING (선택)** | `npm audit` **moderate** 2건(Next 번들 postcss 등) — `--force` 시 Next 다운그레이드 위험으로 배포 필수 조건으로 두지 않음 |

---

## 1. `.env.production`에 넣을 변수 목록 (이름·역할만)

> 로컬에는 보통 `.env.production` 파일을 두지 않고 Vercel에만 등록합니다. 아래는 **운영 프로덕션** 기준입니다.

### 필수 (서비스 동작·보안)

| 변수 | 용도 |
|------|------|
| `NODE_ENV` | Vercel이 `production`으로 설정 (일반적으로 수동 입력 불필요) |
| `NEXTAUTH_URL` | 공개 URL과 동일 (예: `https://www.planic.cloud`) |
| `NEXTAUTH_SECRET` | NextAuth JWT 서명 (32자 이상 난수) |
| `ADMIN_SECRET` | 관리자 쿠키(`planic_admin`) HMAC 서명 |
| `DATABASE_URL` | Neon PostgreSQL 연결 문자열 (`sslmode=require`) |

### 소셜 로그인 (사용하는 프로바이더만)

| 변수 | 용도 |
|------|------|
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `KAKAO_CLIENT_ID` | 선택 |
| `KAKAO_CLIENT_SECRET` | 선택 |
| `NAVER_CLIENT_ID` | 선택 |
| `NAVER_CLIENT_SECRET` | 선택 |

### 관리자 초기 비밀번호 (선택)

| 변수 | 용도 |
|------|------|
| `ADMIN_PASSWORD` | DB에 `admin_password_hash` 없을 때 로그인용 레거시 폴백. **약한 값은 `check-auth-env`에서 planic 프로덕션 빌드 실패** |

### 문서 생성 (운영에서 실제 생성 시)

| 변수 | 용도 |
|------|------|
| `ANTHROPIC_API_KEY` 및/또는 `OPENAI_API_KEY` | AI 호출 (제품 정책에 맞게 하나 이상) |
| `AI_PROVIDER`, `ANTHROPIC_MODEL`, `OPENAI_MODEL` 등 | 선택, 기본값은 코드 참고 |

### 결제 (실결제 시)

| 변수 | 용도 |
|------|------|
| `BILLING_MODE` | `live` (실결제) 또는 `mock` |
| `TOSS_PAYMENTS_SECRET_KEY` | 서버 승인·웹훅 |
| `NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY` | 클라이언트 위젯 |
| `NEXT_PUBLIC_APP_URL` | 리다이렉트 기준 (미설정 시 `NEXTAUTH_URL`/`VERCEL_URL`) |
| `TOSS_PAYMENTS_WEBHOOK_VERIFY` | `true`/`1` 권장(교차 검증) |

### 아이디·비밀번호 로그인 (해당 시만)

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_ENABLE_CREDENTIAL_AUTH` | `1` 이면 클라이언트에서 자격 증명 UI 활성 |
| `ENABLE_EMAIL_PASSWORD_AUTH` | 서버 Provider 활성 |

### 기타 (선택)

| 변수 | 용도 |
|------|------|
| `DATA_DIR` | 서버리스에서는 제한적; 필요 시 |
| `NEXT_PUBLIC_COMPANY_LANDLINE_TEL` | 푸터 등 노출 전화 |
| `AUTH_SOCIAL_ONLY` / `NEXT_PUBLIC_AUTH_SOCIAL_ONLY` | 소셜만 허용 시 |

전체 주석 예시: 저장소 루트 **`.env.local.example`** 참고.

---

## 2. Vercel에 등록할 환경 변수

위 **1절과 동일한 키**를 Vercel **Project → Settings → Environment Variables**에 등록합니다.

### 환경 범위 권장

| 범위 | 포함할 변수 |
|------|-------------|
| **Production** | 운영 도메인·실 DB·실 결제 키·모든 시크릿 |
| **Preview** | 스테이징 DB URL, 테스트 결제 키, `NEXTAUTH_URL`을 Preview URL에 맞게 별도 설정 권장 |
| **Development** | 로컬과 동일하게 복사 가능 (선택) |

### Vercel 시스템 변수

- `VERCEL_URL` — 자동 (미리보기 URL)
- `VERCEL_ENV` — `production` / `preview` / `development`
- planic 운영: `NEXTAUTH_URL`이 `https://www.planic.cloud` 형태일 때 `proxy.ts`의 apex 리다이렉트·세션 쿠키 분기와 맞춰야 함

### 빌드 단계

- `npm run prebuild` → `scripts/check-auth-env.mjs` 실행  
- **Production + `NEXTAUTH_URL`이 planic.cloud** 일 때: `NEXTAUTH_SECRET`, `ADMIN_SECRET` 비어 있으면 **빌드 실패**

---

## 3. Supabase 연결 정보 — 해당 없음

- 코드베이스에 **Supabase 클라이언트/URL 키 참조 없음**.
- DB는 **Neon** (`@neondatabase/serverless`, `DATABASE_URL`).

**확인할 것 (사람):**

- [ ] Neon 콘솔에서 프로젝트·브랜치·연결 문자열이 **운영용**인지
- [ ] `DATABASE_URL`이 Vercel Production에만 넣었는지(실수로 Preview에 운영 DB를 넣지 않았는지)

---

## 4. Supabase RLS 정책 — 해당 없음

- 마이그레이션/SQL에 **`ROW LEVEL SECURITY` / `CREATE POLICY` 없음**.
- 접근 제어는 **애플리케이션**(NextAuth 세션, `requireAdmin`, API 라우트) + **DB 계정 권한**에 의존.

**선택(고도화):** Neon에서 직접 RLS를 쓰려면 정책을 별도 설계·적용해야 하며, 현재 코드와은 별개 작업입니다.

---

## 5. 관리자 계정 생성·권한 확인 방법

### 관리자 로그인 방식

- URL: **`/admin`** (아이디 **`admin`**, 비밀번호는 환경 또는 DB 해시)
- 서버: `lib/admin-auth.ts` — DB `app_kv.admin_password_hash` 우선, 없으면 `ADMIN_PASSWORD` 폴백(운영에서 약한 비밀번호 차단)
- 세션: 쿠키 `planic_admin` — **`ADMIN_SECRET`** 필수

### 배포 후 확인 순서

1. [ ] Vercel에 `ADMIN_SECRET`, `ADMIN_PASSWORD`(또는 DB에 해시 이미 존재) 설정 확인  
2. [ ] 브라우저 시크릿 창에서 `https://www.planic.cloud/admin` 접속  
3. [ ] 로그인 후 `/admin/users` 등 하위 경로 진입·API 응답 200 확인  
4. [ ] **비밀번호 변경**은 대시보드 내 기능 또는 정책에 따름

### 해시만 쓰는 경우

- `scripts/hash-admin-password.js` 등(저장소 내 스크립트)으로 해시 생성 후 DB `app_kv`에 넣는 운영 절차가 있을 수 있음 — 운영 문서와 맞춰 확인.

---

## 6. 일반 사용자 테스트 계정 확인 방법

### 코드에 정의된 결제 테스트용 자격 증명 (자격 증명 로그인이 켜진 경우)

- 시드: `lib/db/users-db.ts`의 `ensureBillingTestUser()` — 아이디 **`billingtest`**, 비밀번호는 코드·로그인 화면 안내와 동일  
- **운영 DB에 시드가 없으면** 로그인 실패할 수 있음 → Neon에 사용자 행 존재 여부 확인

### 확인 절차

1. [ ] Vercel에 `NEXT_PUBLIC_ENABLE_CREDENTIAL_AUTH=1`, `ENABLE_EMAIL_PASSWORD_AUTH=1` (또는 정책에 맞게) 설정  
2. [ ] `/auth`에서 아이디 로그인 시도  
3. [ ] 결제 테스트가 목적이면 **토스 테스트 키·`BILLING_MODE`** 확인

**보안:** 테스트 계정은 공개 안내용이므로, 실서비스 노출 정책은 팀 기준에 맞게 조정.

---

## 7. 배포 후 실제 테스트 시나리오 (스모크)

다음을 **프로덕션 URL**에서 순서대로 수행합니다.

| # | 시나리오 | 기대 |
|---|----------|------|
| 1 | `GET /api/health` | `status`(200 또는 degraded 의도 시 503) 및 `db` 필드 확인 |
| 2 | 비로그인으로 보호 경로 (예: `/dashboard`) | `/auth`로 리다이렉트 |
| 3 | 소셜 또는 자격 증명 로그인 | 세션 생성 후 `/dashboard` 진입 |
| 4 | 작업 이력 `/history` | 목록 로드·에러 시 재시도 표시·빈 목록 문구 구분 |
| 5 | 설정 저장 `/settings` | 저장 성공 토스트 또는 API 오류 메시지 |
| 6 | 문서 생성 1건 (대표 플로우) | 완료·한도 메시지 정상 |
| 7 | 결제 (토스) | `mock` vs `live`에 맞게 성공/실패 URL·웹훅 확인 |
| 8 | 관리자 `/admin` | 로그인·통계·사용자 목록 API |
| 9 | 모바일 너비에서 GNB·헤더 | 햄버거·본문 겹침 없음 |

---

## 배포 직전 — 사람이 체크할 최종 리스트

### 인프라·환경

- [ ] Vercel Production에 `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ADMIN_SECRET`, `DATABASE_URL` 설정
- [ ] Google(및 사용 중 소셜) OAuth **승인된 리디렉션 URI**에 운영 URL 반영
- [ ] Neon DB가 **프로덕션 전용**인지, 마이그레이션/시드 필요 여부 확인

### 보안·결제

- [ ] `ADMIN_PASSWORD`를 쓸 경우 **충분히 강한 값** (planic 빌드 시 약한 값 거부)
- [ ] 실결제 시 `BILLING_MODE=live`, 토스 **live 키**, 웹훅 URL·시크릿 일치

### 기능 플래그

- [ ] 자격 증명 로그인 ON/OFF가 **제품 정책과 일치**
- [ ] `NEXT_PUBLIC_*`만 클라이언트에 노출되는지 재확인 (시크릿 금지)

### 검증 명령 (로컬 또는 CI)

- [ ] `npm run typecheck` 통과
- [ ] `npm run build` 통과

### 배포 후

- [ ] 위 **섹션 7 스모크** 체크
- [ ] 에러 로그(Vercel / Neon) 모니터링 24~48시간

---

*문서 버전: 저장소와 함께 갱신. 비밀 값은 이 파일에 적지 말 것.*

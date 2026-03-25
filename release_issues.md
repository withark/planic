# Planic Release Blocking Issues (Draft)

## 우선순위 기준
- “배포 후 핵심 플로우가 멈추거나(로그인/문서생성/결제완료), 오류가 반복되어 운영이 불가능해지는” 쪽을 먼저 배치

- severity: critical
- area: deployment
- issue: Vercel preview에서도 `AI_MODE=mock`이 문서 생성에서 실질적으로 차단되어(실제 LLM 호출) 키가 없으면 `/api/generate`가 500
- why_it_matters: 문서 생성이 제품 핵심 기능인데, preview에서 테스트가 불가능해질 수 있음. `app/api/generate/route.ts`는 실사용 LLM 키가 없고(mock이 허용되지 않으면) `errorResponse(500, 'NO_AI_KEY', ...)`로 종료합니다.
- reproduction_steps: 1) Vercel preview 환경에서 `AI_MODE=mock` 설정 2) `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` 미설정(또는 빈 값) 3) `/estimate-generator`(또는 다른 generator)에서 “견적 생성” 클릭 4) 네트워크에서 `/api/generate` 응답 500 확인
- suspected_files: `lib/ai/mode.ts`, `app/api/generate/route.ts`, (클라이언트 전파) `lib/api/client.ts`, generator pages (예: `app/estimate-generator/page.tsx`)
- recommended_fix: `lib/ai/mode.ts`의 `isProductionRuntime()` 조건을 Vercel preview를 “mock 허용 가능”으로 취급하도록 조정(예: `VERCEL_ENV === 'preview'`를 production에서 제외), 또는 preview에서 반드시 LLM API 키를 주입하도록 릴리즈 환경 정책을 문서화/검증.

- severity: critical
- area: deployment
- issue: NextAuth 비밀키 누락 시(특히 preview/호스트 불일치 케이스) 미들웨어에서 토큰 검증 실패 → 보호 라우트 접근 불가/리다이렉트 루프 가능
- why_it_matters: `middleware.ts`가 보호 경로를 `/auth`로 강제 이동시키며, 토큰 검증이 실패하면 사용자 전체가 서비스 핵심(예: `/dashboard`, generator pages) 접근을 못 할 수 있음.
- reproduction_steps: 1) Vercel 환경에서 `NEXTAUTH_SECRET` 미설정 2) `NEXTAUTH_URL`이 `planic.cloud`로 정확히 매칭되지 않게 설정(또는 누락) 3) 보호 페이지(`/dashboard` 또는 generator) 진입 4) `/auth`로 반복 리다이렉트 또는 접근 불가 확인
- suspected_files: `middleware.ts`, `lib/nextauth-secret.ts`, `scripts/check-auth-env.mjs`
- recommended_fix: Vercel preview/production 모두에서 `NEXTAUTH_SECRET`을 강제 검증하도록 `scripts/check-auth-env.mjs` 조건을 완화/재정의하거나, `lib/nextauth-secret.ts`에서 production에서 secret이 없으면 명시적 오류/중단 같은 방어 정책을 도입(보안 trade-off 검토).

- severity: critical
- area: deployment
- issue: 라이브 결제 성공 플로우에서 `/billing/success` → `/api/billing/confirm`이 `TOSS_PAYMENTS_SECRET_KEY` 누락 시 500으로 종료(구독 활성화 실패)
- why_it_matters: 결제 승인(서버 확인) 단계가 실패하면 사용자는 “결제 성공 화면”에서 구독 활성화를 받지 못해 전환/운영이 깨짐.
- reproduction_steps: 1) 라이브 모드로 결제 유도(또는 success 페이지 쿼리 형태로 접근) 2) `TOSS_PAYMENTS_SECRET_KEY` 미설정 3) `/billing/success?paymentKey=...&orderId=...&amount=...` 진입 4) `/api/billing/confirm`에서 500 확인 및 구독 미활성화 확인
- suspected_files: `app/billing/success/page.tsx`, `app/api/billing/confirm/route.ts`, `lib/billing/toss-confirm.ts`, `lib/billing/toss-config.ts`
- recommended_fix: preview에서도 최소한 결제 확인에 필요한 `TOSS_PAYMENTS_SECRET_KEY`/클라이언트 키 주입 또는 라이브 결제를 preview에서 비활성화(mock 고정)하고 success 페이지 접근 경로를 차단(환경 정책).

- severity: critical
- area: deployment
- issue: Toss 웹훅 검증(`TOSS_PAYMENTS_WEBHOOK_VERIFY`)이 켜진 상태에서 키가 없으면, 검증 단계에서 401로 종료되고(현 코드 구조상 이후 DB 처리/상태 반영이 진행되지 않음) 주문이 승인되지 않을 수 있음
- why_it_matters: 라이브 모드에서 웹훅은 구독 활성화의 주요 경로일 수 있음. 검증 예외/키 누락 시 주문 상태가 pending으로 남을 위험.
- reproduction_steps: 1) `BILLING_MODE=live` 2) `TOSS_PAYMENTS_WEBHOOK_VERIFY=true` 3) `TOSS_PAYMENTS_SECRET_KEY`/필수 키 미설정 4) Toss에서 `PAYMENT_STATUS_CHANGED` 웹훅 POST 전송 5) 응답 401 및 DB `billing_orders` 상태 변화 없음 확인
- suspected_files: `app/api/billing/webhook/route.ts`, `lib/billing/toss-webhook-verify.ts`, `lib/billing/toss-config.ts`
- recommended_fix: 웹훅 검증을 켜는 운영 정책을 “필수 키 존재 여부 검증”과 묶어서 강제(배포 전 스크립트/CI), 또는 preview에서는 검증 비활성화(`TOSS_PAYMENTS_WEBHOOK_VERIFY=false`)로 고정.

- severity: high
- area: deployment
- issue: Toss 웹훅 라우트에서 일부 단계(`logBillingWebhook`, `recordBillingWebhookEventIfNew`)는 try/catch가 없어서 DB/로깅 예외가 500으로 전파될 수 있음
- why_it_matters: 웹훅은 재시도될 수 있어 500이 반복되면 운영 데이터가 쌓이거나 승인/활성화가 지연될 수 있음. 또한 web console/로그에서 원인 분석이 어려워짐.
- reproduction_steps: 1) `BILLING_MODE=live` 2) DB 연결/스키마 오류 또는 로깅 insert 실패를 유발(예: DB 권한 문제) 3) `PAYMENT_STATUS_CHANGED` 웹훅 전송 4) 응답 500 확인(특히 verify 통과 후에도 500인지)
- suspected_files: `app/api/billing/webhook/route.ts`, `lib/billing/webhook-log.ts`, `lib/billing/webhook-idempotency.ts`, `lib/db/client.ts`
- recommended_fix: `app/api/billing/webhook/route.ts`에서 로깅/아이템업데이트를 분리 try/catch로 감싸고, “구독 상태 반영 실패만 500”처럼 실패 범위를 좁혀 500 전파를 최소화(구조 변경은 최소화 범위에서).

- severity: high
- area: navigation
- issue: 미들웨어 보호 범위에 `/billing`이 포함되어 있어 `/billing/success`, `/billing/fail`이 세션이 없으면 `/auth`로 리다이렉트될 수 있음
- why_it_matters: 결제 직후 사용자 세션이 만료/유실되는 타이밍에선 성공/실패 페이지가 열리지 않고 결제 흐름이 끊겨 사용자 지원 비용이 증가.
- reproduction_steps: 1) 결제 직전 로그아웃 또는 세션 만료 유발 2) Toss 리다이렉트로 `/billing/success` 또는 `/billing/fail` 접근 3) 미들웨어에 의해 `/auth`로 이동되는지 확인
- suspected_files: `middleware.ts`, `app/billing/success/page.tsx`, `app/billing/fail/page.tsx`
- recommended_fix: `/billing/success`와 `/billing/fail`에 대해 미들웨어에서 예외 처리(허용 list)하거나, 최소한 success/fail 페이지는 세션 없이도 결제 검증 쿼리 기반으로 처리 가능한 서버/API 정책을 정리(보안/권한검증은 유지).

- severity: high
- area: deployment
- issue: Admin 인증에서 DB에 `admin_password_hash`가 없을 때 기본 비밀번호(`admin`)로 검증되며, admin 세션 HMAC 시크릿도 환경 미설정 시 dev fallback을 사용할 수 있음
- why_it_matters: 관리 기능이 보호되어도 잘못된 초기화/DB 미구성 상태에서 무단 접근 가능성이 생길 수 있음(운영 안정성과 보안 컴플라이언스 리스크).
- reproduction_steps: 1) DB/KV에 `admin_password_hash`가 없는 상태로 배포 2) `admin-login` 호출 3) 기본 비밀번호 `admin`으로 로그인 성공 여부 확인 4) 동시에 `ADMIN_SECRET`/`NEXTAUTH_SECRET` 미설정 상태에서 admin 쿠키 생성/검증 가능 여부 확인
- suspected_files: `lib/admin-auth.ts`, `app/api/auth/admin-login/route.ts`, (해시 초기화 관련) `scripts/hash-admin-password.js`
- recommended_fix: 운영/preview에서 “DB 해시 미존재 시 admin-login 차단” 같은 강제 방어 정책 추가, 그리고 admin HMAC secret fallback 제거(또는 배포 시 필수 env 검증을 더 강하게).

- severity: medium
- area: form
- issue: `/settings` 주소 검색에서 외부 Daum postcode 스크립트 로딩 실패 시 `onerror`/대체 UI가 없어서 콘솔 에러와 UX 저하가 발생할 수 있음
- why_it_matters: 주소 입력이 핵심 입력일 수 있어 기능이 막히면 설정/결제 전환에 영향 가능.
- reproduction_steps: 1) 네트워크 제한 또는 adblock/차단 환경에서 `t1.daumcdn.net/...postcode.v2.js` 요청 실패 2) `/settings`에서 “주소 찾기” 버튼 클릭 3) 주소가 입력되지 않고 콘솔에 에러가 발생하는지 확인
- suspected_files: `app/settings/page.tsx` (DAUM 스크립트 삽입)
- recommended_fix: script 태그에 `onerror` 처리 추가 + 사용자용 에러/대체 수단 제공(수동 주소 입력 유도 등).

- severity: medium
- area: seo
- issue: OG 이미지/아이콘이 `edge` 런타임 기반(`next/og ImageResponse`)이라 런타임 제약/폴리필 이슈가 있으면 `/opengraph-image`, `/icon`, `/apple-icon` 요청이 500이 될 수 있음
- why_it_matters: 공유 시 빈 썸네일/아이콘 깨짐은 전환과 신뢰도에 직접적 영향을 줄 수 있음(배포 직후 빠르게 눈에 띄는 회귀 포인트).
- reproduction_steps: 1) 배포(Preview/Production)에서 `/opengraph-image`/`/icon`/`/apple-icon` 직접 호출 2) 200이 아닌 5xx 발생 여부 확인 3) 브라우저 콘솔/네트워크에서 에러 확인
- suspected_files: `app/opengraph-image.tsx`, `app/icon.tsx`, `app/apple-icon.tsx`
- recommended_fix: OG/아이콘 라우트의 에지 런타임 호환성 점검(필요 시 runtime 변경은 “구조 변경”이므로, 우선 관측 후 최소 수정 범위로 결정).

- severity: low
- area: analytics
- issue: 코드베이스에서 GA/GTM/PostHog/Segment/Plausible 등 명시적 이벤트 트래킹 호출이 확인되지 않음
- why_it_matters: 운영 관측 요구사항이 있다면 이벤트 누락으로 장애/전환 원인 분석이 어려울 수 있음.
- reproduction_steps: 1) generator/결제 단계에서 콘솔/네트워크로 이벤트 호출 여부 확인 2) 추적 파라미터/태그 로딩이 없는지 확인
- suspected_files: (명시적 추적 로직이 보이지 않는 상태) `lib/`/`components/` 전체(검색 기준), 관련 페이지: `app/*generator*`, `app/billing/*`
- recommended_fix: 운영에서 요구하는 분석 도구에 맞춰 최소 set 이벤트(예: 문서 생성 시작/완료, 결제 성공/실패) 추적이 실제로 동작하는지 설정/가드 포함 여부를 검증(본 요청 범위에서는 코드 수정 보류).


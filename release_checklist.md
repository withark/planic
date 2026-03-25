# Planic Release Stabilization Checklist (Draft)

## 0) Freeze 범위
- 새 기능 추가 금지
- 구조 변경 최소화
- 변경은 “한 번에 하나의 이슈” 원칙

## 1) 핵심 페이지 진입
- 공용 랜딩: `/`, `/features`, `/guide`, `/help`
- SEO 랜딩: `/plans`, `/terms`, `/privacy`
- 인증 필요(핵심 사용자): `/dashboard`, `/create-documents`
- 문서 생성/요청(핵심 입력): `/estimate-generator`, `/program-proposal-generator`, `/planning-generator`, `/cue-sheet-generator`
- 기업정보/기본설정: `/settings`
- 참고자료/업로드(운영 입력): `/reference-estimate`, `/task-order-summary`, `/scenario-reference`
- 가격/표: `/prices`
- 결제(전환): `/billing/checkout`, `/billing/success`, `/billing/fail`

## 2) CTA 동작
- `/dashboard`
  - “업그레이드” 링크(또는 CTA)가 `/plans`로 정상 이동하는지
  - “문서 만들기 화면으로 이동”(링크)이 `/create-documents`로 이동하는지
- `/plans`
  - 월간/연간 토글 동작
  - 각 플랜 카드 CTA
    - `무료로 시작하기`가 `/dashboard`로 이동하는지
    - `업그레이드`가(`/api/billing/subscribe`) 호출 후 Live checkout 요구 시 checkoutUrl로 이동하는지
    - 로그인 상태가 아닐 때 `로그인 후 업그레이드`가 `/auth?callbackUrl=/plans&reason=login_required`로 보내는지
  - 플랜 카드 “상세 혜택 더 보기/상세 접기”(모바일) 토글이 깨지지 않는지
- `/create-documents`
  - 문서 유형 카드 클릭 → 해당 generator 페이지로 이동하는지(예: 견적/기획/프로그램/큐시트)
- Generator 페이지 공통
  - “필수 입력” 검증 문구/disabled 상태가 의도대로 표시되는지(예: 주제/목표 미입력)
  - “견적 생성/기획 문서 생성/프로그램 생성/큐시트 생성” 버튼 클릭 → 생성 단계(progress label) 표시 후 결과 패널이 렌더링되는지
  - 생성 결과에서 “저장” 동작이 `apiFetch`로 정상 수행되는지(성공 토스트 노출)
  - 결과 다운로드(엑셀/PDF)가 조건(예: FREE 제한)과 함께 정상 동작하는지
- 결제
  - `/billing/checkout`: Toss 모듈이 정상 호출되고(팝업 차단 문구 포함) 결제창이 뜨는지
  - `/billing/success`: `/api/billing/confirm` 호출 결과에 따라 `/dashboard?checkout=success`로 이동하는지
  - `/billing/fail`: 에러 메시지와 “플랜으로 돌아가기” CTA가 정상 동작하는지

## 3) 문의/상담/예약 폼 동작
- “문서 생성 요청 폼”(사용자 상담/요청 입력으로 간주)
  - `/estimate-generator`: 입력 필드(`이벤트 주제`, `목표`, 선택 입력들) → `견적 생성` 동작 확인
  - `/planning-generator`: 입력 필드 → `기획 문서 생성` 동작 확인
  - `/program-proposal-generator`: 입력 필드 → `프로그램 생성` 동작 확인
  - `/cue-sheet-generator`: 입력 필드 → `큐시트 생성` 동작 확인
- “기업정보 설정 폼”
  - `/settings`에서 회사 정보 입력 후 “저장” 버튼 클릭 → 저장 완료 토스트 + 이후 생성 페이지 반영 확인
  - 다음 UI/포맷이 깨지지 않는지
    - 사업자번호 하이픈 포맷, 전화번호 하이픈 포맷
    - 주소 찾기(다음 우편번호 API) 팝업 → 주소 입력 반영
  - 결제 조건 기본값(기본 텍스트) 저장 여부 확인
- “운영 입력 폼(업로드/요약)” (문의/상담에 준하는 운영 데이터 입력)
  - `/task-order-summary`: 파일 업로드 → 요약 목록 표시 → `이 요약으로 견적 생성` CTA 동작 확인
  - `/reference-estimate`: 참고 견적서 업로드 → 업로드 완료 토스트 → 활성화/해제 토글 반영 확인

## 4) 성공/실패 상태 처리
- 결제
  - 성공: `/billing/success`의 “결제 확인 중...” → 정상 완료 시 `/dashboard?checkout=success` 토스트가 뜨는지
  - 실패/취소: `/billing/fail`에서 `플랜으로 돌아가기`가 정상 이동하고 메시지가 깨지지 않는지
  - 네트워크 레벨에서 `/api/billing/*`이 4xx/5xx로 터지지 않는지 확인
- 문서 생성
  - 생성 성공: 토스트(예: “견적서 생성 완료!”) + 결과 섹션이 즉시 렌더링되는지
  - 생성 실패: 사용자용 에러 메시지(toUserMessage)가 표시되고 재시도 가능한 상태인지
- 저장
  - 생성 후 “저장” 성공 시 결과/이력 갱신이 반영되는지(예: `/history`에 표시)
  - 저장 실패 시에도 화면이 멈추지 않고 에러 토스트가 보이는지

## 5) 모바일 메뉴
- `components/GNB` 모바일 드로어 확인
  - 햄버거 버튼 → 드로어 오픈
  - 오버레이/닫기 버튼 → 드로어 닫힘
  - 드로어에서 메뉴 클릭 시 이동 후 드로어가 정상적으로 닫히는지
  - 모바일에서 스크롤/포커스가 깨지지 않는지(잔상/배경 스크롤 잠금 확인)

## 6) 주요 링크 확인
- GNB(사이드바) 주요 링크
  - `/dashboard`, `/create-documents`, `/reference-estimate`, `/prices`, `/history`, `/settings`
- 푸터/공용 링크
  - `/guide`, `/features`, `/help`, `/plans`, `/terms`, `/privacy`

## 7) 반응형 레이아웃
- 모바일 폭(예: 390px)에서 다음 페이지 최소 1회씩 스크롤/클릭 확인
  - `/dashboard`, `/create-documents`
  - `/*-generator` 페이지 전환 및 버튼 클릭 영역
  - `/plans` 비교표(가로 스크롤)와 모바일 “상세 혜택 더 보기” 토글
- `h-screen overflow-hidden` 사용 페이지에서
  - 하단 토스트/팝업이 잘리지 않는지
  - 헤더와 스크롤 영역이 겹치지 않는지

## 8) SEO 메타
- 전역 메타
  - `app/layout.tsx` 기본 `title/description/openGraph/twitter`와 `metadataBase`가 기대한 절대 URL로 구성되는지
- 페이지 메타(타이틀/디스크립션)
  - `/features`, `/guide`, `/help`, `/plans`, `/terms`, `/privacy`
- 공유/검색 관점
  - 캐논니컬/OG url base가 placeholder URL로 고정되지 않았는지 확인(Preview→배포에서 특히)

## 9) OG 이미지
- `/opengraph-image` 접속 시 200 응답 및 OG 썸네일 렌더가 정상인지
- 공유 미리보기(메신저/Slack/X)에서 빈 썸네일/깨진 이미지만 없는지 확인

## 10) favicon
- 아이콘 라우트 정상 응답 확인
  - `/icon` (PNG)
  - `/apple-icon` (PNG)
- 탭/즐겨찾기에서 아이콘 깨짐이 없는지 확인

## 11) robots.txt
- `/robots.txt` 직접 열어보기
  - disallow가 의도대로 동작하는지(예: `/api/`, `/admin/`, `/dashboard`, `/auth`, `/settings`, `/history`, `/billing`만 차단)

## 12) sitemap
- `/sitemap.xml` 확인
  - 포함 경로: `/`, `/features`, `/guide`, `/help`, `/plans`, `/terms`, `/privacy`

## 13) analytics/event tracking
- 코드베이스에서 GA/GTM/PostHog/Segment/Plausible 등 명시적 이벤트 트래킹 호출이 보이지 않는 상태로 확인됨
- 그래도 운영 관점에서 필수 확인
  - 트래킹/분석 관련 외부 스크립트 로딩 실패(콘솔 에러) 없는지
  - 이벤트 추적이 별도로 있다면(예: 제3자 태그) 생성/결제 단계에서 이벤트가 의도대로 발생하는지(콘솔/네트워크 확인)

## 14) console errors
- 다음 페이지에서 브라우저 DevTools 콘솔/네트워크에서 에러/경고 확인
  - `/`, `/plans`, `/dashboard`, `/estimate-generator`
- 특히 확인할 것
  - uncaught exception, React hydration warning
  - 네트워크 4xx/5xx (특히 `/api/*`)
  - 스트리밍/NDJSON(생성 단계) 관련 파싱 에러

## 15) 404/500 상태
- 404 확인
  - 존재하지 않는 경로 예: `/__no_such_page`에서 404 페이지가 정상 표시되는지(500이 아닌지)
- 500 확인
  - API 호출이 비정상 HTML 에러 페이지로 떨어지지 않는지(예: 인증 필요 시 JSON/리다이렉트가 기대대로)
  - 생성/저장/업로드 흐름 중 500이 브라우저로 노출되지 않는지 확인

## 16) env 변수 점검
- NextAuth
  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
  - `npm run build` prebuild 체크(`scripts/check-auth-env.mjs`) 통과 여부
- DB/데이터
  - `DATABASE_URL` (Neon Postgres)
  - (해당 기능 사용 시) DB 초기화/스키마가 정상인지
- 결제
  - `BILLING_MODE` (mock/live)
  - live일 때: `TOSS_PAYMENTS_SECRET_KEY`, `NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY`, `TOSS_PAYMENTS_WEBHOOK_VERIFY`/관련 설정
  - `NEXT_PUBLIC_APP_URL` (success/fail redirect 기준)
- AI/생성
  - `OPENAI_API_KEY` 또는 `ANTHROPIC_API_KEY` (실연동 모드 사용 시)
  - `AI_MODE` 및 `AI_PROVIDER`가 운영 기대 동작(mock/real)과 일치하는지

## 17) Vercel 배포 전 최종 확인
- Vercel 환경변수/설정
  - Preview/Production에 필요한 env가 누락 없이 주입되어 있는지
  - `vercel.json` 리다이렉트가 의도대로 동작하는지: `planic.cloud` → `www.planic.cloud`
- 런타임 최종 스모크(브라우저 기준)
  - 핵심 페이지/CTA/문서 생성 최소 1회/결제 성공 또는 mock 흐름 1회
  - `/robots.txt`, `/sitemap.xml`, `/opengraph-image`, `/icon`, `/apple-icon` 응답이 모두 정상인지(200)
  - 콘솔 에러 및 네트워크 5xx가 없는지

## 18) 체크 후 제출물(관측 결과 기록)
- 확인자/시간
- 브라우저(기기/OS/버전)
- 발견된 에러(콘솔/네트워크/로그) 요약 + 재현 URL


# 토스 라이브 결제 흐름 최종 점검 보고 (코드·빌드 검증)

## 1. 실제 성공한 항목

- **BASIC 결제 진입**: `/api/billing/subscribe` (planType: BASIC, billingCycle) → `subscribePlan` → 주문 생성(BASIC 금액) → `checkoutUrl` 반환 → `/billing/checkout?orderId=xxx` → `/api/billing/order`로 주문 조회 후 토스 결제창 호출. 코드 경로 정상.
- **PREMIUM 결제 진입**: 동일 흐름으로 PREMIUM 주문 생성·결제창 진입. 코드 경로 정상.
- **결제 성공 후 구독 반영**: `/billing/success` → POST `/api/billing/confirm` → `confirmTossPayment` → 토스 승인 API 호출 → `markBillingOrderApproved` → `setActiveSubscription` 호출로 구독 활성화. 코드 경로 정상.
- **결제 실패 시 잘못 활성화되지 않음**: 실패 시 `/billing/fail`로만 이동, confirm 미호출 → 주문은 pending 유지, `setActiveSubscription` 미호출. 웹훅 CANCELED/EXPIRED/ABORTED는 `order.status === 'approved'`일 때만 구독 취소. 코드 경로 정상.
- **웹훅 수신 후 상태 반영**: `PAYMENT_STATUS_CHANGED` 처리 — DONE 시 미승인 주문이면 `markBillingOrderApproved` + `setActiveSubscription`; CANCELED/PARTIAL_CANCELED/EXPIRED/ABORTED 시 주문 상태 갱신 및 기승인 시 구독 취소. 이벤트 ID 기준 중복 처리 방지. 코드 경로 정상.
- **/api/me, 대시보드, 플랜 페이지 상태 일치**: `/api/me`가 `getActiveSubscription(userId)`로 구독 조회 후 반환; 대시보드·플랜 페이지는 `/api/me` 호출로 동일 소스 사용. 일치.
- **build 통과 유지**: `npm run build` 성공 (Exit code 0).

## 2. 실패한 항목

- 없음 (본 검증은 코드 경로 및 빌드 기준).

## 3. 실패 원인

- 해당 없음.

## 4. 운영 오픈 가능 여부

- **코드·빌드 기준으로는 운영 오픈 가능.**
- 실제 토스 라이브 환경에서 1회 이상 결제(성공/실패) 및 웹훅 수신을 수동 확인하면 안전.

## 5. 남은 작업

- 토스 라이브에서 **BASIC·PREMIUM 각 1회** 실제 결제 테스트(성공 플로우) 권장.
- 웹훅 URL이 라이브에 등록된 상태에서 **DONE/CANCELED** 이벤트 수신 및 DB/대시보드 반영 여부 1회 확인 권장.
- (선택) 결제 실패 시 `/billing/fail`에서 “플랜으로 돌아가기” 클릭 시 `/plans?checkout=canceled`로 이동해 토스트 노출 여부 확인.

# Planic 관리자 운영 백오피스 (최종 정리)

## 1. 기존 관리자 페이지 문제점 요약

| 문제 | 설명 |
|------|------|
| 역할 혼재 | 대시보드·사용량·사용자가 모두 quotes 집계 중심으로 “무엇을 보는지”에 가깝고, 품질·결제·정산 역할이 분리되지 않음 |
| 결제 단절 | 토스 `billing_orders`·웹훅은 있으나 관리자 화면에 주문/웹훅 요약 없음 |
| 샘플·엔진 추적 불가 | 큐시트 샘플이 “항상 최신 1건”만 사용되고, 어떤 샘플·엔진 설정이 쓰였는지 로그 없음 |
| 엔진 설정 | provider/model/maxTokens만 실질 반영으로 알려져 있었고, 품질 방향은 프롬프트에 없음 |
| 삭제 중심 | 유저 샘플 삭제 API는 하드 삭제 — 운영 백오피스 정책(보관·비활성)과 불일치 |

## 2. 최종 관리자 메뉴 구조안

- **운영 개요**: 대시보드  
- **문서·품질**: 샘플 관리 → 엔진 강화 설정 → 생성 로그 → 검수·미리보기  
- **비즈니스·정산**: 결제 관리 → 정산 관리 → 운영 통계 → 사용통계 → 구독 현황  
- **계정·플랜**: 사용자 관리 → 플랜 관리  
- **시스템**: 시스템 설정 → 에러 로그  

## 3. 메뉴별 역할 정의

| 메뉴 | 역할 |
|------|------|
| 대시보드 | 가입·결제·매출·구독·생성·실패·웹훅·취소 요약 |
| 샘플 관리 | 큐시트 샘플 메타·탭·우선순위·활성·보관·복제 |
| 엔진 강화 | LLM 파라미터 + 프롬프트 품질 지시(구조/문체/샘플 가중치 등) |
| 생성 로그 | 요청별 성공/실패·샘플·엔진 스냅샷·quote 연결 |
| 검수·미리보기 | 최근 견적 목록 + generationMeta로 샘플 반영 교차 확인 |
| 결제 관리 | 주문 단위·상태·웹훅 수신 건수 |
| 정산 관리 | 월별 승인 매출·플랜 비중(MVP) |
| 운영 통계 | 대시보드와 동소스 요약(확장 여지) |
| 사용통계 | 기존 usage API·생성 분포 |
| 구독 현황 | 기존 subscriptions 페이지 |
| 사용자/플랜/시스템/에러 로그 | 기존 유지 |

## 4. MVP 범위

- 그룹형 사이드바 + 대시보드 지표 확장  
- 샘플 DB 컬럼 + 관리자 CRUD(보관/복제/우선순위) + 생성 시 우선순위 반영  
- `generation_runs` + `quotes.generationMeta`  
- 엔진 KV 확장 + `buildGeneratePrompt` 반영  
- 결제 목록 + 웹훅 집계 + 정산 월별 집계  

## 5. 추후 확장

- 탭별 샘플을 견적 외 문서 파이프라인에 분기 연결  
- 전환율·유지율·코호트(이벤트 테이블)  
- 정산 수수료·정산 완료 플래그  
- 검수 화면에서 PDF/탭 인라인 미리보기  

## 6. 유지 / 통합 / 제거

| 유지 | 통합 | 제거/축소 |
|------|------|-----------|
| users, plans, subscriptions, usage, system, logs | usage = 사용통계 메뉴명 | 대시보드 단일 `ADMIN_LINKS` 중복 제거(셸로 통일) |
| engines → 엔진 강화로 명확화 | 구독은 비즈니스 그룹 하위 | 유저용 샘플 하드삭제 API는 유지하되 관리자는 보관 권장 |

## 7. DB 필드·상태 제안

**`cuesheet_samples`**: display_name, document_tab, description, priority, is_active, archived_at, generation_use_count, last_used_at  

**`generation_runs`**: user_id, quote_id, success, error_message, sample_id, sample_filename, cuesheet_applied, engine_snapshot  

**`quotes.payload`(HistoryRecord)**: generationMeta  

**엔진 `app_kv.engine_config`**: structureFirst, toneFirst, outputFormatTemplate, sampleWeightNote, qualityBoost  

## 8. 화면 구조 제안

- 데스크톱: 좌측 고정 사이드바(그룹 헤더) + 본문 max-width  
- 모바일: 사이드바 스크롤·본문 패딩으로 최소 깨짐 방지  

## 9. 샘플 / 엔진 / 생성 로그 연결

1. 사용자 큐시트 업로드 → `cuesheet_samples` + 파일  
2. 생성 시 `listCuesheetSamplesForGeneration`: 보관 제외·활성만·priority DESC  
3. 첫 후보 파일 텍스트 → `cuesheetSampleContext` → 프롬프트  
4. `kv engine_config` → `engineQuality` + LLM 파라미터  
5. 성공 시 `bumpSampleGenerationUse`, `quotesDbAppend`에 generationMeta, `insertGenerationRun`  
6. 실패 시에도 `insertGenerationRun`  

## 10. 결제 / 정산 / 통계

- **결제**: `billing_orders` + `billing_webhook_logs` 주문별 COUNT  
- **정산**: 월별 `status=approved` SUM(amount); 플랜별 GROUP  
- **운영 통계**: stats API; **사용통계**: usage API (매출과 분리)  

## 11. 수정·추가 파일 목록

- `lib/db/client.ts` — cuesheet 컬럼, generation_runs  
- `lib/db/cuesheet-samples-db.ts` — 전면  
- `lib/db/generation-runs-db.ts`, `lib/db/admin-ops-stats-db.ts` — 신규  
- `lib/billing/toss-orders-db.ts` — listBillingOrdersAdmin  
- `lib/admin-types.ts`, `lib/ai/types.ts`, `lib/ai/prompts.ts`, `lib/ai/client.ts`  
- `app/api/generate/route.ts`  
- `app/api/admin/stats|engines|samples|payments|settlement|generation-runs|quotes-recent`  
- `components/admin/AdminShell.tsx`, `app/admin/AdminDashboard.tsx`, `app/admin/engines/page.tsx`  
- `app/admin/samples|generation-logs|review|payments|settlement|ops-stats/page.tsx`  
- `docs/ADMIN_BACKOFFICE.md`  

## 12. 테스트 결과

- `npx tsc --noEmit` 통과  
- `npm run build` 통과  

## 13. 남은 리스크

- 기존 DB에 `ALTER` 실패 시(드물게) 샘플 컬럼 없으면 목록 쿼리 실패 가능 → 배포 후 initDb 1회 유도  
- `generation_runs` 배포 전 생성 건은 로그 없음  
- 정산 월 경계·타임존은 UTC 기준 단순 처리  
- 검수 화면은 사용자 세션 없이 링크만 안내 — 인라인 미리보기는 미구현  

import { CREATE_DOCUMENT_HUB_ITEMS } from '@/lib/marketing-documents'

/** 관리자에서 사용자 앱과 동일한 URL로 이동할 때 쓰는 링크 */
export type AdminUserAppMirrorLink = {
  href: string
  label: string
  desc?: string
}

export type AdminUserAppMirrorGroup = {
  label: string
  items: AdminUserAppMirrorLink[]
}

/** GNB와 동일 (로그인 후 앱 사이드바) */
export const ADMIN_USER_APP_GNB_LINKS: AdminUserAppMirrorLink[] = [
  { href: '/dashboard', label: '홈', desc: '사용자 대시보드' },
  { href: '/create-documents', label: '문서 생성', desc: '문서 허브(자주 쓰는 문서·확장)' },
  { href: '/prices', label: '단가표', desc: '견적 품목·단가' },
  { href: '/history', label: '작업 이력', desc: '저장·생성 기록' },
  { href: '/settings', label: '설정', desc: '회사 정보·로고' },
  { href: '/auth', label: '로그인·가입', desc: '사용자 인증 (/auth)' },
]

/** `/create-documents` 허브와 동일 (`lib/marketing-documents`) */
export function adminUserAppGeneratorLinks(): AdminUserAppMirrorLink[] {
  return CREATE_DOCUMENT_HUB_ITEMS.map((d) => ({
    href: d.href,
    label: d.title,
    desc: `${d.category} — ${d.desc}`,
  }))
}

/** 결제·요금제 (사용자 앱 / 마케팅) */
const USER_BILLING_AND_PLANS: AdminUserAppMirrorLink[] = [
  { href: '/billing', label: '결제·구독', desc: '청구·구독 관리 화면' },
  { href: '/billing/checkout', label: '결제 체크아웃', desc: '주문 컨텍스트 없으면 안내·리다이렉트될 수 있음' },
  { href: '/billing/success', label: '결제 성공', desc: '토스 등 리턴 URL 점검' },
  { href: '/billing/fail', label: '결제 실패', desc: '토스 등 리턴 URL 점검' },
  { href: '/plans', label: '요금제 안내', desc: '플랜 비교(앱·마케팅 공통 경로)' },
]

/** 참고 자료·별도 업로드 플로우 */
const USER_REFERENCE_ROUTES: AdminUserAppMirrorLink[] = [
  { href: '/references', label: '참고 자료', desc: '사용자 참고 문서 업로드·관리' },
  { href: '/reference-estimate', label: '참고 견적', desc: '참고용 견적 활성화' },
  { href: '/scenario-reference', label: '시나리오 참고', desc: '시나리오 참고 자료' },
]

/** 예전·짧은 URL (대부분 리다이렉트 — 동작 확인용) */
const USER_LEGACY_SHORTCUTS: AdminUserAppMirrorLink[] = [
  { href: '/generate', label: '/generate', desc: '→ /estimate-generator' },
  { href: '/create/proposal', label: '/create/proposal', desc: '→ /estimate-generator' },
  { href: '/create/emcee', label: '/create/emcee', desc: '→ /emcee-script-generator' },
  { href: '/create/cuesheet', label: '/create/cuesheet', desc: '→ /cue-sheet-generator' },
  { href: '/create/task-summary', label: '/create/task-summary', desc: '→ /task-order-summary' },
  { href: '/cuesheet', label: '/cuesheet', desc: '큐시트(레거시 모듈 경로)' },
]

/** 비로그인 랜딩·정책 (고객 대면) */
const USER_MARKETING_AND_POLICY: AdminUserAppMirrorLink[] = [
  { href: '/', label: '랜딩', desc: '서비스 소개' },
  { href: '/features', label: '기능 소개', desc: '기능 페이지' },
  { href: '/help', label: '도움말', desc: 'FAQ·이용 안내' },
  { href: '/guide', label: '가이드', desc: '사용 가이드' },
  { href: '/privacy', label: '개인정보처리방침', desc: '' },
  { href: '/terms', label: '이용약관', desc: '' },
  { href: '/refund', label: '환불 정책', desc: '' },
]

/**
 * 관리자 사이드바·대시보드에 쓰는「사용자 앱 전체」그룹.
 * - 1·2: 일상 검수에 자주 쓰는 경로
 * - 3: 결제(하위 URL 포함)·요금·참고 자료
 * - 4: 구 URL·리다이렉트 점검
 * - 5: 랜딩·약관
 */
export const ADMIN_USER_APP_MIRROR_GROUPS: AdminUserAppMirrorGroup[] = [
  { label: '메뉴 (GNB)', items: ADMIN_USER_APP_GNB_LINKS },
  { label: '문서 생성 (허브 동일)', items: adminUserAppGeneratorLinks() },
  { label: '결제·참고', items: [...USER_BILLING_AND_PLANS, ...USER_REFERENCE_ROUTES] },
  { label: '구 URL·리다이렉트', items: USER_LEGACY_SHORTCUTS },
  { label: '랜딩·정책', items: USER_MARKETING_AND_POLICY },
]

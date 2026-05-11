import { CREATE_DOCUMENT_HUB_ITEMS } from '@/lib/marketing-documents'

/** 관리자 화면에서 사용자 앱(GNB·문서 생성 허브)과 동일한 경로로 이동할 때 쓰는 링크 */
export type AdminUserAppMirrorLink = {
  href: string
  label: string
  desc?: string
}

/** GNB 주요 메뉴와 동일 */
export const ADMIN_USER_APP_GNB_LINKS: AdminUserAppMirrorLink[] = [
  { href: '/dashboard', label: '홈', desc: '사용자 대시보드' },
  { href: '/create-documents', label: '문서 생성', desc: '문서 허브(자주 쓰는 문서·확장)' },
  { href: '/prices', label: '단가표', desc: '견적 품목·단가' },
  { href: '/history', label: '작업 이력', desc: '저장·생성 기록' },
  { href: '/settings', label: '설정', desc: '회사 정보·로고' },
]

/** `/create-documents` 허브에 나오는 문서 목록과 동일 (`lib/marketing-documents`) */
export function adminUserAppGeneratorLinks(): AdminUserAppMirrorLink[] {
  return CREATE_DOCUMENT_HUB_ITEMS.map((d) => ({
    href: d.href,
    label: d.title,
    desc: `${d.category} — ${d.desc}`,
  }))
}

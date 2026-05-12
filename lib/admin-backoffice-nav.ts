/**
 * `/app/admin/**` 에 존재하는 관리자 화면을 한곳에서 나열합니다.
 * (동적 `/admin/quotes/[id]`·`/admin/users/[userId]` 는 목록·상세에서 진입)
 */

export type AdminBackofficeLink = {
  href: string
  label: string
  desc?: string
  /** 새 탭에서 API JSON 등 */
  external?: boolean
}

export type AdminBackofficeGroup = {
  label: string
  items: AdminBackofficeLink[]
}

export const ADMIN_BACKOFFICE_MIRROR_GROUPS: AdminBackofficeGroup[] = [
  {
    label: '문서·품질',
    items: [
      { href: '/admin/samples', label: '기준 양식 관리', desc: '참고 양식 등록·연결·반영 방식' },
      { href: '/admin/engines', label: '생성 규칙 설정', desc: '탭별 규칙·샘플 강도·출력 형식' },
      { href: '/admin/generation-logs', label: '생성 로그', desc: '샘플·엔진 반영 추적' },
      { href: '/admin/review', label: '검수·미리보기', desc: '최근 견적 목록 → 건 선택 시 /admin/quotes/[id] 상세' },
      { href: '/admin/references-collect', label: '참고 수집 (레거시)', desc: '현재 /admin/samples 로 리다이렉트' },
    ],
  },
  {
    label: '비즈니스',
    items: [
      { href: '/admin/payments', label: '결제 관리', desc: '매출·실패·환불·토스 주문' },
      { href: '/admin/payment-test', label: '결제 테스트', desc: '체크리스트·연동 확인' },
      { href: '/admin/settlement', label: '정산 관리', desc: '기간별 승인 매출' },
      { href: '/admin/ops-stats', label: '운영 통계', desc: '요약 지표(MVP)' },
      { href: '/admin/usage', label: '사용 통계', desc: '생성·쿼터·사용자별' },
      { href: '/admin/subscriptions', label: '구독 현황', desc: '구독 이력·플랜별' },
      { href: '/admin/users', label: '사용자 관리', desc: '가입·플랜·한도 → 행의 /admin/users/[userId] 상세' },
      { href: '/admin/plans', label: '플랜 관리', desc: '요금제·한도(DB)' },
    ],
  },
  {
    label: '시스템·헬스',
    items: [
      { href: '/admin/system', label: '시스템 설정', desc: '환경·스토어 상태' },
      { href: '/admin/logs', label: '에러 로그', desc: 'API·admin_events' },
      { href: '/api/health', label: 'API 헬스', desc: 'GET JSON', external: true },
    ],
  },
]

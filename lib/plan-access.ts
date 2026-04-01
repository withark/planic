import type { PlanType } from '@/lib/plans'

export type AppDocumentType =
  | 'estimate'
  | 'planning'
  | 'program'
  | 'timetable'
  | 'scenario'
  | 'cuesheet'
  | 'taskOrderSummary'
  | 'emceeScript'

export type PlanFeatureKey =
  | 'taskOrderWorkflow'
  | 'pricingTable'
  | 'scenarioReference'
  | 'cuesheetReference'
  | 'historyFull'
  | 'premiumGeneration'

export const DOCUMENT_LABEL_KO: Record<AppDocumentType, string> = {
  estimate: '견적서',
  planning: '기획안',
  program: '프로그램 제안서',
  timetable: '타임테이블',
  scenario: '시나리오',
  cuesheet: '큐시트',
  taskOrderSummary: '과업지시서 요약',
  emceeScript: '사회자 멘트',
}

const DOCUMENT_MIN_PLAN: Record<AppDocumentType, PlanType> = {
  estimate: 'FREE',
  planning: 'FREE',
  program: 'FREE',
  timetable: 'BASIC',
  scenario: 'BASIC',
  cuesheet: 'BASIC',
  taskOrderSummary: 'BASIC',
  emceeScript: 'BASIC',
}

const FEATURE_MIN_PLAN: Record<PlanFeatureKey, PlanType> = {
  taskOrderWorkflow: 'BASIC',
  pricingTable: 'BASIC',
  scenarioReference: 'BASIC',
  cuesheetReference: 'BASIC',
  historyFull: 'BASIC',
  premiumGeneration: 'PREMIUM',
}

const PLAN_RANK: Record<PlanType, number> = {
  FREE: 0,
  BASIC: 1,
  PREMIUM: 2,
}

export function hasPlanAtLeast(plan: PlanType, required: PlanType): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[required]
}

export function isDocumentAllowedForPlan(plan: PlanType, docType: AppDocumentType): boolean {
  return hasPlanAtLeast(plan, DOCUMENT_MIN_PLAN[docType])
}

export function requiredPlanForDocument(docType: AppDocumentType): PlanType {
  return DOCUMENT_MIN_PLAN[docType]
}

export function isFeatureAllowedForPlan(plan: PlanType, feature: PlanFeatureKey): boolean {
  return hasPlanAtLeast(plan, FEATURE_MIN_PLAN[feature])
}

export function requiredPlanForFeature(feature: PlanFeatureKey): PlanType {
  return FEATURE_MIN_PLAN[feature]
}

export function documentAccessMessage(docType: AppDocumentType): string {
  const label = DOCUMENT_LABEL_KO[docType]
  const required = requiredPlanForDocument(docType)
  if (required === 'PREMIUM') return `${label}은(는) 프로 플랜에서 사용할 수 있습니다.`
  return `${label}은(는) 베이직 플랜부터 사용할 수 있습니다.`
}

export function featureAccessMessage(feature: PlanFeatureKey): string {
  switch (feature) {
    case 'taskOrderWorkflow':
      return '과업지시서 기반 워크플로우는 베이직 플랜부터 사용할 수 있습니다.'
    case 'pricingTable':
      return '단가표 기능은 베이직 플랜부터 사용할 수 있습니다.'
    case 'scenarioReference':
      return '시나리오 참고자료는 베이직 플랜부터 사용할 수 있습니다.'
    case 'cuesheetReference':
      return '큐시트 샘플 자료는 베이직 플랜부터 사용할 수 있습니다.'
    case 'historyFull':
      return '작업 이력의 전체 보관/재활용 기능은 베이직 플랜부터 사용할 수 있습니다.'
    case 'premiumGeneration':
      return '프리미엄 생성 모드는 프로 플랜에서 사용할 수 있습니다.'
    default:
      return '이 기능은 현재 플랜에서 사용할 수 없습니다.'
  }
}


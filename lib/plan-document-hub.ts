import type { PlanType } from '@/lib/plans'
import { documentAccessMessage, isDocumentAllowedForPlan, type AppDocumentType } from '@/lib/plan-access'

/** 문서 생성 허브·대시보드 바로 시작에서 href → 플랜 게이트 docType */
export const HUB_DOC_TYPE_BY_HREF: Record<string, AppDocumentType> = {
  '/estimate-generator': 'estimate',
  '/planning-generator': 'planning',
  '/program-proposal-generator': 'program',
  '/scenario-generator': 'scenario',
  '/cue-sheet-generator': 'cuesheet',
  '/emcee-script-generator': 'emceeScript',
  '/task-order-summary': 'taskOrderSummary',
}

export function docTypeFromHubHref(href: string): AppDocumentType | null {
  return HUB_DOC_TYPE_BY_HREF[href] ?? null
}

export function isHubDocumentLocked(plan: PlanType, href: string): boolean {
  const docType = docTypeFromHubHref(href)
  if (!docType) return false
  return !isDocumentAllowedForPlan(plan, docType)
}

export function hubDocumentLockMessage(href: string): string {
  const docType = docTypeFromHubHref(href)
  return docType ? documentAccessMessage(docType) : '현재 플랜에서 사용할 수 없는 문서입니다.'
}

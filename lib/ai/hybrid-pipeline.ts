import type { PlanType } from '@/lib/plans'
import type { EffectiveEngineConfig } from './client'

/**
 * 하이브리드(OpenAI draft + Claude refine) 파이프라인 — 현재 비활성.
 * Claude 단독 파이프라인으로 운영.
 */
export function getHybridPipelineEngines(
  _userPlan: PlanType | undefined,
  _opts?: { hybridTemplateId?: string | null; forceStandardRefine?: boolean },
): {
  draft: EffectiveEngineConfig
  refine: EffectiveEngineConfig
} | null {
  // Claude 단독 운영 — OpenAI hybrid 비활성
  return null
}

/** 항상 false — hybrid 비활성 상태에서는 정제 단계 없음 */
export function shouldSkipHybridRefinementForPlan(_userPlan: PlanType | undefined): boolean {
  return true
}

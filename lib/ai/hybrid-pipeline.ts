import { getEnv, readEnvBool } from '@/lib/env'
import type { PlanType } from '@/lib/plans'
import type { EffectiveEngineConfig } from './client'
import { clampEngineMaxTokens } from './generate-config'

function parsePositiveIntEnv(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n
}

/**
 * 기본 2단계 파이프라인: OpenAI 초안(gpt-5.4-mini 등) + Claude 정제(Sonnet 등).
 * - `AI_PIPELINE_MODE`가 off/single/legacy면 비활성(단일 엔진).
 * - OpenAI·Anthropic 키가 모두 있으면 기본 hybrid (명시적 hybrid와 동일).
 */
export function getHybridPipelineEngines(userPlan?: PlanType): {
  draft: EffectiveEngineConfig
  refine: EffectiveEngineConfig
} | null {
  const env = getEnv()
  const mode = (env.AI_PIPELINE_MODE || '').trim().toLowerCase()
  if (mode === 'off' || mode === 'single' || mode === 'legacy') return null
  if (!env.OPENAI_API_KEY?.trim() || !env.ANTHROPIC_API_KEY?.trim()) return null

  const draftTokens = clampEngineMaxTokens(parsePositiveIntEnv(env.OPENAI_MAX_TOKENS_DRAFT, 6_144))
  const refineTokens = clampEngineMaxTokens(parsePositiveIntEnv(env.ANTHROPIC_MAX_TOKENS_REFINE, 6_144))

  const draftBase =
    (env.OPENAI_MODEL_DRAFT || '').trim() || (env.OPENAI_MODEL || '').trim() || 'gpt-5.4-mini'
  const premiumDraft =
    (env.OPENAI_MODEL_PREMIUM_DRAFT || '').trim() || draftBase

  const refineBase =
    (env.ANTHROPIC_MODEL_REFINE || '').trim() ||
    (env.ANTHROPIC_MODEL || '').trim() ||
    'claude-sonnet-4-6'
  const premiumRefine = (env.ANTHROPIC_MODEL_PREMIUM || '').trim() || refineBase

  const premiumMode = readEnvBool('AI_ENABLE_PREMIUM_MODE', true)
  const draftModel = premiumMode && userPlan === 'PREMIUM' ? premiumDraft : draftBase
  const refineModel = premiumMode && userPlan === 'PREMIUM' ? premiumRefine : refineBase

  return {
    draft: { provider: 'openai', model: draftModel, maxTokens: draftTokens, overlay: null },
    refine: { provider: 'anthropic', model: refineModel, maxTokens: refineTokens, overlay: null },
  }
}

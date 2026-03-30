import { estimateUsdFromTokens } from '../cost-estimate'
import type { LLMUsage } from '../client'

function usageToApproxUsd(model: string, u?: LLMUsage): number {
  if (!u) return 0
  const pt = u.promptTokens ?? u.inputTokens ?? 0
  const ct = u.completionTokens ?? u.outputTokens ?? 0
  if (!pt && !ct) return 0
  return estimateUsdFromTokens(model, pt, ct).totalUsd
}

/** 단계별 usage로 대략 총 USD(운영 참고용). */
export function aggregateGenerationCostUsd(stages: Array<{ model: string; usage?: LLMUsage }>): {
  totalUsd: number
  byStageUsd: number[]
} {
  const byStageUsd = stages.map((s) => usageToApproxUsd(s.model, s.usage))
  const totalUsd = Math.round(byStageUsd.reduce((a, b) => a + b, 0) * 1_000_000) / 1_000_000
  return { totalUsd, byStageUsd }
}

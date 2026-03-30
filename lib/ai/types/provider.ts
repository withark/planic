import type { EffectiveEngineConfig } from '../client'

export type { EffectiveEngineConfig }
export type AIProviderId = EffectiveEngineConfig['provider']

export type LLMUsageSlice = {
  promptTokens?: number
  completionTokens?: number
  inputTokens?: number
  outputTokens?: number
}

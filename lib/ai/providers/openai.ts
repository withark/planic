import { getEnv } from '@/lib/env'
import { callLLMWithUsage, type CallLLMOptions, type EffectiveEngineConfig } from '../client'

/**
 * OpenAI 전용 초안 생성 — 앱 전역에 raw SDK를 흩뿌리지 않고 여기서만 호출합니다.
 */
export async function generateDraft(
  prompt: string,
  engine: EffectiveEngineConfig,
  opts?: Pick<CallLLMOptions, 'maxTokens' | 'timeoutMs' | 'systemPrompt'>,
) {
  return callLLMWithUsage(prompt, { engine, ...opts })
}

export async function summarizeWithOpenAI(
  prompt: string,
  engine: EffectiveEngineConfig,
  opts?: Pick<CallLLMOptions, 'maxTokens' | 'timeoutMs'>,
) {
  return callLLMWithUsage(prompt, { engine, ...opts })
}

/** 키 존재 여부만 확인(실제 ping 없음). */
export function healthCheckOpenAI(): { ok: boolean; reason?: string } {
  try {
    if (!getEnv().OPENAI_API_KEY?.trim()) return { ok: false, reason: 'OPENAI_API_KEY missing' }
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) }
  }
}

export function isAiModeMockRaw(): boolean {
  return (process.env.AI_MODE || '').trim().toLowerCase() === 'mock'
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
}

/**
 * Safety rule:
 * - Production must never execute mock generation branch.
 * - Mock is allowed only in non-production runtime.
 */
export function isMockGenerationEnabled(): boolean {
  return isAiModeMockRaw() && !isProductionRuntime()
}

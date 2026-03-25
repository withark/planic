export function isAiModeMockRaw(): boolean {
  return (process.env.AI_MODE || '').trim().toLowerCase() === 'mock'
}

export function isProductionRuntime(): boolean {
  // Vercel preview는 Next.js 빌드/런타임이 `NODE_ENV=production`인 경우가 많습니다.
  // 이때 mock 생성이 비활성화되면(=실 API 키 없이) `/api/generate`가 즉시 실패할 수 있어
  // `VERCEL_ENV`가 명시된 환경에서는 Vercel 분기 기준을 우선합니다.
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === 'production'
  return process.env.NODE_ENV === 'production'
}

/**
 * Safety rule:
 * - Production must never execute mock generation branch.
 * - Mock is allowed only in non-production runtime.
 */
export function isMockGenerationEnabled(): boolean {
  return isAiModeMockRaw() && !isProductionRuntime()
}

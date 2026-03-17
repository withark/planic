export function resolveNextAuthSecret(): string | undefined {
  const s = (process.env.NEXTAUTH_SECRET ?? '').trim()
  if (s) return s
  // 개발 중에는 고정된 로컬 전용 secret으로 세션/토큰 검증을 안정화한다.
  if (process.env.NODE_ENV !== 'production') return 'planic-dev-only-secret'
  // 운영에서는 반드시 환경변수로 주입되어야 하므로 undefined 유지
  return undefined
}


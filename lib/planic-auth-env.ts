/**
 * planic.cloud Production 전용: apex/www 공통 세션 쿠키·미들웨어 getToken 이름 정렬.
 * Preview(VERCEL_ENV !== production)에서는 켜지 않음 → vercel.app 등 기본 쿠키만 사용.
 */
export function planicProductionSharedCookie(): boolean {
  if (process.env.NODE_ENV !== 'production') return false
  if (process.env.VERCEL_ENV !== 'production') return false
  return /^https:\/\/(www\.)?planic\.cloud/i.test((process.env.NEXTAUTH_URL || '').trim())
}

/** planic Production에서 쓰는 세션 쿠키 이름 (__Secure- 접두사 없음: Domain 과 조합 시 호환성) */
export const PLANIC_SESSION_COOKIE_NAME = 'next-auth.session-token'

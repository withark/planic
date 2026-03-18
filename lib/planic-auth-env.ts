/**
 * planic.cloud Production 전용: apex/www 공통 세션 쿠키·미들웨어 getToken 이름 정렬.
 * Preview(VERCEL_ENV !== production)에서는 켜지 않음 → vercel.app 등 기본 쿠키만 사용.
 */
/** NEXTAUTH_URL 이 planic 운영 호스트인지 (끝 슬래시 있어도 허용 — Vercel에 / 붙이면 기존 정규식이 실패해 쿠키 분기 전부 꺼지던 버그 방지) */
export function isPlanicProductionNextAuthUrl(url: string): boolean {
  const u = url.trim().replace(/\/+$/, '') || ''
  return /^https:\/\/(www\.)?planic\.cloud$/i.test(u)
}

export function planicProductionSharedCookie(): boolean {
  if (process.env.NODE_ENV !== 'production') return false
  if (process.env.VERCEL_ENV !== 'production') return false
  return isPlanicProductionNextAuthUrl(process.env.NEXTAUTH_URL || '')
}

/** planic Production에서 쓰는 세션 쿠키 이름 (__Secure- 접두사 없음: Domain 과 조합 시 호환성) */
export const PLANIC_SESSION_COOKIE_NAME = 'next-auth.session-token'

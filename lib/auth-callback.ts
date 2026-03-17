/**
 * callbackUrl 검증: 같은 origin의 path만 허용, 그 외는 fallback 반환.
 * signIn(provider, { callbackUrl })에 넣기 전에 사용할 수 있음.
 */
const DEFAULT_CALLBACK = '/'

export function sanitizeCallbackUrl(callbackUrl: string | null | undefined): string {
  if (!callbackUrl || typeof callbackUrl !== 'string') return DEFAULT_CALLBACK
  const trimmed = callbackUrl.trim()
  if (!trimmed) return DEFAULT_CALLBACK
  try {
    if (trimmed.startsWith('/')) {
      if (trimmed.startsWith('//')) return DEFAULT_CALLBACK
      return trimmed
    }
    const url = new URL(trimmed)
    if (typeof window !== 'undefined' && url.origin !== window.location.origin) return DEFAULT_CALLBACK
    // 서버 환경(window 없음)에서는 origin 비교가 불가하므로, path+query만 허용한다.
    // (절대 URL이 들어와도 외부로 튀지 않도록 pathname/search만 반환)
    const pathAndQuery = (url.pathname || DEFAULT_CALLBACK) + (url.search || '')
    return pathAndQuery || DEFAULT_CALLBACK
  } catch {
    return DEFAULT_CALLBACK
  }
}

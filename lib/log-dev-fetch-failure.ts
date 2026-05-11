/** 개발 환경에서만 비치명적 fetch 실패를 콘솔에 남깁니다. */
export function warnDevFetchFailure(context: string, error: unknown): void {
  if (process.env.NODE_ENV !== 'development') return
  console.warn(`[planic] ${context}`, error)
}

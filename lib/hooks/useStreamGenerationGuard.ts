'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * `apiGenerateStream` 등 장시간 요청에 대해
 * - 언마운트 시 AbortSignal로 네트워크 중단
 * - 재시도·연속 클릭 시 이전 세션 무시
 * - `stillCurrent(session)`으로 setState·토스트 가드
 */
export function useStreamGenerationGuard() {
  const isMountedRef = useRef(true)
  const genSessionRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      /** 세션 카운터는 증가시키지 않음(Strict 모드 재마운트 시 첫 요청이 헛도는 것 방지). 무효화는 abort + 새 startSession 카운터로만 처리. */
      abortRef.current?.abort()
    }
  }, [])

  const startSession = useCallback(() => {
    const session = ++genSessionRef.current
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    return { session, signal: ac.signal, ac }
  }, [])

  const clearAbortIfCurrent = useCallback((ac: AbortController) => {
    if (abortRef.current === ac) abortRef.current = null
  }, [])

  const stillCurrent = useCallback((session: number) => {
    return isMountedRef.current && genSessionRef.current === session
  }, [])

  return { isMountedRef, startSession, clearAbortIfCurrent, stillCurrent }
}

'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * `apiGenerateStream` 등 장시간 요청에 대해
 * - 새 생성 시작 시 `startSession` 안에서만 이전 요청 abort (중복 클릭 차단)
 * - 언마운트에서는 abort 하지 않음(일시 재마운트·Strict로 생성이 끊기는 현상 방지)
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

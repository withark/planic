'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api/client'
import type { CompanySettings } from '@/lib/types'

/**
 * 회사 정보가 비어 있는 신규 사용자를 한 번 `/settings?onboarding=1` 로 유도한다.
 *
 * - 마운트 시 `/api/settings` 한 번만 조회.
 * - 회사명(name)이 비어 있으면 현재 경로를 `from`으로 달아 설정 페이지로 이동.
 * - 사용자가 `건너뛰기`를 누른 적이 있으면(`sessionStorage` 플래그) 다시 묻지 않는다.
 * - 401 등 비로그인 응답은 무시한다(다른 가드가 처리).
 */
export function useCompanyOnboardingRedirect(options?: { enabled?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const ranRef = useRef(false)
  const enabled = options?.enabled ?? true

  useEffect(() => {
    if (!enabled) return
    if (ranRef.current) return
    ranRef.current = true

    if (typeof window === 'undefined') return
    try {
      const skipped = window.sessionStorage.getItem('planic_company_onboarding_skipped')
      if (skipped === '1') return
    } catch {
      // sessionStorage 사용 불가 환경 — 그냥 진행
    }

    if (pathname && pathname.startsWith('/settings')) return

    let cancelled = false
    apiFetch<CompanySettings>('/api/settings')
      .then((data) => {
        if (cancelled) return
        const hasName = (data?.name ?? '').trim().length > 0
        if (hasName) return
        const from = pathname && pathname !== '/' ? pathname : '/dashboard'
        const target = `/settings?onboarding=1&from=${encodeURIComponent(from)}`
        router.push(target)
      })
      .catch(() => {
        // 미로그인/일시 오류는 무시 — 다른 가드/페이지 흐름이 처리.
      })

    return () => {
      cancelled = true
    }
  }, [enabled, pathname, router])
}

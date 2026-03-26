'use client'

import { useEffect, useState } from 'react'
import { applyThemeToDom, nextThemeMode, THEME_STORAGE_KEY, type ThemeMode } from '@/components/theme/theme-mode'

function readStoredMode(): ThemeMode {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    // ignore
  }
  return 'system'
}

const LABELS: Record<ThemeMode, string> = {
  light: '라이트',
  dark: '다크',
  system: '시스템',
}

function ThemeModeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === 'light') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.7v2.1M12 19.2v2.1M2.7 12h2.1M19.2 12h2.1M5.4 5.4l1.5 1.5M17.1 17.1l1.5 1.5M18.6 5.4l-1.5 1.5M6.9 17.1l-1.5 1.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (mode === 'dark') {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" aria-hidden>
        <path d="M20.2 14.7A8.7 8.7 0 1 1 9.3 3.8a7.2 7.2 0 1 0 10.9 10.9Z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" aria-hidden>
      <rect x="3.5" y="4.5" width="17" height="12" rx="2.2" />
      <path d="M9 19.5h6M12 16.5v3" strokeLinecap="round" />
    </svg>
  )
}

export function ThemeModeButton() {
  const [mode, setMode] = useState<ThemeMode>('system')

  useEffect(() => {
    setMode(readStoredMode())
  }, [])

  function onClick() {
    const next = nextThemeMode(mode)
    setMode(next)
    applyThemeToDom(next)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-700"
      title={`클릭 시 라이트 → 다크 → 시스템 순으로 전환 (현재: ${LABELS[mode]})`}
      aria-label={`테마 전환 (현재: ${LABELS[mode]})`}
    >
      <ThemeModeIcon mode={mode} />
    </button>
  )
}

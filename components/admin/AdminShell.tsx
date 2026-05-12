'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { ADMIN_USER_APP_MIRROR_GROUPS } from '@/lib/admin-user-app-mirror'
import { ADMIN_BACKOFFICE_MIRROR_GROUPS } from '@/lib/admin-backoffice-nav'

const USER_APP_SHELL_NAV_GROUPS = ADMIN_USER_APP_MIRROR_GROUPS.map((g) => ({
  label: `사용자 앱 · ${g.label}`,
  items: g.items,
}))

const BACKOFFICE_SHELL_NAV_GROUPS = ADMIN_BACKOFFICE_MIRROR_GROUPS.map((g) => ({
  label: `관리 · ${g.label}`,
  items: g.items,
}))

export type AdminShellNavItem = {
  href: string
  label: string
  desc?: string
  external?: boolean
}

/** 운영 백오피스 사이드바 (사용자 미러 + 관리자 전 경로) */
export const ADMIN_NAV_GROUPS: { label: string; items: AdminShellNavItem[] }[] = [
  {
    label: '운영 개요',
    items: [{ href: '/admin', label: '대시보드', desc: '서비스 상태 요약' }],
  },
  ...USER_APP_SHELL_NAV_GROUPS,
  ...BACKOFFICE_SHELL_NAV_GROUPS,
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  async function onLogout() {
    await fetch('/api/auth/admin-logout', { method: 'POST' })
    window.location.href = '/admin'
  }

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-56 lg:w-60 flex-shrink-0 flex flex-col border-r border-slate-200 bg-white shadow-sm">
        <div className="px-3 py-3 border-b border-slate-100">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Planic</span>
          <p className="text-sm font-semibold text-gray-900">운영 백오피스</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map(({ href, label, desc, external }) => (
                  <li key={`${group.label}-${href}-${label}`}>
                    {external ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={desc}
                        className="block px-2.5 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-slate-50 hover:text-gray-900 border border-transparent"
                      >
                        {label}
                        <span className="sr-only">(새 탭)</span>
                      </a>
                    ) : (
                      <Link
                        href={href}
                        title={desc}
                        className={clsx(
                          'block px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors',
                          isActive(href)
                            ? 'bg-primary-50 text-primary-800 border border-primary-100'
                            : 'text-gray-600 hover:bg-slate-50 hover:text-gray-900 border border-transparent',
                        )}
                      >
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="p-2 border-t border-slate-100 space-y-0.5">
          <Link
            href="/"
            className="block px-2.5 py-2 rounded-md text-xs text-gray-500 hover:bg-slate-50"
          >
            서비스 메인
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="w-full text-left px-2.5 py-2 rounded-md text-xs text-gray-500 hover:bg-slate-50"
          >
            로그아웃
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-4 md:p-6 overflow-auto admin-main">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const ADMIN_NAV = [
  { href: '/admin', label: '대시보드' },
  { href: '/admin/users', label: '사용자 관리' },
  { href: '/admin/subscriptions', label: '구독 관리' },
  { href: '/admin/plans', label: '플랜 관리' },
  { href: '/admin/usage', label: '사용량 관리' },
  { href: '/admin/engines', label: '엔진/모델' },
  { href: '/admin/logs', label: '로그' },
  { href: '/admin/system', label: '시스템' },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  async function onLogout() {
    await fetch('/api/auth/admin-logout', { method: 'POST' })
    window.location.href = '/admin'
  }

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href + '/') || pathname === href

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-52 flex-shrink-0 flex flex-col border-r border-slate-200 bg-white">
        <div className="px-4 py-4 border-b border-slate-100">
          <span className="text-sm font-semibold text-gray-900">관리자</span>
        </div>
        <nav className="flex-1 py-2 px-2 space-y-0.5">
          {ADMIN_NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'block px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive(href)
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-slate-100 hover:text-gray-900'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-2 border-t border-slate-100 space-y-0.5">
          <Link
            href="/"
            className="block px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-slate-100 hover:text-gray-700"
          >
            메인으로
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-slate-100 hover:text-gray-700"
          >
            로그아웃
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}

'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import clsx from 'clsx'

const NAV_LINKS = [
  { href: '/create/proposal', label: '제안서' },
  { href: '/create/cuesheet', label: '큐시트' },
  { href: '/create/emcee', label: '사회자 멘트' },
  { href: '/create/task-summary', label: '과업지시서 요약' },
] as const

export default function DocNav() {
  const pathname = usePathname()
  const { data: session, status } = useSession()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="shrink-0 text-base font-bold tracking-tight text-slate-900">
          플래닉
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname?.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {status === 'loading' ? null : session?.user ? (
            <>
              <span className="hidden text-sm text-slate-600 sm:block">
                {session.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="rounded-lg bg-primary-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              로그인
            </Link>
          )}
        </div>
      </div>

      {/* 모바일 하단 탭 */}
      <nav className="flex border-t border-slate-100 sm:hidden">
        {NAV_LINKS.map((link) => {
          const active = pathname?.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'flex flex-1 items-center justify-center py-2 text-xs font-medium',
                active ? 'text-primary-700' : 'text-slate-500',
              )}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}

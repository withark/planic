'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { EvQuoteLogo } from '@/components/EvQuoteLogo'

type PublicSiteHeaderProps = {
  loginHref?: string
  loginLabel?: string
}

const NAV_LINKS = [
  { href: '/features', label: '기능 소개', activePaths: ['/features'] },
  { href: '/guide', label: '사용 방법', activePaths: ['/guide', '/how-it-works'] },
  { href: '/help', label: '도움말', activePaths: ['/help', '/support'] },
  { href: '/plans', label: '요금제', activePaths: ['/plans'] },
] as const

export function PublicSiteHeader({ loginHref = '/auth', loginLabel = '로그인' }: PublicSiteHeaderProps) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-12 w-full max-w-5xl items-center gap-2 px-4 sm:px-6">
        <Link href="/" className="shrink-0 text-slate-900 transition-colors hover:text-primary-600">
          <EvQuoteLogo showText size="sm" className="justify-start" />
        </Link>
        <nav
          className="ml-2 mr-2 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto text-[12px] font-medium text-slate-600 sm:gap-4 sm:text-sm"
          aria-label="공개 사이트 메뉴"
        >
          {NAV_LINKS.map((item) => {
            const isActive = item.activePaths.includes(pathname)
            return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 leading-none transition-colors ${
                isActive
                  ? 'border border-primary-100 bg-primary-50/50 text-primary-700'
                  : 'text-slate-600 hover:text-primary-600'
              }`}
            >
              {item.label}
            </Link>
            )
          })}
        </nav>
        <Link
          href={loginHref}
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:px-3.5 sm:text-sm"
        >
          {loginLabel}
        </Link>
      </div>
    </header>
  )
}

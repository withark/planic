import { SiteFooter } from '@/components/SiteFooter'
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader'

type PublicPageShellProps = {
  children: React.ReactNode
  loginHref?: string
  loginLabel?: string
  compactFooter?: boolean
  /** 랜딩 등 풀폭 콘텐츠 — 기본은 읽기 폭 제한 */
  mainMaxWidth?: 'default' | 'full'
}

export function PublicPageShell({
  children,
  loginHref,
  loginLabel,
  compactFooter = true,
  mainMaxWidth = 'default',
}: PublicPageShellProps) {
  const mainClass =
    mainMaxWidth === 'full'
      ? 'mx-auto w-full max-w-none px-0 py-0 sm:py-1'
      : 'mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10'

  return (
    <div className="min-h-screen bg-[rgb(var(--app-surface))] text-slate-900">
      <PublicSiteHeader
        loginHref={loginHref}
        loginLabel={loginLabel}
        contentMaxWidth={mainMaxWidth === 'full' ? 'wide' : 'default'}
      />
      <main className={mainClass}>{children}</main>
      <SiteFooter compact={compactFooter} />
    </div>
  )
}

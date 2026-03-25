import { SiteFooter } from '@/components/SiteFooter'
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader'

type LegalPageShellProps = {
  title: string
  intro: string
  children: React.ReactNode
}

export function LegalPageShell({ title, intro, children }: LegalPageShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicSiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <header className="mx-auto max-w-[860px]">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900 sm:text-[32px]">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-[15px]">{intro}</p>
        </header>
        <div className="mx-auto mt-8 max-w-[860px]">{children}</div>
      </main>
      <SiteFooter compact />
    </div>
  )
}

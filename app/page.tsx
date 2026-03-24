import Link from 'next/link'
import { getServerSession } from 'next-auth/next'
import { SiteFooter } from '@/components/SiteFooter'
import { EvQuoteLogo } from '@/components/EvQuoteLogo'
import { StartNowLink } from '@/components/StartNowLink'
import { authOptions } from '@/lib/auth'
import { buildStartHref } from '@/lib/auth-redirect'

export const dynamic = 'force-dynamic'

/** blbi.shop에 가깝게: 행동 중심 3단계 + 4개 핵심 메시지(3·4단계 병합) */
const ACTION_STEPS = [
  { n: 1, line: '주제만으로 시작 가능' },
  { n: 2, line: '기존 문서 연결 가능' },
  { n: 3, line: '문서를 하나씩 생성' },
] as const

const STEP_3_EXTRA = '저장 후 다시 수정 가능'

export default async function IntroPage() {
  const session = await getServerSession(authOptions)
  const initialStartHref = buildStartHref({ isAuthenticated: !!session, targetPath: '/dashboard' })
  const loginHref = session ? '/dashboard' : '/auth'
  const loginLabel = session ? '대시보드' : '로그인'

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 1. 컴팩트 헤더 */}
      <header className="flex-shrink-0 border-b border-slate-100/90 bg-white sticky top-0 z-20">
        <div className="mx-auto max-w-3xl px-4 h-11 sm:h-12 flex items-center justify-between gap-3">
          <Link href="/" className="flex-shrink-0 text-gray-900 hover:text-primary-600 transition-colors">
            <EvQuoteLogo showText size="sm" className="justify-start" />
          </Link>
          <Link
            href={loginHref}
            className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            {loginLabel}
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full">
        {/* 2. 강한 히어로 — 위 폴드 집중, 단일 지배적 CTA */}
        <section className="relative border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
          <div className="mx-auto max-w-3xl px-4 pt-8 pb-10 sm:pt-12 sm:pb-14 text-center">
            <p className="text-primary-600 text-[11px] sm:text-xs font-bold tracking-[0.12em] uppercase">
              행사 문서 AI
            </p>
            <h1 className="mt-3 sm:mt-4 text-[1.875rem] leading-[1.12] sm:text-5xl sm:leading-[1.08] font-extrabold text-gray-900 tracking-tight">
              행사 문서,
              <br className="sm:hidden" /> 빠르게 만드세요
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-snug">
              주제만 넣어도 시작됩니다. 로그인 후 바로 이어갈 수 있어요.
            </p>

            <div className="mt-8 sm:mt-10 flex justify-center">
              <StartNowLink
                variant="cta"
                className="inline-flex w-full max-w-[min(100%,20rem)] sm:max-w-xs items-center justify-center gap-2 px-8 py-4 sm:py-[1.125rem] rounded-2xl text-base sm:text-lg font-bold bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-[0_12px_40px_-8px_rgba(79,70,229,0.55)] hover:shadow-[0_14px_44px_-8px_rgba(79,70,229,0.6)] min-h-[3.25rem]"
                initialHref={initialStartHref}
              >
                문서 만들기
                <span aria-hidden className="text-xl leading-none opacity-95">
                  →
                </span>
              </StartNowLink>
            </div>
          </div>
        </section>

        {/* 3. 3단계 액션 — 카드·아이콘·긴 설명 제거 */}
        <section className="border-b border-slate-100 bg-white">
          <div className="mx-auto max-w-3xl px-4 py-7 sm:py-9">
            <p className="text-center text-[11px] font-semibold text-slate-400 tracking-wide uppercase">
              진행 방식
            </p>
            <ol className="mt-5 grid gap-4 sm:grid-cols-3 sm:gap-3 sm:items-start text-center sm:text-left">
              {ACTION_STEPS.map((s) => (
                <li key={s.n} className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 sm:py-3.5">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-[11px] font-bold text-white mb-2 sm:mb-2.5">
                    {s.n}
                  </span>
                  <p className="text-[13px] sm:text-sm font-semibold text-gray-900 leading-snug">{s.line}</p>
                  {s.n === 3 && (
                    <p className="mt-1.5 text-xs text-slate-500 leading-snug">{STEP_3_EXTRA}</p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4. 짧은 푸터 CTA */}
        <section className="border-b border-slate-100 bg-slate-50/50">
          <div className="mx-auto max-w-lg px-4 py-8 sm:py-9 text-center">
            <p className="text-sm font-semibold text-gray-900">바로 시작해 보세요.</p>
            <StartNowLink
              variant="cta"
              className="mt-4 inline-flex w-full max-w-[min(100%,18rem)] sm:max-w-[17rem] mx-auto items-center justify-center px-6 py-3 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-md shadow-primary-600/20"
              initialHref={initialStartHref}
            >
              지금 시작하기
            </StartNowLink>
            <p className="mt-5 text-[11px] text-slate-400">
              <Link href="/plans" className="text-slate-500 hover:text-primary-600 font-medium">
                요금제
              </Link>
            </p>
          </div>
        </section>
      </main>

      <SiteFooter compact />
    </div>
  )
}

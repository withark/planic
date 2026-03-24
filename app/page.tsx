import Link from 'next/link'
import { getServerSession } from 'next-auth/next'
import { EvQuoteLogo } from '@/components/EvQuoteLogo'
import { StartNowLink } from '@/components/StartNowLink'
import { authOptions } from '@/lib/auth'
import { buildStartHref } from '@/lib/auth-redirect'
import { MARKETING_DOCUMENTS } from '@/lib/marketing-documents'
import { PLAN_LIMITS, PRICES_KRW } from '@/lib/plans'

export const dynamic = 'force-dynamic'

/** 랜딩 액션 카드용 한 줄 (스캔용) */
const DOC_LINE_HINT: Record<string, string> = {
  '/estimate-generator': '주제만으로도 초안 · 단가·과업 연결 시 더 정교하게',
  '/planning-generator': '콘셉트·구성·운영 포인트',
  '/program-proposal-generator': '프로그램·타임라인 제안',
  '/scenario-generator': '진행·연출·촬영 순서',
  '/cue-sheet-generator': '시나리오 연동 또는 주제만으로',
  '/task-order-summary': '긴 과업지시서를 요약해 바로 활용',
}

const FAQ_ITEMS = [
  {
    q: '로그인은 어떻게 하나요?',
    a: 'Google 계정으로 로그인하면 바로 이용할 수 있습니다.',
  },
  {
    q: '문서는 어디서 이어서 만드나요?',
    a: '저장한 문서는 이력에서 불러와 수정할 수 있고, 견적·기획·큐시트를 같은 행사 맥락으로 연결해 쓸 수 있습니다.',
  },
] as const

function fmtKRW(n: number) {
  return n.toLocaleString('ko-KR')
}

export default async function IntroPage() {
  const session = await getServerSession(authOptions)
  const initialStartHref = buildStartHref({ isAuthenticated: !!session, targetPath: '/dashboard' })

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="flex-shrink-0 border-b border-slate-100 bg-white/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex-shrink-0 text-gray-900 hover:text-primary-600 transition-colors">
            <EvQuoteLogo showText size="md" className="justify-start" />
          </Link>
          <nav
            className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-600"
            aria-label="주요 이동"
          >
            <a href="#documents" className="hover:text-primary-600 transition-colors">
              문서 종류
            </a>
            <a href="#pricing" className="hover:text-primary-600 transition-colors">
              요금
            </a>
            <Link href={session ? '/dashboard' : '/auth'} className="hover:text-primary-600 transition-colors">
              {session ? '대시보드' : '로그인'}
            </Link>
          </nav>
          <div className="flex sm:hidden items-center gap-3 text-sm">
            <a href="#documents" className="font-medium text-primary-600">
              문서
            </a>
            <a href="#pricing" className="text-slate-600">
              요금
            </a>
            <Link href={session ? '/dashboard' : '/auth'} className="text-slate-600">
              {session ? '홈' : '로그인'}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        {/* 히어로 + 첫 화면 액션 */}
        <section className="relative border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 sm:pt-10 pb-10 sm:pb-12 text-center">
            <p className="text-primary-600 text-xs sm:text-sm font-semibold tracking-wide">행사 문서 AI 도구</p>
            <h1 className="mt-3 text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-gray-900 tracking-tight leading-[1.15]">
              행사 문서, 하나씩 빠르게 만드세요
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              주제만 입력해도 시작할 수 있고, 기존 문서를 연결하면 더 정교하게 만들 수 있습니다.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-xl mx-auto sm:max-w-none">
              <StartNowLink
                variant="cta"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-bold bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25 min-h-[52px]"
                initialHref={initialStartHref}
              >
                문서 만들기
                <span aria-hidden className="text-lg leading-none">
                  →
                </span>
              </StartNowLink>
              <a
                href="#documents"
                className="inline-flex items-center justify-center px-8 py-4 rounded-2xl text-base font-semibold border-2 border-slate-200 text-slate-800 bg-white hover:border-primary-300 hover:bg-primary-50/80 transition-colors min-h-[52px]"
              >
                문서 종류 보기
              </a>
            </div>

            {/* 두 가지 시작 방식 — fold 근처 */}
            <div className="mt-10 sm:mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto text-left">
              <div className="rounded-2xl border-2 border-slate-100 bg-white p-5 sm:p-6 shadow-sm ring-1 ring-slate-50">
                <p className="text-xs font-bold uppercase tracking-wider text-primary-600">A</p>
                <p className="mt-1 text-lg font-bold text-gray-900">주제만으로 시작</p>
                <p className="mt-2 text-sm text-slate-600 leading-snug">
                  주제만 입력하고 시작합니다. 문서는 종류별로 하나씩 생성합니다.
                </p>
              </div>
              <div className="rounded-2xl border-2 border-primary-100 bg-primary-50/40 p-5 sm:p-6 shadow-sm ring-1 ring-primary-100/80">
                <p className="text-xs font-bold uppercase tracking-wider text-primary-700">B</p>
                <p className="mt-1 text-lg font-bold text-gray-900">자료를 연결해 시작</p>
                <p className="mt-2 text-sm text-slate-600 leading-snug">
                  기존 견적서·과업지시서·참고 자료를 연결할수록 결과가 더 정교해집니다.
                </p>
              </div>
            </div>

            <p className="mt-8 text-sm text-slate-500 max-w-2xl mx-auto">
              저장한 문서는 다시 불러와 수정할 수 있으며, 견적서부터 기획안·시나리오·큐시트까지 이어서 활용할 수
              있습니다.
            </p>
          </div>
        </section>

        {/* 문서 액션 카드 */}
        <section id="documents" className="scroll-mt-20 bg-[#f8f9fb]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-14">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">만들 문서를 고르세요</h2>
              <p className="mt-2 text-sm text-slate-500">카드를 누르면 해당 도구로 바로 이동합니다.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {MARKETING_DOCUMENTS.map((doc) => (
                <Link
                  key={doc.href}
                  href={doc.href}
                  className="group relative flex flex-col rounded-2xl border-2 border-slate-200/90 bg-white p-6 sm:p-7 min-h-[148px] shadow-md hover:shadow-xl hover:border-primary-400 hover:-translate-y-0.5 transition-all text-left"
                >
                  <span className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-primary-800 pr-10 transition-colors">
                    {doc.title}
                  </span>
                  <p className="mt-3 text-sm text-slate-600 leading-snug line-clamp-2">{DOC_LINE_HINT[doc.href] ?? doc.desc}</p>
                  <span
                    className="mt-auto pt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary-600 group-hover:text-primary-700"
                    aria-hidden
                  >
                    열기
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 핵심만 요약 */}
        <section id="features" className="scroll-mt-20 border-t border-slate-100 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12">
            <ul className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 text-center text-sm sm:text-[15px] text-slate-700">
              <li className="rounded-full border border-slate-200 bg-slate-50/80 px-4 py-2 font-medium">
                문서를 종류별로 하나씩 생성
              </li>
              <li className="rounded-full border border-slate-200 bg-slate-50/80 px-4 py-2 font-medium">
                단가·기업정보·과업 연동
              </li>
              <li className="rounded-full border border-slate-200 bg-slate-50/80 px-4 py-2 font-medium">
                이력에서 불러와 수정·내보내기
              </li>
            </ul>
          </div>
        </section>

        {/* 사용 방법 — 축약 */}
        <section id="how" className="scroll-mt-20 border-t border-slate-100 bg-[#f8f9fb]">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-12 text-center">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">사용 흐름</h2>
            <ol className="mt-6 text-left space-y-3 text-sm sm:text-[15px] text-slate-600 max-w-xl mx-auto">
              <li className="flex gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary-600 text-xs font-bold text-white">
                  1
                </span>
                <span>로그인 후 대시보드에서 만들 문서를 고릅니다.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary-600 text-xs font-bold text-white">
                  2
                </span>
                <span>주제만 넣거나, 견적·과업 등 저장·연결 자료를 골라 생성합니다.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary-600 text-xs font-bold text-white">
                  3
                </span>
                <span>저장·이력에서 다시 열어 보완하고, 필요 시 PDF·Excel로 내보냅니다.</span>
              </li>
            </ol>
          </div>
        </section>

        {/* 도움말 — 최소 */}
        <section id="help" className="scroll-mt-20 border-t border-slate-100 bg-white">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-12">
            <h2 className="text-lg font-bold text-gray-900 text-center">자주 묻는 질문</h2>
            <div className="mt-6 space-y-2">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.q}
                  className="rounded-xl border border-slate-100 bg-slate-50/50 open:bg-white open:shadow-sm"
                >
                  <summary className="cursor-pointer list-none px-4 py-3 text-left text-sm font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
                    {item.q}
                  </summary>
                  <div className="px-4 pb-3 border-t border-slate-100/80">
                    <p className="pt-2 text-sm text-slate-600 leading-relaxed">{item.a}</p>
                  </div>
                </details>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-slate-500">
              <Link href="/settings" className="font-medium text-primary-700 hover:underline">
                설정
              </Link>
              {' · '}
              <Link href="/plans" className="font-medium text-primary-700 hover:underline">
                요금제 상세
              </Link>
            </p>
          </div>
        </section>

        {/* 요금제 — 요약만 */}
        <section id="pricing" className="scroll-mt-20 border-t border-slate-100 bg-[#f8f9fb]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold text-gray-900">요금제 요약</h2>
              <p className="mt-2 text-sm text-slate-500">한도·보관 기간은 플랜별로 다릅니다. 자세한 내용은 요금제 페이지에서 확인하세요.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(
                [
                  { id: 'FREE' as const, name: '무료', highlight: false },
                  { id: 'BASIC' as const, name: '베이직', highlight: true },
                  { id: 'PREMIUM' as const, name: '프리미엄', highlight: false },
                ] as const
              ).map((plan) => {
                const limits = PLAN_LIMITS[plan.id]
                const price = PRICES_KRW[plan.id]
                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl border p-5 flex flex-col ${
                      plan.highlight
                        ? 'border-primary-300 bg-white shadow-lg ring-2 ring-primary-100'
                        : 'border-slate-200 bg-white/80 shadow-sm'
                    }`}
                  >
                    <p className="text-sm font-bold text-primary-700">{plan.name}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {price.monthly === 0 ? '무료' : `월 ${fmtKRW(price.monthly)}원`}
                    </p>
                    <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                      견적{' '}
                      {Number.isFinite(limits.monthlyQuoteGenerateLimit)
                        ? `월 ${limits.monthlyQuoteGenerateLimit}회`
                        : '무제한'}
                      {' · '}
                      이력 {limits.historyRetentionDays == null ? '무제한' : `${limits.historyRetentionDays}일`}
                    </p>
                  </div>
                )
              })}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/plans"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-md"
              >
                요금제·결제 자세히 보기
              </Link>
            </div>
          </div>
        </section>

        {/* 하단 CTA */}
        <section className="border-t border-slate-100 bg-gradient-to-br from-primary-50/90 via-white to-slate-50">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-14 text-center">
            <p className="text-lg sm:text-xl font-bold text-gray-900">지금 바로 시작하기</p>
            <p className="mt-2 text-sm text-slate-600">로그인 후 대시보드에서 동일한 문서 메뉴를 사용할 수 있습니다.</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <StartNowLink
                variant="cta"
                className="inline-flex items-center justify-center px-10 py-4 rounded-2xl text-base font-bold bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20 min-w-[200px]"
                initialHref={initialStartHref}
              >
                지금 바로 시작하기
              </StartNowLink>
              <Link
                href="/plans"
                className="text-sm font-semibold text-primary-700 hover:text-primary-800 hover:underline"
              >
                요금제 비교
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex-shrink-0 pt-10 pb-10 px-4 border-t border-slate-100 bg-white text-center text-xs text-slate-400">
        <p className="text-slate-500 font-medium tracking-tight">
          플래닉 Planic — 행사 문서를 함께 기획하는 파트너
        </p>
        <address className="not-italic mt-6 text-slate-500 leading-relaxed">
          <p className="text-xs text-slate-600">
            (주)시냇가에심은나무
            <span className="text-slate-300 mx-2" aria-hidden>
              ·
            </span>
            사업자등록번호 438-81-01028
            <span className="text-slate-300 mx-2" aria-hidden>
              ·
            </span>
            대표자 이다윗
          </p>
        </address>
      </footer>
    </div>
  )
}

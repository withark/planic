'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { GNB } from '@/components/GNB'
import { apiFetch } from '@/lib/api/client'
import { toUserMessage } from '@/lib/errors/toUserMessage'
import { MARKETING_DOCUMENTS } from '@/lib/marketing-documents'
import type { PlanLimits, PlanType } from '@/lib/plans'

const DASH_DOC_GROUPS = ['견적·금액', '기획·제안', '운영·정리', '스타일·참고'] as const

function ArrowIntoIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  )
}

type MeResponse = {
  user: { id: string; email: string | null; name: string | null; image: string | null }
  subscription: { planType: PlanType; billingCycle: 'monthly' | 'annual' | null; status: string; expiresAt: string | null }
  usage: { periodKey: string; quoteGeneratedCount: number; companyProfileCount: number }
  limits: PlanLimits
}

function planLabel(p: PlanType) {
  if (p === 'BASIC') return '베이직'
  if (p === 'PREMIUM') return '프리미엄'
  return '무료'
}

function usageLine(label: string, used: number, limit: number) {
  const safeLimit = Number.isFinite(limit) ? limit : used
  return { label, used, limit, pct: safeLimit > 0 ? Math.min(100, Math.round((used / safeLimit) * 100)) : 0 }
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [err, setErr] = useState('')
  const [successToast, setSuccessToast] = useState('')

  useEffect(() => {
    apiFetch<MeResponse>('/api/me')
      .then(setMe)
      .catch((e) => setErr(toUserMessage(e, '정보를 불러오지 못했습니다.')))
  }, [])

  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      setSuccessToast('결제가 완료되었습니다. 구독이 활성화되었어요.')
      setTimeout(() => setSuccessToast(''), 4000)
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [searchParams])

  const plan = me?.subscription?.planType ?? 'FREE'
  const lines = useMemo(() => {
    if (!me) return []
    return [
      usageLine('이번 달 견적 생성', me.usage.quoteGeneratedCount, me.limits.monthlyQuoteGenerateLimit),
      usageLine('기업정보 저장', me.usage.companyProfileCount, me.limits.companyProfileLimit),
    ]
  }, [me])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      <GNB />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-b border-gray-100 bg-white/90 flex-shrink-0">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-gray-900">홈</h1>
            <p className="text-sm text-slate-600 mt-1 max-w-xl">
              플래닉 Planic — 행사 문서를 함께 기획하는 파트너. 아래에서 만들 문서를 고르세요.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="text-xs text-gray-500">현재 플랜</span>
            <span className="px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 text-xs font-semibold">
              {planLabel(plan)}
            </span>
            <Link href="/plans" className="text-xs font-semibold text-primary-700 hover:text-primary-800 underline underline-offset-2">
              업그레이드
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
          {err && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          )}

          <div className="rounded-2xl border border-primary-100/90 bg-gradient-to-br from-white via-primary-50/40 to-slate-50/90 px-5 py-6 sm:px-8 sm:py-7 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-700">Planic</p>
            <h2 className="mt-2 text-base sm:text-lg font-semibold text-gray-900 leading-snug">
              행사 문서의 모든 것, 플래닉이 함께 기획하고 만듭니다
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              AI가 견적·제안·큐시트까지 문서별로 완성합니다. 견적부터 현장 운영표까지 한곳에서 이어집니다.
            </p>
            <p className="mt-3 text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-slate-600">권장 흐름</span>
              <span className="hidden sm:inline text-slate-300">·</span>
              <span>견적 → 기획·프로그램 → 시나리오 → 큐시트</span>
            </p>
          </div>

          {me && plan === 'FREE' && (
            <div className="rounded-2xl border border-primary-200/80 bg-white px-5 py-5 shadow-card">
              <p className="text-sm font-semibold text-gray-900">무료 플랜으로 시작했어요</p>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                첫 견적을 만들거나 기업정보를 저장해 두면 PDF·엑셀 출력과 문서 품질이 한층 좋아집니다.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/estimate-generator" className="btn-primary px-4 py-2.5 text-xs font-semibold rounded-xl">
                  첫 견적 만들기
                </Link>
                <Link
                  href="/settings"
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 transition-colors"
                >
                  기업정보 등록하기
                </Link>
              </div>
            </div>
          )}

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {lines.map((l) => (
              <div key={l.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">{l.label}</p>
                  <p className="text-xs text-gray-500 tabular-nums">
                    {l.used}/{Number.isFinite(l.limit) ? l.limit : '∞'}
                  </p>
                </div>
                <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-primary-600" style={{ width: `${l.pct}%` }} />
                </div>
                {Number.isFinite(l.limit) && l.used >= l.limit && (
                  <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                    한도에 도달했습니다. 업그레이드하면 더 넉넉하게 사용할 수 있어요.
                  </p>
                )}
              </div>
            ))}
          </section>

          <section className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-gray-900">문서 만들기</h2>
                <p className="text-sm text-slate-600 mt-1">필요한 단계만 골라 생성합니다. 순서는 행사에 맞게 조정하세요.</p>
              </div>
              <Link
                href="/create-documents"
                className="text-xs font-semibold text-primary-700 hover:text-primary-800 shrink-0"
              >
                전체 보기 레이아웃 →
              </Link>
            </div>

            <div className="mt-5 space-y-6">
            {DASH_DOC_GROUPS.map((group) => {
              const items = MARKETING_DOCUMENTS.filter((c) => c.category === group)
              if (items.length === 0) return null
              return (
                <div key={group}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group}</p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map((card) => (
                      <Link
                        key={card.href}
                        href={card.href}
                        className="group block rounded-2xl border border-gray-100 bg-slate-50/40 p-4 sm:p-5 shadow-sm hover:shadow-card-hover hover:border-primary-200/90 hover:bg-white transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[15px] font-bold text-gray-900 group-hover:text-primary-800 transition-colors">
                              {card.title}
                            </div>
                            <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-4">{card.desc}</p>
                          </div>
                          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-700 group-hover:bg-primary-100/80 transition-colors">
                            <ArrowIntoIcon className="w-[18px] h-[18px]" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}
            </div>
          </section>
        </div>
      </div>
      {successToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm shadow-lg">{successToast}</div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen overflow-hidden bg-gray-50/50">
        <GNB />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}


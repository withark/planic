'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { GNB } from '@/components/GNB'
import { apiFetch } from '@/lib/api/client'
import { toUserMessage } from '@/lib/errors/toUserMessage'
import { LoadingState } from '@/components/ui/AsyncState'
import type { PlanLimits, PlanType } from '@/lib/plans'
import { planLabelKo } from '@/lib/plans'
import type { HistoryRecord } from '@/lib/types'
import { fmtKRW } from '@/lib/calc'

type MeResponse = {
  user: { id: string; email: string | null; name: string | null; image: string | null }
  subscription: { planType: PlanType; billingCycle: 'monthly' | 'annual' | null; status: string; expiresAt: string | null }
  usage: { periodKey: string; quoteGeneratedCount: number; premiumGeneratedCount: number; companyProfileCount: number }
  limits: PlanLimits
}

type UsageRow = {
  label: string
  used: number
  limit: number
  pct: number
  remainingLabel: string
  atLimit: boolean
}

function buildUsageRow(label: string, used: number, limit: number): UsageRow {
  const finite = Number.isFinite(limit)
  const pct = finite && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const remaining = finite ? Math.max(0, limit - used) : null
  const atLimit = finite && used >= limit
  const remainingLabel = finite ? (atLimit ? '한도 도달' : `남은 ${remaining}회`) : '무제한'
  return { label, used, limit: finite ? limit : used, pct, remainingLabel, atLimit }
}

/** 기업정보 한도는 ‘개’ 단위가 자연스러움 */
function buildCompanyRow(used: number, limit: number): UsageRow {
  const finite = Number.isFinite(limit)
  const pct = finite && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const remaining = finite ? Math.max(0, limit - used) : null
  const atLimit = finite && used >= limit
  const remainingLabel = finite ? (atLimit ? '한도 도달' : `남은 ${remaining}개`) : '무제한'
  return { label: '기업정보 저장', used, limit: finite ? limit : used, pct, remainingLabel, atLimit }
}

function formatUsagePeriodLabel(periodKey: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(periodKey.trim())
  if (!m) return periodKey
  const month = parseInt(m[2], 10)
  return `${m[1]}년 ${month}월`
}

function usageBarClass(row: UsageRow): string {
  if (row.atLimit) return 'bg-rose-500'
  if (row.pct >= 80) return 'bg-amber-500'
  return 'bg-primary-600'
}

function usageRemainingClass(row: UsageRow): string {
  if (row.atLimit) return 'text-rose-700'
  if (row.pct >= 80) return 'text-amber-800'
  return 'text-primary-700'
}

function formatSavedAtLabel(savedAt: string): string {
  if (!savedAt) return '수정 시각 없음'
  const date = new Date(savedAt)
  if (Number.isNaN(date.getTime())) return '수정 시각 없음'
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(
    date.getHours(),
  ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} 수정`
}

const DASHBOARD_DETAILS_STORAGE_KEY = 'planic_dashboard_show_details'

function DashboardContent() {
  const searchParams = useSearchParams()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [err, setErr] = useState('')
  const [successToast, setSuccessToast] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [recentHistory, setRecentHistory] = useState<HistoryRecord[] | null>(null)
  const [historyErr, setHistoryErr] = useState(false)

  useEffect(() => {
    apiFetch<MeResponse>('/api/me')
      .then(setMe)
      .catch((e) => setErr(toUserMessage(e, '정보를 불러오지 못했습니다.')))
  }, [])

  useEffect(() => {
    apiFetch<HistoryRecord[]>('/api/history')
      .then((d) => {
        const newestFirst = [...d].reverse()
        setRecentHistory(newestFirst.slice(0, 3))
        setHistoryErr(false)
      })
      .catch(() => {
        setRecentHistory([])
        setHistoryErr(true)
      })
  }, [])

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      setShowDetails(window.localStorage.getItem(DASHBOARD_DETAILS_STORAGE_KEY) === '1')
    } catch {
      /* ignore */
    }
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
    const rows: UsageRow[] = [buildUsageRow('이번 달 견적 생성', me.usage.quoteGeneratedCount, me.limits.monthlyQuoteGenerateLimit)]
    if (plan === 'PREMIUM') {
      rows.push(
        buildUsageRow(
          '이번 달 프리미엄(Opus) 정제',
          Number(me.usage.premiumGeneratedCount ?? 0),
          me.limits.monthlyPremiumGenerationLimit,
        ),
      )
    }
    rows.push(buildCompanyRow(me.usage.companyProfileCount, me.limits.companyProfileLimit))
    return rows
  }, [me, plan])

  const anyAtLimit = lines.some((l) => l.atLimit)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      <GNB />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-5 border-b border-gray-100 bg-white/90 flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900">홈</h1>
            <p className="text-sm text-slate-600 mt-1">필수 입력만으로 바로 시작하세요.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="text-xs text-gray-500">플랜</span>
            <span className="px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 text-xs font-semibold">
              {planLabelKo(plan)}
            </span>
            <Link href="/plans" className="text-xs font-semibold text-primary-700 hover:text-primary-800 underline underline-offset-2">
              업그레이드
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 max-w-3xl mx-auto w-full">
          {err && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
          )}

          <section className="order-1 rounded-2xl border-2 border-primary-100 bg-white p-5 shadow-card ring-1 ring-primary-50/70">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold text-gray-900">바로 시작</h2>
              <button
                type="button"
                onClick={() => {
                  const next = !showDetails
                  setShowDetails(next)
                  try {
                    if (next) window.localStorage.setItem(DASHBOARD_DETAILS_STORAGE_KEY, '1')
                    else window.localStorage.removeItem(DASHBOARD_DETAILS_STORAGE_KEY)
                  } catch {
                    /* ignore */
                  }
                }}
                className="text-xs font-semibold text-primary-700 hover:text-primary-800 underline underline-offset-2"
              >
                {showDetails ? '상세 정보 숨기기' : '상세 정보 보기'}
              </button>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Link
                href="/estimate-generator"
                className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
              >
                견적서 만들기
              </Link>
              <Link
                href="/create-documents"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
              >
                다른 문서 선택
              </Link>
            </div>
          </section>

          {showDetails && me && lines.length > 0 && (
            <section
              className={`order-3 rounded-2xl border bg-white p-5 shadow-card space-y-4 ${
                anyAtLimit ? 'border-amber-200/90 ring-1 ring-amber-100/70' : 'border-gray-100'
              }`}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="text-sm font-bold text-gray-900">이번 달 사용량</h2>
                <p className="text-xs text-slate-500 tabular-nums">집계: {formatUsagePeriodLabel(me.usage.periodKey)}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {lines.map((l) => (
                  <div
                    key={l.label}
                    className={`rounded-xl border px-3 py-3 ${
                      l.atLimit
                        ? 'border-rose-200/90 bg-rose-50/40'
                        : l.pct >= 80
                          ? 'border-amber-100 bg-amber-50/25'
                          : 'border-transparent bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">{l.label}</p>
                      <p className={`text-xs font-semibold tabular-nums shrink-0 ${usageRemainingClass(l)}`}>
                        {l.remainingLabel}
                      </p>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-gray-200/90 overflow-hidden">
                      <div
                        className={`h-full transition-[width] ${usageBarClass(l)}`}
                        style={{ width: `${l.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {anyAtLimit && (
                <p className="text-xs text-slate-500">
                  아래 <span className="font-medium text-slate-700">요금제 보기</span>에서 한도를 늘릴 수 있어요.
                </p>
              )}
            </section>
          )}

          {showDetails && me && anyAtLimit && lines.length > 0 && (
            <div
              className="order-4 rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-white to-white pl-4 pr-4 py-4 shadow-sm ring-1 ring-amber-100/80"
              role="status"
              aria-live="polite"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3 min-w-0">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 text-lg font-bold"
                    aria-hidden
                  >
                    !
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-amber-950">한도에 도달한 항목이 있어요</p>
                    <ul className="mt-1.5 text-sm text-amber-900/90 list-disc pl-4 space-y-0.5">
                      {lines
                        .filter((l) => l.atLimit)
                        .map((l) => (
                          <li key={l.label}>{l.label}</li>
                        ))}
                    </ul>
                    <p className="mt-2 text-xs text-amber-800/85">업그레이드하면 더 넉넉하게 쓸 수 있어요.</p>
                  </div>
                </div>
                <Link
                  href="/plans"
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors sm:self-center"
                >
                  요금제 보기
                </Link>
              </div>
            </div>
          )}

          {me && (
            <section className="order-2 rounded-2xl border border-gray-200/90 bg-white p-5 shadow-card">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-bold text-gray-900">최근 작업 이어하기</h2>
                <Link href="/history" className="text-sm font-semibold text-primary-700 hover:text-primary-800 shrink-0">
                  작업 이력 전체 →
                </Link>
              </div>
              {recentHistory === null ? (
                <p className="mt-3 text-sm text-slate-500">최근 작업을 불러오는 중...</p>
              ) : historyErr ? (
                <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  최근 이력을 불러오지 못했습니다.{' '}
                  <Link href="/history" className="font-semibold underline underline-offset-2">
                    작업 이력
                  </Link>
                  에서 다시 확인해 보세요.
                </p>
              ) : recentHistory.length === 0 ? (
                <div className="mt-4 rounded-xl border-2 border-dashed border-primary-200/80 bg-primary-50/40 px-4 py-6 text-center">
                  <p className="text-sm text-slate-700">아직 저장된 작업이 없어요. 견적서부터 시작해 보세요.</p>
                  <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3">
                    <Link
                      href="/estimate-generator"
                      className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-primary-700 transition-colors"
                    >
                      견적서 만들기 시작
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                  {recentHistory.map((h) => (
                    <li key={h.id}>
                      <Link
                        href={`/estimate-generator?estimate=${encodeURIComponent(h.id)}`}
                        className="flex items-center justify-between gap-3 bg-slate-50/30 px-4 py-3 text-sm hover:bg-primary-50/50 transition-colors group"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate group-hover:text-primary-900">
                            {h.eventName || '행사명 없음'}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                            견적일 {h.quoteDate || '—'} · {fmtKRW(h.total)}원
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">{formatSavedAtLabel(h.savedAt)}</p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-primary-700 opacity-80 group-hover:opacity-100">
                          이어서
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {showDetails && me && plan === 'FREE' && (
            <div className="order-5 rounded-2xl border border-primary-100 bg-white px-5 py-5 shadow-card ring-1 ring-primary-50">
              <p className="text-sm font-semibold text-gray-900">무료 플랜 이용 중이에요</p>
              <p className="mt-2 text-sm text-slate-600 leading-snug">
                현재 플랜은 월 견적 생성과 기업정보 저장이 제한됩니다. 업그레이드하면 생성 한도와 프리미엄 정제 기능을 더 넉넉하게 사용할 수 있어요.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link
                  href="/settings"
                  className="inline-flex px-4 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 transition-colors"
                >
                  기업정보 관리
                </Link>
                <Link
                  href="/plans"
                  className="inline-flex px-4 py-2.5 text-xs font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                >
                  플랜 업그레이드
                </Link>
              </div>
            </div>
          )}
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
    <Suspense
      fallback={
        <div className="flex h-screen overflow-hidden bg-gray-50/50">
          <GNB />
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
              <LoadingState label="로딩 중…" />
            </div>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}

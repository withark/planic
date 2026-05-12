'use client'

import { useCallback, useEffect, useState } from 'react'
import { LoadingState, ErrorState } from '@/components/ui/AsyncState'
import { adminJson } from '@/lib/admin-client'

interface BriefEnrichDaily {
  date: string
  applied: number
  skipped: number
  total: number
  avgLatencyMs: number
}

interface BriefEnrichStats {
  windowDays: number
  total: number
  applied: number
  skipped: number
  avgLatencyMs: number
  maxLatencyMs: number
  modelBreakdown: Array<{ provider: string; model: string; count: number; avgLatencyMs: number }>
  daily?: BriefEnrichDaily[]
}

interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  stroke?: string
  fill?: string
  /** 0~values.length-1 마지막 인덱스에 점을 찍을지 */
  showLast?: boolean
  ariaLabel?: string
}

function Sparkline({
  values,
  width = 180,
  height = 36,
  stroke = '#4f46e5',
  fill = 'rgba(79,70,229,0.12)',
  showLast = true,
  ariaLabel,
}: SparklineProps) {
  if (!values.length) {
    return (
      <div className="text-[11px] text-slate-400" aria-label={ariaLabel}>
        데이터 없음
      </div>
    )
  }
  const max = Math.max(1, ...values)
  const min = 0
  const range = Math.max(1, max - min)
  const stepX = values.length > 1 ? width / (values.length - 1) : width
  const points = values.map((v, i) => {
    const x = values.length > 1 ? i * stepX : width / 2
    const y = height - ((v - min) / range) * (height - 4) - 2
    return { x, y, v }
  })
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  const areaPath = `${path} L${(points[points.length - 1]?.x ?? 0).toFixed(2)},${height} L0,${height} Z`
  const last = points[points.length - 1]
  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <path d={areaPath} fill={fill} />
      <path d={path} stroke={stroke} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {showLast && last ? (
        <circle cx={last.x} cy={last.y} r={2.5} fill={stroke} />
      ) : null}
    </svg>
  )
}

export default function AdminOpsStatsPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [enrich, setEnrich] = useState<BriefEnrichStats | null>(null)
  const [enrichLoading, setEnrichLoading] = useState(false)
  const [enrichError, setEnrichError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const out = await adminJson<Record<string, unknown>>('/api/admin/stats')
    if (out.ok) {
      setStats(out.data ?? null)
    } else {
      setStats(null)
      setError(out.message)
    }
    setLoading(false)
  }, [])

  const loadEnrich = useCallback(async () => {
    setEnrichLoading(true)
    setEnrichError(null)
    const out = await adminJson<BriefEnrichStats>('/api/admin/ops-stats/brief-enrich')
    if (out.ok && out.data) {
      setEnrich(out.data)
    } else {
      setEnrich(null)
      setEnrichError(out.ok ? 'Brief Enrich 통계 응답이 비어 있습니다.' : out.message)
    }
    setEnrichLoading(false)
  }, [])

  useEffect(() => {
    void load()
    void loadEnrich()
  }, [load, loadEnrich])

  if (loading) return <LoadingState label="로딩 중…" />
  if (error) return <ErrorState message={error} onRetry={() => void load()} />
  if (!stats) return <p className="text-sm text-gray-500">표시할 통계가 없습니다.</p>

  const appliedRatio = enrich && enrich.total > 0 ? Math.round((enrich.applied / enrich.total) * 100) : 0
  const daily = enrich?.daily ?? []
  const appliedSeries = daily.map((d) => d.applied)
  const skippedSeries = daily.map((d) => d.skipped)
  const latencySeries = daily.map((d) => d.avgLatencyMs)
  const dailyHasAny = daily.some((d) => d.total > 0)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-lg font-bold text-gray-900">운영 통계</h1>
        <p className="text-sm text-gray-600">
          MVP: 대시보드와 동일 소스의 요약 지표입니다. 전환율·유지율·코호트는 DB 이벤트 수집 후 확장합니다.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-800">생성·매출·구독 요약</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm max-w-lg border rounded-lg p-4 bg-white">
          <dt className="text-gray-500">총 생성(견적)</dt>
          <dd className="font-mono">{String(stats.quoteCountTotal)}</dd>
          <dt className="text-gray-500">7일 생성</dt>
          <dd className="font-mono">{String(stats.quoteCountLast7d ?? stats.quoteCountLast24h ?? 0)}</dd>
          <dt className="text-gray-500">오늘 매출</dt>
          <dd className="font-mono">₩{Number(stats.revenueTodayKrw ?? 0).toLocaleString()}</dd>
          <dt className="text-gray-500">활성 구독</dt>
          <dd className="font-mono">{String(stats.subscriptionsActivePaid ?? stats.activeSubscriptions ?? 0)}</dd>
          <dt className="text-gray-500">distinct 견적 사용자</dt>
          <dd className="font-mono">{String(stats.userCount)}</dd>
        </dl>
        <p className="text-xs text-slate-500">
          상세 매출·전환은 <a className="text-primary-600" href="/admin/settlement">정산 관리</a>와 결제
          목록을 함께 보세요.
        </p>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800">
            Stage 0 · 입력 강화 통계 <span className="text-xs font-normal text-gray-500">(최근 {enrich?.windowDays ?? 7}일)</span>
          </h2>
          <button
            type="button"
            onClick={() => void loadEnrich()}
            disabled={enrichLoading}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {enrichLoading ? '갱신 중…' : '새로고침'}
          </button>
        </div>
        {enrichError ? (
          <ErrorState message={enrichError} onRetry={() => void loadEnrich()} />
        ) : enrichLoading && !enrich ? (
          <LoadingState label="강화 통계 로딩 중…" />
        ) : enrich ? (
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-2 text-sm max-w-lg border rounded-lg p-4 bg-white">
              <dt className="text-gray-500">총 시도</dt>
              <dd className="font-mono">{enrich.total.toLocaleString()}</dd>
              <dt className="text-gray-500">적용</dt>
              <dd className="font-mono">
                {enrich.applied.toLocaleString()} <span className="text-xs text-gray-400">({appliedRatio}%)</span>
              </dd>
              <dt className="text-gray-500">스킵·실패</dt>
              <dd className="font-mono">{enrich.skipped.toLocaleString()}</dd>
              <dt className="text-gray-500">평균 응답</dt>
              <dd className="font-mono">{enrich.avgLatencyMs.toLocaleString()} ms</dd>
              <dt className="text-gray-500">최대 응답</dt>
              <dd className="font-mono">{enrich.maxLatencyMs.toLocaleString()} ms</dd>
            </dl>
            {daily.length > 0 ? (
              <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    일자별 추이 <span className="font-normal text-gray-400">({daily.length}일)</span>
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    {daily[0]?.date} → {daily[daily.length - 1]?.date}
                  </span>
                </div>
                {!dailyHasAny ? (
                  <p className="mt-3 text-xs text-gray-500">최근 기간 동안 강화 데이터가 없습니다.</p>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-[11px] text-gray-500">적용 건수</p>
                      <Sparkline
                        values={appliedSeries}
                        stroke="#4f46e5"
                        fill="rgba(79,70,229,0.12)"
                        ariaLabel="일자별 강화 적용 건수"
                      />
                      <p className="mt-0.5 text-[11px] font-mono text-gray-700">
                        오늘 {appliedSeries[appliedSeries.length - 1] ?? 0} ·
                        최대 {Math.max(0, ...appliedSeries)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500">스킵·실패</p>
                      <Sparkline
                        values={skippedSeries}
                        stroke="#b45309"
                        fill="rgba(180,83,9,0.12)"
                        ariaLabel="일자별 강화 스킵·실패 건수"
                      />
                      <p className="mt-0.5 text-[11px] font-mono text-gray-700">
                        오늘 {skippedSeries[skippedSeries.length - 1] ?? 0} ·
                        최대 {Math.max(0, ...skippedSeries)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500">평균 응답 (ms)</p>
                      <Sparkline
                        values={latencySeries}
                        stroke="#0f766e"
                        fill="rgba(15,118,110,0.12)"
                        ariaLabel="일자별 강화 평균 응답시간(ms)"
                      />
                      <p className="mt-0.5 text-[11px] font-mono text-gray-700">
                        오늘 {(latencySeries[latencySeries.length - 1] ?? 0).toLocaleString()}ms ·
                        최대 {Math.max(0, ...latencySeries).toLocaleString()}ms
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            {enrich.modelBreakdown.length > 0 ? (
              <div className="max-w-2xl overflow-hidden rounded-lg border border-gray-200 bg-white">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Provider</th>
                      <th className="px-3 py-2 text-left font-medium">Model</th>
                      <th className="px-3 py-2 text-right font-medium">건수</th>
                      <th className="px-3 py-2 text-right font-medium">평균 응답(ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrich.modelBreakdown.map((row, i) => (
                      <tr key={`${row.provider}:${row.model}:${i}`} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-800">{row.provider || '—'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-700">{row.model || '—'}</td>
                        <td className="px-3 py-2 text-right font-mono">{row.count.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-mono">{row.avgLatencyMs.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-500">최근 7일간 강화 적용 데이터가 없습니다.</p>
            )}
            <p className="text-xs text-slate-500">
              Stage 0(입력 자동 강화)의 활용도와 비용·지연을 모델별로 비교해 운영 결정을 내릴 수 있어요.
              엔진 설정의 <span className="font-semibold text-slate-700">입력 자동 강화</span> 토글로 on/off
              할 수 있습니다.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">표시할 강화 통계가 없습니다.</p>
        )}
      </section>
    </div>
  )
}

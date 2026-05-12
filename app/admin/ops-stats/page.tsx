'use client'

import { useCallback, useEffect, useState } from 'react'
import { LoadingState, ErrorState } from '@/components/ui/AsyncState'
import { adminJson } from '@/lib/admin-client'

interface BriefEnrichStats {
  windowDays: number
  total: number
  applied: number
  skipped: number
  avgLatencyMs: number
  maxLatencyMs: number
  modelBreakdown: Array<{ provider: string; model: string; count: number; avgLatencyMs: number }>
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

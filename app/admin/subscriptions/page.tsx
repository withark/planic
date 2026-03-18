'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type SubStats = {
  paidSubscribersActive?: number
  activePaidCount?: number
  freeToPaidThisMonth?: number
  activeSubscriptionsPaid?: number
  canceledThisMonth?: number
  planSubscriberCounts?: { planType: string; activeCount: number }[]
  planPaymentShare?: { planType: string; count: number; revenueKrw: number }[]
  paymentFailuresMonth?: number
}

type SubRow = {
  id: string
  userId: string
  planType: string
  billingCycle: string | null
  status: string
  startedAt: string | null
  expiresAt: string | null
  canceledAt: string | null
  createdAt: string
  trial: boolean
}

export default function AdminSubscriptionsPage() {
  const [stats, setStats] = useState<SubStats | null>(null)
  const [rows, setRows] = useState<SubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/subscriptions')
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok && res?.data) {
          setStats(res.data.stats ?? null)
          setRows(Array.isArray(res.data.rows) ? res.data.rows : [])
        } else setError(res?.error?.message || '조회 실패')
      })
      .catch(() => setError('요청 실패'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-gray-500">로딩 중…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">구독 관리</h1>
        <Link href="/admin" className="text-sm text-primary-600">← 대시보드</Link>
      </div>
      <p className="text-xs text-gray-500">
        SQL <code className="bg-slate-100 px-1 rounded">subscriptions</code> 이력 + 결제 집계. 토스 결제 승인 시{' '}
        <code className="bg-slate-100 px-1 rounded">setActiveSubscription</code>으로 갱신됩니다.
      </p>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            ['활성 유료 구독(레코드)', stats.activeSubscriptionsPaid ?? stats.paidSubscribersActive ?? 0],
            ['유료 사용자(중복 제거)', stats.activePaidCount ?? 0],
            ['이번 달 유료 전환(결제 건)', stats.freeToPaidThisMonth ?? 0],
            ['이번 달 해지 완료', stats.canceledThisMonth ?? 0],
            ['이번 달 결제 실패', stats.paymentFailuresMonth ?? 0],
          ].map(([k, v]) => (
            <div key={k as string} className="p-3 rounded-lg border bg-white text-sm">
              <p className="text-xs text-gray-500">{k}</p>
              <p className="text-lg font-semibold tabular-nums">{Number(v).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {stats?.planSubscriberCounts && stats.planSubscriberCounts.length > 0 && (
        <div className="p-3 rounded-lg border bg-white text-sm">
          <p className="font-medium mb-2">플랜별 활성 구독 수</p>
          <ul className="text-xs space-y-1">
            {stats.planSubscriberCounts.map((p) => (
              <li key={p.planType}>
                {p.planType}: {p.activeCount}명
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats?.planPaymentShare && stats.planPaymentShare.length > 0 && (
        <div className="p-3 rounded-lg border bg-white text-sm">
          <p className="font-medium mb-2">플랜별 매출 비중(이번 달 승인)</p>
          <ul className="text-xs space-y-1">
            {stats.planPaymentShare.map((p) => (
              <li key={p.planType}>
                {p.planType}: {p.count}건 · ₩{p.revenueKrw.toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto border rounded-lg bg-white text-xs">
        <p className="px-3 py-2 font-medium text-gray-700 border-b bg-slate-50">최근 구독 변경 내역(최대 500행)</p>
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="px-2 py-2 text-left">user_id</th>
              <th className="px-2 py-2 text-left">플랜</th>
              <th className="px-2 py-2 text-left">주기</th>
              <th className="px-2 py-2 text-left">상태</th>
              <th className="px-2 py-2 text-left">시작</th>
              <th className="px-2 py-2 text-left">종료 예정</th>
              <th className="px-2 py-2 text-left">해지일</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">구독 이력 없음</td>
              </tr>
            ) : (
              rows.slice(0, 100).map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="px-2 py-1.5 font-mono truncate max-w-[120px]">{s.userId.slice(0, 16)}…</td>
                  <td className="px-2 py-1.5">{s.planType}</td>
                  <td className="px-2 py-1.5">{s.billingCycle ?? '—'}</td>
                  <td className="px-2 py-1.5">{s.status}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{s.startedAt ? new Date(s.startedAt).toLocaleDateString('ko-KR') : '—'}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{s.expiresAt ? new Date(s.expiresAt).toLocaleDateString('ko-KR') : '—'}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{s.canceledAt ? new Date(s.canceledAt).toLocaleDateString('ko-KR') : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">trial 플래그는 별도 결제 없이 FREE→유료 전환 시 false. KV 수동 구독은 구독 API POST로 유지 가능.</p>
    </div>
  )
}

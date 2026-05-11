'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ErrorState, LoadingState } from '@/components/ui/AsyncState'
import { adminJson } from '@/lib/admin-client'

type Order = {
  id: string
  userId: string
  orderId: string
  planType: string
  billingCycle: string
  amount: number
  status: string
  paymentKey: string | null
  approvedAt: string | null
  createdAt: string
}

type BillingStats = {
  paymentsApprovedToday?: number
  revenueMonthKrw?: number
  paymentSuccessRateMonth?: number
  recentFailures?: { orderId: string; status: string; updatedAt: string }[]
  refundsCount30d?: number
  refundAmount30dKrw?: number
  recentCanceledOrders?: { orderId: string; userId: string; amount: number; updatedAt: string }[]
}

type PaymentsPayload = {
  orders?: Order[]
  webhookByOrder?: Record<string, { count: number; lastAt: string }>
}

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [webhookByOrder, setWebhookByOrder] = useState<Record<string, { count: number; lastAt: string }>>({})
  const [billing, setBilling] = useState<BillingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [payOut, billOut] = await Promise.all([
      adminJson<PaymentsPayload>('/api/admin/payments'),
      adminJson<BillingStats | null>('/api/admin/billing'),
    ])
    const parts: string[] = []
    if (!payOut.ok) {
      setOrders([])
      setWebhookByOrder({})
      parts.push(`주문 목록: ${payOut.message}`)
    } else {
      setOrders(payOut.data?.orders ?? [])
      setWebhookByOrder(payOut.data?.webhookByOrder ?? {})
    }
    if (!billOut.ok) {
      setBilling(null)
      parts.push(`요약 지표: ${billOut.message}`)
    } else {
      setBilling(billOut.data ?? null)
    }
    setError(parts.length ? parts.join(' ') : null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  if (loading) return <LoadingState label="결제·정산 데이터를 불러오는 중…" />
  if (error && orders.length === 0 && !billing)
    return <ErrorState message={error} onRetry={() => void loadAll()} />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-gray-900">결제·정산</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadAll()}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? '불러오는 중…' : '다시 불러오기'}
          </button>
          <Link href="/admin" className="text-sm text-primary-600 hover:text-primary-700">
            ← 대시보드
          </Link>
        </div>
      </div>

      {error ? (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          {error}
        </div>
      ) : null}

      {billing && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <div className="p-3 rounded border bg-white">
            <p className="text-xs text-gray-500">오늘 승인</p>
            <p className="font-semibold">{billing.paymentsApprovedToday ?? 0}</p>
          </div>
          <div className="p-3 rounded border bg-white">
            <p className="text-xs text-gray-500">이번 달 매출</p>
            <p className="font-semibold">₩{(billing.revenueMonthKrw ?? 0).toLocaleString()}</p>
          </div>
          <div className="p-3 rounded border bg-white">
            <p className="text-xs text-gray-500">이번 달 성공률</p>
            <p className="font-semibold">{billing.paymentSuccessRateMonth ?? 0}%</p>
          </div>
          <div className="p-3 rounded border bg-white">
            <p className="text-xs text-gray-500">실패 최근</p>
            <p className="font-mono text-[10px]">
              {(billing.recentFailures ?? []).slice(0, 2).map((f) => f.orderId).join(', ') || '—'}
            </p>
          </div>
          <div className="p-3 rounded border bg-white">
            <p className="text-xs text-gray-500">30일 환불/취소 건</p>
            <p className="font-semibold">{billing.refundsCount30d ?? 0}</p>
          </div>
          <div className="p-3 rounded border bg-white">
            <p className="text-xs text-gray-500">30일 환불 금액</p>
            <p className="font-semibold">₩{(billing.refundAmount30dKrw ?? 0).toLocaleString()}</p>
          </div>
        </div>
      )}
      {billing?.recentCanceledOrders && billing.recentCanceledOrders.length > 0 && (
        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 text-sm">
          <p className="font-medium text-amber-900 mb-2">최근 환불/취소 내역</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="p-1">주문번호</th>
                <th className="p-1">사용자</th>
                <th className="p-1 text-right">금액</th>
                <th className="p-1">취소 시각</th>
              </tr>
            </thead>
            <tbody>
              {billing.recentCanceledOrders.slice(0, 10).map((c) => (
                <tr key={c.orderId} className="border-t border-amber-100">
                  <td className="p-1 font-mono">{c.orderId.slice(0, 20)}…</td>
                  <td className="p-1 font-mono">{c.userId.slice(0, 12)}…</td>
                  <td className="p-1 text-right tabular-nums">₩{c.amount.toLocaleString()}</td>
                  <td className="p-1 text-gray-600">{new Date(c.updatedAt).toLocaleString('ko-KR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm text-gray-600">
        토스 주문 단위 목록입니다. 웹훅 수신 건수는 같은 주문번호로 집계합니다. 구독 반영은 웹훅 승인 후{' '}
        <code className="bg-slate-100 px-1 rounded text-xs">subscriptions</code>와 연동됩니다.
      </p>
      <div className="overflow-x-auto border rounded-lg bg-white text-sm">
        <table className="min-w-full">
          <thead className="bg-slate-50 text-xs">
            <tr>
              <th className="p-2 text-left">주문번호</th>
              <th className="p-2 text-left">사용자</th>
              <th className="p-2 text-left">플랜</th>
              <th className="p-2 text-right">금액</th>
              <th className="p-2 text-left">상태</th>
              <th className="p-2 text-left">승인일시</th>
              <th className="p-2 text-left">웹훅</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  등록된 주문이 없거나 아직 불러오지 못했습니다.
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const wh = webhookByOrder[o.orderId]
                return (
                  <tr key={o.id} className="border-t">
                    <td className="p-2 font-mono text-xs">{o.orderId}</td>
                    <td className="p-2 font-mono text-xs">{o.userId.slice(0, 12)}…</td>
                    <td className="p-2">
                      {o.planType} / {o.billingCycle}
                    </td>
                    <td className="p-2 text-right tabular-nums">₩{o.amount.toLocaleString()}</td>
                    <td className="p-2">
                      <span
                        className={
                          o.status === 'approved'
                            ? 'text-green-700'
                            : o.status === 'pending'
                              ? 'text-amber-700'
                              : 'text-red-600'
                        }
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="p-2 text-xs whitespace-nowrap">{o.approvedAt || '—'}</td>
                    <td className="p-2 text-xs">{wh ? `${wh.count}회 · ${wh.lastAt}` : '—'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

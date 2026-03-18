'use client'

import { useEffect, useState } from 'react'

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

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [webhookByOrder, setWebhookByOrder] = useState<Record<string, { count: number; lastAt: string }>>({})
  const [billing, setBilling] = useState<BillingStats | null>(null)
  useEffect(() => {
    fetch('/api/admin/payments')
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok) {
          setOrders(res.data?.orders ?? [])
          setWebhookByOrder(res.data?.webhookByOrder ?? {})
        }
      })
    fetch('/api/admin/billing')
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok && res?.data) setBilling(res.data)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">결제·정산</h1>
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
            <p className="font-mono text-[10px]">{(billing.recentFailures ?? []).slice(0, 2).map((f) => f.orderId).join(', ') || '—'}</p>
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
            {orders.map((o) => {
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
                  <td className="p-2 text-xs">
                    {wh ? `${wh.count}회 · ${wh.lastAt}` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

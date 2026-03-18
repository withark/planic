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

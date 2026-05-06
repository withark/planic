'use client'

import { useEffect, useState } from 'react'

export default function AdminSettlementPage() {
  const [data, setData] = useState<{
    months: { month: string; gross: number; approved: number; canceled: number }[]
    planShare: { plan: string; amount: number; count: number; pct: number }[]
    note?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/admin/settlement?months=6')
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok) setData(res.data)
        else setError(res?.error?.message || '정산 데이터를 불러오지 못했습니다.')
      })
      .catch(() => setError('정산 데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-gray-500">로딩 중...</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return <p className="text-sm text-slate-500">표시할 정산 데이터가 없습니다.</p>

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-gray-900">정산 관리</h1>
      <p className="text-sm text-gray-600">{data.note}</p>
      <section>
        <h2 className="text-sm font-semibold mb-2">월별 승인 매출(MVP)</h2>
        <div className="border rounded-lg bg-white overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 text-left">월</th>
                <th className="p-2 text-right">승인 금액</th>
                <th className="p-2 text-right">건수</th>
                <th className="p-2 text-right">취소/실패 건(동 기간)</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map((m) => (
                <tr key={m.month} className="border-t">
                  <td className="p-2">{m.month}</td>
                  <td className="p-2 text-right tabular-nums">₩{m.gross.toLocaleString()}</td>
                  <td className="p-2 text-right">{m.approved}</td>
                  <td className="p-2 text-right">{m.canceled}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="text-sm font-semibold mb-2">플랜별 매출 비중(전체 승인 누적)</h2>
        <ul className="space-y-1 text-sm">
          {data.planShare.map((p) => (
            <li key={p.plan} className="flex justify-between border-b border-slate-100 py-1 max-w-md">
              <span>{p.plan}</span>
              <span className="tabular-nums">
                ₩{p.amount.toLocaleString()} ({p.pct}%) · {p.count}건
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type SubRow = {
  userId: string
  planId: string | null
  status: string
  startedAt: string | null
  expiresAt: string | null
  quoteCount: number
  lastActivityAt: string | null
}

export default function AdminSubscriptionsPage() {
  const [list, setList] = useState<SubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/subscriptions')
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok && Array.isArray(res?.data)) setList(res.data)
        else setError(res?.error?.message || '조회 실패')
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
        <Link href="/admin" className="text-sm text-primary-600 hover:text-primary-700">← 대시보드</Link>
      </div>
      <p className="text-xs text-gray-500">quotes 기준 사용자 + kv subscriptions 데이터. 결제 연동 전까지는 상태·플랜을 DB에 수동 반영할 수 있습니다.</p>
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2 text-left font-medium text-gray-700">user_id</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">플랜</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">상태</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">시작일</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">만료일</th>
              <th className="px-4 py-2 text-right font-medium text-gray-700">생성 수</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">최근 활동</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">데이터 없음 (사용자 생성 이력 또는 구독 데이터가 없습니다)</td></tr>
            ) : (
              list.map((s) => (
                <tr key={s.userId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs truncate max-w-[160px]" title={s.userId}>{s.userId}</td>
                  <td className="px-4 py-2">{s.planId ?? '—'}</td>
                  <td className="px-4 py-2">{s.status}</td>
                  <td className="px-4 py-2 text-gray-600">{s.startedAt ? new Date(s.startedAt).toLocaleDateString('ko-KR') : '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{s.expiresAt ? new Date(s.expiresAt).toLocaleDateString('ko-KR') : '—'}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{s.quoteCount}</td>
                  <td className="px-4 py-2 text-gray-600">{s.lastActivityAt ? new Date(s.lastActivityAt).toLocaleString('ko-KR') : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">구독 수정/갱신 UI 및 Stripe 연동은 추후 구현 예정입니다.</p>
    </div>
  )
}

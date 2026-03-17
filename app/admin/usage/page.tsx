'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type UsageData = {
  totalGenerations: number
  last24h: number
  last7d: number
  byUser: { userId: string; generationCount: number; lastAt: string }[]
}

export default function AdminUsagePage() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/usage')
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok && res?.data) setData(res.data)
        else setError(res?.error?.message || '조회 실패')
      })
      .catch(() => setError('요청 실패'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-gray-500">로딩 중…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">사용량 관리</h1>
        <Link href="/admin" className="text-sm text-primary-600 hover:text-primary-700">← 대시보드</Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <p className="text-xs text-gray-500">총 생성 건수</p>
          <p className="text-xl font-semibold tabular-nums">{data.totalGenerations}</p>
        </div>
        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <p className="text-xs text-gray-500">최근 24h</p>
          <p className="text-xl font-semibold tabular-nums">{data.last24h}</p>
        </div>
        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <p className="text-xs text-gray-500">최근 7일</p>
          <p className="text-xl font-semibold tabular-nums">{data.last7d}</p>
        </div>
      </div>
      <section>
        <h2 className="text-sm font-medium text-gray-700 mb-2">사용자별 생성량</h2>
        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2 text-left font-medium text-gray-700">user_id</th>
                <th className="px-4 py-2 text-right font-medium text-gray-700">생성 수</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">최근 생성</th>
              </tr>
            </thead>
            <tbody>
              {data.byUser.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">데이터 없음</td></tr>
              ) : (
                data.byUser.map((u) => (
                  <tr key={u.userId} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-xs truncate max-w-[200px]" title={u.userId}>{u.userId}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{u.generationCount}</td>
                    <td className="px-4 py-2 text-gray-600">{u.lastAt ? new Date(u.lastAt).toLocaleString('ko-KR') : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-xs text-gray-400">토큰/크레딧 집계는 추후 연동 예정입니다.</p>
    </div>
  )
}

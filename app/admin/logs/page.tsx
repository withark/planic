'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type LogRow = { id: string; kind: string; context: string; message: string; created_at: string }

export default function AdminLogsPage() {
  const [list, setList] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/logs?limit=100')
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
        <h1 className="text-lg font-semibold text-gray-900">로그</h1>
        <div className="flex items-center gap-2">
          <a href="/api/health" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:text-primary-700">헬스 체크</a>
          <Link href="/admin" className="text-sm text-primary-600 hover:text-primary-700">← 대시보드</Link>
        </div>
      </div>
      <p className="text-xs text-gray-500">API 오류 시 logError로 기록된 이벤트입니다. DB가 있을 때만 저장됩니다.</p>
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2 text-left font-medium text-gray-700 w-20">kind</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">context</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">message</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700 w-40">시각</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">기록 없음 (DB 미설정 시 로그는 저장되지 않습니다)</td></tr>
            ) : (
              list.map((row) => (
                <tr key={row.id} className={`border-b border-slate-100 ${row.kind === 'error' ? 'bg-red-50/50' : ''}`}>
                  <td className="px-4 py-2"><span className={row.kind === 'error' ? 'text-red-600 font-medium' : ''}>{row.kind}</span></td>
                  <td className="px-4 py-2 font-mono text-xs">{row.context}</td>
                  <td className="px-4 py-2 text-gray-800 max-w-md truncate" title={row.message}>{row.message}</td>
                  <td className="px-4 py-2 text-gray-600">{new Date(row.created_at).toLocaleString('ko-KR')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

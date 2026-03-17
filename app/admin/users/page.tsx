'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type UserRow = {
  userId: string
  email: string | null
  name: string | null
  isAdmin: boolean
  planId: string | null
  status: string
  quoteCount: number
  lastActivityAt: string
}

export default function AdminUsersPage() {
  const [list, setList] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/users')
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
        <h1 className="text-lg font-semibold text-gray-900">사용자 관리</h1>
        <Link href="/admin" className="text-sm text-primary-600 hover:text-primary-700">← 대시보드</Link>
      </div>
      <p className="text-xs text-gray-500">quotes 테이블 기준 사용자(생성 이력이 있는 user_id) 목록입니다. 이메일/이름은 NextAuth 세션에만 있으며 DB에는 저장되지 않습니다.</p>
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2 text-left font-medium text-gray-700">user_id</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">생성 건수</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">최근 활동</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">플랜</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">상태</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">데이터 없음</td></tr>
            ) : (
              list.map((u) => (
                <tr key={u.userId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs truncate max-w-[180px]" title={u.userId}>{u.userId}</td>
                  <td className="px-4 py-2 tabular-nums">{u.quoteCount}</td>
                  <td className="px-4 py-2 text-gray-600">{u.lastActivityAt ? new Date(u.lastActivityAt).toLocaleString('ko-KR') : '—'}</td>
                  <td className="px-4 py-2">{u.planId ?? '—'}</td>
                  <td className="px-4 py-2">{u.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

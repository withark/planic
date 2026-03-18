'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type UserRow = {
  userId: string
  email: string | null
  name: string | null
  signupAt: string
  lastLoginAt: string | null
  currentPlan: string
  subscriptionStatus: string
  expiresAt: string | null
  startedAt: string | null
  usageStatus: string
  quotaExceeded: boolean
  loginMethod: string
  isAdmin: boolean
  isActive: boolean
  quoteCount: number
  lastPaymentAt: string | null
  paidConversion: boolean
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
        <Link href="/admin" className="text-sm text-primary-600">← 대시보드</Link>
      </div>
      <p className="text-xs text-gray-500">
        DB users + 활성 구독 + 이번 달 사용량. 로그인 시 Google 등으로 upsert·최근 로그인 갱신.
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white text-xs">
        <table className="w-full min-w-[1400px]">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="px-2 py-2 text-left">user_id</th>
              <th className="px-2 py-2 text-left">이메일</th>
              <th className="px-2 py-2 text-left">가입일</th>
              <th className="px-2 py-2 text-left">최근 로그인</th>
              <th className="px-2 py-2 text-left">플랜</th>
              <th className="px-2 py-2 text-left">구독</th>
              <th className="px-2 py-2 text-left">사용량</th>
              <th className="px-2 py-2 text-center">초과</th>
              <th className="px-2 py-2 text-left">로그인</th>
              <th className="px-2 py-2 text-center">관리자</th>
              <th className="px-2 py-2 text-center">활성</th>
              <th className="px-2 py-2 text-left">최근 결제</th>
              <th className="px-2 py-2 text-center">유료</th>
              <th className="px-2 py-2 text-right">견적 수</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-4 py-6 text-center text-gray-500">
                  users 테이블에 행이 없습니다. 서비스 로그인 후 집계됩니다.
                </td>
              </tr>
            ) : (
              list.map((u) => (
                <tr key={u.userId} className="border-b hover:bg-slate-50">
                  <td className="px-2 py-1.5 font-mono truncate max-w-[100px]" title={u.userId}>{u.userId.slice(0, 14)}…</td>
                  <td className="px-2 py-1.5 truncate max-w-[120px]">{u.email ?? '—'}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{new Date(u.signupAt).toLocaleDateString('ko-KR')}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('ko-KR') : '—'}</td>
                  <td className="px-2 py-1.5">{u.currentPlan}</td>
                  <td className="px-2 py-1.5">{u.subscriptionStatus}</td>
                  <td className="px-2 py-1.5">{u.usageStatus}</td>
                  <td className="px-2 py-1.5 text-center">{u.quotaExceeded ? '⚠' : '—'}</td>
                  <td className="px-2 py-1.5">{u.loginMethod}</td>
                  <td className="px-2 py-1.5 text-center">{u.isAdmin ? 'Y' : ''}</td>
                  <td className="px-2 py-1.5 text-center">{u.isActive ? 'Y' : 'N'}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-[10px]">{u.lastPaymentAt ? new Date(u.lastPaymentAt).toLocaleString('ko-KR') : '—'}</td>
                  <td className="px-2 py-1.5 text-center">{u.paidConversion ? 'Y' : ''}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{u.quoteCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

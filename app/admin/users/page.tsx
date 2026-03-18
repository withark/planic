'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { AdminCard, AdminSection } from '@/components/admin/AdminCard'

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
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('')
  const [activeFilter, setActiveFilter] = useState<string>('')

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

  const filtered = useMemo(() => {
    let out = list
    const q = search.trim().toLowerCase()
    if (q) {
      out = out.filter(
        (u) =>
          (u.email ?? '').toLowerCase().includes(q) ||
          (u.name ?? '').toLowerCase().includes(q) ||
          (u.userId ?? '').toLowerCase().includes(q)
      )
    }
    if (planFilter) out = out.filter((u) => u.currentPlan === planFilter)
    if (activeFilter === 'active') out = out.filter((u) => u.isActive)
    if (activeFilter === 'inactive') out = out.filter((u) => !u.isActive)
    if (activeFilter === 'admin') out = out.filter((u) => u.isAdmin)
    return out
  }, [list, search, planFilter, activeFilter])

  const summary = useMemo(() => {
    const total = list.length
    const active = list.filter((u) => u.isActive).length
    const paid = list.filter((u) => u.paidConversion).length
    const over = list.filter((u) => u.quotaExceeded).length
    return { total, active, paid, over }
  }, [list])

  const planOptions = useMemo(() => {
    const set = new Set(list.map((u) => u.currentPlan))
    return Array.from(set).sort()
  }, [list])

  if (loading) return <p className="text-sm text-slate-500">로딩 중…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div className="space-y-6">
      {/* A. 헤더 */}
      <header>
        <h1 className="text-xl font-bold text-gray-900">사용자 관리</h1>
        <p className="mt-1 text-sm text-slate-600">
          사용자 상태, 플랜, 구독, 사용량, 로그인 상태를 관리하는 화면입니다.
        </p>
      </header>

      {/* B. 요약 카드 */}
      <AdminSection title="요약" description="전체·활성·유료·한도 초과">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <AdminCard label="전체 사용자 수" value={summary.total.toLocaleString()} />
          <AdminCard label="활성 사용자 수" value={summary.active.toLocaleString()} />
          <AdminCard label="유료 사용자 수" value={summary.paid.toLocaleString()} />
          <AdminCard
            label="제한 초과 사용자 수"
            value={summary.over.toLocaleString()}
            danger={summary.over > 0}
            sub="이번 달 생성 한도 도달"
          />
        </div>
      </AdminSection>

      {/* C. 검색/필터 */}
      <AdminSection title="검색·필터" description="이메일·이름·플랜·활성·관리자">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="이메일·이름·user_id 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64"
          />
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">플랜 전체</option>
            {planOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">활성/비활성 전체</option>
            <option value="active">활성만</option>
            <option value="inactive">비활성만</option>
            <option value="admin">관리자만</option>
          </select>
          <span className="text-xs text-slate-500">총 {filtered.length}명</span>
        </div>
      </AdminSection>

      {/* D. 사용자 테이블 */}
      <AdminSection title="사용자 목록" description="이름·가입일·플랜·구독·사용량·관리자">
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">이름/이메일</th>
                <th className="px-3 py-2 text-left font-medium">가입일</th>
                <th className="px-3 py-2 text-left font-medium">최근 로그인</th>
                <th className="px-3 py-2 text-left font-medium">로그인 방식</th>
                <th className="px-3 py-2 text-left font-medium">현재 플랜</th>
                <th className="px-3 py-2 text-left font-medium">구독 상태</th>
                <th className="px-3 py-2 text-left font-medium">사용량</th>
                <th className="px-3 py-2 text-center font-medium">초과</th>
                <th className="px-3 py-2 text-left font-medium">최근 결제</th>
                <th className="px-3 py-2 text-center font-medium">관리자</th>
                <th className="px-3 py-2 text-center font-medium">활성</th>
                <th className="px-3 py-2 text-right font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-500">
                    조건에 맞는 사용자가 없습니다.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 200).map((u) => (
                  <tr key={u.userId} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-2">
                      <span className="font-medium text-gray-900">{u.name || u.email || '—'}</span>
                      {u.email && <span className="block text-xs text-slate-500 truncate max-w-[140px]">{u.email}</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">{new Date(u.signupAt).toLocaleDateString('ko-KR')}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('ko-KR') : '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{u.loginMethod}</td>
                    <td className="px-3 py-2">
                      <span className="font-medium">{u.currentPlan}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{u.subscriptionStatus}</td>
                    <td className="px-3 py-2 text-slate-600">{u.usageStatus}</td>
                    <td className="px-3 py-2 text-center">{u.quotaExceeded ? '⚠ 초과' : '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600 text-xs">
                      {u.lastPaymentAt ? new Date(u.lastPaymentAt).toLocaleDateString('ko-KR') : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">{u.isAdmin ? 'Y' : '—'}</td>
                    <td className="px-3 py-2 text-center">{u.isActive ? '활성' : '비활성'}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/admin/users/${u.userId}`}
                        className="text-xs text-primary-600 hover:underline"
                      >
                        상세
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 200 && (
          <p className="mt-2 text-xs text-slate-500">상위 200명만 표시. 검색·필터로 범위를 좁혀 주세요.</p>
        )}
      </AdminSection>

      <p className="text-xs text-slate-400">
        상세 보기·상태 변경·플랜 변경·제한 해제는 추후 API 연동 시 제공됩니다. 삭제보다 비활성화/정지를 우선 적용할 예정입니다.
      </p>
    </div>
  )
}

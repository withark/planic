'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AdminSection } from '@/components/admin/AdminCard'

type User = {
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

export default function AdminUserDetailPage() {
  const params = useParams()
  const userId = params?.userId as string
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!userId) return
    fetch(`/api/admin/users/${userId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok && res?.data) setUser(res.data)
        else setError(res?.error?.message || '조회 실패')
      })
      .catch(() => setError('요청 실패'))
      .finally(() => setLoading(false))
  }, [userId])

  async function setActive(isActive: boolean) {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.ok !== false) setUser((u) => (u ? { ...u, isActive } : null))
      else alert(data?.error?.message ?? '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-500">로딩 중…</p>
  if (error || !user) return <p className="text-sm text-red-600">{error || '사용자 없음'}</p>

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">사용자 상세</h1>
          <p className="mt-1 text-sm text-slate-600">{user.name || user.email || user.userId}</p>
        </div>
        <Link href="/admin/users" className="text-sm text-primary-600 hover:underline">← 목록</Link>
      </header>

      <AdminSection title="기본 정보" description="이메일·가입·로그인">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><dt className="text-slate-500">user_id</dt><dd className="font-mono text-xs break-all">{user.userId}</dd></div>
          <div><dt className="text-slate-500">이메일</dt><dd>{user.email ?? '—'}</dd></div>
          <div><dt className="text-slate-500">이름</dt><dd>{user.name ?? '—'}</dd></div>
          <div><dt className="text-slate-500">가입일</dt><dd>{new Date(user.signupAt).toLocaleString('ko-KR')}</dd></div>
          <div><dt className="text-slate-500">최근 로그인</dt><dd>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('ko-KR') : '—'}</dd></div>
          <div><dt className="text-slate-500">로그인 방식</dt><dd>{user.loginMethod}</dd></div>
        </dl>
      </AdminSection>

      <AdminSection title="플랜·구독·사용량" description="현재 플랜·구독 상태·한도">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><dt className="text-slate-500">현재 플랜</dt><dd className="font-medium">{user.currentPlan}</dd></div>
          <div><dt className="text-slate-500">구독 상태</dt><dd>{user.subscriptionStatus}</dd></div>
          <div><dt className="text-slate-500">사용량</dt><dd>{user.usageStatus}</dd></div>
          <div><dt className="text-slate-500">한도 초과</dt><dd>{user.quotaExceeded ? '⚠ 예' : '아니오'}</dd></div>
          <div><dt className="text-slate-500">저장 견적 수</dt><dd>{user.quoteCount}</dd></div>
          <div><dt className="text-slate-500">최근 결제일</dt><dd>{user.lastPaymentAt ? new Date(user.lastPaymentAt).toLocaleDateString('ko-KR') : '—'}</dd></div>
        </dl>
      </AdminSection>

      <AdminSection title="상태 변경" description="활성/비활성 (비활성 시 로그인 제한)">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={user.isActive}
              onChange={(e) => setActive(e.target.checked)}
              disabled={saving}
            />
            활성 (로그인 허용)
          </label>
          <span className="text-xs text-slate-500">{saving ? '저장 중…' : ''}</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">관리자 여부: {user.isAdmin ? '예' : '아니오'}</p>
      </AdminSection>

      <p className="text-xs text-slate-400">플랜 변경·제한 해제는 구독/결제 API 연동 후 제공 예정입니다.</p>
    </div>
  )
}

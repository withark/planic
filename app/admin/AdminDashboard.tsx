'use client'
import { useState } from 'react'
import Link from 'next/link'
import { GNB } from '@/components/GNB'

const LINKS = [
  { href: '/settings', label: '설정', desc: '회사 정보, 기본 견적 설정' },
  { href: '/prices', label: '단가표', desc: '단가 관리' },
  { href: '/references', label: '참고 견적서', desc: '참고 견적서 업로드' },
  { href: '/history', label: '견적 이력', desc: '저장된 견적 목록' },
  { href: '/api/health', label: '헬스 체크', desc: 'API 상태 (새 탭)', external: true },
]

export function AdminDashboard() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwMessage, setPwMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pwLoading, setPwLoading] = useState(false)

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMessage(null)
    setPwLoading(true)
    try {
      const res = await fetch('/api/auth/admin-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.ok) {
        setPwMessage({ type: 'ok', text: '비밀번호가 변경되었습니다.' })
        setCurrentPassword('')
        setNewPassword('')
      } else {
        setPwMessage({ type: 'err', text: data?.error || '변경에 실패했습니다.' })
      }
    } catch {
      setPwMessage({ type: 'err', text: '요청 중 오류가 발생했습니다.' })
    } finally {
      setPwLoading(false)
    }
  }

  async function onLogout() {
    await fetch('/api/auth/admin-logout', { method: 'POST' })
    window.location.href = '/admin'
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="flex-shrink-0 border-r border-slate-200 bg-white">
        <GNB />
      </aside>
      <main className="flex-1 min-w-0 p-6">
        <div className="max-w-2xl space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">관리자</h1>
            <button
              type="button"
              onClick={onLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              로그아웃
            </button>
          </div>

          <section>
            <h2 className="text-sm font-medium text-gray-700 mb-3">바로가기</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {LINKS.map(({ href, label, desc, external }) => (
                <li key={href}>
                  {external ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg border border-slate-200 bg-white hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
                    >
                      <span className="font-medium text-gray-900">{label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </a>
                  ) : (
                    <Link
                      href={href}
                      className="block p-3 rounded-lg border border-slate-200 bg-white hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
                    >
                      <span className="font-medium text-gray-900">{label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-medium text-gray-700 mb-3">비밀번호 변경</h2>
            <form onSubmit={onChangePassword} className="space-y-3 max-w-sm">
              {pwMessage && (
                <p
                  className={`text-sm px-3 py-2 rounded-md ${
                    pwMessage.type === 'ok' ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'
                  }`}
                  role="alert"
                >
                  {pwMessage.text}
                </p>
              )}
              <div>
                <label htmlFor="current-pw" className="block text-sm text-gray-600 mb-1">
                  현재 비밀번호
                </label>
                <input
                  id="current-pw"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="new-pw" className="block text-sm text-gray-600 mb-1">
                  새 비밀번호 (4자 이상)
                </label>
                <input
                  id="new-pw"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <button type="submit" disabled={pwLoading} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
                {pwLoading ? '변경 중…' : '비밀번호 변경'}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}

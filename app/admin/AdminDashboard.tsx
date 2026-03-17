'use client'
import { useState } from 'react'
import Link from 'next/link'

/** 관리자 전용 바로가기 — 사용자 화면(설정/단가/참고/이력)은 포함하지 않음 */
const ADMIN_LINKS = [
  { href: '/admin/users', label: '사용자 관리', desc: '가입 사용자·권한', ready: true },
  { href: '/admin/subscriptions', label: '구독 관리', desc: '구독 현황·갱신', ready: true },
  { href: '/admin/plans', label: '플랜 관리', desc: '요금제·한도 설정', ready: true },
  { href: '/admin/usage', label: '사용량 관리', desc: 'API·생성 사용량', ready: true },
  { href: '/admin/engines', label: '엔진/모델', desc: 'AI 모델·엔진 정책', ready: true },
  { href: '/admin/logs', label: '로그', desc: '요청·장애 로그', ready: true },
  { href: '/admin/system', label: '시스템', desc: '공지·시스템 설정', ready: true },
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

  return (
    <div className="min-h-full flex flex-col">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        <section>
          <h2 className="text-sm font-medium text-gray-700 mb-3">운영 바로가기</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ADMIN_LINKS.map(({ href, label, desc, external, ready }) => (
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
                    <p className="text-xs text-gray-500 mt-0.5">
                      {desc}
                      {ready && <span className="text-gray-400"> · 준비 중</span>}
                    </p>
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
    </div>
  )
}

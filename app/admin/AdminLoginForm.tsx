'use client'
import { useState } from 'react'
import Link from 'next/link'
import { EvQuoteLogo } from '@/components/EvQuoteLogo'

export function AdminLoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || '로그인에 실패했습니다.')
        return
      }
      window.location.href = data?.redirect || '/admin'
    } catch {
      setError('로그인 요청 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-primary-50/30">
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-gray-800 hover:text-primary-600 transition-colors">
          <EvQuoteLogo showText size="md" />
        </Link>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-semibold text-gray-900">관리자 로그인</h1>
            <p className="text-sm text-gray-500">아이디와 비밀번호를 입력하세요.</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md" role="alert">
                {error}
              </p>
            )}
            <div>
              <label htmlFor="admin-username" className="block text-sm font-medium text-gray-700 mb-1">
                아이디
              </label>
              <input
                id="admin-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="admin"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 disabled:opacity-50"
            >
              {loading ? '로그인 중…' : '로그인'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400">
            <Link href="/" className="hover:text-primary-600">메인으로 돌아가기</Link>
          </p>
        </div>
      </main>
    </div>
  )
}

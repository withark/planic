'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type SystemData = {
  status: string
  db: string
  envSummary: { hasDatabase: boolean; nodeEnv: string }
  notice: string | null
}

export default function AdminSystemPage() {
  const [data, setData] = useState<SystemData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/system')
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
        <h1 className="text-lg font-semibold text-gray-900">시스템</h1>
        <Link href="/admin" className="text-sm text-primary-600 hover:text-primary-700">← 대시보드</Link>
      </div>
      <div className="grid grid-cols-2 gap-4 max-w-xl">
        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <p className="text-xs text-gray-500">상태</p>
          <p className="font-medium">{data.status === 'ok' ? '정상' : '제한적'}</p>
        </div>
        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <p className="text-xs text-gray-500">DB</p>
          <p className="font-medium">{data.db === 'ok' ? '연결됨' : data.db === 'unconfigured' ? '미설정' : '오류'}</p>
        </div>
        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <p className="text-xs text-gray-500">NODE_ENV</p>
          <p className="font-medium">{data.envSummary?.nodeEnv ?? '—'}</p>
        </div>
      </div>
      <section>
        <h2 className="text-sm font-medium text-gray-700 mb-2">점검 링크</h2>
        <ul className="space-y-1 text-sm">
          <li><a href="/api/health" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">/api/health</a> — 헬스 체크</li>
        </ul>
      </section>
      {data.notice && <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">{data.notice}</p>}
      <p className="text-xs text-gray-400">공지/운영 메모·시스템 설정 확장은 추후 반영 예정입니다.</p>
    </div>
  )
}

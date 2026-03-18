'use client'

import { useEffect, useState } from 'react'

export default function AdminOpsStatsPage() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok) setStats(res.data)
      })
  }, [])

  if (!stats) return <p className="text-sm text-gray-500">로딩…</p>

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">운영 통계</h1>
      <p className="text-sm text-gray-600">
        MVP: 대시보드와 동일 소스의 요약 지표입니다. 전환율·유지율·코호트는 DB 이벤트 수집 후 확장합니다.
      </p>
      <dl className="grid grid-cols-2 gap-2 text-sm max-w-lg border rounded-lg p-4 bg-white">
        <dt className="text-gray-500">총 생성(견적)</dt>
        <dd className="font-mono">{String(stats.quoteCountTotal)}</dd>
        <dt className="text-gray-500">7일 생성</dt>
        <dd className="font-mono">{String(stats.quoteCountLast7d)}</dd>
        <dt className="text-gray-500">오늘 매출</dt>
        <dd className="font-mono">₩{Number(stats.revenueTodayKrw).toLocaleString()}</dd>
        <dt className="text-gray-500">활성 구독</dt>
        <dd className="font-mono">{String(stats.activeSubscriptions)}</dd>
        <dt className="text-gray-500">distinct 견적 사용자</dt>
        <dd className="font-mono">{String(stats.userCount)}</dd>
      </dl>
      <p className="text-xs text-slate-500">
        상세 매출·전환은 <a className="text-primary-600" href="/admin/settlement">정산 관리</a>와 결제
        목록을 함께 보세요.
      </p>
    </div>
  )
}

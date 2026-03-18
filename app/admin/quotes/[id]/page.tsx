'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type HistoryRecord = {
  id: string
  eventName: string
  clientName: string
  quoteDate: string
  eventDate: string
  duration: string
  type: string
  headcount: string
  total: number
  savedAt: string
  doc?: unknown
}

export default function AdminQuoteDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [quote, setQuote] = useState<HistoryRecord | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/admin/quotes/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok && res?.data) {
          setQuote(res.data.quote)
          setUserId(res.data.userId)
        } else setError(res?.error?.message || '조회 실패')
      })
      .catch(() => setError('요청 실패'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-sm text-slate-500">로딩 중…</p>
  if (error || !quote) return <p className="text-sm text-red-600">{error || '견적 없음'}</p>

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">견적 상세 (관리자)</h1>
          <p className="mt-1 text-sm text-slate-600">{quote.eventName} · {quote.clientName}</p>
        </div>
        <Link href="/admin/generation-logs" className="text-sm text-primary-600 hover:underline">← 생성 로그</Link>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">요약</h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><dt className="text-slate-500">견적 ID</dt><dd className="font-mono text-xs">{quote.id}</dd></div>
          <div><dt className="text-slate-500">사용자 ID</dt><dd className="font-mono text-xs truncate" title={userId ?? ''}>{userId?.slice(0, 12)}…</dd></div>
          <div><dt className="text-slate-500">행사명</dt><dd>{quote.eventName}</dd></div>
          <div><dt className="text-slate-500">클라이언트</dt><dd>{quote.clientName}</dd></div>
          <div><dt className="text-slate-500">견적일</dt><dd>{quote.quoteDate}</dd></div>
          <div><dt className="text-slate-500">행사일</dt><dd>{quote.eventDate}</dd></div>
          <div><dt className="text-slate-500">총액</dt><dd className="font-medium">₩{(quote.total ?? 0).toLocaleString('ko-KR')}</dd></div>
          <div><dt className="text-slate-500">저장 시각</dt><dd>{quote.savedAt ? new Date(quote.savedAt).toLocaleString('ko-KR') : '—'}</dd></div>
        </dl>
      </section>

      {quote.doc != null ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">문서 payload (doc)</h2>
          <pre className="max-h-96 overflow-y-auto rounded bg-slate-50 p-3 text-xs whitespace-pre-wrap break-words">
            {JSON.stringify(quote.doc, null, 2)}
          </pre>
        </section>
      ) : null}
    </div>
  )
}

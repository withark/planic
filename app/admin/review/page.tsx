'use client'

import { useEffect, useState } from 'react'
import { LoadingState, ErrorState } from '@/components/ui/AsyncState'
import { adminJson } from '@/lib/admin-client'

type Item = {
  id: string
  userId: string
  eventName: string
  total: number
  createdAt: string
  generationMeta: {
    cuesheetApplied?: boolean
    sampleFilename?: string
    engineSnapshot?: Record<string, unknown>
  } | null
}

export default function AdminReviewPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    const out = await adminJson<{ items?: Item[] }>('/api/admin/quotes-recent')
    if (out.ok) {
      setItems(out.data?.items ?? [])
    } else {
      setItems([])
      setError(out.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading) return <LoadingState label="로딩 중…" />
  if (error) return <ErrorState message={error} onRetry={() => void load()} />

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">검수·미리보기</h1>
      <p className="text-sm text-gray-600 max-w-3xl">
        최근 생성된 견적(제안·타임테이블·큐시트·시나리오 포함)입니다. 사용자 앱의{' '}
        <strong>히스토리/생성 화면</strong>에서 동일 건을 열어 PDF·탭별 레이아웃을 검수하세요.
        아래 <code className="bg-slate-100 px-1 rounded text-xs">generationMeta</code>로 샘플 반영 여부를
        교차 확인할 수 있습니다.
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">최근 생성 문서가 없습니다.</p>
      ) : (
      <ul className="space-y-2">
        {items.map((it) => (
          <li
            key={it.id}
            className="border border-slate-200 rounded-lg p-3 bg-white flex flex-wrap justify-between gap-2 items-start"
          >
            <div>
              <p className="font-medium">{it.eventName || '(무제)'}</p>
              <p className="text-xs text-gray-500">
                {it.createdAt} · user {it.userId.slice(0, 12)}… · 합계 ₩{it.total.toLocaleString()}
              </p>
              <p className="text-xs mt-1 text-slate-600">
                샘플 반영: {it.generationMeta?.cuesheetApplied ? '예' : '미적용/없음'}{' '}
                {it.generationMeta?.sampleFilename ? `(${it.generationMeta.sampleFilename})` : ''}
              </p>
            </div>
            <a
              href={`/admin/quotes/${it.id}`}
              className="text-xs text-primary-600 shrink-0"
              title="관리자 상세 화면으로 이동"
            >
              상세 보기 →
            </a>
          </li>
        ))}
      </ul>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'

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
  useEffect(() => {
    fetch('/api/admin/quotes-recent')
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok) setItems(res.data?.items ?? [])
      })
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">검수·미리보기</h1>
      <p className="text-sm text-gray-600 max-w-3xl">
        최근 생성된 견적(제안·타임테이블·큐시트·시나리오 포함)입니다. 사용자 앱의{' '}
        <strong>히스토리/생성 화면</strong>에서 동일 건을 열어 PDF·탭별 레이아웃을 검수하세요.
        아래 <code className="bg-slate-100 px-1 rounded text-xs">generationMeta</code>로 샘플 반영 여부를
        교차 확인할 수 있습니다.
      </p>
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
              href={`/generate`}
              className="text-xs text-primary-600 shrink-0"
              title="사용자 계정으로 해당 견적은 히스토리에서 확인"
            >
              생성 플로우 →
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

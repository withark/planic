'use client'

import { useEffect, useState } from 'react'

type Sample = {
  id: string
  userId: string
  filename: string
  displayName: string
  documentTab: string
  description: string
  priority: number
  isActive: boolean
  archivedAt: string | null
  generationUseCount: number
  lastUsedAt: string | null
  uploadedAt: string
  ext: string
}

const TABS = [
  { v: 'cuesheet', l: '큐시트' },
  { v: 'proposal', l: '제안 프로그램' },
  { v: 'timetable', l: '타임테이블' },
  { v: 'scenario', l: '시나리오' },
]

export default function AdminSamplesPage() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState(true)

  function load() {
    fetch('/api/admin/samples')
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok) setSamples(res.data?.samples ?? [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch('/api/admin/samples', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    })
    load()
  }

  if (loading) return <p className="text-sm text-gray-500">로딩…</p>

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">샘플 관리</h1>
      <p className="text-sm text-gray-600 max-w-3xl">
        업로드된 큐시트(및 탭 분류) 자료입니다. <strong>비활성·보관</strong>으로 숨기고, 우선순위로 생성 시 반영 순서를
        조정합니다. 생성 파이프라인은 <strong>활성 샘플 중 우선순위 ↑ · 최신 순</strong> 1건을 큐시트 문맥으로
        사용합니다.
      </p>
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-600">
            <tr>
              <th className="p-2">샘플명</th>
              <th className="p-2">user</th>
              <th className="p-2">탭</th>
              <th className="p-2">우선순위</th>
              <th className="p-2">활성</th>
              <th className="p-2">사용 횟수</th>
              <th className="p-2">보관</th>
              <th className="p-2">동작</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 align-top">
                <td className="p-2">
                  <div className="font-medium">{s.displayName || s.filename}</div>
                  <div className="text-xs text-gray-400">{s.filename}</div>
                  <input
                    className="mt-1 w-full text-xs border rounded px-1"
                    placeholder="설명"
                    defaultValue={s.description}
                    onBlur={(e) => patch(s.id, { description: e.target.value })}
                  />
                </td>
                <td className="p-2 font-mono text-xs break-all max-w-[100px]">{s.userId.slice(0, 12)}…</td>
                <td className="p-2">
                  <select
                    className="text-xs border rounded"
                    value={s.documentTab}
                    onChange={(e) => patch(s.id, { documentTab: e.target.value })}
                  >
                    {TABS.map((t) => (
                      <option key={t.v} value={t.v}>
                        {t.l}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    className="w-16 border rounded px-1 text-xs"
                    defaultValue={s.priority}
                    onBlur={(e) => patch(s.id, { priority: parseInt(e.target.value, 10) || 0 })}
                  />
                </td>
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={s.isActive && !s.archivedAt}
                    disabled={!!s.archivedAt}
                    onChange={(e) => patch(s.id, { isActive: e.target.checked })}
                  />
                </td>
                <td className="p-2 tabular-nums">{s.generationUseCount}</td>
                <td className="p-2">{s.archivedAt ? '보관' : '—'}</td>
                <td className="p-2 space-x-1 flex flex-wrap">
                  {!s.archivedAt && (
                    <button
                      type="button"
                      className="text-xs text-amber-700 underline"
                      onClick={() => {
                        if (confirm('보관(비활성)할까요?')) patch(s.id, { action: 'archive' })
                      }}
                    >
                      보관
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-xs text-primary-700 underline"
                    onClick={() => {
                      const uid = prompt('복제 대상 user_id', s.userId)
                      if (uid) patch(s.id, { action: 'duplicate', targetUserId: uid })
                    }}
                  >
                    복제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {samples.length === 0 && <p className="text-sm text-gray-500">등록된 샘플이 없습니다.</p>}
    </div>
  )
}

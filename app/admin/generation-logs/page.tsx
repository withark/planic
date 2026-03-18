'use client'

import { useEffect, useState } from 'react'

type Run = {
  id: string
  userId: string
  quoteId: string | null
  success: boolean
  errorMessage: string
  sampleId: string
  sampleFilename: string
  cuesheetApplied: boolean
  engineSnapshot: Record<string, unknown>
  createdAt: string
}

export default function AdminGenerationLogsPage() {
  const [runs, setRuns] = useState<Run[]>([])
  useEffect(() => {
    fetch('/api/admin/generation-runs')
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok) setRuns(res.data?.runs ?? [])
      })
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">생성 로그 / 반영 상태</h1>
      <p className="text-sm text-gray-600">
        각 생성 요청별로 샘플 적용 여부·엔진 스냅샷을 남깁니다. 샘플 미반영 시 생성 건에서{' '}
        <code className="bg-slate-100 px-1 rounded">cuesheetApplied=false</code> 또는 샘플 후보 없음을 확인하세요.
      </p>
      <div className="overflow-x-auto border rounded-lg bg-white text-sm">
        <table className="min-w-full">
          <thead className="bg-slate-50 text-xs">
            <tr>
              <th className="p-2 text-left">시각</th>
              <th className="p-2 text-left">사용자</th>
              <th className="p-2 text-left">성공</th>
              <th className="p-2 text-left">샘플</th>
              <th className="p-2 text-left">큐시트 반영</th>
              <th className="p-2 text-left">엔진</th>
              <th className="p-2 text-left">에러</th>
              <th className="p-2 text-left">quote</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="p-2 whitespace-nowrap text-xs">{r.createdAt}</td>
                <td className="p-2 font-mono text-xs">{r.userId.slice(0, 10)}…</td>
                <td className="p-2">{r.success ? '✓' : '✗'}</td>
                <td className="p-2 text-xs">
                  {r.sampleFilename || '—'}
                  <br />
                  <span className="text-gray-400">{r.sampleId}</span>
                </td>
                <td className="p-2">{r.cuesheetApplied ? 'Y' : 'N'}</td>
                <td className="p-2 text-xs max-w-[180px] truncate" title={JSON.stringify(r.engineSnapshot)}>
                  {String(r.engineSnapshot?.model ?? '')} / structure:{String(r.engineSnapshot?.structureFirst ?? '')}
                </td>
                <td className="p-2 text-xs text-red-600 max-w-xs truncate">{r.errorMessage || '—'}</td>
                <td className="p-2 font-mono text-xs">{r.quoteId?.slice(0, 8) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

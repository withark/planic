'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ErrorState, LoadingState } from '@/components/ui/AsyncState'
import { adminJson } from '@/lib/admin-client'

type Plan = {
  id: string
  name: string
  priceMonth: number
  generationLimit: number
  features: string[]
  active: boolean
  sortOrder: number
}

export default function AdminPlansPage() {
  const [list, setList] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    const out = await adminJson<Plan[]>('/api/admin/plans')
    if (!out.ok) {
      setList([])
      setError(out.message)
    } else {
      setList(Array.isArray(out.data) ? out.data : [])
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  async function save() {
    setSaving(true)
    try {
      const out = await adminJson<unknown>('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list),
      })
      if (out.ok) {
        await load()
      } else {
        setError(out.message)
      }
    } catch {
      setError('저장 요청 실패')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState label="플랜 목록을 불러오는 중…" />
  if (error && list.length === 0) return <ErrorState message={error} onRetry={() => void load()} />

  return (
    <div className="space-y-4">
      {error && list.length > 0 ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">플랜 관리</h1>
        <div className="flex items-center gap-2">
          <button type="button" onClick={save} disabled={saving} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
            {saving ? '저장 중...' : '저장'}
          </button>
          <Link href="/admin" className="text-sm text-primary-600 hover:text-primary-700">← 대시보드</Link>
        </div>
      </div>
      <p className="text-xs text-gray-500">DB에 저장된 플랜 목록입니다. 수정 후 저장하면 반영됩니다. -1 = 무제한.</p>
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-2 text-left font-medium text-gray-700">id</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">이름</th>
              <th className="px-4 py-2 text-right font-medium text-gray-700">월 가격</th>
              <th className="px-4 py-2 text-right font-medium text-gray-700">생성 한도</th>
              <th className="px-4 py-2 text-left font-medium text-gray-700">활성</th>
              <th className="px-4 py-2 text-right font-medium text-gray-700">순서</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2 font-mono text-xs">{p.id}</td>
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2 text-right tabular-nums">{p.priceMonth.toLocaleString('ko-KR')}원</td>
                <td className="px-4 py-2 text-right tabular-nums">{p.generationLimit === -1 ? '무제한' : p.generationLimit}</td>
                <td className="px-4 py-2">{p.active ? '예' : '아니오'}</td>
                <td className="px-4 py-2 text-right">{p.sortOrder}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">기능(features) 수정·추가 UI는 추후 확장 예정입니다. 현재는 목록 조회·저장 구조만 동작합니다.</p>
    </div>
  )
}

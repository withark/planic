'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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

  function load() {
    fetch('/api/admin/plans')
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok && Array.isArray(res?.data)) setList(res.data)
        else setError(res?.error?.message || '조회 실패')
      })
      .catch(() => setError('요청 실패'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.ok) {
        load()
      } else {
        setError(data?.error?.message || '저장 실패')
      }
    } catch {
      setError('저장 요청 실패')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">로딩 중...</p>
  if (error && list.length === 0) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div className="space-y-4">
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

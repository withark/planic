'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminSection } from '@/components/admin/AdminCard'

const DOC_TYPES = [
  { v: 'quote', l: '견적서' },
  { v: 'proposal', l: '제안서' },
  { v: 'task_order', l: '과업지시서' },
  { v: 'event_plan', l: '행사 기획서' },
  { v: 'ops_plan', l: '운영계획서' },
  { v: 'cuesheet', l: '큐시트' },
  { v: 'timetable', l: '타임테이블' },
  { v: 'scenario', l: '시나리오' },
] as const

type Candidate = {
  id: string
  url: string
  title: string
  documentType: string
  status: string
  rawText: string | null
  createdAt: string
  updatedAt: string
}

export default function AdminReferencesCollectPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [documentType, setDocumentType] = useState('quote')
  const [rawText, setRawText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [registeringId, setRegisteringId] = useState<string | null>(null)

  function load() {
    fetch('/api/admin/reference-candidates')
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok) setCandidates(res.data?.candidates ?? [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/reference-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          title: title.trim() || url.trim() || '(제목 없음)',
          documentType,
          rawText: rawText.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.id) {
        setUrl('')
        setTitle('')
        setRawText('')
        load()
      } else alert(data?.error?.message ?? '등록 실패')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRegister(id: string) {
    const targetUserId = prompt('샘플을 등록할 사용자 user_id를 입력하세요.')
    if (!targetUserId?.trim()) return
    setRegisteringId(id)
    try {
      const res = await fetch(`/api/admin/reference-candidates/${id}/register-sample`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetUserId.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        load()
        alert('기준 양식으로 등록되었습니다. 기준 양식 관리에서 확인하세요.')
      } else alert(data?.error?.message ?? '등록 실패')
    } finally {
      setRegisteringId(null)
    }
  }

  if (loading) return <p className="text-sm text-slate-500">로딩 중…</p>

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-gray-900">외부 자료 수집</h1>
        <p className="mt-1 text-sm text-slate-600">
          웹상의 견적서·제안서·과업지시서 등을 <strong>수집 → 검토 → 샘플 등록</strong>하는 메뉴입니다.
          수집된 자료는 바로 생성에 반영되지 않고, 검토 후 기준 양식 관리로 넘기세요.
        </p>
      </header>

      <AdminSection title="URL 등록 / 자료 추가" description="URL과 제목·문서 유형을 입력하고, 필요 시 텍스트를 붙여넣으세요.">
        <form onSubmit={handleAdd} className="space-y-3 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="자료 제목 (비어 있으면 URL 사용)"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">문서 유형</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              {DOC_TYPES.map((t) => (
                <option key={t.v} value={t.v}>{t.l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">텍스트 (선택, 샘플로 저장 시 사용)</label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="URL에서 복사한 텍스트 또는 직접 입력. 샘플로 저장할 때 이 내용이 기준 양식 파일로 들어갑니다."
              rows={4}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
            {submitting ? '등록 중…' : '후보로 등록'}
          </button>
        </form>
      </AdminSection>

      <AdminSection title="문서 후보 목록" description="등록된 후보. 미리보기 후 샘플로 저장하면 기준 양식 관리에 반영됩니다.">
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">제목</th>
                <th className="px-3 py-2 text-left font-medium">URL</th>
                <th className="px-3 py-2 text-left font-medium">유형</th>
                <th className="px-3 py-2 text-left font-medium">상태</th>
                <th className="px-3 py-2 text-left font-medium">미리보기</th>
                <th className="px-3 py-2 text-right font-medium">동작</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">등록된 후보가 없습니다.</td>
                </tr>
              ) : (
                candidates.map((c) => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-medium">{c.title || '—'}</td>
                    <td className="px-3 py-2 text-xs truncate max-w-[180px]" title={c.url}>{c.url || '—'}</td>
                    <td className="px-3 py-2">{DOC_TYPES.find((t) => t.v === c.documentType)?.l ?? c.documentType}</td>
                    <td className="px-3 py-2">{c.status}</td>
                    <td className="px-3 py-2">
                      {c.rawText ? (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-primary-600">미리보기</summary>
                          <pre className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap rounded bg-slate-100 p-2 text-[11px]">
                            {c.rawText.slice(0, 300)}{c.rawText.length > 300 ? '…' : ''}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {c.status !== 'registered' && c.rawText ? (
                        <button
                          type="button"
                          disabled={registeringId === c.id}
                          onClick={() => handleRegister(c.id)}
                          className="text-xs text-primary-600 underline disabled:opacity-50"
                        >
                          {registeringId === c.id ? '등록 중…' : '샘플로 저장'}
                        </button>
                      ) : c.status === 'registered' ? (
                        <span className="text-slate-500">등록됨</span>
                      ) : (
                        <span className="text-slate-400 text-xs">텍스트 입력 필요</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          「샘플로 저장」 시 지정한 사용자의 기준 양식으로 등록됩니다. →{' '}
          <Link href="/admin/samples" className="text-primary-600 underline">기준 양식 관리</Link>
        </p>
      </AdminSection>

      <p className="text-xs text-slate-400">
        키워드 기반 수집·URL 자동 가져오기는 추후 제공 예정입니다. 현재는 URL·제목·텍스트 붙여넣기로 후보를 등록하고, 검토 후 샘플로 저장할 수 있습니다.
      </p>
    </div>
  )
}

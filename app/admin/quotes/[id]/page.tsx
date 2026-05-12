'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ErrorState, LoadingState } from '@/components/ui/AsyncState'
import { adminJson } from '@/lib/admin-client'

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

type BriefEnrichDocShape = {
  oneLiner?: string
  toneGuide?: string
  keyConcepts?: string[]
  mustHaveDetails?: string[]
  cautionPoints?: string[]
  documentSpecificHints?: string
  meta?: { provider?: string; model?: string; latencyMs?: number }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((it) => String(it ?? '').trim()).filter(Boolean)
}

function extractBriefEnrich(doc: unknown): BriefEnrichDocShape | null {
  if (!isRecord(doc)) return null
  const be = doc.briefEnrich
  if (!isRecord(be)) return null
  const meta = isRecord(be.meta)
    ? {
        provider: typeof be.meta.provider === 'string' ? be.meta.provider : undefined,
        model: typeof be.meta.model === 'string' ? be.meta.model : undefined,
        latencyMs: typeof be.meta.latencyMs === 'number' ? be.meta.latencyMs : undefined,
      }
    : undefined
  const result: BriefEnrichDocShape = {
    oneLiner: typeof be.oneLiner === 'string' ? be.oneLiner.trim() || undefined : undefined,
    toneGuide: typeof be.toneGuide === 'string' ? be.toneGuide.trim() || undefined : undefined,
    keyConcepts: asStringArray(be.keyConcepts),
    mustHaveDetails: asStringArray(be.mustHaveDetails),
    cautionPoints: asStringArray(be.cautionPoints),
    documentSpecificHints:
      typeof be.documentSpecificHints === 'string' ? be.documentSpecificHints.trim() || undefined : undefined,
    meta,
  }
  const hasContent =
    !!result.oneLiner ||
    !!result.toneGuide ||
    (result.keyConcepts?.length ?? 0) > 0 ||
    (result.mustHaveDetails?.length ?? 0) > 0 ||
    (result.cautionPoints?.length ?? 0) > 0 ||
    !!result.documentSpecificHints
  if (!hasContent) return null
  return result
}

export default function AdminQuoteDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [quote, setQuote] = useState<HistoryRecord | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!id) return
    setLoading(true)
    setError(null)
    const out = await adminJson<{ quote: HistoryRecord; userId: string }>(`/api/admin/quotes/${id}`)
    if (!out.ok) {
      setQuote(null)
      setUserId(null)
      setError(out.message)
    } else if (out.data?.quote) {
      setQuote(out.data.quote)
      setUserId(out.data.userId ?? null)
    } else {
      setQuote(null)
      setUserId(null)
      setError('견적 없음')
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [id])

  if (loading) return <LoadingState label="견적을 불러오는 중…" />
  if (error || !quote) return <ErrorState message={error || '견적 없음'} onRetry={() => void load()} />

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

      {(() => {
        const enriched = extractBriefEnrich(quote.doc)
        if (!enriched) return null
        const providerLabel =
          enriched.meta?.provider === 'anthropic'
            ? 'Anthropic'
            : enriched.meta?.provider === 'openai'
              ? 'OpenAI'
              : enriched.meta?.provider || '—'
        const concepts = enriched.keyConcepts ?? []
        const mustHave = enriched.mustHaveDetails ?? []
        const cautions = enriched.cautionPoints ?? []
        return (
          <section className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-indigo-900">입력 자동 강화 (Stage 0)</h2>
              <span className="text-xs text-indigo-800/80">
                {providerLabel}
                {enriched.meta?.model ? (
                  <>
                    {' · '}
                    <code className="rounded bg-white/70 px-1 font-mono text-[11px]">{enriched.meta.model}</code>
                  </>
                ) : null}
                {enriched.meta?.latencyMs != null ? ` · ${enriched.meta.latencyMs}ms` : ''}
              </span>
            </div>
            {enriched.oneLiner ? (
              <p className="mt-3 rounded-md bg-white/80 px-3 py-2 text-sm text-indigo-950">
                <span className="mr-1 font-semibold text-indigo-700">요약:</span>
                {enriched.oneLiner}
              </p>
            ) : null}
            {enriched.toneGuide ? (
              <p className="mt-2 text-xs text-indigo-900/90">
                <span className="mr-1 font-semibold">톤 가이드:</span>
                {enriched.toneGuide}
              </p>
            ) : null}
            {concepts.length > 0 ? (
              <div className="mt-3">
                <p className="text-[11px] font-semibold text-indigo-800/80">키 컨셉</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {concepts.map((c, i) => (
                    <span
                      key={`q-kc-${i}`}
                      className="rounded-full border border-indigo-200 bg-white px-2 py-0.5 text-[11px] text-indigo-800"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {mustHave.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold text-indigo-800/80">필수 디테일 ({mustHave.length})</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-indigo-950">
                    {mustHave.map((line, i) => (
                      <li key={`q-mh-${i}`}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {cautions.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold text-amber-800/80">주의 포인트 ({cautions.length})</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-amber-950">
                    {cautions.map((line, i) => (
                      <li key={`q-ca-${i}`}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            {enriched.documentSpecificHints ? (
              <p className="mt-3 rounded-md bg-white/60 px-3 py-2 text-xs text-indigo-900/90">
                <span className="mr-1 font-semibold text-indigo-700">문서 특화 힌트:</span>
                {enriched.documentSpecificHints}
              </p>
            ) : null}
          </section>
        )
      })()}

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

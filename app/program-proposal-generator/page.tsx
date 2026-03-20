'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { GNB } from '@/components/GNB'
import QuoteResult from '@/components/quote/QuoteResult'
import { Toast, Button } from '@/components/ui'
import type { CompanySettings, HistoryRecord, PriceCategory, QuoteDoc, TaskOrderDoc } from '@/lib/types'
import { apiFetch } from '@/lib/api/client'
import { toUserMessage } from '@/lib/errors/toUserMessage'
import { exportToExcel } from '@/lib/exportExcel'
import { exportToPdf } from '@/lib/exportPdf'
import { fmtKRW } from '@/lib/calc'
import type { PlanType } from '@/lib/plans'
import { MAX_UPLOAD_BYTES, formatUploadLimitText } from '@/lib/upload-limits'
import { calcTotals } from '@/lib/calc'

type MeLite = {
  subscription: { planType: PlanType }
  usage: { quoteGeneratedCount: number }
  limits: { monthlyQuoteGenerateLimit: number }
}

type SourceMode = 'existingEstimate' | 'uploadEstimate'

export default function ProgramProposalGeneratorPage() {
  const [me, setMe] = useState<MeLite | null>(null)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [prices, setPrices] = useState<PriceCategory[]>([])

  const [toast, setToast] = useState('')
  const showToast = useCallback((m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 3000)
  }, [])

  const [sourceMode, setSourceMode] = useState<SourceMode>('existingEstimate')
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([])
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null)

  const [doc, setDoc] = useState<QuoteDoc | null>(null)

  const [taskOrderBaseId, setTaskOrderBaseId] = useState<string | undefined>(undefined)
  const [taskOrderRefs, setTaskOrderRefs] = useState<TaskOrderDoc[]>([])

  const [styleMode, setStyleMode] = useState<'userStyle' | 'aiTemplate'>('userStyle')

  const [generating, setGenerating] = useState(false)
  const generatingTabs = useMemo(() => ({ program: generating }), [generating])

  const fetchInit = useCallback(async () => {
    apiFetch<MeLite>('/api/me').then(setMe).catch(() => {})
    apiFetch<CompanySettings>('/api/settings').then(setCompanySettings).catch(() => {})
    apiFetch<PriceCategory[]>('/api/prices').then(setPrices).catch(() => setPrices([]))
    apiFetch<HistoryRecord[]>('/api/history').then(d => setHistoryList([...d].reverse())).catch(() => setHistoryList([]))
    apiFetch<TaskOrderDoc[]>('/api/task-order-references').then(setTaskOrderRefs).catch(() => setTaskOrderRefs([]))
  }, [])

  useEffect(() => {
    fetchInit()
  }, [fetchInit])

  useEffect(() => {
    if (sourceMode !== 'existingEstimate') return
    if (!selectedEstimateId) return
    const rec = historyList.find(r => r.id === selectedEstimateId)
    if (!rec?.doc) return
    setDoc(rec.doc as QuoteDoc)
  }, [historyList, selectedEstimateId, sourceMode])

  const requestBaseFromDoc = useCallback((d: QuoteDoc) => {
    return {
      clientName: d.clientName,
      clientManager: d.clientManager,
      clientTel: d.clientTel,
      eventName: d.eventName,
      quoteDate: d.quoteDate,
      eventDate: d.eventDate,
      eventDuration: d.eventDuration,
      headcount: d.headcount,
      venue: d.venue,
      eventType: d.eventType,
      budget: '',
      requirements: '',
      styleMode,
      generationMode: taskOrderBaseId ? 'taskOrderBase' : undefined,
      taskOrderBaseId: taskOrderBaseId,
    }
  }, [styleMode, taskOrderBaseId])

  const handleGenerateProgram = useCallback(async () => {
    if (!doc) return
    setGenerating(true)
    try {
      const body = requestBaseFromDoc(doc)
      const data = await apiFetch<{ doc: QuoteDoc }>(`/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          documentTarget: 'program',
          existingDoc: doc,
        }),
      })
      setDoc(data.doc)
      showToast('프로그램 제안 생성 완료!')
    } catch (e) {
      showToast(toUserMessage(e, '프로그램 생성에 실패했습니다.'))
    } finally {
      setGenerating(false)
    }
  }, [doc, requestBaseFromDoc, showToast])

  const onGenerateTab = useCallback(
    (tab: 'program') => {
      if (tab === 'program') return handleGenerateProgram()
    },
    [handleGenerateProgram],
  )

  async function handleUploadEstimate(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      showToast(`파일이 너무 큽니다. ${formatUploadLimitText()} 이하로 업로드해 주세요.`)
      return
    }
    const fd = new FormData()
    fd.append('file', file)
    fd.append('target', 'estimate')

    try {
      showToast('문서 파싱 중...')
      const res = await apiFetch<{ doc: QuoteDoc }>('/api/parse-quote-doc', { method: 'POST', body: fd as any })
      setDoc(res.doc)
      setSelectedEstimateId(null)
      showToast('업로드 문서를 견적 컨텍스트로 변환했습니다.')
    } catch (e) {
      showToast(toUserMessage(e, '문서 업로드/파싱에 실패했습니다.'))
    }
  }

  const taskOrderOptions = useMemo(() => [{ id: '', label: '없음' }, ...taskOrderRefs.map(r => ({ id: r.id, label: r.filename }))], [taskOrderRefs])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      <GNB />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 h-14 border-b border-gray-100 bg-white/90 flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-gray-900">프로그램 제안서 생성</h1>
            <p className="text-xs text-gray-500 mt-0.5">견적 컨텍스트를 기반으로 프로그램 제안만 생성합니다.</p>
          </div>
          {me?.subscription?.planType === 'FREE' && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1">
              무료
            </span>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
            <div className="flex items-start gap-6 flex-wrap">
              <div className="min-w-[240px]">
                <div className="text-sm font-semibold text-gray-900">입력 소스</div>
                <div className="text-xs text-gray-500 mt-1">아래에서 견적 컨텍스트를 선택(또는 업로드)하세요.</div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <label className="text-xs text-slate-500 flex items-center gap-2 opacity-90">
                  <input
                    type="radio"
                    className="h-4 w-4 accent-slate-400"
                    checked={sourceMode === 'existingEstimate'}
                    onChange={() => setSourceMode('existingEstimate')}
                  />
                  기존 견적 선택
                </label>
                <label className="text-xs text-slate-500 flex items-center gap-2 opacity-90">
                  <input
                    type="radio"
                    className="h-4 w-4 accent-slate-400"
                    checked={sourceMode === 'uploadEstimate'}
                    onChange={() => setSourceMode('uploadEstimate')}
                  />
                  견적 문서 업로드
                </label>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {sourceMode === 'existingEstimate' ? (
                <div>
                  <div className="text-xs text-gray-500 font-semibold mb-2">기존 견적 목록</div>
                  {historyList.length === 0 ? (
                    <div className="text-sm text-gray-500 py-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-center">
                      저장된 견적이 없습니다. 먼저 견적 생성 메뉴에서 생성하세요.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {historyList.slice(0, 10).map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelectedEstimateId(r.id)}
                          className="text-left rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{r.eventName || '행사명 없음'}</div>
                              <div className="text-xs text-gray-500 mt-1">{r.clientName} · {r.quoteDate}</div>
                            </div>
                            <div className="text-sm font-semibold tabular-nums text-gray-900 flex-shrink-0">{r.total ? fmtKRW(r.total) : '0'}원</div>
                          </div>
                          {selectedEstimateId === r.id && (
                            <div className="mt-2 text-xs text-primary-700 font-semibold">선택됨</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500 font-semibold">견적 문서 업로드</div>
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.doc,.docx,.txt,.csv,.md"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void handleUploadEstimate(f)
                      e.target.value = ''
                    }}
                  />
                  <div className="text-[11px] text-gray-500">
                    지원: pdf/docx/xlsx/txt/csv/md (추출 가능한 텍스트 기반)
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-2 block">스타일 모드</label>
                  <select value={styleMode} onChange={(e) => setStyleMode(e.target.value as any)} className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100">
                    <option value="userStyle">사용자 학습 스타일</option>
                    <option value="aiTemplate">AI 추천 템플릿 모드</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-2 block">과업지시서 요약(추가 컨텍스트, 선택)</label>
                  <select
                    value={taskOrderBaseId || ''}
                    onChange={(e) => setTaskOrderBaseId(e.target.value || undefined)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                  >
                    {taskOrderOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {doc ? (
            <section className="rounded-2xl border border-gray-100 bg-white shadow-card overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-slate-50/50">
                <div className="text-sm font-semibold text-gray-900">프로그램 제안 결과</div>
                <div className="text-xs text-gray-500 mt-1">생성 후 내용을 편집하세요.</div>
              </div>
              <div className="h-[calc(100vh-220px)] min-h-[420px]">
                <QuoteResult
                  doc={doc}
                  companySettings={companySettings}
                  prices={prices}
                  planType={me?.subscription?.planType ?? 'FREE'}
                  onChange={setDoc}
                  onGenerateTab={(t) => (t === 'program' ? void onGenerateTab(t) : undefined)}
                  generatingTabs={generatingTabs}
                  visibleTabs={['program']}
                  initialTab="program"
                  showTabButtons={false}
                  disableAutoGenerate
                  onExcel={(view) => {
                    exportToExcel(doc, companySettings ?? undefined, view)
                    showToast('Excel 다운로드 완료!')
                  }}
                  onPdf={async () => {
                    if (me?.subscription?.planType === 'FREE') {
                      showToast('PDF 다운로드는 BASIC 플랜부터 이용할 수 있어요.')
                      return
                    }
                    try {
                      await exportToPdf(doc, companySettings ?? undefined)
                      showToast('PDF 저장 완료!')
                    } catch (e) {
                      showToast(toUserMessage(e, '저장 실패'))
                    }
                  }}
                  onLoadPrevious={undefined}
                />
              </div>

              <div className="p-4 border-t border-gray-100 bg-white">
                <div className="text-[11px] text-gray-500">
                  프로그램은 비어 있으면 버튼을 눌러 생성하세요. (이번 요청은 프로그램만 생성됩니다)
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
              <div className="text-sm font-semibold text-gray-900">견적 컨텍스트가 필요합니다</div>
              <div className="text-xs text-gray-500 mt-2">
                기존 견적 선택 또는 견적 문서 업로드로 컨텍스트를 먼저 준비하세요.
              </div>
            </section>
          )}
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}


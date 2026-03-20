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
import type { PlanType } from '@/lib/plans'
import { MAX_UPLOAD_BYTES, formatUploadLimitText } from '@/lib/upload-limits'
import { calcTotals } from '@/lib/calc'

type MeLite = {
  subscription: { planType: PlanType }
  usage: { quoteGeneratedCount: number }
  limits: { monthlyQuoteGenerateLimit: number }
}

type SourceMode = 'fromEstimate' | 'fromTopic'

function makeDummyQuoteDoc(topic: string, eventName: string): QuoteDoc {
  return {
    eventName: eventName || topic || '행사',
    clientName: '',
    clientManager: '',
    clientTel: '',
    quoteDate: new Date().toISOString().slice(0, 10),
    eventDate: '',
    eventDuration: '',
    venue: '',
    headcount: '',
    eventType: '기타',
    quoteItems: [{ category: '기타', items: [{ name: '기본 컨텍스트', spec: '', qty: 1, unit: '식', unitPrice: 0, total: 0, note: '', kind: '필수' }] }],
    expenseRate: 0,
    profitRate: 0,
    cutAmount: 0,
    notes: '',
    paymentTerms: '',
    validDays: 7,
    program: { concept: '', programRows: [], timeline: [], staffing: [], tips: [], cueRows: [], cueSummary: '' },
    scenario: undefined,
    planning: undefined,
    quoteTemplate: 'default',
  }
}

export default function PlanningGeneratorPage() {
  const [me, setMe] = useState<MeLite | null>(null)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [prices, setPrices] = useState<PriceCategory[]>([])

  const [toast, setToast] = useState('')
  const showToast = useCallback((m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 3000)
  }, [])

  const [sourceMode, setSourceMode] = useState<SourceMode>('fromEstimate')

  const [historyList, setHistoryList] = useState<HistoryRecord[]>([])
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null)
  const [doc, setDoc] = useState<QuoteDoc | null>(null)

  const [topic, setTopic] = useState('')
  const [eventName, setEventName] = useState('')

  const [styleMode, setStyleMode] = useState<'userStyle' | 'aiTemplate'>('userStyle')

  const [taskOrderBaseId, setTaskOrderBaseId] = useState<string | undefined>(undefined)
  const [taskOrderRefs, setTaskOrderRefs] = useState<TaskOrderDoc[]>([])

  const [extraRequirements, setExtraRequirements] = useState('')

  const [generating, setGenerating] = useState(false)
  const generatingTabs = useMemo(() => ({ planning: generating }), [generating])

  useEffect(() => {
    apiFetch<MeLite>('/api/me').then(setMe).catch(() => {})
    apiFetch<CompanySettings>('/api/settings').then(setCompanySettings).catch(() => {})
    apiFetch<PriceCategory[]>('/api/prices').then(setPrices).catch(() => setPrices([]))
    apiFetch<HistoryRecord[]>('/api/history').then(d => setHistoryList([...d].reverse())).catch(() => setHistoryList([]))
    apiFetch<TaskOrderDoc[]>('/api/task-order-references').then(setTaskOrderRefs).catch(() => setTaskOrderRefs([]))
  }, [])

  useEffect(() => {
    if (sourceMode !== 'fromEstimate') return
    if (!selectedEstimateId) return
    const rec = historyList.find(r => r.id === selectedEstimateId)
    if (rec?.doc) setDoc(rec.doc as QuoteDoc)
  }, [historyList, selectedEstimateId, sourceMode])

  useEffect(() => {
    if (sourceMode !== 'fromTopic') return
    const safeTopic = topic.trim()
    const safeEventName = eventName.trim()
    if (!safeTopic) return
    setDoc(makeDummyQuoteDoc(safeTopic, safeEventName || safeTopic))
  }, [eventName, sourceMode, topic])

  const requestBaseFromDoc = useCallback((d: QuoteDoc, requirementsText: string) => {
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
      requirements: requirementsText,
      styleMode,
      generationMode: taskOrderBaseId ? 'taskOrderBase' : undefined,
      taskOrderBaseId: taskOrderBaseId,
    }
  }, [styleMode, taskOrderBaseId])

  const handleGeneratePlanning = useCallback(async () => {
    if (!doc) return
    setGenerating(true)
    try {
      const req = (sourceMode === 'fromTopic' ? topic.trim() : extraRequirements.trim()) || (sourceMode === 'fromTopic' ? topic.trim() : '')
      const requirements = [req, extraRequirements.trim()].filter(Boolean).join('\n')
      const body = requestBaseFromDoc(doc, requirements || '')

      const data = await apiFetch<{ doc: QuoteDoc }>(`/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          documentTarget: 'planning',
          existingDoc: doc,
        }),
      })
      setDoc(data.doc)
      showToast('기획 문서 생성 완료!')
    } catch (e) {
      showToast(toUserMessage(e, '기획 문서 생성에 실패했습니다.'))
    } finally {
      setGenerating(false)
    }
  }, [doc, extraRequirements, requestBaseFromDoc, showToast, sourceMode, topic])

  const onGeneratePlanningTab = useCallback(
    (t: 'planning') => {
      if (t === 'planning') return handleGeneratePlanning()
    },
    [handleGeneratePlanning],
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
      showToast('견적 문서 파싱 중...')
      const res = await apiFetch<{ doc: QuoteDoc }>('/api/parse-quote-doc', { method: 'POST', body: fd as any })
      setDoc(res.doc)
      setSelectedEstimateId(null)
      showToast('업로드 문서를 견적 컨텍스트로 변환했습니다.')
    } catch (e) {
      showToast(toUserMessage(e, '업로드/파싱에 실패했습니다.'))
    }
  }

  const taskOrderOptions = useMemo(() => [{ id: '', label: '없음' }, ...taskOrderRefs.map(r => ({ id: r.id, label: r.filename }))], [taskOrderRefs])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      <GNB />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 h-14 border-b border-gray-100 bg-white/90 flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-gray-900">기획 문서 생성</h1>
            <p className="text-xs text-gray-500 mt-0.5">견적/주제 컨텍스트로 기획 문서만 생성합니다.</p>
          </div>
          <span className="text-xs text-gray-500">문서별 독립 생성</span>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
            <div className="flex items-start gap-6 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-gray-900">입력 모드</div>
                <div className="text-xs text-gray-500 mt-1">A. 견적 기반 / B. 주제 기반</div>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <label className="text-xs text-slate-500 flex items-center gap-2 opacity-90">
                  <input
                    type="radio"
                    className="h-4 w-4 accent-slate-400"
                    checked={sourceMode === 'fromEstimate'}
                    onChange={() => setSourceMode('fromEstimate')}
                  />
                  견적에서 생성
                </label>
                <label className="text-xs text-slate-500 flex items-center gap-2 opacity-90">
                  <input
                    type="radio"
                    className="h-4 w-4 accent-slate-400"
                    checked={sourceMode === 'fromTopic'}
                    onChange={() => setSourceMode('fromTopic')}
                  />
                  주제로 생성
                </label>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {sourceMode === 'fromEstimate' ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-gray-500 font-semibold mb-2">기존 견적 선택</div>
                    {historyList.length === 0 ? (
                      <div className="text-sm text-gray-500 py-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-center">
                        저장된 견적이 없습니다.
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
                              <div className="text-sm font-semibold tabular-nums text-gray-900 flex-shrink-0">{fmtNumber(r.total)}원</div>
                            </div>
                            {selectedEstimateId === r.id && (
                              <div className="mt-2 text-xs text-primary-700 font-semibold">선택됨</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 font-semibold">또는 견적 문서 업로드</div>
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
                      파일 크기 {formatUploadLimitText()} 이하
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-semibold mb-2 block">행사명(선택)</label>
                    <input
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      placeholder="예) 기업 워크숍 운영 기획"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-semibold mb-2 block">주제/목표(필수)</label>
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="예) 팀 커뮤니케이션을 위한 기업 워크숍 운영/산출물 계획 작성"
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 resize-none"
                    />
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

              <div>
                <label className="text-xs text-gray-500 font-semibold mb-2 block">추가 요청/제약(선택)</label>
                <textarea
                  value={extraRequirements}
                  onChange={(e) => setExtraRequirements(e.target.value)}
                  placeholder="예) 현장 운영 인력(상주/비상주) 제약, 산출물 포맷, 리스크 최소화 포인트 등"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 resize-none"
                />
              </div>
            </div>
          </section>

          {doc ? (
            <section className="rounded-2xl border border-gray-100 bg-white shadow-card overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-slate-50/50">
                <div className="text-sm font-semibold text-gray-900">기획 문서 결과</div>
                <div className="text-xs text-gray-500 mt-1">아직 생성되지 않았다면 버튼으로 생성하세요. (요청은 `기획 문서`만)</div>
              </div>
              <div className="h-[calc(100vh-240px)] min-h-[420px]">
                <QuoteResult
                  doc={doc}
                  companySettings={companySettings}
                  prices={prices}
                  planType={me?.subscription?.planType ?? 'FREE'}
                  onChange={setDoc}
                  onGenerateTab={(t) => (t === 'planning' ? void onGeneratePlanningTab(t) : undefined)}
                  generatingTabs={generatingTabs}
                  visibleTabs={['planning']}
                  initialTab="planning"
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
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
              <div className="text-sm font-semibold text-gray-900">컨텍스트가 필요합니다</div>
              <div className="text-xs text-gray-500 mt-2">견적 기반/주제 기반 입력을 완료한 뒤 생성하세요.</div>
            </section>
          )}
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}

function fmtNumber(n: number) {
  return Math.round(n || 0).toLocaleString('ko-KR')
}


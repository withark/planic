'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { GNB } from '@/components/GNB'
import QuoteResult from '@/components/quote/QuoteResult'
import { Button, Toast } from '@/components/ui'
import type {
  CompanySettings,
  PriceCategory,
  QuoteDoc,
  ScenarioRefDoc,
  TaskOrderDoc,
} from '@/lib/types'
import { apiFetch } from '@/lib/api/client'
import { toUserMessage } from '@/lib/errors/toUserMessage'
import { exportToExcel } from '@/lib/exportExcel'
import { exportToPdf } from '@/lib/exportPdf'
import { MAX_UPLOAD_BYTES, formatUploadLimitText } from '@/lib/upload-limits'
import type { PlanType } from '@/lib/plans'

type MeLite = {
  subscription: { planType: PlanType }
  usage: { quoteGeneratedCount: number }
  limits: { monthlyQuoteGenerateLimit: number }
}

type GeneratedDocListRow = {
  id: string
  docType: 'estimate' | 'program' | 'timetable' | 'planning' | 'scenario' | 'cuesheet'
  createdAt: string
  total: number
  eventName: string
  clientName: string
  quoteDate: string
  eventDate: string
}

type BaseMode = 'planning' | 'program' | 'scenarioRef'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function makeDummyQuoteDoc({
  eventName,
  quoteDate,
  eventType,
}: {
  eventName: string
  quoteDate: string
  eventType: string
}): QuoteDoc {
  return {
    eventName,
    clientName: '',
    clientManager: '',
    clientTel: '',
    quoteDate,
    eventDate: '',
    eventDuration: '',
    venue: '',
    headcount: '',
    eventType,
    quoteItems: [
      {
        category: '기타',
        items: [
          {
            name: '기본 컨텍스트',
            spec: '',
            qty: 1,
            unit: '식',
            unitPrice: 0,
            total: 0,
            note: '',
            kind: '필수',
          },
        ],
      },
    ],
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

export default function ScenarioGeneratorPage() {
  const [toast, setToast] = useState<string | null>(null)
  const showToast = useCallback((m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const [me, setMe] = useState<MeLite | null>(null)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [prices, setPrices] = useState<PriceCategory[]>([])
  const [taskOrderRefs, setTaskOrderRefs] = useState<TaskOrderDoc[]>([])
  const [scenarioRefs, setScenarioRefs] = useState<ScenarioRefDoc[]>([])

  const [baseMode, setBaseMode] = useState<BaseMode>('scenarioRef')
  const [styleMode, setStyleMode] = useState<'userStyle' | 'aiTemplate'>('userStyle')

  const [taskOrderBaseId, setTaskOrderBaseId] = useState<string | undefined>(undefined)
  const taskOrderOptions = useMemo(
    () => [{ id: '', label: '없음' }, ...taskOrderRefs.map(r => ({ id: r.id, label: r.filename }))],
    [taskOrderRefs],
  )

  // base docs list + selection
  const [baseDocList, setBaseDocList] = useState<GeneratedDocListRow[]>([])
  const [selectedBaseDocId, setSelectedBaseDocId] = useState<string | null>(null)

  // scenarioRef (optional add-on context)
  const [selectedScenarioRefId, setSelectedScenarioRefId] = useState<string | null>(null)

  // dummy base inputs (when baseMode === scenarioRef)
  const [eventName, setEventName] = useState('행사명')
  const [quoteDate, setQuoteDate] = useState(todayStr())
  const [eventType, setEventType] = useState('기타')
  const [extraRequirements, setExtraRequirements] = useState('')

  const [doc, setDoc] = useState<QuoteDoc | null>(null)
  const [generating, setGenerating] = useState(false)
  const generatingTabs = useMemo(() => ({ scenario: generating }), [generating])

  useEffect(() => {
    apiFetch<MeLite>('/api/me').then(setMe).catch(() => {})
    apiFetch<CompanySettings>('/api/settings').then(setCompanySettings).catch(() => {})
    apiFetch<PriceCategory[]>('/api/prices').then(setPrices).catch(() => setPrices([]))
    apiFetch<TaskOrderDoc[]>('/api/task-order-references').then(setTaskOrderRefs).catch(() => setTaskOrderRefs([]))
    apiFetch<ScenarioRefDoc[]>('/api/scenario-references').then(setScenarioRefs).catch(() => setScenarioRefs([]))
  }, [])

  useEffect(() => {
    if (baseMode === 'scenarioRef') {
      setBaseDocList([])
      setSelectedBaseDocId(null)
      return
    }

    const target = baseMode === 'planning' ? 'planning' : 'program'
    apiFetch<GeneratedDocListRow[]>(`/api/generated-docs?docType=${target}&limit=20`)
      .then(setBaseDocList)
      .catch(() => setBaseDocList([]))
  }, [baseMode])

  useEffect(() => {
    if (baseMode === 'scenarioRef') {
      // dummy base doc로 시작 (요청은 scenario만 생성)
      setDoc(makeDummyQuoteDoc({ eventName: eventName.trim() || '행사', quoteDate, eventType }))
      return
    }
    if (!selectedBaseDocId) return
    apiFetch<{ doc: QuoteDoc }>(`/api/generated-docs/${selectedBaseDocId}`)
      .then(res => setDoc(res.doc))
      .catch(() => setDoc(null))
  }, [baseMode, selectedBaseDocId, eventName, quoteDate, eventType])

  const requestBaseFromDoc = useCallback(
    (d: QuoteDoc, requirementsText: string) => {
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
        taskOrderBaseId,
      }
    },
    [styleMode, taskOrderBaseId],
  )

  const handleGenerateScenario = useCallback(async () => {
    if (!doc) return
    if (!doc.eventName?.trim()) {
      showToast('행사명을 확인해 주세요.')
      return
    }
    if (!doc.quoteDate?.trim()) {
      showToast('견적일을 확인해 주세요.')
      return
    }
    setGenerating(true)
    try {
      const requirements = extraRequirements.trim()
      const baseBody = requestBaseFromDoc(doc, requirements)

      const scenarioRefIds = selectedScenarioRefId ? [selectedScenarioRefId] : []

      const data = await apiFetch<{ doc: QuoteDoc }>(`/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...baseBody,
          documentTarget: 'scenario',
          existingDoc: doc,
          scenarioRefIds,
        }),
      })
      setDoc(data.doc)
      showToast('시나리오 생성 완료!')
    } catch (e) {
      showToast(toUserMessage(e, '시나리오 생성에 실패했습니다.'))
    } finally {
      setGenerating(false)
    }
  }, [doc, extraRequirements, requestBaseFromDoc, selectedScenarioRefId, showToast])

  const onGenerateTab = useCallback(
    (t: 'scenario') => {
      if (t === 'scenario') void handleGenerateScenario()
    },
    [handleGenerateScenario],
  )

  async function handleUploadScenarioRef(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      showToast(`파일이 너무 큽니다. ${formatUploadLimitText()} 이하로 업로드해 주세요.`)
      return
    }
    const fd = new FormData()
    fd.append('file', file)
    try {
      showToast('시나리오 샘플 업로드 중...')
      await apiFetch<unknown>('/api/scenario-references', { method: 'POST', body: fd as any })
      const list = await apiFetch<ScenarioRefDoc[]>('/api/scenario-references')
      setScenarioRefs(list)
      showToast('업로드 완료!')
    } catch (e) {
      showToast(toUserMessage(e, '업로드에 실패했습니다.'))
    }
  }

  async function handleUploadBaseDoc(file: File, target: 'planning' | 'program') {
    if (file.size > MAX_UPLOAD_BYTES) {
      showToast(`파일이 너무 큽니다. ${formatUploadLimitText()} 이하로 업로드해 주세요.`)
      return
    }
    const fd = new FormData()
    fd.append('file', file)
    fd.append('target', target)
    try {
      showToast(`${target === 'planning' ? '기획 문서' : '프로그램 제안'} 파싱 중...`)
      const res = await apiFetch<{ doc: QuoteDoc }>('/api/parse-quote-doc', { method: 'POST', body: fd as any })
      setDoc(res.doc)
      setSelectedBaseDocId(null)
      showToast('업로드 컨텍스트 적용 완료!')
    } catch (e) {
      showToast(toUserMessage(e, '업로드/파싱에 실패했습니다.'))
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      <GNB />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 h-14 border-b border-gray-100 bg-white/90 flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Scenario Generator</h1>
            <p className="text-xs text-gray-500 mt-0.5">시나리오 문서만 독립 생성합니다.</p>
          </div>
          <span className="text-xs text-gray-500">문서별 독립 생성</span>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-gray-900">기본 컨텍스트 소스</div>
                <div className="text-xs text-gray-500 mt-1">시나리오 생성의 기반이 되는 문서를 선택하세요.</div>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="text-xs text-gray-600 flex items-center gap-2">
                  <input type="radio" checked={baseMode === 'scenarioRef'} onChange={() => setBaseMode('scenarioRef')} />
                  시나리오 샘플(더미 기반)
                </label>
                <label className="text-xs text-gray-600 flex items-center gap-2">
                  <input type="radio" checked={baseMode === 'planning'} onChange={() => setBaseMode('planning')} />
                  기획 문서 기반
                </label>
                <label className="text-xs text-gray-600 flex items-center gap-2">
                  <input type="radio" checked={baseMode === 'program'} onChange={() => setBaseMode('program')} />
                  프로그램 제안 기반
                </label>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {baseMode === 'scenarioRef' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-500 font-semibold mb-2 block">행사명(기본)</label>
                    <input
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      placeholder="예) 기업 워크숍 운영 기획"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-semibold mb-2 block">견적일</label>
                    <input
                      value={quoteDate}
                      onChange={(e) => setQuoteDate(e.target.value)}
                      type="date"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-semibold mb-2 block">행사 종류</label>
                    <input
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      placeholder="예) 교육/행사/기타"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-gray-500 font-semibold mb-2">
                      {baseMode === 'planning' ? '기획 문서 선택' : '프로그램 제안 선택'}
                    </div>
                    {baseDocList.length === 0 ? (
                      <div className="text-sm text-gray-500 py-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-center">
                        아직 선택 가능한 {baseMode} 문서가 없습니다.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {baseDocList.map(r => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelectedBaseDocId(r.id)}
                            className="text-left rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 truncate">{r.eventName || '행사명 없음'}</div>
                                <div className="text-xs text-gray-500 mt-1">{r.clientName || '미확인'} · {r.quoteDate}</div>
                              </div>
                              <div className="text-sm font-semibold tabular-nums text-gray-900 flex-shrink-0">{fmtKRW(r.total)}</div>
                            </div>
                            {selectedBaseDocId === r.id && <div className="mt-2 text-xs text-primary-700 font-semibold">선택됨</div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 font-semibold">또는 문서 업로드</div>
                    <input
                      type="file"
                      accept=".pdf,.xlsx,.xls,.doc,.docx,.txt,.csv,.md"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) void handleUploadBaseDoc(f, baseMode === 'planning' ? 'planning' : 'program')
                        e.target.value = ''
                      }}
                    />
                    <div className="text-[11px] text-gray-500">파일 크기 {formatUploadLimitText()} 이하</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-2 block">스타일 모드</label>
                  <select
                    value={styleMode}
                    onChange={(e) => setStyleMode(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                  >
                    <option value="userStyle">사용자 학습 스타일</option>
                    <option value="aiTemplate">AI 추천 템플릿 모드</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-2 block">과업지시서 요약(추가 컨텍스트)</label>
                  <select
                    value={taskOrderBaseId || ''}
                    onChange={(e) => setTaskOrderBaseId(e.target.value || undefined)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                  >
                    {taskOrderOptions.map(o => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 font-semibold mb-2">시나리오 샘플(옵션)</div>
                  <div className="text-[11px] text-gray-500">시나리오 말투/구성 포인트를 추가로 반영합니다.</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <select
                      value={selectedScenarioRefId || ''}
                      onChange={(e) => setSelectedScenarioRefId(e.target.value || null)}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                    >
                      <option value="">미선택</option>
                      {scenarioRefs.slice(0, 20).map(r => (
                        <option key={r.id} value={r.id}>
                          {r.filename}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="file"
                      accept=".pdf,.xlsx,.xls,.doc,.docx,.txt,.csv,.md,.ppt,.pptx"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) void handleUploadScenarioRef(f)
                        e.target.value = ''
                      }}
                    />
                    <div className="text-[11px] text-gray-500">파일 크기 {formatUploadLimitText()} 이하</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-semibold mb-2 block">추가 요청/제약(선택)</label>
                <textarea
                  value={extraRequirements}
                  onChange={(e) => setExtraRequirements(e.target.value)}
                  placeholder="예) 분위기(진지/유쾌), 진행 스토리텔링 강조, 운영 리스크 최소화 포인트 등"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100 resize-none"
                />
              </div>
            </div>
          </section>

          {doc ? (
            <section className="rounded-2xl border border-gray-100 bg-white shadow-card overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-slate-50/50">
                <div className="text-sm font-semibold text-gray-900">시나리오 결과</div>
                <div className="text-xs text-gray-500 mt-1">아직 생성되지 않았다면 `Generate Scenario` 버튼으로 생성하세요. (요청은 `시나리오`만)</div>
              </div>
              <div className="h-[calc(100vh-280px)] min-h-[420px]">
                <QuoteResult
                  doc={doc}
                  companySettings={companySettings}
                  prices={prices}
                  planType={me?.subscription?.planType ?? 'FREE'}
                  onChange={setDoc as any}
                  generatingTabs={generatingTabs}
                  visibleTabs={['scenario']}
                  initialTab="scenario"
                  showTabButtons={false}
                  disableAutoGenerate
                  onGenerateTab={(t) => onGenerateTab(t as any)}
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
              <div className="text-xs text-gray-500 mt-2">기본 컨텍스트 소스를 선택한 뒤 생성하세요.</div>
            </section>
          )}
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}

function fmtKRW(n: number) {
  return Math.round(n || 0).toLocaleString('ko-KR') + ''
}


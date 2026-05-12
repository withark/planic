'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GNB } from '@/components/GNB'
import QuoteResult from '@/components/quote/QuoteResult'
import SimpleGeneratorWizard, { type WizardMode } from '@/components/generators/SimpleGeneratorWizard'
import { MacroPasteGate } from '@/components/generators/MacroPasteGate'
import { LoadSavedGeneratedDocModal } from '@/components/generators/LoadSavedGeneratedDocModal'
import GenerationProgressPanel, { appendStageLine } from '@/components/generators/GenerationProgressPanel'
import BriefEnrichSummaryCard, {
  type BriefEnrichSummary,
  parseBriefEnrichSummary,
} from '@/components/generators/BriefEnrichSummaryCard'
import { Input, Textarea, Toast } from '@/components/ui'
import type { CompanySettings, PriceCategory, QuoteDoc } from '@/lib/types'
import type { PlanType } from '@/lib/plans'
import { apiFetch, apiGenerateStream } from '@/lib/api/client'
import { toUserMessage } from '@/lib/errors/toUserMessage'
import { useStreamGenerationGuard } from '@/lib/hooks/useStreamGenerationGuard'
import { warnDevFetchFailure } from '@/lib/log-dev-fetch-failure'
import { exportToExcel } from '@/lib/exportExcel'
import { exportToPdf, pdfKindFromQuoteTab } from '@/lib/exportPdf'
import { buildTopicSeedDoc } from '@/lib/topic-seed-doc'
import { mapPastedTextToTopicGoalFields } from '@/lib/brief-text-parse'
import { isDocumentAllowedForPlan } from '@/lib/plan-access'
import { PlanLockedNotice } from '@/components/plan/PlanLockedNotice'

type MeLite = {
  subscription: { planType: PlanType }
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

type SourceMode = 'fromScenario' | 'fromProgram' | 'fromTopic'

export default function CueSheetGeneratorPage() {
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { isMountedRef, startSession, clearAbortIfCurrent, stillCurrent } = useStreamGenerationGuard()

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
    setToast(null)
  }, [])

  const showToast = useCallback((m: string) => {
    setToast(m)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 3000)
  }, [])

  const [me, setMe] = useState<MeLite | null>(null)
  const [meLoadError, setMeLoadError] = useState<string | null>(null)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [prices, setPrices] = useState<PriceCategory[]>([])

  const refetchMe = useCallback(() => {
    setMeLoadError(null)
    apiFetch<MeLite>('/api/me')
      .then((data) => {
        if (!isMountedRef.current) return
        setMe(data)
        setMeLoadError(null)
      })
      .catch((e) => {
        if (!isMountedRef.current) return
        setMeLoadError(toUserMessage(e, '내 정보를 불러오지 못했습니다.'))
      })
  }, [isMountedRef])

  const [sourceMode, setSourceMode] = useState<SourceMode>('fromTopic')

  const [scenarioList, setScenarioList] = useState<GeneratedDocListRow[]>([])
  const [programList, setProgramList] = useState<GeneratedDocListRow[]>([])

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)

  const [topic, setTopic] = useState('')
  const [goal, setGoal] = useState('')
  const [headcount, setHeadcount] = useState('')
  const [venue, setVenue] = useState('')
  const [notes, setNotes] = useState('')

  const [contextDoc, setContextDoc] = useState<QuoteDoc | null>(null)
  const [doc, setDoc] = useState<QuoteDoc | null>(null)
  const [generatedDocId, setGeneratedDocId] = useState<string | null>(null)

  const [generating, setGenerating] = useState(false)
  const [generationProgressLabel, setGenerationProgressLabel] = useState<string | null>(null)
  const [generationStageLog, setGenerationStageLog] = useState<string[]>([])
  const [briefEnrich, setBriefEnrich] = useState<BriefEnrichSummary | null>(null)
  const [refinementCount, setRefinementCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loadSavedOpen, setLoadSavedOpen] = useState(false)
  const generatingTabs = useMemo(() => ({ program: generating }), [generating])

  const modes: WizardMode[] = useMemo(
    () => [
      { id: 'fromTopic', title: '주제만 입력', desc: '현장 운영 핵심만 넣고 바로 큐시트를 만듭니다.' },
      { id: 'fromScenario', title: '시나리오 기준', desc: '시나리오 흐름을 스태프 실행표로 바꿉니다.' },
      { id: 'fromProgram', title: '프로그램 제안서 기준', desc: '프로그램 구성안을 시간축 운영표로 전환합니다.' },
    ],
    [],
  )

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    },
    [],
  )

  useEffect(() => {
    refetchMe()
    apiFetch<CompanySettings>('/api/settings')
      .then(setCompanySettings)
      .catch((e) => warnDevFetchFailure('GET /api/settings (cue-sheet-generator)', e))
    apiFetch<PriceCategory[]>('/api/prices').then(setPrices).catch(() => setPrices([]))

    apiFetch<GeneratedDocListRow[]>('/api/generated-docs?docType=scenario&limit=20')
      .then(setScenarioList)
      .catch(() => setScenarioList([]))
    apiFetch<GeneratedDocListRow[]>('/api/generated-docs?docType=program&limit=20')
      .then(setProgramList)
      .catch(() => setProgramList([]))
  }, [refetchMe])

  useEffect(() => {
    if (sourceMode !== 'fromScenario') return
    if (!selectedScenarioId) {
      setContextDoc(null)
      return
    }
    apiFetch<{ doc: QuoteDoc }>(`/api/generated-docs/${selectedScenarioId}`)
      .then((res) => setContextDoc(res.doc))
      .catch(() => setContextDoc(null))
  }, [sourceMode, selectedScenarioId])

  useEffect(() => {
    if (sourceMode !== 'fromProgram') return
    if (!selectedProgramId) {
      setContextDoc(null)
      return
    }
    apiFetch<{ doc: QuoteDoc }>(`/api/generated-docs/${selectedProgramId}`)
      .then((res) => setContextDoc(res.doc))
      .catch(() => setContextDoc(null))
  }, [sourceMode, selectedProgramId])

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
    }
  }, [])

  const handleGenerateCueSheet = useCallback(async () => {
    const contextDocForGenerate =
      sourceMode === 'fromTopic'
        ? buildTopicSeedDoc({ topic: topic.trim() || '행사', headcount, venue, goal, notes, documentTarget: 'cuesheet' })
        : contextDoc
    if (!contextDocForGenerate) {
      showToast('생성에 필요한 문서 컨텍스트가 없습니다. 소스를 선택했는지 확인해 주세요.')
      return
    }
    const { session, signal, ac } = startSession()
    setGenerating(true)
    setGenerationStageLog(['입력 확인 중'])
    setGenerationProgressLabel('입력 확인 중')
    setBriefEnrich(null)
    try {
      const promptRequirements = [goal.trim(), notes.trim() ? `추가 메모: ${notes.trim()}` : ''].filter(Boolean).join('\n')
      const requirementsText = sourceMode === 'fromTopic' ? promptRequirements : ''
      const baseBody = requestBaseFromDoc(contextDocForGenerate, requirementsText)
      const data = await apiGenerateStream(
        {
          ...baseBody,
          briefGoal: sourceMode === 'fromTopic' ? goal.trim() : '',
          briefNotes: sourceMode === 'fromTopic' ? notes.trim() : '',
          documentTarget: 'cuesheet',
          existingDoc: contextDocForGenerate,
          cuesheetSampleIds: [],
        },
        {
          signal,
          onStage: ({ stage, label, details }) => {
            if (!stillCurrent(session)) return
            setGenerationProgressLabel(label)
            setGenerationStageLog((prev) => appendStageLine(prev, label))
            if (stage === 'enrich-done') {
              const summary = parseBriefEnrichSummary(details)
              if (summary) setBriefEnrich(summary)
            }
          },
        },
      )
      if (!stillCurrent(session)) return
      setDoc(data.doc)
      setGeneratedDocId(data.id)
      setGenerationProgressLabel(null)
      showToast('큐시트 생성 완료!')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (!stillCurrent(session)) return
      showToast(toUserMessage(e, '큐시트 생성에 실패했습니다.'))
      setGenerationProgressLabel('생성에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      clearAbortIfCurrent(ac)
      if (stillCurrent(session)) {
        setGenerating(false)
        setGenerationProgressLabel(null)
        setGenerationStageLog([])
      }
    }
  }, [contextDoc, requestBaseFromDoc, showToast, sourceMode, topic, goal, notes, headcount, venue, startSession, stillCurrent, clearAbortIfCurrent])

  const handleRefineBrief = useCallback(
    (note: string) => {
      const trimmed = note.trim()
      if (!trimmed) return
      if (generating) return
      setNotes((prev) => {
        const base = (prev || '').trim()
        const refinement = `[보강 메모] ${trimmed}`
        return base ? `${base}\n\n${refinement}` : refinement
      })
      setRefinementCount((n) => n + 1)
      const id = window.setTimeout(() => {
        void handleGenerateCueSheet()
      }, 0)
      return () => window.clearTimeout(id)
    },
    [generating, handleGenerateCueSheet],
  )

  const handleLoadSavedDoc = useCallback(
    ({ doc: nextDoc, id }: { doc: QuoteDoc; id: string }) => {
      setDoc(nextDoc)
      setContextDoc(nextDoc)
      setGeneratedDocId(id)
      setBriefEnrich(nextDoc.briefEnrich ? (nextDoc.briefEnrich as BriefEnrichSummary) : null)
      setRefinementCount(0)
      showToast('과거에 저장한 문서를 불러왔습니다. 내용을 수정한 뒤 저장·다운로드하세요.')
    },
    [showToast],
  )

  const handleSaveDoc = useCallback(
    async (nextDoc: QuoteDoc) => {
      if (!generatedDocId) return
      setSaving(true)
      try {
        const persistedDoc: QuoteDoc = briefEnrich
          ? { ...nextDoc, briefEnrich: briefEnrich as QuoteDoc['briefEnrich'] }
          : nextDoc
        await apiFetch(`/api/generated-docs/${generatedDocId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doc: persistedDoc }),
        })
        showToast('저장이 완료되었습니다.')
      } catch (e) {
        if (!isMountedRef.current) return
        showToast(toUserMessage(e, '저장에 실패했습니다.'))
      } finally {
        if (isMountedRef.current) setSaving(false)
      }
    },
    [generatedDocId, showToast, isMountedRef, briefEnrich],
  )

  const generateDisabled =
    sourceMode === 'fromTopic'
      ? !topic.trim() || !goal.trim()
      : !contextDoc || (sourceMode === 'fromScenario' ? !selectedScenarioId : !selectedProgramId)

  const validationMessage = useMemo(() => {
    if (!generateDisabled) return null
    if (sourceMode === 'fromTopic') {
      if (!topic.trim()) return '이벤트 주제를 입력해 주세요.'
      if (!goal.trim()) return '목표를 입력해 주세요.'
      return null
    }
    const sourceLabel = sourceMode === 'fromScenario' ? '시나리오' : '프로그램 제안서'
    const sourceId = sourceMode === 'fromScenario' ? selectedScenarioId : selectedProgramId
    if (!sourceId) return `${sourceLabel}을(를) 선택해 주세요.`
    if (!contextDoc) return `${sourceLabel} 문서를 불러오는 중이거나 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.`
    return null
  }, [generateDisabled, sourceMode, topic, goal, selectedScenarioId, selectedProgramId, contextDoc])

  const applyPastedBrief = useCallback(
    (text: string) => {
      setSourceMode('fromTopic')
      const m = mapPastedTextToTopicGoalFields(text)
      setTopic(m.topic)
      setGoal(m.goal)
      setNotes(m.notes)
      setHeadcount(m.headcount)
      setVenue(m.venue)
      setDoc(
        buildTopicSeedDoc({
          topic: m.topic,
          headcount: m.headcount,
          venue: m.venue,
          goal: m.goal,
          notes: m.notes,
          documentTarget: 'cuesheet',
        }),
      )
      setGeneratedDocId(null)
      showToast('입력을 반영했어요. 주제·목표를 확인한 뒤 생성해 주세요.')
    },
    [showToast],
  )

  const topicInvalid = sourceMode === 'fromTopic' && generateDisabled && !topic.trim()
  const goalInvalid = sourceMode === 'fromTopic' && generateDisabled && !goal.trim()
  const isCuesheetLocked = !isDocumentAllowedForPlan(me?.subscription?.planType ?? 'FREE', 'cuesheet')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      <GNB />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white/90 px-6 py-5 flex-shrink-0">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">큐시트 생성</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">현장 스태프가 그대로 따라갈 수 있는 시간축 운영표를 만듭니다.</p>
          </div>
          {me?.subscription?.planType === 'FREE' && (
            <span className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">무료</span>
          )}
        </header>

        {meLoadError ? (
          <div
            role="alert"
            className="flex shrink-0 items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-950"
          >
            <p className="min-w-0 leading-snug">
              {meLoadError} — 플랜·사용량 표시가 지연될 수 있어요.
            </p>
            <button
              type="button"
              onClick={() => void refetchMe()}
              className="shrink-0 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
            >
              다시 시도
            </button>
          </div>
        ) : null}

        <div className="flex-1 overflow-hidden p-6">
          {isCuesheetLocked ? (
            <div className="h-full overflow-y-auto">
              <PlanLockedNotice
                title="큐시트는 베이직부터 사용할 수 있어요."
                message="무료 플랜에서는 기본 문서를 먼저 생성할 수 있습니다. 베이직 이상에서 큐시트 생성과 운영 워크플로우를 사용할 수 있습니다."
                ctaLabel="베이직으로 업그레이드"
              />
            </div>
          ) : (
            <div className="grid h-full min-h-0 gap-6 md:grid-cols-[minmax(420px,520px)_minmax(0,1fr)]">
              <section
                className={`min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${generating ? 'max-md:order-last' : ''}`}
              >
                <MacroPasteGate
                  skipStorageKey="planic:skip-paste-gate:cuesheet"
                  title="운영 정보를 한 번에 붙여 넣기"
                  description="타임라인 메모·역할 분담을 통째로 넣어도 됩니다. 다음 단계에서 순서와 목표를 확인하고 큐시트를 생성합니다."
                  placeholder="행사명, 세션 순서, 스태프 역할, 주의할 장비·동선 등 자유 형식으로 입력해 주세요."
                  onApplyPaste={applyPastedBrief}
                  onSkipPaste={() => {}}
                >
                <SimpleGeneratorWizard
            title="큐시트 생성"
            subtitle="시간, 담당자, 준비물, 멘트 큐를 한 번에 정리해 바로 현장 공유가 가능하도록 구성했습니다."
            modes={modes}
            modeId={sourceMode}
            onModeChange={(id) => {
              const next = id as SourceMode
              setSourceMode(next)
              setSelectedScenarioId(null)
              setSelectedProgramId(null)
              setTopic('')
              setGoal('')
              setHeadcount('')
              setVenue('')
              setNotes('')
              setContextDoc(null)
              setDoc(null)
              setGeneratedDocId(null)
            }}
            requiredInput={
              sourceMode === 'fromScenario' ? (
                <select
                  value={selectedScenarioId || ''}
                  onChange={(e) => {
                    setSelectedScenarioId(e.target.value || null)
                    setDoc(null)
                    setGeneratedDocId(null)
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 shadow-sm focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100/70"
                >
                  <option value="" disabled>
                    시나리오를 선택하세요
                  </option>
                  {scenarioList.slice(0, 20).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.eventName || '행사명 없음'} · {r.quoteDate}
                    </option>
                  ))}
                </select>
              ) : sourceMode === 'fromProgram' ? (
                <select
                  value={selectedProgramId || ''}
                  onChange={(e) => {
                    setSelectedProgramId(e.target.value || null)
                    setDoc(null)
                    setGeneratedDocId(null)
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 shadow-sm focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100/70"
                >
                  <option value="" disabled>
                    프로그램 제안을 선택하세요
                  </option>
                  {programList.slice(0, 20).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.eventName || '행사명 없음'} · {r.quoteDate}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-3">
                  <Input
                    label="이벤트 주제"
                    showRequiredMark
                    invalid={topicInvalid}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="예) 기업 워크숍 현장 운영 흐름"
                  />
                  <Textarea
                    label="목표"
                    showRequiredMark
                    invalid={goalInvalid}
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="예) 참가자들이 끝까지 몰입하고 행동까지 이어지게"
                    rows={3}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="참석 인원(선택)"
                      value={headcount}
                      onChange={(e) => setHeadcount(e.target.value)}
                      placeholder="예) 80"
                      inputMode="numeric"
                    />
                    <Input
                      label="장소(선택)"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="예) 잠실"
                    />
                  </div>
                  <Textarea
                    label="추가 메모(선택)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="예) VIP 동선 고려, 세션 구성 등"
                    rows={3}
                  />
                </div>
              )
            }
            generateLabel="큐시트 생성"
            onGenerate={handleGenerateCueSheet}
            generating={generating}
            generationProgressLabel={generationProgressLabel}
            generateDisabled={generateDisabled}
            validationMessage={validationMessage}
                />
                </MacroPasteGate>
              </section>

              {generating ? (
                <div className="flex max-h-full min-h-0 h-full flex-col max-md:order-first md:order-none">
                  <GenerationProgressPanel
                    className="flex-1"
                    title="큐시트 생성 중"
                    lines={generationStageLog}
                    briefEnrich={briefEnrich}
                    onRefineBrief={handleRefineBrief}
                    refiningBrief={generating}
                    active={generating}
                    refinementCount={refinementCount}
                  />
                </div>
              ) : doc && generatedDocId ? (
                <div className="flex min-h-0 h-full flex-col gap-3 overflow-hidden">
                  {briefEnrich ? (
                    <BriefEnrichSummaryCard
                      summary={briefEnrich}
                      active={false}
                      onRefine={handleRefineBrief}
                      refining={generating}
                      refinementCount={refinementCount}
                    />
                  ) : null}
                <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-slate-50/50 p-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">큐시트 결과</div>
                      <div className="mt-1 text-xs text-gray-500">아래에서 cueRows를 편집하세요.</div>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1">
                    <QuoteResult
                  doc={doc}
                  docId={generatedDocId}
                  onSaveDoc={handleSaveDoc}
                  saving={saving}
                  companySettings={companySettings}
                  prices={prices}
                  onChange={setDoc}
                  generatingTabs={generatingTabs}
                  generationProgressLabel={generationProgressLabel}
                  visibleTabs={['program']}
                  initialTab="program"
                  showTabButtons={false}
                  disableAutoGenerate
                  hideOnDemandGenerate
                  showCueSheetEditor
                  onExcel={async (view) => {
                    try {
                      await exportToExcel(doc, companySettings ?? undefined, view)
                      showToast('엑셀 다운로드 완료!')
                    } catch (e) {
                      showToast(toUserMessage(e, '엑셀 다운로드 실패'))
                    }
                  }}
                  onPdf={async ({ tab, showCueSheetEditor }) => {
                    if (me?.subscription?.planType === 'FREE') {
                      showToast('PDF 다운로드는 베이직 플랜부터 이용할 수 있어요.')
                      return
                    }
                    try {
                      await exportToPdf(
                        doc,
                        companySettings ?? undefined,
                        pdfKindFromQuoteTab(tab, { showCueSheetEditor }),
                      )
                      showToast('PDF 저장 완료!')
                    } catch (e) {
                      showToast(toUserMessage(e, '저장 실패'))
                    }
                  }}
                  onLoadPrevious={() => setLoadSavedOpen(true)}
                  loadPreviousLabel="과거 큐시트 불러오기"
                    />
                  </div>
                </section>
                </div>
              ) : (
                <section className="min-h-0 overflow-y-auto rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
                  <div className="text-sm font-semibold text-gray-900">입력 후 생성하세요</div>
                  <div className="mt-2 text-xs text-gray-500">
                    {sourceMode === 'fromTopic' ? '주제와 목표를 입력하면 돼요.' : '소스를 선택해 주세요.'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setLoadSavedOpen(true)}
                    className="mt-4 text-sm font-semibold text-primary-700 underline-offset-2 hover:text-primary-800 hover:underline"
                  >
                    과거 큐시트 불러오기
                  </button>
                  <p className="mt-2 text-xs text-slate-500">
                    예전에 저장한 문서를 불러와 내용만 수정·저장·다운로드할 수 있어요. (이어쓰기는 지원하지 않아요.)
                  </p>
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      <LoadSavedGeneratedDocModal
        open={loadSavedOpen}
        onClose={() => setLoadSavedOpen(false)}
        docType="cuesheet"
        onLoaded={handleLoadSavedDoc}
      />

      {toast && <Toast message={toast} onClose={dismissToast} />}
    </div>
  )
}

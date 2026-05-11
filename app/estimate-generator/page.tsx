'use client'

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'next/navigation'
import { GNB } from '@/components/GNB'
import QuoteResult from '@/components/quote/QuoteResult'
import SimpleGeneratorWizard, { type WizardMode } from '@/components/generators/SimpleGeneratorWizard'
import { MacroPasteGate, type MacroPasteBottomStep } from '@/components/generators/MacroPasteGate'
import { looksLikeVendorQuoteBlock, parseLooseBrief } from '@/lib/brief-text-parse'
import { CalendarPicker, Input, Textarea, Toast } from '@/components/ui'
import type { CompanySettings, HistoryRecord, PriceCategory, QuoteDoc, TaskOrderDoc } from '@/lib/types'
import { apiFetch, apiGenerateStream } from '@/lib/api/client'
import { toUserMessage } from '@/lib/errors/toUserMessage'
import { LoadingState } from '@/components/ui/AsyncState'
import { ESTIMATE_BUDGET_OPTIONS } from '@/lib/estimate-budget-options'
import { EVENT_TYPE_GROUPS } from '@/lib/estimate/event-types'
import { exportToExcel } from '@/lib/exportExcel'
import { exportToPdf } from '@/lib/exportPdf'
import { isPaidPlan, type PlanType } from '@/lib/plans'
import { isFeatureAllowedForPlan } from '@/lib/plan-access'
import { isExcludedSupplyLineItem } from '@/lib/quote/supply-line-filter'
import { calcTotals, normalizeQuoteUnitPricesToThousand } from '@/lib/calc'
import { saveAs } from 'file-saver'
import { generateProposal } from '@/src/lib/generateProposal'

type MeLite = {
  user?: { id?: string | null; email?: string | null } | null
  subscription: { planType: PlanType }
  usage: { quoteGeneratedCount: number; premiumGeneratedCount: number }
  limits: { monthlyQuoteGenerateLimit: number; monthlyPremiumGenerationLimit: number }
}

type SourceMode = 'fromEstimate' | 'fromTaskOrder' | 'fromTopic' | 'fromPrompt'
const DRAFT_STORAGE_KEY = 'planic:estimate-generator:draft:v1'
/** Tailwind `md`(768px) 미만 — `max-md`와 동일한 구간 */
const ESTIMATE_NARROW_MQ = '(max-width: 767px)'

function subscribeEstimateNarrowMq(onChange: () => void) {
  if (typeof window === 'undefined') return () => {}
  const mq = window.matchMedia(ESTIMATE_NARROW_MQ)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function estimateNarrowMatchesSnapshot() {
  return typeof window !== 'undefined' && window.matchMedia(ESTIMATE_NARROW_MQ).matches
}

type TaskOrderSummaryParsed = {
  projectTitle?: string
  orderingOrganization?: string
  oneLineSummary?: string
  purpose?: string
  mainScope?: string
  deliverables?: string
  restrictionsCautions?: string
  requiredStaffing?: string
  eventRange?: string
  timelineDuration?: string
  evaluationSelection?: string
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function formatSavedAtLabel(savedAtIso: string | null): string {
  if (!savedAtIso) return '아직 저장 기록 없음'
  const d = new Date(savedAtIso)
  if (Number.isNaN(d.getTime())) return '방금 저장됨'
  return `마지막 임시저장 ${d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
}

function safeParseJson(v: string) {
  try {
    return JSON.parse(v || '{}') as unknown
  } catch {
    return null
  }
}

function getTaskOrderParsed(t: TaskOrderDoc): TaskOrderSummaryParsed | null {
  const parsed = safeParseJson(t.summary)
  return parsed && typeof parsed === 'object' ? (parsed as TaskOrderSummaryParsed) : null
}

function EstimateGeneratorContent() {
  const proposalLabel = '행사 제안서'
  const searchParams = useSearchParams()
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = useCallback((m: string) => {
    setToast(m)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 3000)
  }, [])

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    },
    [],
  )

  const [me, setMe] = useState<MeLite | null>(null)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [prices, setPrices] = useState<PriceCategory[]>([])

  const [sourceMode, setSourceMode] = useState<SourceMode>('fromTopic')

  const [historyList, setHistoryList] = useState<HistoryRecord[]>([])
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null)
  /** 우측 패널「저장된 견적 불러오기」전용 선택값 */
  const [loadPickerId, setLoadPickerId] = useState<string>('')

  const [taskOrderRefs, setTaskOrderRefs] = useState<TaskOrderDoc[]>([])
  const [selectedTaskOrderId, setSelectedTaskOrderId] = useState<string | null>(null)


  /** 견적서에 들어가는 수신/행사 기본 정보 */
  const [clientName, setClientName] = useState('')
  const [clientManager, setClientManager] = useState('')
  const [clientTel, setClientTel] = useState('')
  const [topic, setTopic] = useState('') // 행사명
  const [eventDate, setEventDate] = useState<Date | null>(null)
  const [eventDuration, setEventDuration] = useState('')
  // (선택) 시작/종료 시간(HH:mm) — UI에서는 현재 필수로 받지 않음
  const [startHHmm, setStartHHmm] = useState('')
  const [endHHmm, setEndHHmm] = useState('')
  const [headcount, setHeadcount] = useState('')
  const [venue, setVenue] = useState('')
  const [notes, setNotes] = useState('') // 추가 요청사항(선택)
  /** 업체 원문만 모드: 들은 내용 전체 */
  const [vendorBrief, setVendorBrief] = useState('')
  const [budget, setBudget] = useState('미정')
  /** 행사 종류 — 단가표 필터·AI 프롬프트에 사용 (InputForm과 동일 옵션) */
  const [eventType, setEventType] = useState('')
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)

  const [doc, setDoc] = useState<QuoteDoc | null>(null)
  const [generatedDocId, setGeneratedDocId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generationProgressLabel, setGenerationProgressLabel] = useState<string | null>(null)
  /** 생성 스트림 단계 로그(우측 채팅형 진행 UI) */
  const [generationStageLog, setGenerationStageLog] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [proposalGenerating, setProposalGenerating] = useState(false)
  const generatingTabs = useMemo(() => ({ estimate: generating }), [generating])
  /** 붙여넣기 전송 또는 건너뛰기 이후 — 하단 state-bar 단계 표시용 */
  const [pasteFlowCommitted, setPasteFlowCommitted] = useState(false)
  /** md 미만: 입력 / 미리보기 전환 — SSR 스냅샷 false, 클라이언트는 matchMedia와 동기(하이드레이션 안전) */
  const isNarrowViewport = useSyncExternalStore(
    subscribeEstimateNarrowMq,
    estimateNarrowMatchesSnapshot,
    () => false,
  )
  const [mobileSheet, setMobileSheet] = useState<'chat' | 'preview'>('chat')
  const [pdfExporting, setPdfExporting] = useState(false)

  const userDraftStorageKey = useMemo(() => {
    const userId = me?.user?.id
    if (!userId) return null
    return `${DRAFT_STORAGE_KEY}:${userId}`
  }, [me?.user?.id])

  const selectedHistory = useMemo(
    () => (selectedEstimateId ? historyList.find((r) => r.id === selectedEstimateId) || null : null),
    [historyList, selectedEstimateId],
  )
  const selectedHistoryDoc = selectedHistory?.doc || null

  const selectedTaskOrder = useMemo(
    () => (selectedTaskOrderId ? taskOrderRefs.find((r) => r.id === selectedTaskOrderId) || null : null),
    [taskOrderRefs, selectedTaskOrderId],
  )
  const selectedTaskOrderParsed = useMemo(
    () => (selectedTaskOrder ? getTaskOrderParsed(selectedTaskOrder) : null),
    [selectedTaskOrder],
  )

  const priceItemCount = useMemo(
    () =>
      prices.reduce(
        (count, category) => count + (Array.isArray(category.items) ? category.items.length : 0),
        0,
      ),
    [prices],
  )

  /** 베이직 이상만 저장형 단가표가 열리며, 이때는 생성 전 단가표에 최소 1품목 필요 */
  const pricingSheetRequired = isFeatureAllowedForPlan(me?.subscription?.planType ?? 'FREE', 'pricingTable')

  const modes: WizardMode[] = useMemo(
    () => [
      {
        id: 'fromTopic',
        title: '주제만 입력',
        desc: pricingSheetRequired
          ? `수신처·행사 정보를 채우면 단가표와 맞춰 ${proposalLabel} 초안을 만듭니다.`
          : `수신처·행사 정보를 채우면 시장 단가를 참고해 ${proposalLabel} 초안을 만듭니다. (저장형 단가표는 베이직부터)`,
      },
      {
        id: 'fromPrompt',
        title: '업체 원문만',
        desc: `들은 내용·메모를 그대로 붙여 넣어 ${proposalLabel} 형식으로 정리합니다.`,
      },
      {
        id: 'fromTaskOrder',
        title: '과업지시서 기준',
        desc: `업로드한 과업지시서 요지를 반영해 ${proposalLabel}을 구성합니다.`,
      },
      {
        id: 'fromEstimate',
        title: '저장된 제안서 기준',
        desc: '이전에 저장한 문서를 불러와 수정·재발행합니다.',
      },
    ],
    [pricingSheetRequired, proposalLabel],
  )
  /** 무료: 주제·업체 원문만 사용 가능 / 유료: 과업지시서·저장 견적 포함 전체 */
  const modesForWizard = useMemo(() => {
    const paid = isPaidPlan(me?.subscription?.planType ?? 'FREE')
    return modes.map((m) => ({
      ...m,
      disabled:
        paid
          ? false
          : m.id === 'fromTaskOrder' || m.id === 'fromEstimate',
    }))
  }, [modes, me?.subscription?.planType])

  useEffect(() => {
    apiFetch<MeLite>('/api/me').then(setMe).catch(() => {})
    apiFetch<CompanySettings>('/api/settings').then(setCompanySettings).catch(() => {})
    apiFetch<PriceCategory[]>('/api/prices').then(setPrices).catch(() => setPrices([]))
  }, [])

  useEffect(() => {
    if (!isNarrowViewport) setMobileSheet('chat')
  }, [isNarrowViewport])

  useEffect(() => {
    apiFetch<HistoryRecord[]>('/api/history')
      .then((list) => {
        const ordered = [...list].reverse().slice(0, 20)
        setHistoryList(ordered)
        setLoadPickerId((prev) => {
          if (prev && ordered.some((r) => r.id === prev)) return prev
          return ordered[0]?.id ?? ''
        })
      })
      .catch(() => setHistoryList([]))
    apiFetch<TaskOrderDoc[]>('/api/task-order-references').then(setTaskOrderRefs).catch(() => setTaskOrderRefs([]))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !userDraftStorageKey) return
    const raw = window.localStorage.getItem(userDraftStorageKey)
    if (!raw) return
    const parsed = safeParseJson(raw)
    if (!parsed || typeof parsed !== 'object') return
    const draft = parsed as Partial<{
      sourceMode: SourceMode
      selectedEstimateId: string | null
      selectedTaskOrderId: string | null
      clientName: string
      clientManager: string
      clientTel: string
      topic: string
      eventDateIso: string
      eventDuration: string
      startHHmm: string
      endHHmm: string
      headcount: string
      venue: string
      notes: string
      vendorBrief: string
      budget: string
      eventType: string
      savedAt: string
    }>

    if (draft.sourceMode) setSourceMode(draft.sourceMode)
    if (typeof draft.selectedEstimateId !== 'undefined') setSelectedEstimateId(draft.selectedEstimateId)
    if (typeof draft.selectedTaskOrderId !== 'undefined') setSelectedTaskOrderId(draft.selectedTaskOrderId)
    if (typeof draft.clientName === 'string') setClientName(draft.clientName)
    if (typeof draft.clientManager === 'string') setClientManager(draft.clientManager)
    if (typeof draft.clientTel === 'string') setClientTel(draft.clientTel)
    if (typeof draft.topic === 'string') setTopic(draft.topic)
    if (typeof draft.eventDateIso === 'string') {
      const m = draft.eventDateIso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (m) {
        const y = Number(m[1])
        const mo = Number(m[2]) - 1
        const d = Number(m[3])
        if (Number.isFinite(y) && Number.isFinite(mo) && Number.isFinite(d)) setEventDate(new Date(y, mo, d))
      }
    }
    if (typeof draft.eventDuration === 'string') setEventDuration(draft.eventDuration)
    if (typeof draft.startHHmm === 'string') setStartHHmm(draft.startHHmm)
    if (typeof draft.endHHmm === 'string') setEndHHmm(draft.endHHmm)
    if (typeof draft.headcount === 'string') setHeadcount(draft.headcount)
    if (typeof draft.venue === 'string') setVenue(draft.venue)
    if (typeof draft.notes === 'string') setNotes(draft.notes)
    if (typeof draft.vendorBrief === 'string') setVendorBrief(draft.vendorBrief)
    if (typeof draft.budget === 'string') setBudget(draft.budget)
    if (typeof draft.eventType === 'string') setEventType(draft.eventType)
    if (typeof draft.savedAt === 'string') setDraftSavedAt(draft.savedAt)

    const hasMeaningful =
      (typeof draft.topic === 'string' && draft.topic.trim().length > 0) ||
      (typeof draft.vendorBrief === 'string' && draft.vendorBrief.trim().length > 0) ||
      (typeof draft.clientName === 'string' && draft.clientName.trim().length > 0) ||
      (typeof draft.eventType === 'string' && draft.eventType.trim().length > 0) ||
      (typeof draft.notes === 'string' && draft.notes.trim().length > 0)
    if (hasMeaningful) setPasteFlowCommitted(true)
  }, [userDraftStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined' || !userDraftStorageKey) return
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString()
      const payload = {
        sourceMode,
        selectedEstimateId,
        selectedTaskOrderId,
        clientName,
        clientManager,
        clientTel,
        topic,
        eventDateIso: eventDate ? `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}` : '',
        eventDuration,
        startHHmm,
        endHHmm,
        headcount,
        venue,
        notes,
        vendorBrief,
        budget,
        eventType,
        savedAt,
      }
      window.localStorage.setItem(userDraftStorageKey, JSON.stringify(payload))
      setDraftSavedAt(savedAt)
    }, 500)
    return () => {
      window.clearTimeout(timer)
    }
  }, [userDraftStorageKey, sourceMode, selectedEstimateId, selectedTaskOrderId, clientName, clientManager, clientTel, topic, eventDate, eventDuration, startHHmm, endHHmm, headcount, venue, notes, vendorBrief, budget, eventType])

  useEffect(() => {
    if (sourceMode !== 'fromEstimate') return
    const et = selectedHistoryDoc?.eventType
    if (typeof et === 'string' && et.trim()) setEventType(et)
  }, [sourceMode, selectedEstimateId, selectedHistoryDoc?.eventType])

  useEffect(() => {
    const q = searchParams.get('estimate')
    if (!q || historyList.length === 0) return
    const found = historyList.some((h) => h.id === q)
    if (!found) return
    setSourceMode('fromEstimate')
    setSelectedEstimateId(q)
    try {
      window.history.replaceState({}, '', '/estimate-generator')
    } catch {
      /* ignore */
    }
  }, [searchParams, historyList])

  useEffect(() => {
    setDoc(null)
    setGeneratedDocId(null)
    if (sourceMode === 'fromEstimate') setSelectedTaskOrderId(null)
    if (sourceMode === 'fromTaskOrder') setSelectedEstimateId(null)
    if (sourceMode === 'fromTopic' || sourceMode === 'fromPrompt') {
      setSelectedEstimateId(null)
      setSelectedTaskOrderId(null)
    }
  }, [sourceMode])

  // 저장 견적(fromEstimate)을 고르면 공통 입력값을 자동으로 채웁니다.
  useEffect(() => {
    if (sourceMode !== 'fromEstimate') return
    if (!selectedHistoryDoc) return
    const d = selectedHistoryDoc
    setClientName(d.clientName || '')
    setClientManager(d.clientManager || '')
    setClientTel(d.clientTel || '')
    setTopic(d.eventName || '')
    setVenue(d.venue || '')
    setHeadcount(d.headcount || '')
    setNotes(d.notes || '')
    setEventDuration(d.eventDuration || '')

    const iso = String(d.eventDate || '').trim()
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) {
      setEventDate(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
    } else {
      const dt = new Date(iso)
      setEventDate(Number.isNaN(dt.getTime()) ? null : dt)
    }
  }, [sourceMode, selectedHistoryDoc])

  // 과업지시서(fromTaskOrder) 선택 시 가능한 범위에서 공통 입력값을 채웁니다.
  useEffect(() => {
    if (sourceMode !== 'fromTaskOrder') return
    if (!selectedTaskOrderParsed) return

    const p = selectedTaskOrderParsed
    const derivedEventName =
      p.projectTitle ||
      p.orderingOrganization ||
      selectedTaskOrder?.filename ||
      '행사'
    const derivedNotes = p.oneLineSummary || p.purpose || p.mainScope || selectedTaskOrder?.summary || ''

    if (!topic.trim()) setTopic(derivedEventName)
    if (!clientName.trim() && p.orderingOrganization) setClientName(p.orderingOrganization)
    if (!venue.trim() && p.eventRange) setVenue(p.eventRange)
    if (!notes.trim() && derivedNotes) setNotes(derivedNotes)

    if (!headcount.trim() && p.requiredStaffing) {
      const raw = p.requiredStaffing
      const range = raw.match(/(\d{1,3}(?:,\d{3})?)\s*명?\s*[~\-–]\s*(\d{1,3}(?:,\d{3})?)\s*명?/)
      if (range) {
        const a = range[1].replace(/,/g, '')
        const b = range[2].replace(/,/g, '')
        setHeadcount(`${a}~${b}`)
      } else {
        const one = raw.match(/(\d{1,3}(?:,\d{3})?)\s*명/)
        if (one) setHeadcount(one[1].replace(/,/g, ''))
      }
    }

    if (!eventDuration.trim() && p.timelineDuration) {
      const h = p.timelineDuration.match(/(\d{1,2})\s*시간/)
      const m = p.timelineDuration.match(/(\d{1,2})\s*분/)
      if (h) {
        setEventDuration(m ? `${h[1]}시간 ${m[1]}분` : `${h[1]}시간`)
      }
    }

    if (!eventDate && p.timelineDuration) {
      const dtm = p.timelineDuration.match(/(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
      if (dtm) setEventDate(new Date(Number(dtm[1]), Number(dtm[2]) - 1, Number(dtm[3])))
    }
  }, [sourceMode, selectedTaskOrderParsed, selectedTaskOrder, topic, clientName, venue, notes, headcount, eventDuration, eventDate])

  useEffect(() => {
    if (!me) return
    const paid = isPaidPlan(me.subscription.planType)
    if (!paid && (sourceMode === 'fromTaskOrder' || sourceMode === 'fromEstimate')) {
      setSourceMode('fromTopic')
    }
  }, [me, sourceMode])

  const requestBodyForEstimate = useCallback(() => {
    const eventDateIso = eventDate
      ? `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(
          2,
          '0',
        )}`
      : ''
    const safeClientName = clientName.trim()
    const safeClientManager = clientManager.trim()
    const safeClientTel = clientTel.trim()
    const safeTopic = topic.trim()
    const safeNotes = notes.trim()
    const safeHeadcount = headcount.trim()
    const safeVenue = venue.trim()
    const safeEventDuration = eventDuration.trim()
    const safeStartHHmm = startHHmm.trim()
    const safeEndHHmm = endHHmm.trim()
    const promptRequirements = safeNotes ? `추가 메모: ${safeNotes}` : ''

    if (sourceMode === 'fromPrompt') {
      const raw = vendorBrief.trim()
      if (!raw) return null
      const et = eventType.trim()
      return {
        eventDate: '',
        eventDuration: '',
        eventStartHHmm: '',
        eventEndHHmm: '',
        headcount: '',
        venue: '',
        budget,
        documentTarget: 'estimate' as const,
        clientName: '',
        clientManager: '',
        clientTel: '',
        requirements:
          '업체 견적·브리핑 원문을 기준으로 행사 제안서를 구성합니다. 원문의 품목·수량·단가·조건을 반영하고, 사용자 단가표와 조합해 합리적인 항목을 만드세요.',
        briefNotes: raw,
        generationMode: 'vendorBrief' as const,
        eventName: topic.trim() || '업체 견적 기반',
        quoteDate: todayStr(),
        eventType: et || '기타',
      }
    }

    const base = {
      eventDate: eventDateIso,
      eventDuration: safeEventDuration,
      eventStartHHmm: safeStartHHmm,
      eventEndHHmm: safeEndHHmm,
      headcount: safeHeadcount,
      venue: safeVenue,
      budget,
      documentTarget: 'estimate' as const,
      clientName: safeClientName,
      clientManager: safeClientManager,
      clientTel: safeClientTel,
      requirements: promptRequirements,
    }

    if (sourceMode === 'fromEstimate') {
      const d = selectedHistoryDoc
      if (!d) return null
      const effectiveNotes = safeNotes || d.notes || ''
      const effectiveRequirements = effectiveNotes ? `추가 메모: ${effectiveNotes}` : ''
      return {
        ...base,
        quoteDate: d.quoteDate,
        eventName: safeTopic || d.eventName,
        eventType: eventType.trim() || d.eventType || '기타',
        clientName: safeClientName || d.clientName || '',
        clientManager: safeClientManager || d.clientManager || '',
        clientTel: safeClientTel || d.clientTel || '',
        headcount: safeHeadcount || d.headcount || '',
        venue: safeVenue || d.venue || '',
        eventDate: eventDateIso || d.eventDate || '',
        eventDuration: safeEventDuration || d.eventDuration || '',
        existingDoc: d,
        requirements: effectiveRequirements,
        briefNotes: effectiveNotes,
      }
    }

    if (sourceMode === 'fromTaskOrder') {
      if (!selectedTaskOrder) return null
      const derivedNotes =
        selectedTaskOrderParsed?.oneLineSummary ||
        selectedTaskOrderParsed?.purpose ||
        selectedTaskOrderParsed?.mainScope ||
        selectedTaskOrder.summary ||
        ''
      const effectiveNotes = safeNotes || derivedNotes
      const effectiveRequirements = effectiveNotes ? `추가 메모: ${effectiveNotes}` : ''
      return {
        ...base,
        eventName:
          safeTopic ||
          selectedTaskOrderParsed?.projectTitle ||
          selectedTaskOrderParsed?.orderingOrganization ||
          selectedTaskOrder.filename ||
          '행사',
        quoteDate: todayStr(),
        eventType: eventType.trim() || '기타',
        clientName: safeClientName || selectedTaskOrderParsed?.orderingOrganization || '',
        requirements: effectiveRequirements,
        briefNotes: effectiveNotes,
        generationMode: 'taskOrderBase' as const,
        taskOrderBaseId: selectedTaskOrder.id,
      }
    }

    return {
      ...base,
      eventName: safeTopic || '행사',
      quoteDate: todayStr(),
      eventType: eventType.trim() || '기타',
      briefNotes: safeNotes,
    }
  }, [
    budget,
    eventType,
    selectedHistoryDoc,
    selectedTaskOrder,
    selectedTaskOrderParsed,
    clientName,
    clientManager,
    clientTel,
    eventDate,
    eventDuration,
    startHHmm,
    endHHmm,
    sourceMode,
    topic,
    headcount,
    venue,
    notes,
    vendorBrief,
  ])

  const handleGenerateEstimate = useCallback(async () => {
    const body = requestBodyForEstimate()
    if (!body) {
      if (sourceMode === 'fromEstimate') {
        showToast('저장된 문서를 불러올 수 없습니다. 목록에서 다시 선택해 주세요.')
      } else if (sourceMode === 'fromTaskOrder') {
        showToast('과업지시서 정보를 불러올 수 없습니다. 다시 선택해 주세요.')
      } else if (sourceMode === 'fromPrompt') {
        showToast('업체에서 들은 내용을 입력해 주세요.')
      } else {
        showToast('필수 입력을 확인해 주세요.')
      }
      return
    }

    setGenerating(true)
    setGenerationStageLog(['요청을 서버로 보내는 중…'])
    setGenerationProgressLabel('입력 확인 중')
    try {
      const data = await apiGenerateStream(body, {
        onStage: ({ label }) => {
          setGenerationProgressLabel(label)
          setGenerationStageLog((prev) => (prev[prev.length - 1] === label ? prev : [...prev, label]))
        },
      })
      setDoc(data.doc)
      setGeneratedDocId(data.id)
      if (typeof window !== 'undefined' && window.matchMedia(ESTIMATE_NARROW_MQ).matches) {
        setMobileSheet('preview')
      }
      if (data.doc.quoteTemplate === 'fixed-v2' && priceItemCount > 0) {
        showToast(
          `단가표 ${priceItemCount}개 품목 기준으로 맞췄고, 없는 항목은 시장가로 채웠습니다. (「단가표」에서 확인)`,
        )
      } else {
        showToast('행사 제안서 생성 완료!')
      }
    } catch (e) {
      showToast(toUserMessage(e, '행사 제안서 생성에 실패했습니다.'))
    } finally {
      setGenerating(false)
      setGenerationProgressLabel(null)
      setGenerationStageLog([])
    }
  }, [requestBodyForEstimate, showToast, sourceMode, priceItemCount])

  const handleSaveDoc = useCallback(
    async (nextDoc: QuoteDoc) => {
      if (!generatedDocId) return
      normalizeQuoteUnitPricesToThousand(nextDoc)
      setSaving(true)
      try {
        await apiFetch(`/api/generated-docs/${generatedDocId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doc: nextDoc }),
        })
        await apiFetch(`/api/quotes/${generatedDocId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doc: nextDoc }),
        })
        const updatedHistory = await apiFetch<HistoryRecord[]>('/api/history')
        setHistoryList([...updatedHistory].reverse().slice(0, 20))
        showToast('저장이 완료되었습니다.')
      } catch (e) {
        showToast(toUserMessage(e, '저장에 실패했습니다.'))
      } finally {
        setSaving(false)
      }
    },
    [generatedDocId, showToast],
  )

  const handleProposalDownload = useCallback(async () => {
    const proposalSource = doc ?? selectedHistoryDoc
    if (!proposalSource) {
      showToast('제안서로 내보낼 문서 정보가 없습니다.')
      return
    }

    setProposalGenerating(true)
    try {
      const requestBody = requestBodyForEstimate()
      const requirementsText =
        sourceMode === 'fromPrompt'
          ? vendorBrief.trim()
          : notes.trim()
      const followUpText = notes.trim()
      const noteText = proposalSource.notes?.trim() || ''

      const blob = await generateProposal({
        clientName: proposalSource.clientName || clientName.trim(),
        contact: proposalSource.clientTel || clientTel.trim(),
        eventName: proposalSource.eventName || topic.trim(),
        eventDate: proposalSource.eventDate || (requestBody?.eventDate ?? ''),
        eventPlace: proposalSource.venue || venue.trim(),
        headcount: proposalSource.headcount || headcount.trim(),
        budget: requestBody?.budget || budget,
        eventType: proposalSource.eventType || eventType.trim(),
        requirements: requirementsText,
        followUp: followUpText,
        notes: noteText,
      })

      const filename = `제안서_${(proposalSource.clientName || clientName || '고객').trim()}_${(proposalSource.eventDate || requestBody?.eventDate || '미정').trim()}.docx`
      saveAs(blob, filename)
      showToast('제안서 다운로드를 시작했습니다.')
    } catch (e) {
      showToast(toUserMessage(e, '제안서 생성에 실패했습니다.'))
    } finally {
      setProposalGenerating(false)
    }
  }, [
    budget,
    clientName,
    clientTel,
    doc,
    eventType,
    headcount,
    notes,
    requestBodyForEstimate,
    selectedHistoryDoc,
    showToast,
    sourceMode,
    topic,
    vendorBrief,
    venue,
  ])

  const handleLoadSavedEstimate = useCallback(() => {
    const id = loadPickerId.trim()
    if (!id) {
      showToast('불러올 문서를 목록에서 선택해 주세요.')
      return
    }
    const rec = historyList.find((r) => r.id === id)
    if (!rec?.doc) {
      showToast('문서를 불러올 수 없습니다. 작업 이력을 확인해 주세요.')
      return
    }
    const next = structuredClone(rec.doc) as QuoteDoc
    normalizeQuoteUnitPricesToThousand(next)
    setDoc(next)
    setGeneratedDocId(rec.id)
    setPasteFlowCommitted(true)
    showToast('저장된 문서를 불러왔습니다. 수신처·항목만 수정한 뒤 저장하거나 보내세요.')
  }, [historyList, loadPickerId, showToast])

  const generateDisabled = useMemo(() => {
    if (pricingSheetRequired && priceItemCount === 0) return true
    if (!eventType.trim()) return true
    if (sourceMode === 'fromPrompt') {
      return vendorBrief.trim().length < 40
    }
    const commonValid =
      clientName.trim() &&
      clientManager.trim() &&
      clientTel.trim() &&
      topic.trim() &&
      !!eventDate &&
      eventDuration.trim() &&
      headcount.trim() &&
      venue.trim()

    if (sourceMode === 'fromEstimate') return !selectedEstimateId || !selectedHistoryDoc || !commonValid
    if (sourceMode === 'fromTaskOrder') return !selectedTaskOrderId || !selectedTaskOrder || !commonValid
    return !commonValid
  }, [
    pricingSheetRequired,
    priceItemCount,
    selectedEstimateId,
    selectedHistoryDoc,
    selectedTaskOrderId,
    selectedTaskOrder,
    sourceMode,
    topic,
    clientName,
    clientManager,
    clientTel,
    eventDate,
    eventDuration,
    headcount,
    venue,
    vendorBrief,
    eventType,
  ])

  /** 목업(ai_quote_saas_mockup) state-bar 단계 — 붙여넣기 여부·생성·미리보기와 연동 */
  const macroPasteBottomSteps = useMemo((): MacroPasteBottomStep[] => {
    if (generating) {
      return [
        { label: '파싱', status: 'done' },
        { label: '구조화', status: 'done' },
        { label: '생성 중', status: 'active' },
        { label: '미리보기', status: 'idle' },
      ]
    }
    if (doc && generatedDocId) {
      return [
        { label: '파싱', status: 'done' },
        { label: '구조화', status: 'done' },
        { label: '검토', status: 'done' },
        { label: '미리보기', status: 'active' },
      ]
    }
    if (!pasteFlowCommitted) {
      return [
        { label: '붙여넣기', status: 'active' },
        { label: '구조화', status: 'idle' },
        { label: '생성', status: 'idle' },
        { label: '미리보기', status: 'idle' },
      ]
    }
    if (generateDisabled) {
      return [
        { label: '파싱', status: 'done' },
        { label: '구조화', status: 'active' },
        { label: '생성', status: 'idle' },
        { label: '미리보기', status: 'idle' },
      ]
    }
    return [
      { label: '파싱', status: 'done' },
      { label: '구조화', status: 'done' },
      { label: '생성', status: 'active' },
      { label: '미리보기', status: 'idle' },
    ]
  }, [generating, doc, generatedDocId, generateDisabled, pasteFlowCommitted])

  const exportEstimatePdf = useCallback(async () => {
    if (!doc || pdfExporting) return
    setPdfExporting(true)
    try {
      await exportToPdf(doc, companySettings ?? undefined)
      showToast('PDF 저장 완료!')
    } catch (e) {
      showToast(toUserMessage(e, '저장 실패'))
    } finally {
      setPdfExporting(false)
    }
  }, [doc, companySettings, showToast, pdfExporting])

  const scrollPreviewPanelTop = useCallback(() => {
    document.getElementById('estimate-preview-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
    if (typeof window !== 'undefined' && window.matchMedia(ESTIMATE_NARROW_MQ).matches) {
      setMobileSheet('preview')
    }
  }, [])

  const focusEstimateTable = useCallback(() => {
    const root = document.getElementById('estimate-result-body')
    root?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => {
      const first =
        root?.querySelector<HTMLTextAreaElement>('tr.group textarea') ??
        root?.querySelector<HTMLTextAreaElement>('textarea')
      first?.focus()
    }, 450)
  }, [])

  const scrollToWizardTop = useCallback(() => {
    document.getElementById('estimate-wizard-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  /** MacroPasteGate 세션 복원 effect가 참조하므로 useCallback으로 고정 */
  const markPasteFlowCommitted = useCallback(() => {
    setPasteFlowCommitted(true)
  }, [])

  const applyPastedBrief = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      const p = parseLooseBrief(trimmed)
      if (looksLikeVendorQuoteBlock(p)) {
        setSourceMode('fromPrompt')
        setVendorBrief(trimmed)
        setTopic((prev) => prev.trim() || (p.supplierHint?.slice(0, 120) ?? '') || '업체 견적 기반')
        setEventType((et) => et.trim() || '기타')
        showToast('업체 원문 모드로 맞췄어요. 행사 종류를 선택한 뒤 생성해 주세요.')
        return
      }
      setSourceMode('fromTopic')
      if (p.supplierHint) setClientName(p.supplierHint)
      if (p.representativeHint) {
        const parts = p.representativeHint.split(/\s+/).filter(Boolean)
        setClientManager(parts[parts.length - 1] || p.representativeHint)
      }
      if (p.phones[0]) setClientTel(p.phones[0])
      const metaBits = [
        p.bizNumbers.length ? `사업자등록번호: ${p.bizNumbers.join(', ')}` : '',
        p.priceLines.length ? `금액 요약:\n${p.priceLines.join('\n')}` : '',
      ].filter(Boolean)
      setNotes(metaBits.length ? `${trimmed}\n\n---\n${metaBits.join('\n')}` : trimmed)
      setTopic((prev) => {
        if (prev.trim()) return prev
        const first = trimmed
          .split(/\r?\n/)
          .map((l) => l.trim())
          .find((l) => l.length > 0)
        if (!first) return prev
        return first.length > 100 ? `${first.slice(0, 97)}…` : first
      })
      showToast('필드를 채웠어요. 일정·인원을 확인한 뒤 생성해 주세요.')
    },
    [showToast],
  )

  const validationMessage = useMemo(() => {
    if (!generateDisabled) return null
    if (pricingSheetRequired && priceItemCount === 0) {
      return '단가표에 항목이 없습니다. 단가표 메뉴에서 항목을 입력하거나 .xlsx를 업로드한 뒤 다시 시도해 주세요.'
    }
    if (!eventType.trim()) return '행사 종류를 선택해 주세요. (체육대회·워크숍·팀빌딩 등)'
    if (sourceMode === 'fromPrompt') {
      return vendorBrief.trim().length < 40
        ? '업체에서 들은 내용을 40자 이상 붙여 넣어 주세요. (메모·견적 요약·대화록 등)'
        : null
    }
    if (sourceMode === 'fromEstimate') {
      if (!selectedEstimateId) return '저장된 문서를 선택해 주세요.'
      if (!selectedHistoryDoc) return '선택한 견적 문서를 불러올 수 없습니다. 다른 항목을 선택해 주세요.'
    }
    if (sourceMode === 'fromTaskOrder') {
      if (!selectedTaskOrderId) return '과업지시서를 선택해 주세요.'
      if (!selectedTaskOrder) return '선택한 과업지시서를 불러오지 못했습니다.'
    }
    if (!clientName.trim()) return '업체명을 입력해 주세요.'
    if (!clientManager.trim()) return '담당자를 입력해 주세요.'
    if (!clientTel.trim()) return '연락처를 입력해 주세요.'
    if (!topic.trim()) return '행사명을 입력해 주세요.'
    if (!eventDate) return '행사 날짜를 입력해 주세요.'
    if (!eventDuration.trim()) return '행사 시간(소요/구간)을 입력해 주세요.'
    if (!venue.trim()) return '행사장소를 입력해 주세요.'
    if (!headcount.trim()) return '인원을 입력해 주세요.'
    return null
  }, [
    generateDisabled,
    pricingSheetRequired,
    priceItemCount,
    sourceMode,
    topic,
    selectedTaskOrderId,
    selectedTaskOrder,
    selectedEstimateId,
    selectedHistoryDoc,
    clientName,
    clientManager,
    clientTel,
    eventDate,
    eventDuration,
    venue,
    headcount,
    vendorBrief,
    eventType,
  ])

  const docSummary = useMemo(() => {
    if (!doc) return null
    const lineCount = doc.quoteItems.reduce(
      (count, category) =>
        count + (category.items?.filter((item) => !isExcludedSupplyLineItem(item)).length ?? 0),
      0,
    )
    const optionalCount = doc.quoteItems.reduce(
      (count, category) =>
        count +
        (category.items?.filter((item) => {
          const kind = item.kind || category.category
          return kind === '선택1' || kind === '선택2'
        }).length ?? 0),
      0,
    )
    return { lineCount, optionalCount }
  }, [doc])

  const promptOnlyInputs = (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 space-y-3">
        <p className="text-xs leading-relaxed text-slate-600">
          업체·행사사 등에서 들은 내용을 그대로 붙여 넣으면, 단가표를 반영해 행사 제안서 형식으로 정리합니다. 행사명·수신처·일정은
          원문에서 찾거나 AI가 채웁니다.
        </p>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-800">
            행사 종류<span className="text-red-500">*</span>
          </label>
          <p className="mb-1.5 text-xs text-slate-500">
            체육대회·워크숍·팀빌딩 등에 맞게 단가표에서 가져올 카테고리와 AI가 넣을 품목이 달라집니다.
          </p>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 shadow-sm focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100/70"
          >
            <option value="">선택하세요</option>
            {EVENT_TYPE_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <Textarea
          label="업체에서 들은 내용"
          showRequiredMark
          required
          value={vendorBrief}
          onChange={(e) => setVendorBrief(e.target.value)}
          placeholder="예) ○○업체 담당 ○○○ / 4/12 잠실 ○○홀 / 인원 200명 전후 / MC 180만, 음향 350만, 현수막 2개 각 15만… (메모·카톡·이메일 그대로)"
          rows={12}
        />
        <Input
          label="행사명(선택)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="비워 두면 원문·문서 제목에서 추정합니다"
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-800">예산 범위</label>
          <select
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 shadow-sm focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100/70"
          >
            {ESTIMATE_BUDGET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )

  const topicInputs = (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 space-y-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-800">
            행사 종류<span className="text-red-500">*</span>
          </label>
          <p className="mb-1.5 text-xs text-slate-500">
            업로드한 단가표에서 이 유형에 맞는 카테고리만 펼치고, AI도 이 유형에 맞는 항목을 우선합니다.
          </p>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 shadow-sm focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100/70"
          >
            <option value="">선택하세요</option>
            {EVENT_TYPE_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <Input
          label="업체명"
          showRequiredMark
          required
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="예) ㈜OOO"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="담당자"
            showRequiredMark
            required
            value={clientManager}
            onChange={(e) => setClientManager(e.target.value)}
            placeholder="예) 김OO"
          />
          <Input
            label="연락처"
            showRequiredMark
            required
            value={clientTel}
            onChange={(e) => setClientTel(e.target.value)}
            placeholder="예) 010-1234-5678"
          />
        </div>
        <Input
          label="행사명"
          showRequiredMark
          required
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="예) 2026 상반기 임직원 워크숍"
        />
        <Input
          label="행사장소"
          showRequiredMark
          required
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder="예) 잠실 롯데호텔"
        />
        <div className="space-y-3">
          <CalendarPicker
            label="행사 날짜"
            value={eventDate}
            onChange={setEventDate}
            placeholder="날짜 선택"
          />
          <Input
            label="행사 시간"
            showRequiredMark
            required
            value={eventDuration}
            onChange={(e) => setEventDuration(e.target.value)}
            placeholder="예) 10:00~12:00 / 2시간"
          />
        </div>
        <Input
          label="인원"
          showRequiredMark
          required
          value={headcount}
          onChange={(e) => setHeadcount(e.target.value)}
          placeholder="예) 80"
          inputMode="numeric"
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-800">예산 범위</label>
          <p className="mb-1.5 text-xs text-slate-500">AI가 총액·항목 구성을 맞출 때 참고합니다.</p>
          <select
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 shadow-sm focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100/70"
          >
            {ESTIMATE_BUDGET_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <Textarea
          label="추가 요청사항(선택)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="필요할 때만 적어 주세요. 예) CEO 인사말, VIP 동선, 특수 장비 등"
          rows={4}
        />
      </div>
    </div>
  )

  const totalsForHeader = useMemo(() => {
    if (!doc) return null
    return calcTotals(doc)
  }, [doc])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      <GNB />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex flex-shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 sm:px-5">
          <h1 className="text-sm font-semibold text-slate-900">행사 제안서 생성</h1>
          <p className="hidden text-[11px] text-slate-500 sm:block">
            타임테이블 등 세부 문서는 생성 완료 후 같은 행사 정보로 이어서 만들 수 있어요.
          </p>
        </header>

        {/* md부터 좌 340px 고정 — lg(1024)만 쓰면 창이 좁을 때 좌열이 전체 너비로 보임 */}
        {/* md 미만: 한 화면에 입력 또는 미리보기 */}
        {isNarrowViewport ? (
          <div
            className="flex shrink-0 gap-1 border-b border-slate-200 bg-white px-2 py-1.5 md:hidden"
            role="tablist"
            aria-label="입력과 미리보기 전환"
          >
            <button
              type="button"
              role="tab"
              id="estimate-tab-chat"
              aria-controls="estimate-panel-chat"
              aria-selected={mobileSheet === 'chat'}
              onClick={() => setMobileSheet('chat')}
              className={`min-h-9 flex-1 rounded-lg px-2 text-xs font-semibold ${
                mobileSheet === 'chat' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              입력·채팅
            </button>
            <button
              type="button"
              role="tab"
              id="estimate-tab-preview"
              aria-controls="estimate-panel-preview"
              aria-selected={mobileSheet === 'preview'}
              onClick={() => setMobileSheet('preview')}
              className={`min-h-9 flex-1 rounded-lg px-2 text-xs font-semibold ${
                mobileSheet === 'preview' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              미리보기
            </button>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div
            id="estimate-panel-chat"
            role={isNarrowViewport ? 'tabpanel' : undefined}
            aria-labelledby={isNarrowViewport ? 'estimate-tab-chat' : undefined}
            hidden={isNarrowViewport && mobileSheet !== 'chat'}
            className="flex min-h-0 w-full flex-col overflow-hidden border-slate-200 md:w-[340px] md:min-w-[340px] md:max-w-[340px] md:flex-none md:border-r md:bg-white"
          >
            <div id="estimate-wizard-top" className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {me ? (
                <div className="flex-shrink-0 border-b border-slate-100 bg-white px-3 py-2 text-[11px] text-slate-500 tabular-nums">
                  {me.subscription.planType}
                  {' · '}
                  {me.usage.quoteGeneratedCount}/{me.limits.monthlyQuoteGenerateLimit}
                  {me.subscription.planType === 'PREMIUM'
                    ? ` · 프리미엄 ${me.usage.premiumGeneratedCount}/${me.limits.monthlyPremiumGenerationLimit}`
                    : ''}
                </div>
              ) : null}
              <section className="flex min-h-0 min-w-0 flex-1 flex-col">
              <MacroPasteGate
                skipStorageKey="planic:skip-paste-gate:estimate"
                layout="chat"
                chatPanelStyle="split"
                quickChipLabels={['VAT 포함으로', '만원 단위', '행사일 미정']}
                bottomSteps={macroPasteBottomSteps}
                onFollowUpSend={(text) => {
                  const t = text.trim()
                  if (!t) return
                  if (sourceMode === 'fromPrompt') {
                    setVendorBrief((v) => (v.trim() ? `${v.trim()}\n${t}` : t))
                    showToast('업체 원문에 이어 붙였어요. 표에 반영하려면 다시 생성해 주세요.')
                  } else {
                    setNotes((n) => (n.trim() ? `${n.trim()}\n${t}` : t))
                    showToast('추가 요청을 메모에 넣었어요. 표에 반영하려면 왼쪽에서 다시 생성해 주세요.')
                  }
                }}
                followUpAssistantReply={
                  sourceMode === 'fromPrompt'
                    ? '업체 원문에 이어 붙였어요. 표를 바꾸려면 「행사 제안서 생성하기」로 다시 생성해야 해요.'
                    : '메모에 반영했어요. AI가 표를 바꾸려면 왼쪽의 「행사 제안서 생성하기」로 다시 생성해야 해요.'
                }
                title="행사 제안서"
                description="카톡처럼 말하면 초안이 만들어져요."
                chatWelcome={`안녕하세요! 행사·견적 내용을 자유롭게 말씀해 주세요.

공급자·일정·인원·금액을 넣어 주시면 오른쪽에서 제안서 초안을 만들 수 있어요.`}
                placeholder={`예)\n공급자 : (주)OOO 대표이사 홍길동\n사업자번호 : 000-00-00000\n연락처 : 010-0000-0000\n사회자 1명 330만원 · VAT 별도\n붐어 MC 4명 …`}
                onApplyPaste={applyPastedBrief}
                onWizardEntered={markPasteFlowCommitted}
              >
              <SimpleGeneratorWizard
            title="행사 제안서 생성하기"
            step1Label="생성 방식"
            showHeaderEyebrow={false}
            preStepContent={null}
            modes={modesForWizard}
            modeId={sourceMode}
            onBlockedModeClick={() => showToast('베이직 이상 플랜에서 사용할 수 있어요.')}
            onModeChange={(id) => {
              const next = id as SourceMode
              setSourceMode(next)
              setClientName('')
              setClientManager('')
              setClientTel('')
              setTopic('')
              setEventDate(null)
              setEventDuration('')
              setStartHHmm('')
              setEndHHmm('')
              setHeadcount('')
              setVenue('')
              setNotes('')
              setVendorBrief('')
              setBudget('미정')
              setEventType('')
            }}
            requiredInput={
              sourceMode === 'fromEstimate' ? (
                <>
                  <select
                    value={selectedEstimateId || ''}
                    onChange={(e) => {
                      setSelectedEstimateId(e.target.value || null)
                      setDoc(null)
                      setGeneratedDocId(null)
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 shadow-sm focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100/70"
                  >
                    <option value="" disabled>
                      저장된 문서를 선택하세요
                    </option>
                    {historyList.slice(0, 20).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.eventName || '행사'} · {r.quoteDate}
                      </option>
                    ))}
                  </select>
                  <div className="mt-3">{topicInputs}</div>
                </>
              ) : sourceMode === 'fromTaskOrder' ? (
                <>
                  <select
                    value={selectedTaskOrderId || ''}
                    onChange={(e) => {
                      setSelectedTaskOrderId(e.target.value || null)
                      setDoc(null)
                      setGeneratedDocId(null)
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 shadow-sm focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100/70"
                  >
                    <option value="" disabled>
                      과업지시서를 선택하세요
                    </option>
                    {taskOrderRefs.slice(0, 20).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.filename || '문서'}
                      </option>
                    ))}
                  </select>
                  <div className="mt-3">{topicInputs}</div>
                </>
              ) : sourceMode === 'fromPrompt' ? (
                promptOnlyInputs
              ) : (
                topicInputs
              )
            }
            generateLabel="행사 제안서 생성하기"
            onGenerate={handleGenerateEstimate}
            generating={generating}
            generationProgressLabel={generationProgressLabel}
            generateDisabled={generateDisabled}
            validationMessage={validationMessage}
            showValidationBanner
            step2ActionLabel="행사 제안서 생성으로 이동"
              />
              </MacroPasteGate>
            </section>
            </div>
          </div>

          <div
            id="estimate-panel-preview"
            role={isNarrowViewport ? 'tabpanel' : undefined}
            aria-labelledby={isNarrowViewport ? 'estimate-tab-preview' : undefined}
            hidden={isNarrowViewport && mobileSheet !== 'preview'}
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50"
          >
              <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
              <h2 className="min-w-0 flex-1 text-[13px] font-medium text-slate-900">행사 제안서 미리보기</h2>
              {doc && generatedDocId ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium text-emerald-800">
                  확인됨
                </span>
              ) : generating ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-medium text-amber-900">
                  생성 중…
                </span>
              ) : (
                <span className="rounded-full border border-amber-200 bg-[#fef9c3] px-2 py-0.5 text-[10.5px] font-medium text-[#854d0e]">
                  초안
                </span>
              )}
              <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-testid="estimate-preview-scroll-top"
                  onClick={() => scrollPreviewPanelTop()}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  미리보기로
                </button>
                <button
                  type="button"
                  data-testid="estimate-focus-table"
                  disabled={!(doc && generatedDocId)}
                  title={doc && generatedDocId ? '표 편집으로 이동' : '문서를 만든 뒤 사용할 수 있어요'}
                  onClick={() => focusEstimateTable()}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  직접 편집
                </button>
                {doc && generatedDocId ? (
                  <button
                    type="button"
                    data-testid="estimate-header-pdf"
                    disabled={pdfExporting}
                    onClick={() => void exportEstimatePdf()}
                    className="rounded-md border border-primary-600 bg-primary-600 px-2.5 py-1 text-[11.5px] font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    {pdfExporting ? 'PDF…' : 'PDF'}
                  </button>
                ) : null}
              </div>
            </div>
            <div id="estimate-preview-scroll" className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
              {doc && generatedDocId ? (
                <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                  {totalsForHeader && docSummary ? (
                    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-slate-100 bg-white/95 px-3 py-2.5 backdrop-blur sm:px-4">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-500">총액(VAT포함)</p>
                        <p className="text-lg font-bold tabular-nums text-slate-900 sm:text-xl">
                          {totalsForHeader.grand.toLocaleString('ko-KR')}원
                        </p>
                      </div>
                      <div className="text-xs text-slate-600 sm:border-l sm:border-slate-200 sm:pl-3">
                        <span className="font-medium text-slate-700">{doc.headcount || '—'}명</span>
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span>{doc.eventDate || '행사일 미정'}</span>
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span>
                          품목 {docSummary.lineCount}개
                        </span>
                      </div>
                      <div className="ml-auto flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleProposalDownload()}
                          disabled={proposalGenerating}
                          className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60 sm:text-sm"
                        >
                          {proposalGenerating ? '생성 중...' : '행사 제안서 생성'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSaveDoc(doc)}
                          disabled={saving}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 sm:text-sm"
                        >
                          {saving ? '저장 중...' : '저장'}
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollToWizardTop()}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm"
                        >
                          입력으로
                        </button>
                        <span className="hidden text-[11px] text-slate-400 xl:inline">{formatSavedAtLabel(draftSavedAt)}</span>
                      </div>
                    </div>
                  ) : null}
                  <div id="estimate-result-body" className="min-w-0">
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
                      visibleTabs={['estimate']}
                      initialTab="estimate"
                      showTabButtons={false}
                      disableAutoGenerate
                      hideOnDemandGenerate
                      disableInternalScroll
                      estimateToolbar="exportOnly"
                      estimateSingleTabLayout="compact"
                      estimateDisplayName={proposalLabel}
                      onExcel={async (view) => {
                        try {
                          await exportToExcel(doc, companySettings ?? undefined, view)
                          showToast('엑셀 다운로드 완료!')
                        } catch (e) {
                          showToast(toUserMessage(e, '엑셀 다운로드 실패'))
                        }
                      }}
                      onPdf={async () => {
                        await exportEstimatePdf()
                      }}
                    />
                  </div>
                </div>
              ) : generating ? (
                <div className="rounded-xl border border-primary-200 bg-primary-50/30 p-3 shadow-sm">
                  <div className="flex items-center gap-2 text-[12px] text-slate-800">
                    <span
                      className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600"
                      aria-hidden
                    />
                    <span className="font-medium">
                      {generationProgressLabel ?? 'AI가 행사 제안서를 구성하고 있습니다…'}
                    </span>
                  </div>
                  {generationStageLog.length > 0 ? (
                    <details className="mt-2 group">
                      <summary className="cursor-pointer text-[11px] font-medium text-slate-600 hover:text-slate-900">
                        단계 로그 펼치기
                      </summary>
                      <ol className="mt-2 max-h-48 list-decimal space-y-1 overflow-y-auto pl-5 text-[11px] text-slate-600">
                        {generationStageLog.map((line, i) => (
                          <li key={`${i}-${line}`}>{line}</li>
                        ))}
                      </ol>
                    </details>
                  ) : (
                    <p className="mt-2 text-[11px] text-slate-500">단계 로그가 곧 여기에 쌓입니다.</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-3">
                    <div className="flex flex-1 flex-col justify-center gap-3">
                      <div className="bubble-tip relative rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50/90 to-white px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm">
                        <span className="absolute -left-1 top-4 h-3 w-3 rotate-45 border-l border-b border-primary-100 bg-primary-50/90" aria-hidden />
                        왼쪽에서{' '}
                        <strong className="text-primary-800">
                          {sourceMode === 'fromPrompt' ? '업체 원문·예산' : '주제·예산'}
                        </strong>
                        을 입력한 뒤 생성하면, 단가표를 반영한 행사 제안서 초안이 여기에 표시됩니다.
                      </div>
                      <div className="bubble-tip relative ml-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm">
                        <span className="absolute -left-1 top-4 h-3 w-3 rotate-45 border-l border-b border-slate-200 bg-white" aria-hidden />
                        이미 만든 문서는 아래에서 불러와 <strong>수신처·금액</strong>만 손보고 저장·엑셀·PDF로 보낼 수 있어요.
                      </div>
                      <div className="bubble-tip relative rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm">
                        <span className="absolute -left-1 top-4 h-3 w-3 rotate-45 border-l border-b border-emerald-100 bg-emerald-50/50" aria-hidden />
                        표는 넓게 편집할 수 있도록 이 화면에 맞춰 두었습니다. 엑셀·PDF는 결과 상단 버튼을 사용하세요.
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold text-slate-700">저장된 문서 불러오기</p>
                      <p className="mt-1 text-xs text-slate-500">작업 이력에 있는 문서를 그대로 열어 수정합니다. 전체 목록은 작업 이력에서 확인하세요.</p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
                        <select
                          value={loadPickerId}
                          onChange={(e) => setLoadPickerId(e.target.value)}
                          disabled={historyList.length === 0}
                          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:opacity-50"
                        >
                          {historyList.length === 0 ? (
                            <option value="">저장된 문서가 없습니다</option>
                          ) : (
                            historyList.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.eventName || '행사'} · {r.quoteDate}
                                {r.total ? ` · ${Number(r.total).toLocaleString('ko-KR')}원` : ''}
                              </option>
                            ))
                          )}
                        </select>
                        <button
                          type="button"
                          onClick={() => void handleLoadSavedEstimate()}
                          disabled={historyList.length === 0 || !loadPickerId}
                          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          불러와서 편집
                        </button>
                      </div>
                      <div className="mt-3 text-center">
                        <Link
                          href="/history"
                          className="text-xs font-semibold text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-900"
                        >
                          작업 이력에서 전체 목록 보기
                        </Link>
                      </div>
                    </div>
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}

export default function EstimateGeneratorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen overflow-hidden bg-gray-50/50">
          <GNB />
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
              <LoadingState label="로딩 중…" />
            </div>
          </div>
        </div>
      }
    >
      <EstimateGeneratorContent />
    </Suspense>
  )
}

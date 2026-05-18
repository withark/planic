'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GNB } from '@/components/GNB'
import { QuoteResult } from '@/components/quote/QuoteResult'
import { apiGenerateStream, apiFetch } from '@/lib/api/client'
import { toUserMessage } from '@/lib/errors/toUserMessage'
import { exportToExcel } from '@/lib/exportExcel'
import { exportToPdf } from '@/lib/exportPdf'
import { exportProgramProposalDocxFromDoc } from '@/lib/export/exportDocxFromQuoteDoc'
import { normalizeQuoteUnitPricesToThousand } from '@/lib/calc'
import { isExcludedSupplyLineItem } from '@/lib/quote/supply-line-filter'
import type { CompanySettings, PriceCategory, QuoteDoc } from '@/lib/types'
import type { ChatIntentParams, ChatIntentResult } from '@/app/api/chat-intent/route'
import clsx from 'clsx'

// ─── Types ───────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  stage?: string
  isGenerating?: boolean
  isError?: boolean
}

type MeLite = {
  user?: { id?: string | null } | null
  subscription: { planType: string }
  usage: { quoteGeneratedCount: number }
  limits: { monthlyQuoteGenerateLimit: number }
}

function uid() {
  return Math.random().toString(36).slice(2)
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const STAGE_LABELS: Record<string, string> = {
  enrich: '브리프 분석 중...',
  'enrich-done': '분석 완료',
  draft: '초안 작성 중...',
  'draft-done': '초안 완성',
  refine: '문서 다듬는 중...',
  'refine-done': '정제 완료',
  repair: '검수 중...',
  done: '완성',
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyPreview() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-6 select-none">
      <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-violet-400" aria-hidden>
          <path d="M9 12h6M9 16h4M7 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-4-4H7Z"
            stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M15 4v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <p className="text-slate-700 font-medium text-[15px]">문서가 여기에 표시됩니다</p>
        <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">
          왼쪽 채팅창에 행사 내용을 입력하면<br />제안서, 견적서, 큐시트 등을 바로 만들어 드려요
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {[
          '삼성전자 임직원 체육대회 300명 올림픽공원 10월',
          '스타트업 데모데이 100명 강남 컨퍼런스홀',
          '고등학교 졸업식 500명 학교 강당 2월',
        ].map((ex) => (
          <div key={ex} className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 text-left">
            &ldquo;{ex}&rdquo;
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Generating Dots ──────────────────────────────────────────────────────────

function GeneratingDots({ stage }: { stage?: string }) {
  const label = stage ? (STAGE_LABELS[stage] ?? stage) : '생성 중...'
  return (
    <div className="flex items-center gap-2 text-slate-500 text-sm">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      <span>{label}</span>
    </div>
  )
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={clsx('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" aria-hidden>
            <path d="M12 3C7 3 4 7 4 11c0 2.5 1.2 4.7 3 6v3l3-1.5c.6.1 1.3.2 2 .2 5 0 9-3.6 9-8S17 3 12 3Z"
              fill="currentColor" />
          </svg>
        </div>
      )}
      <div
        className={clsx(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-violet-600 text-white rounded-tr-sm'
            : msg.isError
              ? 'bg-red-50 text-red-700 border border-red-200 rounded-tl-sm'
              : 'bg-white text-slate-800 border border-slate-100 shadow-sm rounded-tl-sm',
        )}
      >
        {msg.isGenerating
          ? <GeneratingDots stage={msg.stage} />
          : <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
        }
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-slate-500" aria-hidden>
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  )
}

// ─── Chat Input ───────────────────────────────────────────────────────────────

function ChatInput({
  onSend,
  disabled,
  placeholder,
}: {
  onSend: (text: string) => void
  disabled: boolean
  placeholder?: string
}) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  const send = () => {
    const t = text.trim()
    if (!t || disabled) return
    onSend(t)
    setText('')
    if (ref.current) ref.current.style.height = 'auto'
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  return (
    <div className="border-t border-slate-100 bg-white px-4 py-3">
      <div className="flex gap-3 items-end bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200 focus-within:border-violet-300 focus-within:bg-white transition-colors">
        <textarea
          ref={ref}
          value={text}
          onChange={onInput}
          onKeyDown={onKey}
          disabled={disabled}
          placeholder={placeholder ?? '행사 내용을 자유롭게 입력하세요...'}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none leading-relaxed"
          style={{ maxHeight: 160 }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || disabled}
          aria-label="전송"
          className="shrink-0 w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center text-white disabled:opacity-40 hover:bg-violet-700 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden>
            <path d="M12 20V4M5 11l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <p className="text-[11px] text-slate-400 mt-2 text-center">Enter 전송 · Shift+Enter 줄바꿈</p>
    </div>
  )
}

// ─── Download Bar ─────────────────────────────────────────────────────────────

function DownloadBar({
  doc,
  companySettings,
  onSave,
  saving,
}: {
  doc: QuoteDoc
  companySettings?: CompanySettings | null
  onSave?: () => void
  saving?: boolean
}) {
  const [busy, setBusy] = useState<string | null>(null)

  const run = (key: string, fn: () => Promise<void>) => async () => {
    setBusy(key)
    try { await fn() } finally { setBusy(null) }
  }

  const handleWord = run('word', async () => {
    const cloned: QuoteDoc = JSON.parse(JSON.stringify(doc))
    normalizeQuoteUnitPricesToThousand(cloned)
    cloned.quoteItems = cloned.quoteItems.map(cat => ({
      ...cat,
      items: cat.items.filter(it => !isExcludedSupplyLineItem(it)),
    }))
    await exportProgramProposalDocxFromDoc(cloned, { company: companySettings ?? undefined })
  })

  return (
    <div className="border-t border-slate-100 px-4 py-3 flex items-center gap-2 bg-white shrink-0">
      <button onClick={run('xl', () => exportToExcel(doc, companySettings ?? undefined))}
        disabled={!!busy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50">
        {busy === 'xl' ? '...' : 'Excel'}
      </button>
      <button onClick={run('pdf', () => exportToPdf(doc, companySettings ?? undefined))}
        disabled={!!busy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50">
        {busy === 'pdf' ? '...' : 'PDF'}
      </button>
      <button onClick={handleWord}
        disabled={!!busy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50">
        {busy === 'word' ? '...' : 'Word'}
      </button>
      {onSave && (
        <button onClick={onSave} disabled={saving}
          className="ml-auto px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors disabled:opacity-50">
          {saving ? '저장 중...' : '저장'}
        </button>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function EstimateGeneratorContent() {
  const router = useRouter()
  const [me, setMe] = useState<MeLite | null>(null)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [prices, setPrices] = useState<PriceCategory[]>([])

  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    role: 'assistant',
    content: '안녕하세요! 어떤 행사 문서가 필요한가요?\n\n행사 내용을 자유롭게 말씀해 주세요. 견적서·기획안·큐시트·시나리오 등을 바로 만들어 드립니다.',
  }])
  const [isGenerating, setIsGenerating] = useState(false)

  const [currentDoc, setCurrentDoc] = useState<QuoteDoc | null>(null)
  const [currentDocId, setCurrentDocId] = useState<string | null>(null)
  const [currentParams, setCurrentParams] = useState<Partial<ChatIntentParams>>({})
  const [saving, setSaving] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<'chat' | 'preview'>('chat')
  const [generatingTabs, setGeneratingTabs] = useState<Partial<Record<string, boolean>>>({})

  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiFetch<MeLite>('/api/me').then(r => { if (r) setMe(r) }).catch((err: unknown) => {
      if ((err as { status?: number }).status === 401) router.replace('/login')
    })
    apiFetch<{ settings: CompanySettings }>('/api/settings').then(r => {
      if (r?.settings) setCompanySettings(r.settings)
    }).catch(() => {})
    apiFetch<{ categories: PriceCategory[] }>('/api/prices').then(r => {
      if (r?.categories) setPrices(r.categories)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const updateMessage = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
  }, [])

  const runGenerate = useCallback(async (
    params: Partial<ChatIntentParams>,
    assistantId: string,
    isModify?: boolean,
  ) => {
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    const merged = { ...currentParams, ...params }
    setCurrentParams(merged)

    try {
      const result = await apiGenerateStream({
        eventName: merged.eventName || '행사',
        clientName: merged.clientName || '',
        clientManager: '',
        clientTel: '',
        quoteDate: todayStr(),
        eventDate: merged.eventDate || '',
        eventDuration: merged.eventDuration || '',
        venue: merged.venue || '',
        headcount: merged.headcount || '',
        eventType: merged.eventType?.trim() || '일반행사',
        budget: merged.budget || '',
        requirements: merged.requirements || '',
        briefNotes: merged.requirements || '',
        documentTarget: (merged.documentTarget || 'estimate') as string,
        generationMode: 'normal',
        existingDoc: isModify && currentDoc ? currentDoc : undefined,
        prices: prices.length > 0 ? prices : undefined,
      }, {
        signal: ctrl.signal,
        onStage: ({ stage, label }) => {
          updateMessage(assistantId, { stage, content: label ?? stage })
        },
      })

      if (result?.doc) {
        setCurrentDoc(result.doc)
        setCurrentDocId(result.id ?? null)

        const docLabels: Record<string, string> = {
          estimate: '행사 제안서', program: '프로그램 제안서', planning: '기획안',
          cuesheet: '큐시트', scenario: '시나리오', emceeScript: '사회자 멘트 원고', timetable: '타임테이블',
        }
        const label = docLabels[merged.documentTarget ?? 'estimate'] ?? '문서'
        updateMessage(assistantId, {
          isGenerating: false,
          content: `${label}를 완성했어요 ✓\n\n수정이 필요하면 말씀해 주세요.\n예) "인원 200명으로", "큐시트도 만들어줘"`,
          stage: undefined,
        })
        if (window.innerWidth < 768) setMobilePanel('preview')
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'AbortError') return
      updateMessage(assistantId, {
        isGenerating: false,
        isError: true,
        content: toUserMessage(err) ?? '문서 생성 중 오류가 발생했습니다.',
        stage: undefined,
      })
    } finally {
      setIsGenerating(false)
      abortRef.current = null
    }
  }, [currentParams, currentDoc, prices, updateMessage])

  const handleGenerateTab = useCallback(async (tab: string) => {
    if (!currentDoc) return
    setGeneratingTabs(prev => ({ ...prev, [tab]: true }))
    const assistantId = uid()
    const tabLabels: Record<string, string> = {
      program: '프로그램 제안서', timetable: '타임테이블', planning: '기획안',
      scenario: '시나리오', emceeScript: '사회자 멘트 원고', cuesheet: '큐시트',
    }
    setMessages(prev => [...prev, {
      id: assistantId, role: 'assistant',
      content: `${tabLabels[tab] ?? tab} 생성 중...`,
      isGenerating: true,
    }])
    try {
      const result = await apiGenerateStream({
        eventName: currentParams.eventName || currentDoc.eventName || '행사',
        clientName: currentParams.clientName || currentDoc.clientName || '',
        clientManager: currentDoc.clientManager || '',
        clientTel: currentDoc.clientTel || '',
        quoteDate: todayStr(),
        eventDate: currentParams.eventDate || currentDoc.eventDate || '',
        eventDuration: currentParams.eventDuration || currentDoc.eventDuration || '',
        venue: currentParams.venue || currentDoc.venue || '',
        headcount: currentParams.headcount || currentDoc.headcount || '',
        eventType: (currentParams.eventType || currentDoc.eventType || '일반행사').trim() || '일반행사',
        budget: currentParams.budget || '',
        requirements: currentParams.requirements || '',
        briefNotes: currentParams.requirements || '',
        documentTarget: tab,
        generationMode: 'normal',
        existingDoc: currentDoc,
        prices: prices.length > 0 ? prices : undefined,
      })
      if (result?.doc) {
        setCurrentDoc(result.doc)
        setCurrentDocId(result.id ?? null)
        updateMessage(assistantId, {
          isGenerating: false,
          content: `${tabLabels[tab] ?? tab}를 완성했어요 ✓`,
          stage: undefined,
        })
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== 'AbortError') {
        updateMessage(assistantId, {
          isGenerating: false,
          isError: true,
          content: toUserMessage(err) ?? '생성 중 오류가 발생했습니다.',
        })
      }
    } finally {
      setGeneratingTabs(prev => ({ ...prev, [tab]: false }))
    }
  }, [currentDoc, currentParams, prices, updateMessage])

  const handleSend = useCallback(async (text: string) => {
    if (isGenerating) return

    const userMsgId = uid()
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: text }])
    setIsGenerating(true)

    const assistantId = uid()
    setMessages(prev => [...prev, {
      id: assistantId, role: 'assistant',
      content: '분석 중...', isGenerating: true, stage: 'enrich',
    }])

    try {
      const history = messages
        .filter(m => !m.isGenerating)
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }))

      const intent = await apiFetch<ChatIntentResult>('/api/chat-intent', {
        method: 'POST',
        body: JSON.stringify({ message: text, history, currentParams }),
      })

      if (!intent) throw new Error('응답이 없습니다.')

      if (intent.action === 'clarify') {
        updateMessage(assistantId, { isGenerating: false, content: intent.question, stage: undefined })
        setIsGenerating(false)
        return
      }

      const isModify = intent.action === 'modify'
      const params = isModify
        ? { ...currentParams, ...intent.params }
        : (intent.params ?? {})

      updateMessage(assistantId, { content: '문서 작성 중...', stage: 'draft' })
      await runGenerate(params, assistantId, isModify)
    } catch (err) {
      updateMessage(assistantId, {
        isGenerating: false, isError: true,
        content: toUserMessage(err) ?? '오류가 발생했습니다.',
        stage: undefined,
      })
      setIsGenerating(false)
    }
  }, [isGenerating, messages, currentParams, updateMessage, runGenerate])

  const limitReached = me && me.usage.quoteGeneratedCount >= me.limits.monthlyQuoteGenerateLimit

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <GNB />

      {/* Mobile panel toggle */}
      {currentDoc && (
        <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex bg-white rounded-full shadow-lg border border-slate-200 p-1 gap-1">
          {(['chat', 'preview'] as const).map(p => (
            <button
              key={p}
              onClick={() => setMobilePanel(p)}
              className={clsx(
                'px-4 py-1.5 rounded-full text-xs font-medium transition-colors',
                mobilePanel === p ? 'bg-violet-600 text-white' : 'text-slate-500',
              )}
            >
              {p === 'chat' ? '채팅' : '문서'}
            </button>
          ))}
        </div>
      )}

      {/* Left: Chat */}
      <div className={clsx(
        'flex flex-col bg-white border-r border-slate-200 shrink-0',
        'w-full md:w-[400px] lg:w-[440px]',
        currentDoc && mobilePanel === 'preview' ? 'hidden md:flex' : 'flex',
      )}>
        <div className="px-5 py-4 border-b border-slate-100">
          <h1 className="text-[15px] font-semibold text-slate-800">행사 문서 생성</h1>
          {me && (
            <p className="text-xs text-slate-400 mt-0.5">
              이번 달 {me.usage.quoteGeneratedCount} / {me.limits.monthlyQuoteGenerateLimit}회
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          <div ref={bottomRef} />
        </div>

        {limitReached ? (
          <div className="px-4 py-4 border-t border-slate-100 text-center space-y-1">
            <p className="text-sm text-slate-500">이번 달 생성 한도에 도달했습니다.</p>
            <a href="/plans" className="text-violet-600 text-sm font-medium hover:underline">
              플랜 업그레이드 →
            </a>
          </div>
        ) : (
          <ChatInput
            onSend={handleSend}
            disabled={isGenerating}
            placeholder={currentDoc
              ? '수정 요청 입력... (예: 인원 200명으로, 큐시트도 만들어줘)'
              : undefined}
          />
        )}
      </div>

      {/* Right: Preview */}
      <div className={clsx(
        'flex-1 flex flex-col min-w-0 overflow-hidden',
        currentDoc && mobilePanel === 'chat' ? 'hidden md:flex' : 'flex',
      )}>
        {currentDoc ? (
          <>
            <div className="flex-1 overflow-auto min-h-0">
              <QuoteResult
                doc={currentDoc}
                companySettings={companySettings}
                prices={prices}
                onChange={(doc) => setCurrentDoc(doc)}
                docId={currentDocId ?? undefined}
                saving={saving}
                showTabButtons
                disableAutoGenerate
                visibleTabs={['estimate', 'program', 'timetable', 'planning', 'scenario', 'emceeScript']}
                onGenerateTab={handleGenerateTab}
                generatingTabs={generatingTabs}
                onExcel={(view) => exportToExcel(currentDoc, companySettings ?? undefined, view)}
                onPdf={() => exportToPdf(currentDoc, companySettings ?? undefined)}
              />
            </div>
            <DownloadBar
              doc={currentDoc}
              companySettings={companySettings}
              onSave={async () => {
                if (!currentDoc || !currentDocId) return
                setSaving(true)
                try {
                  await apiFetch(`/api/generated-docs/${currentDocId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ doc: currentDoc }),
                  })
                } finally { setSaving(false) }
              }}
              saving={saving}
            />
          </>
        ) : (
          <EmptyPreview />
        )}
      </div>
    </div>
  )
}

export default function EstimateGeneratorPage() {
  return (
    <Suspense>
      <EstimateGeneratorContent />
    </Suspense>
  )
}

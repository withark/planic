'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import clsx from 'clsx'

type Phase = 'paste' | 'wizard'

type ChatMsg = { id: number; role: 'user' | 'assistant'; text: string }

export type MacroPasteBottomStep = { label: string; status: 'done' | 'active' | 'idle' }

type Props = {
  /** sessionStorage 키 — '1' 이면 다음 방문부터 마법사만 */
  skipStorageKey: string
  /** 상단 제목 */
  title: string
  description: string
  placeholder: string
  /** 붙여넣기 확인 후 필드에 반영 */
  onApplyPaste: (rawText: string) => void
  /** 건너뛰기 — 마법사만 */
  onSkipPaste?: () => void
  children: React.ReactNode
  /**
   * card: 기존 큰 카드 + 텍스트영역
   * chat: 좌측 채팅형(목업과 동일 구조) — 색·폰트는 플래닉 디자인 유지
   */
  layout?: 'card' | 'chat'
  /** layout=chat 일 때 첫 안내 말풍선 */
  chatWelcome?: string
  /** layout=chat + split: 목업(ai_quote_saas_mockup)처럼 패널 밀착·하단 칩·입력·상태바 순서 */
  chatPanelStyle?: 'default' | 'split'
  /** 칩 라벨 — 메시지·입력 사이(목업과 동일 위치), 클릭 시 초안에 한 줄 추가 */
  quickChipLabels?: string[]
  /** split: 하단 단계 표시(목업 state-bar) */
  bottomSteps?: MacroPasteBottomStep[]
  /** split + 마법사 단계: 하단 입력 전송 시 (메모 반영 등) */
  onFollowUpSend?: (text: string) => void
  /** 마법사 단계 후속 입력 안내 말풍선 기본 문구 */
  followUpAssistantReply?: string
  /** 붙여넣기 전송·건너뛰기·세션 복원 등으로 마법사에 들어왔을 때(부모 단계 UI 동기화) */
  onWizardEntered?: () => void
  /** true: 채팅 전송 시 마법사로 넘기지 않고 onChatSubmit만 호출(견적 제안서 등) */
  chatPrimaryMode?: boolean
  /** chatPrimaryMode일 때 단계별 마법사 패널 표시 여부(건너뛰기 시 true) */
  showWizardPanel?: boolean
  /** chatPrimaryMode일 때 Enter 전송 — 첫 입력·후속 수정 공통. false면 안내 말풍선 생략(검증 실패 등) */
  onChatSubmit?: (text: string) => void | boolean | Promise<boolean | void>
  /** chatPrimaryMode 첫 전송 후 안내 말풍선 */
  chatSubmitAssistantReply?: string
  /** chatPrimaryMode 후속 전송 안내 말풍선 */
  chatFollowUpAssistantReply?: string
  /** chatPrimaryMode 검증·생성 시작 실패 시 안내 말풍선 */
  chatSubmitFailureReply?: string
}

export function MacroPasteGate({
  skipStorageKey,
  title,
  description,
  placeholder,
  onApplyPaste,
  onSkipPaste,
  children,
  layout = 'card',
  chatWelcome,
  chatPanelStyle = 'default',
  quickChipLabels,
  bottomSteps,
  onFollowUpSend,
  followUpAssistantReply,
  onWizardEntered,
  chatPrimaryMode = false,
  showWizardPanel = false,
  onChatSubmit,
  chatSubmitAssistantReply = '제안서를 만들고 있어요. 잠시만 기다려 주세요.',
  chatFollowUpAssistantReply = '수정 요청을 반영해 다시 만들고 있어요.',
  chatSubmitFailureReply = '제안서를 만들지 못했어요. 내용을 조금 더 적거나 잠시 후 다시 시도해 주세요.',
}: Props) {
  const [phase, setPhase] = useState<Phase>('paste')
  const [draft, setDraft] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const msgIdRef = useRef(0)

  const nextMsgId = useCallback(() => {
    msgIdRef.current += 1
    return msgIdRef.current
  }, [])

  const defaultWelcome =
    chatWelcome ??
    '견적이나 행사 정보를 아래 입력란에 붙여 넣고 보내 주세요. 확인 후 오른쪽에서 제안서를 만들 수 있어요.'

  const defaultFollowUpReply =
    followUpAssistantReply ??
    '메모에 반영했어요. 아래에서 내용을 확인한 뒤 필요하면 다시 생성해 보세요.'

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage.getItem(skipStorageKey) === '1') {
        if (chatPrimaryMode) {
          onSkipPaste?.()
          onWizardEntered?.()
        } else {
          setPhase('wizard')
          onWizardEntered?.()
        }
      }
    } catch {
      /* ignore */
    }
  }, [skipStorageKey, onWizardEntered, onSkipPaste, chatPrimaryMode])

  useEffect(() => {
    if (layout !== 'chat' || phase !== 'paste') return
    setChatMessages((prev) => (prev.length > 0 ? prev : [{ id: nextMsgId(), role: 'assistant', text: defaultWelcome }]))
  }, [layout, phase, defaultWelcome, nextMsgId])

  /** 건너뛰기 재방문 시 빈 채팅 방지 — 목업처럼 좌열 항상 유지 */
  useEffect(() => {
    if (layout !== 'chat' || chatPanelStyle !== 'split') return
    try {
      if (typeof window === 'undefined') return
      if (window.sessionStorage.getItem(skipStorageKey) !== '1') return
      setChatMessages((prev) =>
        prev.length > 0
          ? prev
          : [
              {
                id: nextMsgId(),
                role: 'assistant',
                text: '건너뛰기로 마법사만 열었어요. 필요하면 아래 입력란에 추가 요청을 적어 주세요.',
              },
            ],
      )
    } catch {
      /* ignore */
    }
  }, [skipStorageKey, layout, chatPanelStyle, nextMsgId])

  useEffect(() => {
    if (layout !== 'chat') return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [chatMessages, layout])

  const persistSkip = () => {
    try {
      window.sessionStorage.setItem(skipStorageKey, '1')
    } catch {
      /* ignore */
    }
  }

  const runPrimaryChatSubmit = useCallback(
    async (text: string, assistantReply: string) => {
      setChatMessages((prev) => [...prev, { id: nextMsgId(), role: 'user', text }])
      setDraft('')
      let ok = true
      try {
        const r = await onChatSubmit!(text)
        ok = r !== false
      } catch {
        ok = false
      }
      setChatMessages((prev) => [
        ...prev,
        {
          id: nextMsgId(),
          role: 'assistant',
          text: ok ? assistantReply : chatSubmitFailureReply,
        },
      ])
      queueMicrotask(() => composerRef.current?.focus())
    },
    [onChatSubmit, nextMsgId, chatSubmitFailureReply],
  )

  const handleContinue = () => {
    const t = draft.trim()
    if (!t) return
    if (chatPrimaryMode && onChatSubmit) {
      const isFollowUp = chatMessages.some((m) => m.role === 'user')
      const assistantText = isFollowUp ? chatFollowUpAssistantReply : chatSubmitAssistantReply
      void runPrimaryChatSubmit(t, assistantText)
      return
    }
    if (layout === 'chat') {
      setChatMessages((prev) => [
        ...prev,
        { id: nextMsgId(), role: 'user', text: t },
        {
          id: nextMsgId(),
          role: 'assistant',
          text: '반영했습니다. 아래에서 상호·일정·금액을 확인한 뒤 생성해 주세요.',
        },
      ])
    }
    onApplyPaste(t)
    setDraft('')
    setPhase('wizard')
    onWizardEntered?.()
  }

  const handleFollowUp = () => {
    const t = draft.trim()
    if (!t) return
    if (chatPrimaryMode && onChatSubmit) {
      void runPrimaryChatSubmit(t, chatFollowUpAssistantReply)
      return
    }
    setChatMessages((prev) => [
      ...prev,
      { id: nextMsgId(), role: 'user', text: t },
      { id: nextMsgId(), role: 'assistant', text: defaultFollowUpReply },
    ])
    onFollowUpSend?.(t)
    setDraft('')
  }

  const handleSkip = () => {
    onSkipPaste?.()
    if (!chatPrimaryMode) setPhase('wizard')
    persistSkip()
    onWizardEntered?.()
    if (layout === 'chat' && chatPanelStyle === 'split') {
      setChatMessages((prev) =>
        prev.length > 0
          ? prev
          : [{ id: nextMsgId(), role: 'assistant', text: '단계별 입력으로 진행할게요. 필요하면 아래 입력란에 추가 요청을 적을 수 있어요.' }],
      )
    }
  }

  const showPastePanel = phase === 'paste'
  const wizardOpen = chatPrimaryMode ? showWizardPanel : phase === 'wizard'
  const embedSplit = chatPanelStyle === 'split'
  const showChatDock =
    layout === 'chat' && (embedSplit || phase === 'paste' || chatMessages.length > 0)

  /** 목업 HTML과 동일: 헤더·메시지·(마법사)·칩·입력·상태바 한 열 */
  if (layout === 'chat' && embedSplit) {
    const appendQuickChip = (label: string) => {
      setDraft((d) => {
        const next = d.trim() ? `${d.trim()}\n${label}` : label
        return next
      })
    }

    const handleComposerSend = () => {
      const chatHasUser = chatMessages.some((m) => m.role === 'user')
      if (chatPrimaryMode && chatHasUser) handleFollowUp()
      else if (showPastePanel) handleContinue()
      else handleFollowUp()
      queueMicrotask(() => composerRef.current?.focus())
    }

    return (
      <div className="flex h-full min-h-0 flex-1 flex-col gap-0">
        {showChatDock ? (
          <>
            <div
              className={clsx(
                'flex flex-shrink-0 items-start justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3',
              )}
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-900">{title}</p>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">{description}</p>
              </div>
              {showPastePanel ? (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                >
                  건너뛰고 단계별 입력
                </button>
              ) : null}
            </div>

            <div
              className={clsx(
                'flex min-h-0 flex-1 flex-col',
                showPastePanel ? 'justify-start overflow-y-auto' : 'overflow-hidden',
              )}
            >
            <div
              ref={scrollRef}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              className={clsx(
                'space-y-3 overflow-y-auto px-3 py-3 sm:px-4',
                showPastePanel
                  ? 'flex-shrink-0 bg-slate-50/60'
                  : 'max-h-[min(34vh,300px)] min-h-0 flex-shrink-0 border-b border-slate-200 bg-slate-50/60',
              )}
            >
              {chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={clsx(
                      'max-w-[min(100%,280px)] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-[12.5px] leading-relaxed',
                      m.role === 'user'
                        ? 'rounded-br-[4px] bg-primary-600 text-white'
                        : 'rounded-bl-[4px] border border-slate-200 bg-white text-slate-800 shadow-sm',
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {wizardOpen ? (
              <div
                className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-slate-100 bg-white"
                data-testid="macro-paste-wizard-panel"
              >
                <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 pt-2 sm:px-4">{children}</div>
              </div>
            ) : null}

            {quickChipLabels && quickChipLabels.length > 0 ? (
              <div className="flex-shrink-0 bg-white px-3 pb-1.5 pt-1 sm:px-4">
                <div className="flex flex-wrap gap-1">
                  {quickChipLabels.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => appendQuickChip(chip)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10.5px] font-medium text-slate-600 transition hover:bg-slate-100"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex-shrink-0 border-t border-slate-200 bg-white px-3 py-2.5 sm:px-4">
              <div className="flex items-end gap-2 rounded-[10px] border border-slate-200 bg-slate-50/80 px-2 py-1.5">
                <label className="sr-only">메시지 입력</label>
                <textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={wizardOpen ? '수정사항을 말씀해 주세요…' : placeholder}
                  rows={showPastePanel ? 6 : wizardOpen ? 2 : 3}
                  data-testid="macro-paste-composer"
                  className={clsx(
                    'min-h-[44px] flex-1 resize-none border-0 bg-transparent px-1 py-1 text-[12.5px] text-slate-900 outline-none',
                    'placeholder:text-slate-400 focus:ring-0',
                  )}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleComposerSend()
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={!draft.trim()}
                  onClick={handleComposerSend}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40"
                  aria-label="전송"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                    <path
                      d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <p className="mt-1.5 text-[10.5px] text-slate-500">Shift+Enter 줄바꿈 · Enter 전송</p>
            </div>
            </div>

            {bottomSteps && bottomSteps.length > 0 ? (
              <div className="flex shrink-0 flex-wrap gap-3 border-t border-slate-200 bg-white px-4 py-2">
                {bottomSteps.map((step, i) => (
                  <div key={`${step.label}-${i}`} className="flex items-center gap-1">
                    <span
                      className={clsx(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        step.status === 'done' && 'bg-emerald-500',
                        step.status === 'active' && 'animate-pulse bg-primary-600',
                        step.status === 'idle' && 'bg-slate-300',
                      )}
                      aria-hidden
                    />
                    <span
                      className={clsx(
                        'text-[10.5px]',
                        step.status === 'done' && 'text-emerald-700',
                        step.status === 'active' && 'font-medium text-primary-700',
                        step.status === 'idle' && 'text-slate-400',
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    )
  }

  if (layout === 'chat') {
    const compactChat = wizardOpen && chatMessages.length > 0

    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {showChatDock ? (
          <div
            className={clsx(
              'flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm',
              compactChat ? 'max-h-[min(38vh,340px)] flex-shrink-0' : 'min-h-[280px] flex-1',
            )}
          >
            <div className="flex flex-shrink-0 items-start justify-between gap-2 border-b border-slate-100 bg-white px-3 py-2.5 sm:px-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900">{title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{description}</p>
              </div>
              {showPastePanel ? (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                >
                  건너뛰고 단계별 입력
                </button>
              ) : compactChat ? (
                <span className="shrink-0 rounded-lg bg-primary-50 px-2 py-1 text-[10px] font-medium text-primary-800">
                  대화 유지
                </span>
              ) : null}
            </div>

            <div
              ref={scrollRef}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              className={clsx(
                'min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/40 px-3 py-3 sm:px-4',
              )}
            >
              {chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={clsx(
                      'max-w-[min(100%,340px)] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm',
                      m.role === 'user'
                        ? 'rounded-tr-sm bg-primary-600 text-white'
                        : 'rounded-tl-sm border border-slate-200/90 bg-white text-slate-800',
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {showPastePanel ? (
              <div className="flex-shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4">
                {quickChipLabels && quickChipLabels.length > 0 ? (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {quickChipLabels.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() =>
                          setDraft((d) => {
                            const next = d.trim() ? `${d.trim()}\n${chip}` : chip
                            return next
                          })
                        }
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <label className="sr-only">메시지 입력</label>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    className={clsx(
                      'min-h-[72px] flex-1 resize-y rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-[15px] text-slate-900 shadow-inner',
                      'placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100/70',
                    )}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleContinue()
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={!draft.trim()}
                    onClick={handleContinue}
                    className="h-fit shrink-0 self-end rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
                  >
                    보내기
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Shift+Enter로 줄바꿈 · Enter로 전송</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {wizardOpen ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {compactChat ? (
              <p className="mb-1 flex-shrink-0 text-[11px] font-medium text-slate-500">
                아래에서 세부 내용만 확인·수정하면 돼요. 위 대화는 그대로 남아 있어요.
              </p>
            ) : null}
            <div
              className={clsx(
                'min-h-0 flex-1 overflow-y-auto',
                !compactChat && 'min-h-[240px]',
              )}
              data-testid="macro-paste-wizard-panel"
            >
              {children}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  /* ——— card (기존) ——— */
  const showPastePanelCard = phase === 'paste'
  return (
    <div className="space-y-4">
      {showPastePanelCard ? (
        <div className="rounded-2xl border border-primary-200 bg-gradient-to-b from-white to-primary-50/50 p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-700">1단계 · 자료 붙여넣기</p>
              <h2 className="mt-1 text-base font-bold text-slate-900">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{description}</p>
            </div>
            <button
              type="button"
              onClick={handleSkip}
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              건너뛰고 단계별 입력
            </button>
          </div>
          <label className="mt-4 block">
            <span className="sr-only">붙여넣기</span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              rows={12}
              className={clsx(
                'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 shadow-sm',
                'placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100/70',
              )}
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={handleContinue}
              className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
            >
              내용 검토·수정으로 이동
            </button>
            <p className="text-xs text-slate-500">다음 화면에서 금액·상호 등을 고친 뒤 문서를 생성합니다.</p>
          </div>
        </div>
      ) : null}

      <div className={showPastePanelCard ? 'hidden' : 'block'} data-testid="macro-paste-wizard-panel">
        {children}
      </div>
    </div>
  )
}

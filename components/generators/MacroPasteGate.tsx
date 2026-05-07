'use client'

import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

type Phase = 'paste' | 'wizard'

type ChatMsg = { role: 'user' | 'assistant'; text: string }

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
}: Props) {
  const [phase, setPhase] = useState<Phase>('paste')
  const [draft, setDraft] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  const defaultWelcome =
    chatWelcome ??
    '견적이나 행사 정보를 아래 입력란에 붙여 넣고 보내 주세요. 확인 후 오른쪽에서 제안서를 만들 수 있어요.'

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage.getItem(skipStorageKey) === '1') {
        setPhase('wizard')
      }
    } catch {
      /* ignore */
    }
  }, [skipStorageKey])

  useEffect(() => {
    if (layout !== 'chat' || phase !== 'paste') return
    setChatMessages((prev) => (prev.length > 0 ? prev : [{ role: 'assistant', text: defaultWelcome }]))
  }, [layout, phase, defaultWelcome])

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

  const handleContinue = () => {
    const t = draft.trim()
    if (!t) return
    if (layout === 'chat') {
      setChatMessages((prev) => [
        ...prev,
        { role: 'user', text: t },
        {
          role: 'assistant',
          text: '반영했습니다. 아래 마법사에서 상호·일정·금액을 확인한 뒤 생성해 주세요.',
        },
      ])
    }
    onApplyPaste(t)
    setDraft('')
    setPhase('wizard')
  }

  const handleSkip = () => {
    onSkipPaste?.()
    setPhase('wizard')
    persistSkip()
  }

  const showPastePanel = phase === 'paste'
  const showChatDock = layout === 'chat' && (phase === 'paste' || chatMessages.length > 0)

  if (layout === 'chat') {
    const wizardOpen = phase === 'wizard'
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
              className={clsx(
                'min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/40 px-3 py-3 sm:px-4',
              )}
            >
              {chatMessages.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
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
  return (
    <div className="space-y-4">
      {showPastePanel ? (
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

      <div className={showPastePanel ? 'hidden' : 'block'} data-testid="macro-paste-wizard-panel">
        {children}
      </div>
    </div>
  )
}

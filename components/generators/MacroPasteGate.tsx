'use client'

import { useEffect, useState } from 'react'
import clsx from 'clsx'

type Phase = 'paste' | 'wizard'

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
}

export function MacroPasteGate({
  skipStorageKey,
  title,
  description,
  placeholder,
  onApplyPaste,
  onSkipPaste,
  children,
}: Props) {
  const [phase, setPhase] = useState<Phase>('paste')
  const [draft, setDraft] = useState('')

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage.getItem(skipStorageKey) === '1') {
        setPhase('wizard')
      }
    } catch {
      /* ignore */
    }
  }, [skipStorageKey])

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
    onApplyPaste(t)
    setPhase('wizard')
  }

  const handleSkip = () => {
    onSkipPaste?.()
    setPhase('wizard')
    persistSkip()
  }

  const showPastePanel = phase === 'paste'

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

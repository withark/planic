'use client'

import type { ReactNode } from 'react'
import { Fragment, useRef } from 'react'
import clsx from 'clsx'
import { Button } from '@/components/ui'

const WIZARD_STEPS = [
  { n: 1 as const, label: '기준 선택' },
  { n: 2 as const, label: '핵심 정보' },
  { n: 3 as const, label: '생성·확인' },
]

export type WizardMode = {
  id: string
  title: string
  desc?: string
}

export type WizardHighlight = {
  label: string
  value: string
}

export default function SimpleGeneratorWizard({
  title,
  subtitle,
  highlights = [],
  modes,
  modeId,
  onModeChange,
  requiredInput,
  generateLabel,
  onGenerate,
  generating = false,
  generateDisabled = false,
  generationProgressLabel = null,
  validationMessage,
  preStepContent,
  showValidationBanner = true,
  collapsibleHighlights = false,
}: {
  title: string
  subtitle?: string
  highlights?: WizardHighlight[]
  modes: WizardMode[]
  modeId: string
  onModeChange: (id: string) => void
  requiredInput: ReactNode
  generateLabel: string
  onGenerate: () => void | Promise<void>
  generating?: boolean
  generateDisabled?: boolean
  /** 생성 중 서버 단계(NDJSON) — 있으면 버튼 위에 표시 */
  generationProgressLabel?: string | null
  /** 생성 버튼이 비활성일 때, 부족한 입력을 한눈에 설명 */
  validationMessage?: string | null
  /** 1단계 위에 배치(예: 스타일·참고 견적 안내) */
  preStepContent?: ReactNode
  /** false이면 노란 검증 박스를 숨김(인라인 검증 등과 병행할 때) */
  showValidationBanner?: boolean
  /** true이면 요약 카드를 접을 수 있는 영역으로 표시 */
  collapsibleHighlights?: boolean
}) {
  // 부모 컴포넌트의 `generating` 상태 업데이트가 렌더되기 전
  // 아주 빠른 더블 클릭에서 `onGenerate`가 2번 호출되는 것을 방지합니다.
  const inFlightRef = useRef(false)

  const handleGenerateClick = async () => {
    if (generateDisabled || generating) return
    if (inFlightRef.current) return
    inFlightRef.current = true
    try {
      await onGenerate()
    } finally {
      inFlightRef.current = false
    }
  }

  const highlightGrid = (
    <div className="grid gap-3 md:grid-cols-3">
      {highlights.map((item) => (
        <div key={`${item.label}-${item.value}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="text-xs font-semibold tracking-wide text-slate-500">{item.label}</div>
          <div className="mt-1 text-sm font-semibold leading-6 text-slate-900">{item.value}</div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold tracking-wide text-primary-700">바로 전달 가능한 문서 생성</div>
          <div className="mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">{title}</div>
          {subtitle ? <div className="mt-2 text-[15px] leading-7 text-slate-600 sm:text-base">{subtitle}</div> : null}
        </div>
      </div>

      <nav className="mt-5 flex flex-wrap items-center gap-x-1 gap-y-2" aria-label="견적 작성 단계">
        {WIZARD_STEPS.map((s, i) => (
          <Fragment key={s.n}>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-800 sm:text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] text-white sm:text-xs">
                {s.n}
              </span>
              {s.label}
            </div>
            {i < WIZARD_STEPS.length - 1 ? (
              <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
                —
              </span>
            ) : null}
          </Fragment>
        ))}
      </nav>

      {highlights.length ? (
        collapsibleHighlights ? (
          <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/40 px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800 outline-none marker:text-primary-600">
              입력 요약 보기 (필수·권장·결과물)
            </summary>
            <div className="mt-3">{highlightGrid}</div>
          </details>
        ) : (
          <div className="mt-5">{highlightGrid}</div>
        )
      ) : null}

      <div className="mt-6 space-y-5">
        {preStepContent ? <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">{preStepContent}</div> : null}

        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900 px-2 text-xs font-semibold text-white">1</span>
            <div className="text-[17px] font-semibold text-slate-900">기준 선택</div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {modes.map((m) => {
              const active = m.id === modeId
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onModeChange(m.id)}
                  className={clsx(
                    'rounded-2xl border p-4 text-left shadow-sm transition-all',
                    active
                      ? 'border-primary-400 bg-primary-50/90 ring-2 ring-primary-500/35 shadow-md'
                      : 'border-slate-200 bg-white hover:border-primary-200 hover:bg-slate-50 hover:shadow',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-[15px] font-semibold text-slate-900">{m.title}</div>
                    <span
                      className={clsx(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        active ? 'border-primary-600 bg-primary-600' : 'border-slate-300 bg-white',
                      )}
                      aria-hidden="true"
                    >
                      {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                    </span>
                  </div>
                  {m.desc ? (
                    <div className={clsx('mt-2 text-sm leading-5', active ? 'text-slate-600' : 'text-slate-500')}>{m.desc}</div>
                  ) : null}
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900 px-2 text-xs font-semibold text-white">2</span>
            <div className="text-[17px] font-semibold text-slate-900">핵심 정보 입력</div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
            {requiredInput}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900 px-2 text-xs font-semibold text-white">3</span>
            <div className="text-[17px] font-semibold text-slate-900">생성 및 확인</div>
          </div>
          {generating && generationProgressLabel ? (
            <div
              className="mb-3 rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 to-white px-4 py-3 text-sm font-medium text-primary-900"
              role="status"
              aria-live="polite"
            >
              {generationProgressLabel}
            </div>
          ) : null}
          {generateDisabled && validationMessage && showValidationBanner ? (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <p className="text-sm font-medium text-amber-950">{validationMessage}</p>
            </div>
          ) : null}
          <div className="flex flex-col items-stretch sm:items-start">
            <Button
              variant="primary"
              className="w-full justify-center py-4 text-[15px] sm:w-auto sm:min-w-[min(100%,280px)] sm:px-10"
              disabled={generateDisabled || generating}
              onClick={() => void handleGenerateClick()}
            >
              {generating ? `${generateLabel}...` : generateLabel}
            </Button>
            {generateDisabled && !generating ? (
              <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">필수 항목을 채우면 버튼이 활성화됩니다.</p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}

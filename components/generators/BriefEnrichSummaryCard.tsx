'use client'

import { useState } from 'react'
import clsx from 'clsx'

export interface BriefEnrichSummary {
  oneLiner?: string
  toneGuide?: string
  keyConcepts?: string[]
  mustHaveDetails?: string[]
  cautionPoints?: string[]
  documentSpecificHints?: string
  meta?: {
    provider?: string
    model?: string
    latencyMs?: number
  }
}

/**
 * NDJSON `enrich-done` 이벤트에서 받은 details를 파싱해 안전한 객체로 변환.
 * 알 수 없는 형태면 null 반환.
 */
export function parseBriefEnrichSummary(details: unknown): BriefEnrichSummary | null {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null
  const d = details as Record<string, unknown>
  if (d.kind && d.kind !== 'briefEnrich') return null

  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x ?? '').trim()).filter(Boolean) : []
  const str = (v: unknown): string | undefined => {
    const s = typeof v === 'string' ? v.trim() : ''
    return s ? s : undefined
  }
  const meta = (() => {
    const m = d.meta
    if (!m || typeof m !== 'object' || Array.isArray(m)) return undefined
    const mm = m as Record<string, unknown>
    return {
      provider: str(mm.provider),
      model: str(mm.model),
      latencyMs: typeof mm.latencyMs === 'number' ? mm.latencyMs : undefined,
    }
  })()

  const summary: BriefEnrichSummary = {
    oneLiner: str(d.oneLiner),
    toneGuide: str(d.toneGuide),
    keyConcepts: arr(d.keyConcepts),
    mustHaveDetails: arr(d.mustHaveDetails),
    cautionPoints: arr(d.cautionPoints),
    documentSpecificHints: str(d.documentSpecificHints),
    meta,
  }
  const hasContent =
    !!summary.oneLiner ||
    !!summary.toneGuide ||
    (summary.keyConcepts?.length ?? 0) > 0 ||
    (summary.mustHaveDetails?.length ?? 0) > 0 ||
    (summary.cautionPoints?.length ?? 0) > 0 ||
    !!summary.documentSpecificHints
  return hasContent ? summary : null
}

interface Props {
  summary: BriefEnrichSummary | null
  className?: string
  /** 본 문서 생성이 진행 중일 때 true(=배너 강조). 완료/실패 후에도 표시 유지 */
  active?: boolean
  /**
   * 사용자가 카드 안에서 보강 메모를 작성하고 "이 메모로 다시 생성"을 누르면 호출.
   * note는 사용자가 입력한 텍스트(trim된 상태). 페이지 측에서 briefNotes/requirements에 합치고
   * 재생성 트리거를 직접 수행한다. 미제공이면 입력 영역을 표시하지 않는다.
   */
  onRefine?: (note: string) => void
  /** 재생성 버튼 비활성화(이미 다시 생성 중일 때) */
  refining?: boolean
}

/**
 * 본 생성 직전 LLM이 사용자 입력을 어떻게 정리했는지 사용자에게 그대로 보여주는 미리보기 카드.
 * - 토글로 접고 펼 수 있다. 기본은 펼쳐진 상태.
 * - summary가 null이면 아무것도 렌더링하지 않는다.
 */
export default function BriefEnrichSummaryCard({
  summary,
  className,
  active,
  onRefine,
  refining,
}: Props) {
  const [open, setOpen] = useState(true)
  const [refineNote, setRefineNote] = useState('')
  if (!summary) return null

  const noteTrimmed = refineNote.trim()
  const canSubmitRefine = !!onRefine && !active && !refining && noteTrimmed.length >= 2

  const concepts = summary.keyConcepts ?? []
  const mustHave = summary.mustHaveDetails ?? []
  const cautions = summary.cautionPoints ?? []

  return (
    <section
      className={clsx(
        'rounded-2xl border shadow-sm transition-colors',
        active
          ? 'border-indigo-200 bg-indigo-50/70'
          : 'border-indigo-100 bg-white',
        className,
      )}
      aria-label="AI가 정리한 입력 미리보기"
    >
      <header className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="flex items-start gap-2">
          <span
            aria-hidden
            className={clsx(
              'mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold',
              active ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700',
            )}
          >
            AI
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-indigo-900">
              AI가 입력을 정리했어요
            </p>
            <p className="mt-0.5 text-[11px] text-indigo-900/70 leading-snug">
              사용자가 적은 메모를 본 문서 생성 직전에 컨셉·필수 디테일·주의 포인트로 다시 정리했어요. 마음에 들지 않으면
              위 폼의 요청사항을 더 구체적으로 적어 주시면 결과가 더 좋아져요.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-lg border border-indigo-200 bg-white px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50"
        >
          {open ? '접기' : '펴기'}
        </button>
      </header>

      {open ? (
        <div className="space-y-3 border-t border-indigo-100/80 px-4 py-3 text-[12.5px] text-indigo-950/90">
          {summary.oneLiner ? (
            <div>
              <p className="text-[11px] font-semibold text-indigo-700/80">한 줄 요약</p>
              <p className="mt-0.5 leading-relaxed">{summary.oneLiner}</p>
            </div>
          ) : null}

          {concepts.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold text-indigo-700/80">컨셉 키워드</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {concepts.map((c, i) => (
                  <span
                    key={`${c}-${i}`}
                    className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-800"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {mustHave.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold text-indigo-700/80">필수 디테일</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 leading-relaxed">
                {mustHave.slice(0, 8).map((line, i) => (
                  <li key={`mh-${i}`}>{line}</li>
                ))}
              </ul>
              {mustHave.length > 8 ? (
                <p className="mt-1 text-[10px] text-indigo-700/70">+{mustHave.length - 8}개 더</p>
              ) : null}
            </div>
          ) : null}

          {cautions.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold text-amber-700/80">주의 포인트</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 leading-relaxed text-amber-900/90">
                {cautions.slice(0, 6).map((line, i) => (
                  <li key={`ca-${i}`}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {summary.documentSpecificHints ? (
            <div>
              <p className="text-[11px] font-semibold text-indigo-700/80">이 문서를 위한 추가 지시</p>
              <p className="mt-0.5 leading-relaxed">{summary.documentSpecificHints}</p>
            </div>
          ) : null}

          {summary.toneGuide ? (
            <div>
              <p className="text-[11px] font-semibold text-indigo-700/80">작성 톤</p>
              <p className="mt-0.5 leading-relaxed">{summary.toneGuide}</p>
            </div>
          ) : null}

          {summary.meta?.model ? (
            <p className="text-[10px] text-indigo-700/60">
              {summary.meta.provider === 'anthropic'
                ? 'Anthropic'
                : summary.meta.provider === 'openai'
                  ? 'OpenAI'
                  : (summary.meta.provider ?? '')}
              {summary.meta.provider ? ' · ' : ''}
              <span className="font-mono">{summary.meta.model}</span>
              {typeof summary.meta.latencyMs === 'number' ? ` · ${summary.meta.latencyMs}ms` : ''}
            </p>
          ) : null}

          {onRefine ? (
            <div className="mt-2 rounded-xl border border-indigo-200 bg-white p-3">
              <p className="text-[11.5px] font-semibold text-indigo-900">
                결과가 마음에 들지 않으면 한 줄로 알려 주세요
              </p>
              <p className="mt-0.5 text-[10.5px] text-indigo-700/80 leading-snug">
                예: “비전탑·줄다리기 종목을 더 강조해줘”, “VIP 의전 동선을 추가해줘”, “행사 톤은 격식 있게”
                — 입력 메모를 합쳐 즉시 다시 생성합니다.
              </p>
              <textarea
                value={refineNote}
                onChange={(e) => setRefineNote(e.target.value)}
                rows={2}
                placeholder="추가하거나 빼고 싶은 디테일을 적어 주세요"
                className="mt-2 w-full rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-[12px] leading-relaxed text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                disabled={active || refining}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[10px] text-indigo-700/60">
                  {active
                    ? '생성이 진행 중이라 잠시 후 입력해 주세요.'
                    : refining
                      ? '메모를 합쳐 다시 생성 중입니다…'
                      : `${noteTrimmed.length}/600자 · 2자 이상 입력 시 재생성 가능`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!canSubmitRefine) return
                    onRefine?.(noteTrimmed.slice(0, 600))
                    setRefineNote('')
                  }}
                  disabled={!canSubmitRefine}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11.5px] font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  이 메모로 다시 생성
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

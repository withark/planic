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
  /** 생성 중에도 메모를 넣을 수 있을 때: 큐에 쌓아 두었다가 생성 종료 후 notes에 합침 */
  onQueueRefine?: (note: string) => void
  /** 재생성 버튼 비활성화(이미 다시 생성 중일 때) */
  refining?: boolean
  /** 이 세션에서 누적된 보강 메모 개수. 0보다 크면 카드 상단에 인디케이터를 표시 */
  refinementCount?: number
  /** 생성 중 큐에 쌓인 메모 개수 */
  queuedRefineCount?: number
  /** 상세 블록 기본 펼침 여부 (모바일에서는 접어 두는 편이 낫다) */
  defaultOpen?: boolean
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
  onQueueRefine,
  refining,
  refinementCount,
  queuedRefineCount,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [refineNote, setRefineNote] = useState('')
  if (!summary) return null

  const noteTrimmed = refineNote.trim()
  const canQueue = !!(onQueueRefine && (active || refining) && noteTrimmed.length >= 2)
  const canSubmitRefine = !!onRefine && !active && !refining && noteTrimmed.length >= 2
  const textareaDisabled = refining && !onQueueRefine ? true : active && !onQueueRefine ? true : false

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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="brief-enrich-body"
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-indigo-50/40 focus:bg-indigo-50/60 focus:outline-none"
      >
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
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-indigo-900">
                AI가 입력을 정리했어요
              </p>
              {refinementCount && refinementCount > 0 ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-600/90 px-2 py-0.5 text-[10px] font-semibold text-white"
                  title="이 세션에서 보강 메모로 재생성한 횟수"
                >
                  보강 {refinementCount}회 누적
                </span>
              ) : null}
              {queuedRefineCount && queuedRefineCount > 0 ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-amber-600/90 px-2 py-0.5 text-[10px] font-semibold text-white"
                  title="생성이 끝나면 요청사항에 합쳐질 메모 개수"
                >
                  대기 {queuedRefineCount}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[11px] text-indigo-900/70 leading-snug">
              사용자가 적은 메모를 본 문서 생성 직전에 컨셉·필수 디테일·주의 포인트로 다시 정리했어요. 마음에 들지 않으면
              아래 보강 메모에 한 줄을 적거나 위 폼의 요청사항을 더 구체적으로 적어 주세요.
            </p>
          </div>
        </div>
        <span
          aria-hidden
          className="shrink-0 rounded-lg border border-indigo-200 bg-white px-2 py-1 text-[11px] font-medium text-indigo-700"
        >
          {open ? '접기' : '펴기'}
        </span>
      </button>

      {open ? (
        <div
          id="brief-enrich-body"
          className="max-h-[min(42vh,22rem)] overflow-y-auto overscroll-y-contain border-t border-indigo-100/80 md:max-h-none"
        >
          <div className="space-y-3 px-4 py-3 text-[12.5px] text-indigo-950/90">
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

          {(onRefine || onQueueRefine) ? (
            <div className="mt-2 rounded-xl border border-indigo-200 bg-white p-3">
              <p className="text-[11.5px] font-semibold text-indigo-900">
                결과가 마음에 들지 않으면 한 줄로 알려 주세요
              </p>
              <p className="mt-0.5 text-[10.5px] text-indigo-700/80 leading-snug">
                {onQueueRefine && (active || refining)
                  ? '생성이 끝나면 요청사항에 합쳐 드려요. 끝난 뒤 다시 생성하면 반영돼요.'
                  : '예: “비전탑·줄다리기 종목을 더 강조해줘”, “VIP 의전 동선을 추가해줘”, “행사 톤은 격식 있게” — 입력 메모를 합쳐 즉시 다시 생성합니다.'}
              </p>
              <textarea
                value={refineNote}
                onChange={(e) => setRefineNote(e.target.value)}
                rows={2}
                placeholder="추가하거나 빼고 싶은 디테일을 적어 주세요"
                className="mt-2 w-full rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-[12px] leading-relaxed text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                disabled={textareaDisabled}
              />
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[10px] text-indigo-700/60">
                  {active && !onQueueRefine
                    ? '생성이 진행 중이라 잠시 후 입력해 주세요.'
                    : refining && !onQueueRefine
                      ? '메모를 합쳐 다시 생성 중입니다…'
                      : `${noteTrimmed.length}/600자 · 2자 이상`}
                </p>
                <div className="flex flex-wrap justify-end gap-2">
                  {canQueue ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!canQueue) return
                        onQueueRefine?.(noteTrimmed.slice(0, 600))
                        setRefineNote('')
                      }}
                      className="rounded-lg border border-amber-500 bg-amber-50 px-3 py-1.5 text-[11.5px] font-semibold text-amber-950 shadow-sm hover:bg-amber-100"
                    >
                      대기열에 넣기
                    </button>
                  ) : null}
                  {onRefine ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!canSubmitRefine) return
                        onRefine(noteTrimmed.slice(0, 600))
                        setRefineNote('')
                      }}
                      disabled={!canSubmitRefine}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-[11.5px] font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                    >
                      이 메모로 다시 생성
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

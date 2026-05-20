'use client'

import type { PlanningDoc, QuoteDoc } from '@/lib/types'

// ─── 섹션 헤더 ────────────────────────────────────────────────────────────────
function SectionHeader({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-baseline gap-2.5 border-b-2 border-slate-800 pb-1 mb-3">
      <span className="text-base font-extrabold text-slate-800 tabular-nums">{n}</span>
      <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
    </div>
  )
}

// ─── 나레이션 블록 ─────────────────────────────────────────────────────────────
function Narrative({ text }: { text: string }) {
  if (!text?.trim()) return null
  return (
    <p className="whitespace-pre-wrap text-sm leading-[1.9] text-slate-700">{text.trim()}</p>
  )
}

// ─── 공통 테이블 ──────────────────────────────────────────────────────────────
function DocTable({ head, rows }: {
  head: string[]
  rows: (string | React.ReactNode)[][]
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-800 text-white">
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left text-xs font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
              {row.map((cell, j) => (
                <td key={j} className="border-b border-slate-200 px-3 py-2 text-slate-700 align-top text-xs sm:text-sm">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── 세부 프로그램 블록 ───────────────────────────────────────────────────────
function ProgramBlock({ n, block }: { n: number; block: NonNullable<PlanningDoc['actionProgramBlocks']>[number] }) {
  const desc = block.description?.trim() ?? ''

  // description을 ■ 섹션 기준으로 파싱
  const sections = desc.split(/(?=■)/).filter(Boolean)

  return (
    <div className="mb-6">
      <SectionHeader n={n} title={`${block.dayLabel ? block.dayLabel + ' — ' : ''}${block.title}`} />
      <div className="text-xs text-slate-500 mb-2">{block.timeRange} · {block.participants}</div>

      {sections.length > 1 ? (
        <div className="space-y-3">
          {sections.map((sec, i) => {
            const firstNl = sec.indexOf('\n')
            const heading = firstNl > 0 ? sec.slice(0, firstNl).trim() : sec.trim()
            const body = firstNl > 0 ? sec.slice(firstNl + 1).trim() : ''
            return (
              <div key={i}>
                <div className="text-xs font-bold text-slate-700 mb-0.5">{heading}</div>
                {body ? <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{body}</p> : null}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{desc}</p>
      )}
    </div>
  )
}

// ─── 견적 요약 ────────────────────────────────────────────────────────────────
function BudgetSection({ doc }: { doc: QuoteDoc }) {
  const items = doc.quoteItems ?? []
  if (items.length === 0 || items.every(c => (c.items ?? []).length === 0)) return null

  const rows: [string, string, string, string, string][] = []
  let subTotal = 0
  for (const cat of items) {
    for (const item of cat.items ?? []) {
      const total = (item.unitPrice ?? 0) * (item.qty ?? 1)
      subTotal += total
      rows.push([
        cat.category || '',
        item.name,
        item.spec || '',
        `${(item.qty ?? 1)}${item.unit || '식'}`,
        `${total.toLocaleString()}원`,
      ])
    }
  }
  const exp = Math.round(subTotal * (doc.expenseRate || 0) / 100)
  const prof = Math.round(subTotal * (doc.profitRate || 0) / 100)
  const supply = subTotal + exp + prof
  const vat = Math.round(supply * 0.1)
  const grand = supply + vat - (doc.cutAmount || 0)

  return (
    <div>
      <DocTable
        head={['카테고리', '항목', '규격', '수량', '금액']}
        rows={rows}
      />
      <div className="mt-2 space-y-1 text-xs text-right text-slate-600">
        <div>소 계: {subTotal.toLocaleString()}원</div>
        {exp > 0 && <div>제경비 ({doc.expenseRate}%): {exp.toLocaleString()}원</div>}
        {prof > 0 && <div>기업이윤 ({doc.profitRate}%): {prof.toLocaleString()}원</div>}
        <div>공급가액: {supply.toLocaleString()}원</div>
        <div>부가세 (10%): {vat.toLocaleString()}원</div>
        <div className="text-sm font-bold text-slate-900 border-t border-slate-300 pt-1">
          합 계: {grand.toLocaleString()}원
        </div>
      </div>
      {doc.notes ? (
        <p className="mt-2 text-xs text-slate-500 whitespace-pre-wrap">※ {doc.notes}</p>
      ) : null}
    </div>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────
type Props = {
  eventName: string
  planning: PlanningDoc
  doc?: QuoteDoc
  onPatch: (patch: Partial<PlanningDoc>) => void
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function PlanningProposalView({ eventName, planning: p, doc }: Props) {
  const timeline = doc?.program?.timeline ?? []
  const hasTimeline = timeline.length > 0
  const blocks = p.actionProgramBlocks ?? []
  const hasBudget = (doc?.quoteItems ?? []).some(c => (c.items ?? []).length > 0)

  // 섹션 번호 카운터
  let sn = 0
  const n = () => ++sn

  return (
    <div className="planning-proposal-print mx-auto max-w-3xl bg-white px-6 py-8 text-slate-900 print:px-0">

      {/* ── 표지 ── */}
      <div className="mb-10 border-b-4 border-slate-800 pb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">행 사 제 안 서</p>
        <h1 className="text-2xl font-extrabold leading-snug text-slate-900 sm:text-3xl">
          {eventName || '행사 제안서'}
        </h1>
        {p.subtitle ? (
          <p className="mt-2 text-sm font-semibold text-amber-600">{p.subtitle}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-slate-500">
          {doc?.clientName ? <span>의뢰처: <strong className="text-slate-700">{doc.clientName}</strong></span> : null}
          {doc?.eventDate ? <span>일정: <strong className="text-slate-700">{doc.eventDate}</strong></span> : null}
          {doc?.venue ? <span>장소: <strong className="text-slate-700">{doc.venue}</strong></span> : null}
          {doc?.headcount ? <span>인원: <strong className="text-slate-700">{doc.headcount}</strong></span> : null}
          {doc?.quoteDate ? <span>작성일: <strong className="text-slate-700">{doc.quoteDate}</strong></span> : null}
        </div>
      </div>

      <div className="space-y-10">

        {/* ── 1. 행사 개요 ── */}
        {p.programOverviewRows && p.programOverviewRows.length > 0 && (
          <section>
            <SectionHeader n={n()} title="행사 개요" />
            <DocTable
              head={['구분', '내용', '비고']}
              rows={p.programOverviewRows.map(r => [r.label, r.value, r.detail ?? ''])}
            />
          </section>
        )}

        {/* ── 2. 기획 의도 ── */}
        {p.overview?.trim() && (
          <section>
            <SectionHeader n={n()} title="기획 의도" />
            <Narrative text={p.overview} />
          </section>
        )}

        {/* ── 3. 대상 특성 분석 ── */}
        {p.audienceAnalysis && p.audienceAnalysis.length > 0 && (
          <section>
            <SectionHeader n={n()} title="대상 특성 분석" />
            <ul className="space-y-1.5">
              {p.audienceAnalysis.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 shrink-0 text-slate-400">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── 4. 핵심 운영 방향 ── */}
        {p.keyDirections && p.keyDirections.length > 0 && (
          <section>
            <SectionHeader n={n()} title="핵심 운영 방향" />
            <ul className="space-y-2">
              {p.keyDirections.map((dir, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="shrink-0 font-bold text-slate-500">{i + 1}.</span>
                  <span>{dir}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── 5. 장소 운영 방향 ── */}
        {p.venueGuide?.trim() && (
          <section>
            <SectionHeader n={n()} title="장소 운영 방향" />
            <Narrative text={p.venueGuide} />
          </section>
        )}

        {/* ── 6. 전체 일정표 ── */}
        {hasTimeline && (
          <section>
            <SectionHeader n={n()} title="전체 일정표" />
            <DocTable
              head={['시간', '구분 / 내용', '세부 운영', '담당']}
              rows={timeline.map(row => [row.time, row.content, row.detail ?? '', row.manager ?? ''])}
            />
          </section>
        )}

        {/* ── 7+. 세부 프로그램 (블록별 섹션) ── */}
        {blocks.map((block) => (
          <section key={block.order}>
            <ProgramBlock n={n()} block={block} />
          </section>
        ))}

        {/* ── 진행자 운영 멘트 예시 ── */}
        {p.facilitatorNotes && p.facilitatorNotes.length > 0 && (
          <section>
            <SectionHeader n={n()} title="진행자 운영 멘트 예시" />
            <DocTable
              head={['시점', '멘트']}
              rows={p.facilitatorNotes.map(note => [
                <span key="m" className="font-semibold text-slate-700">{note.moment}</span>,
                <span key="s" className="italic text-slate-600">"{note.script}"</span>,
              ])}
            />
          </section>
        )}

        {/* ── 우천 · 돌발 상황 대체 운영안 ── */}
        {p.contingencyPlan?.trim() && (
          <section>
            <SectionHeader n={n()} title="우천 · 돌발 상황 대체 운영안" />
            <Narrative text={p.contingencyPlan} />
          </section>
        )}

        {/* ── 견적서 ── */}
        {hasBudget && doc && (
          <section>
            <SectionHeader n={n()} title="견적서" />
            <BudgetSection doc={doc} />
          </section>
        )}

        {/* ── 기대 효과 ── */}
        {((p.expectedEffectsShortTerm?.length ?? 0) > 0 || (p.expectedEffectsLongTerm?.length ?? 0) > 0) && (
          <section>
            <SectionHeader n={n()} title="기대 효과" />
            <DocTable
              head={['영역', '기대 효과']}
              rows={[
                ...(p.expectedEffectsShortTerm ?? []).map(e => ['단기', e]),
                ...(p.expectedEffectsLongTerm ?? []).map(e => ['장기', e]),
              ]}
            />
          </section>
        )}

        {/* ── 맺음말 ── */}
        <div className="border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
          <p>위와 같이 제안드립니다. 검토 후 회신 부탁드립니다.</p>
          {doc?.quoteDate ? <p className="mt-1">{doc.quoteDate.slice(0, 7).replace('-', '년 ').replace('-', '월')}</p> : null}
        </div>

      </div>
    </div>
  )
}

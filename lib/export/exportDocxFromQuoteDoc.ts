/**
 * QuoteDoc → 각 생성기별 워드(.docx) export 통합 진입점.
 *
 * 각 generator 페이지는 이 모듈의 함수만 호출하면 되도록 매핑·예외 처리를 집약한다.
 * - 기획 / 시나리오 / 큐시트 / 사회자 멘트 / 프로그램 제안 5종 모두 지원.
 * - 견적기에서도 program 제안용 워드를 그대로 호출해 "행사 제안서" 생성을 대체할 수 있다.
 */
import type {
  EmceeScriptLine,
  ProgramTableRow,
  QuoteDoc,
  CueSheetRow,
} from '@/lib/types'
import type {
  CuesheetContent,
  CuesheetRow,
  EmceeContent,
  EmceeSegment,
  ProgramRow,
  ProposalContent,
  QuoteData,
  QuoteLineItem,
} from '@/lib/types/doc-content'
import { exportProposalDocx } from './exportProposalDocx'
import { exportEmceeDocx } from './exportEmceeDocx'
import { exportCuesheetDocx } from './exportCuesheetDocx'
import { exportPlanningDocx } from './exportPlanningDocx'
import { exportScenarioDocx } from './exportScenarioDocx'

function s(v: unknown): string {
  return String(v ?? '').trim()
}

function splitLines(value: string | undefined): string[] {
  return s(value)
    .split(/\n+/u)
    .map((line) => line.trim())
    .filter(Boolean)
}

function mapProgramRows(rows: ProgramTableRow[] | undefined): ProgramRow[] {
  if (!rows?.length) return []
  return rows.map((r) => ({
    stage: [s(r.kind), s(r.audience) ? `[${s(r.audience)}]` : ''].filter(Boolean).join(' ').trim() || '프로그램',
    name: s(r.kind) || s(r.content).slice(0, 20) || '프로그램',
    detail: [s(r.content), s(r.notes) ? `(${s(r.notes)})` : ''].filter(Boolean).join(' '),
    duration: s(r.time),
  }))
}

function mapEmceeSegments(lines: EmceeScriptLine[] | undefined): EmceeSegment[] {
  if (!lines?.length) return []
  return lines.map((l, idx) => ({
    sequence: Number.parseInt(s(l.order) || '', 10) || idx + 1,
    time: s(l.time) || undefined,
    stage: s(l.segment) || '구간',
    cue: undefined,
    script: s(l.script),
    notes: s(l.notes) || undefined,
  }))
}

function mapCueRows(rows: CueSheetRow[] | undefined): CuesheetRow[] {
  if (!rows?.length) return []
  return rows.map((r) => ({
    time: s(r.time),
    duration: '',
    program: s(r.content) || s(r.order) || '항목',
    detail: s(r.script),
    format: s(r.order) || '',
    staff: s(r.staff),
    equipment: s(r.prep) || undefined,
    notes: s(r.special) || undefined,
  }))
}

function mapQuoteItemsForProposal(doc: QuoteDoc): QuoteData | undefined {
  const flat: QuoteLineItem[] = []
  for (const cat of doc.quoteItems ?? []) {
    for (const it of cat.items ?? []) {
      if (!s(it.name)) continue
      flat.push({
        name: `[${s(cat.category) || '항목'}] ${s(it.name)}`,
        unitPrice: Number.isFinite(it.unitPrice) ? Number(it.unitPrice) : 0,
        quantity: Number.isFinite(it.qty) ? Number(it.qty) : 0,
        unit: s(it.unit) || '식',
        subItems: s(it.spec) ? [`· ${s(it.spec)}`] : undefined,
      })
    }
  }
  if (!flat.length) return undefined
  return {
    companyName: undefined,
    representative: undefined,
    contact: undefined,
    items: flat.slice(0, 60),
    expenseRate: Number.isFinite(doc.expenseRate) ? Number(doc.expenseRate) : 10,
    profitAmount: 0,
    includeVat: true,
  }
}

function toProposalContent(
  doc: QuoteDoc,
  options?: { includeQuote?: boolean; budget?: string },
): ProposalContent {
  const program = doc.program
  const concept = s(program?.concept)
  const tagline = concept ? concept.split(/\n+/u)[0].slice(0, 80) : ''
  const highlights = (program?.tips ?? []).map((t) => s(t)).filter(Boolean).slice(0, 5)
  return {
    clientName: s(doc.clientName),
    contact: s(doc.clientTel),
    eventName: s(doc.eventName),
    eventDate: s(doc.eventDate),
    eventPlace: s(doc.venue),
    headcount: s(doc.headcount),
    budget: s(options?.budget) || '협의',
    eventType: s(doc.eventType),
    tagline,
    highlights,
    programFlow: mapProgramRows(program?.programRows),
    followUp: [],
    notes: splitLines(doc.notes),
    quote: options?.includeQuote ? mapQuoteItemsForProposal(doc) : undefined,
  }
}

function toEmceeContent(doc: QuoteDoc): EmceeContent {
  const script = doc.emceeScript
  return {
    eventName: s(doc.eventName),
    eventDate: s(doc.eventDate),
    tone: s(script?.hostGuidelines).slice(0, 40) || '진중하고 따뜻한 톤',
    segments: mapEmceeSegments(script?.lines),
    notes: splitLines(script?.summaryTop),
  }
}

function toCuesheetContent(doc: QuoteDoc): CuesheetContent {
  return {
    eventName: s(doc.eventName),
    eventDate: s(doc.eventDate),
    eventPlace: s(doc.venue),
    headcount: s(doc.headcount),
    cuesheetType: s(doc.eventType) || '행사 운영',
    rows: mapCueRows(doc.program?.cueRows),
    staffList: undefined,
    notes: splitLines(doc.program?.cueSummary),
  }
}

export async function exportProgramProposalDocxFromDoc(
  doc: QuoteDoc,
  options?: { includeQuote?: boolean; allowEmptyProgram?: boolean; budget?: string },
): Promise<void> {
  const hasProgram = (doc.program?.programRows?.length ?? 0) > 0 || s(doc.program?.concept).length > 0
  const hasQuote = (doc.quoteItems ?? []).some((c) => (c.items ?? []).length > 0)
  if (!hasProgram && !options?.allowEmptyProgram) {
    throw new Error('프로그램 본문이 비어 있습니다. 먼저 프로그램 제안을 생성해 주세요.')
  }
  if (!hasProgram && !hasQuote && options?.allowEmptyProgram) {
    throw new Error('프로그램·견적 본문이 모두 비어 있습니다. 먼저 견적을 생성해 주세요.')
  }
  await exportProposalDocx(toProposalContent(doc, options))
}

export async function exportEmceeScriptDocxFromDoc(doc: QuoteDoc): Promise<void> {
  if (!doc.emceeScript?.lines?.length) {
    throw new Error('사회자 멘트 본문이 비어 있습니다. 먼저 사회자 멘트를 생성해 주세요.')
  }
  await exportEmceeDocx(toEmceeContent(doc))
}

export async function exportCueSheetDocxFromDoc(doc: QuoteDoc): Promise<void> {
  if (!doc.program?.cueRows?.length) {
    throw new Error('큐시트 본문이 비어 있습니다. 먼저 큐시트를 생성해 주세요.')
  }
  await exportCuesheetDocx(toCuesheetContent(doc))
}

export async function exportPlanningDocxFromDoc(doc: QuoteDoc): Promise<void> {
  await exportPlanningDocx(doc)
}

export async function exportScenarioDocxFromDoc(doc: QuoteDoc): Promise<void> {
  await exportScenarioDocx(doc)
}

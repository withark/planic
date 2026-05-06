import type { CuesheetContent, EmceeContent, ProposalContent } from '@/lib/types/doc-content'
import type { TaskSummary } from '@/lib/types/task-summary'

export type DocQualityDocKind = 'proposal' | 'cuesheet' | 'emcee' | 'taskSummary'

/** 스프레드 시 선택 필드가 undefined로 덮어쓰이지 않도록 제거 */
export function omitUndefinedProps<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {}
  for (const key of Object.keys(obj) as (keyof T)[]) {
    const v = obj[key as string]
    if (v !== undefined) out[key] = v as T[keyof T]
  }
  return out
}

/** 검증 실패 시 사람이 읽기 쉬운 이슈 목록 (프롬프트 보정용) */
export function collectProposalQualityIssues(content: ProposalContent): string[] {
  const issues: string[] = []
  const tagline = String(content.tagline ?? '').trim()
  if (tagline.length < 4) issues.push('tagline이 너무 짧거나 비어 있습니다. 행사 콘셉트가 드러나는 한 줄로 채우세요.')

  const highlights = Array.isArray(content.highlights) ? content.highlights : []
  const solidHighlights = highlights.map((h) => String(h ?? '').trim()).filter(Boolean)
  if (solidHighlights.length < 3) issues.push(`highlights는 최소 3개 필요합니다. (현재 ${solidHighlights.length}개)`)
  for (let i = 0; i < solidHighlights.length; i += 1) {
    if (solidHighlights[i].length < 6) issues.push(`highlights[${i}] 내용을 더 구체적으로 확장하세요.`)
  }

  const flow = Array.isArray(content.programFlow) ? content.programFlow : []
  if (flow.length < 6) issues.push(`programFlow는 최소 6개 항목이 필요합니다. (현재 ${flow.length}개)`)
  flow.forEach((row, i) => {
    const stage = String(row?.stage ?? '').trim()
    const name = String(row?.name ?? '').trim()
    const detail = String(row?.detail ?? '').trim()
    const duration = String(row?.duration ?? '').trim()
    if (stage.length < 2) issues.push(`programFlow[${i}].stage를 구체적으로 작성하세요.`)
    if (name.length < 2) issues.push(`programFlow[${i}].name을 구체적인 프로그램명으로 작성하세요.`)
    if (detail.length < 20) issues.push(`programFlow[${i}].detail을 운영 방법이 드러나도록 2문장 이상으로 확장하세요.`)
    if (duration.length < 1) issues.push(`programFlow[${i}].duration에 예상 소요 시간을 넣으세요.`)
  })

  return issues
}

export function collectCuesheetQualityIssues(content: CuesheetContent): string[] {
  const issues: string[] = []
  const rows = Array.isArray(content.rows) ? content.rows : []
  if (rows.length < 10) issues.push(`rows는 최소 10개 이상이어야 합니다. (현재 ${rows.length}개) 셋업·리허설부터 행사 종료까지 빠짐없이 채우세요.`)

  rows.forEach((row, i) => {
    const detail = String(row?.detail ?? '').trim()
    const program = String(row?.program ?? '').trim()
    if (program.length < 2) issues.push(`rows[${i}].program을 구체적인 구간명으로 작성하세요.`)
    if (detail.length < 15) issues.push(`rows[${i}].detail을 현장 실행 가능한 수준으로 구체화하세요.`)
  })

  const staff = Array.isArray(content.staffList) ? content.staffList : []
  const staffOk = staff.map((s) => String(s ?? '').trim()).filter(Boolean)
  if (staffOk.length < 2) issues.push(`staffList에 역할별 인력을 최소 2개 이상 넣으세요. (예: "MC 1인", "음향 1인")`)

  const notes = Array.isArray(content.notes) ? content.notes : []
  const notesOk = notes.map((n) => String(n ?? '').trim()).filter(Boolean)
  if (notesOk.length < 3) issues.push('notes에 현장 유의사항을 최소 3개 이상 작성하세요.')

  return issues
}

export function collectTaskSummaryQualityIssues(s: TaskSummary): string[] {
  const issues: string[] = []
  const t = (v: unknown) => String(v ?? '').trim()

  if (t(s.projectTitle).length < 2) issues.push('projectTitle(사업명)을 구체적으로 채우세요.')
  if (t(s.orderingOrganization).length < 2) issues.push('orderingOrganization(발주기관)을 채우세요.')

  const purpose = t(s.purpose)
  const scope = t(s.mainScope)
  if (purpose.length < 30 && scope.length < 30) {
    issues.push('purpose 또는 mainScope 중 하나는 최소 30자 이상으로 사업 목적·범위가 드러나게 작성하세요.')
  }

  const oneLine = t(s.oneLineSummary)
  if (oneLine.length < 8) issues.push('oneLineSummary를 8자 이상으로 핵심을 요약하세요.')
  if (oneLine.length > 80) issues.push('oneLineSummary는 80자 이내로 간결하게 조정하세요.')

  const filledCount = [
    t(s.eventRange),
    t(s.deliverables),
    t(s.requiredStaffing),
    t(s.budget),
    t(s.specialNotes),
  ].filter((x) => x.length >= 8).length
  if (filledCount < 2) {
    issues.push('eventRange, deliverables, requiredStaffing, budget, specialNotes 중 최소 2개 이상을 문서 근거로 구체적으로 채우세요.')
  }

  return issues
}

export function normalizeTaskSummaryPatch(patch: Partial<TaskSummary>): TaskSummary {
  const keys: (keyof TaskSummary)[] = [
    'projectTitle',
    'orderingOrganization',
    'purpose',
    'mainScope',
    'eventRange',
    'deliverables',
    'requiredStaffing',
    'budget',
    'specialNotes',
    'oneLineSummary',
  ]
  const out = {} as TaskSummary
  for (const k of keys) {
    out[k] = String(patch[k] ?? '').trim()
  }
  return out
}

export function collectEmceeQualityIssues(content: EmceeContent): string[] {
  const issues: string[] = []
  const segments = Array.isArray(content.segments) ? content.segments : []
  if (segments.length < 8) issues.push(`segments는 최소 8개 이상이어야 합니다. (현재 ${segments.length}개) 시작부터 종료까지 전 구간을 커버하세요.`)

  segments.forEach((seg, i) => {
    const stage = String(seg?.stage ?? '').trim()
    const script = String(seg?.script ?? '').trim()
    if (stage.length < 2) issues.push(`segments[${i}].stage에 구간명(예: 오프닝, 본행사)을 넣으세요.`)
    if (script.length < 40) issues.push(`segments[${i}].script를 사회자가 그대로 읽을 수 있는 완성 멘트로 확장하세요. (현재 너무 짧음)`)
  })

  return issues
}

export function normalizeProposalContentPatch(patch: Partial<ProposalContent>): Partial<ProposalContent> {
  return {
    ...patch,
    tagline: String(patch.tagline ?? '').trim(),
    highlights: Array.isArray(patch.highlights) ? patch.highlights.map((h) => String(h ?? '').trim()).filter(Boolean) : [],
    programFlow: Array.isArray(patch.programFlow) ? patch.programFlow : [],
    followUp: Array.isArray(patch.followUp) ? patch.followUp.map((h) => String(h ?? '').trim()).filter(Boolean) : undefined,
    notes: Array.isArray(patch.notes) ? patch.notes.map((h) => String(h ?? '').trim()).filter(Boolean) : undefined,
  }
}

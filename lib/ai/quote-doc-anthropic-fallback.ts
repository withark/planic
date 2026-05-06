import Anthropic from '@anthropic-ai/sdk'
import { claudeRepairJsonText, parseRepairedJson } from '@/lib/ai/claude-json-repair'
import { normalizeQuoteDoc } from '@/lib/ai/parsers'
import type { QuoteDoc } from '@/lib/types'
import type { AppDocumentType } from '@/lib/plan-access'

function mergeQuoteDocKeepEstimateCore(base: QuoteDoc, repaired: QuoteDoc): QuoteDoc {
  return {
    ...repaired,
    quoteItems: base.quoteItems,
    expenseRate: base.expenseRate,
    profitRate: base.profitRate,
    cutAmount: base.cutAmount,
    quoteTemplate: base.quoteTemplate,
    budgetConstraint: base.budgetConstraint,
    eventName: base.eventName,
    clientName: base.clientName,
    clientManager: base.clientManager,
    clientTel: base.clientTel,
    quoteDate: base.quoteDate,
    eventDate: base.eventDate,
    eventDuration: base.eventDuration,
    venue: base.venue,
    headcount: base.headcount,
    eventType: base.eventType,
    validDays: base.validDays,
    paymentTerms: base.paymentTerms,
    notes: repaired.notes ?? base.notes,
    program: repaired.program ?? base.program,
    scenario: repaired.scenario ?? base.scenario,
    planning: repaired.planning ?? base.planning,
    emceeScript: repaired.emceeScript ?? base.emceeScript,
  }
}

/**
 * 비-estimate 생성 후에도 남은 품질 이슈가 있을 때, Anthropic으로 QuoteDoc 전체를 한 번 더 보정합니다.
 * 견적 코어(항목·단가 관련)는 원본을 유지합니다.
 */
export async function anthropicFallbackRepairQuoteDoc(params: {
  client: Anthropic
  doc: QuoteDoc
  issues: string[]
  documentTarget: AppDocumentType
  normalizeOpts: Parameters<typeof normalizeQuoteDoc>[1]
}): Promise<QuoteDoc> {
  const { client, doc, issues, normalizeOpts, documentTarget } = params
  if (issues.length === 0) return doc

  const userPrompt = `다음은 플래닉 행사 문서(QuoteDoc) JSON입니다. 문서 타깃(documentTarget)은 "${documentTarget}" 입니다. 품질 검증 이슈를 모두 해결한 수정본만 출력하세요.

[품질 이슈]
${issues.map((s) => `- ${s}`).join('\n')}

[규칙]
- quoteItems, expenseRate, profitRate, cutAmount, quoteTemplate, budgetConstraint 필드는 원본과 값이 같아야 합니다(JSON 동일).
- 상단 메타(eventName, clientName, quoteDate, venue 등)는 원본과 동일하게 유지하세요.
- program / scenario / planning / emceeScript 등 서술·구조 필드를 이슈에 맞게 보강하세요.
- 출력은 마크다운 없이 단일 JSON만.

[원본 JSON]
${JSON.stringify(doc)}`

  const raw = await claudeRepairJsonText({
    client,
    userRepairPrompt: userPrompt,
    maxTokens: 8192,
  })

  let repairedParsed = parseRepairedJson<QuoteDoc>(raw)
  repairedParsed = normalizeQuoteDoc(repairedParsed, normalizeOpts)
  return mergeQuoteDocKeepEstimateCore(doc, repairedParsed)
}

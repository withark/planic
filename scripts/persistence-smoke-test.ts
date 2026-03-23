/**
 * DBless 환경에서 file-persistence 폴백이 실제로 동작하는지 확인합니다.
 * - `DATABASE_URL`을 빈 값으로 만들어 hasDatabase() == false를 강제
 * - insert -> get/list -> update -> 재로드를 최소 경로로 검증
 */
process.env.DATABASE_URL = ''

import { insertReferenceDoc, listReferenceDocs, setActiveReferenceDoc, listReferenceDocsForStyle } from '@/lib/db/reference-docs-db'
import { quotesDbAppend, quotesDbGetAll, quotesDbGetById, quotesDbUpdateById } from '@/lib/db/quotes-db'
import { insertGeneratedDoc, getGeneratedDocById, listGeneratedDocsByType, updateGeneratedDocById } from '@/lib/db/generated-docs-db'
import type { HistoryRecord, QuoteDoc, ReferenceDoc } from '@/lib/types'

function makeQuoteDoc(eventName: string, eventType: string): QuoteDoc {
  return {
    eventName,
    clientName: '테스트고객',
    clientManager: '',
    clientTel: '',
    quoteDate: new Date().toISOString().slice(0, 10),
    eventDate: '',
    eventDuration: '',
    venue: '잠실',
    headcount: '100',
    eventType,
    quoteItems: [
      {
        category: '기타',
        items: [
          { name: '기본 항목', spec: '', qty: 1, unit: '식', unitPrice: 100000, total: 100000, note: '', kind: '필수' },
        ],
      },
    ],
    expenseRate: 10,
    profitRate: 5,
    cutAmount: 0,
    notes: '메모',
    paymentTerms: '',
    validDays: 7,
    program: {
      concept: '',
      programRows: [],
      timeline: [],
      staffing: [],
      tips: [],
      cueRows: [],
      cueSummary: '',
    },
    planning: undefined,
    scenario: undefined,
    quoteTemplate: 'default',
  }
}

async function main() {
  const userId = `smoke_${Date.now()}`

  // 1) reference-docs
  const inputRef: Omit<ReferenceDoc, 'id'> = {
    filename: 'ref.txt',
    uploadedAt: new Date().toISOString(),
    summary: '{"categoryOrder":["기본","필수","선택"]}',
    rawText: 'raw',
    extractedPrices: [],
    isActive: false,
  }
  const ref = await insertReferenceDoc(userId, inputRef)
  const refs = await listReferenceDocs(userId)
  if (!refs.some((r) => r.id === ref.id)) throw new Error('reference-docs insert/list failed')

  await setActiveReferenceDoc(userId, ref.id)
  const styleRefs = await listReferenceDocsForStyle(userId, 1)
  if (styleRefs.length !== 1 || !styleRefs[0].isActive) throw new Error('reference-docs setActive/listForStyle failed')

  // 2) quotes/history
  const doc0 = makeQuoteDoc('행사A', '기타')
  const history0: HistoryRecord = {
    id: 'quote_1',
    eventName: doc0.eventName,
    clientName: doc0.clientName,
    quoteDate: doc0.quoteDate,
    eventDate: doc0.eventDate,
    duration: doc0.eventDuration,
    type: doc0.eventType,
    headcount: doc0.headcount,
    total: 0,
    savedAt: new Date().toISOString(),
    doc: doc0,
    generationMeta: { engineSnapshot: {} },
  }
  await quotesDbAppend(history0, userId)
  const all0 = await quotesDbGetAll(userId)
  if (!all0.some((h) => h.id === history0.id)) throw new Error('quotes append/getAll failed')

  const existing0 = await quotesDbGetById(history0.id, userId)
  if (!existing0) throw new Error('quotes getById failed')

  const doc1 = makeQuoteDoc('행사B', '컨퍼런스')
  await quotesDbUpdateById({ id: history0.id, userId, doc: doc1 })
  const afterUpdate = await quotesDbGetById(history0.id, userId)
  if (!afterUpdate?.doc || afterUpdate.doc.eventName !== '행사B') throw new Error('quotes update did not persist')

  // 3) generated-docs
  const gDoc0 = makeQuoteDoc('행사C', '기타')
  await insertGeneratedDoc({ userId, id: 'gen_1', docType: 'estimate', doc: gDoc0 })
  const g0 = await getGeneratedDocById({ userId, id: 'gen_1' })
  if (!g0 || g0.payload.eventName !== '행사C') throw new Error('generated-docs insert/get failed')

  const gDoc1 = makeQuoteDoc('행사D', '기타')
  await updateGeneratedDocById({ userId, id: 'gen_1', doc: gDoc1 })
  const g1 = await getGeneratedDocById({ userId, id: 'gen_1' })
  if (!g1 || g1.payload.eventName !== '행사D') throw new Error('generated-docs update did not persist')

  const listByType = await listGeneratedDocsByType({ userId, docType: 'estimate', limit: 10 })
  if (!listByType.some((d) => d.id === 'gen_1')) throw new Error('generated-docs listByType failed')

  console.log('[persistence-smoke-test] PASS')
}

void main().catch((e) => {
  console.error('[persistence-smoke-test] FAIL', e)
  process.exitCode = 1
})


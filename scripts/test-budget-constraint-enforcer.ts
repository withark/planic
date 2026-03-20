import { enforceBudgetHardConstraint } from '../lib/quote/budget-enforcer'
import type { QuoteDoc } from '../lib/types'
import { calcTotals } from '../lib/calc'

function makeQuoteDoc(overBudget: boolean): QuoteDoc {
  const basePm = overBudget ? 8_000_000 : 1_000_000
  const baseStaffUnit = overBudget ? 500_000 : 120_000

  return {
    eventName: '테스트 행사',
    clientName: '테스트',
    clientManager: '담당자',
    clientTel: '010-0000-0000',
    quoteDate: '2026-03-20',
    eventDate: '2026-03-25',
    eventDuration: '2시간',
    venue: '서울',
    headcount: '100명',
    eventType: '기업 행사',
    quoteTemplate: 'default',
    quoteItems: [
      {
        category: '인건비/운영',
        items: [
          {
            name: '총괄 PM',
            spec: '총괄 운영',
            qty: 1,
            unit: '식',
            unitPrice: basePm,
            total: 0,
            note: '',
            kind: '인건비',
          },
          {
            name: '현장 진행요원',
            spec: '등록/전환 지원',
            qty: overBudget ? 10 : 2,
            unit: '명',
            unitPrice: baseStaffUnit,
            total: 0,
            note: '',
            kind: '필수',
          },
        ],
      },
      {
        category: '무대/장비',
        items: [
          {
            name: '음향 오퍼레이터',
            spec: '음향 운영',
            qty: 1,
            unit: '식',
            unitPrice: overBudget ? 3_000_000 : 700_000,
            total: 0,
            note: '',
            kind: '필수',
          },
        ],
      },
      {
        category: '제작/홍보',
        items: [
          {
            name: '제작/홍보물 운영',
            spec: '배너/포토존',
            qty: 1,
            unit: '식',
            unitPrice: overBudget ? 2_000_000 : 300_000,
            total: 0,
            note: '',
            kind: '선택1',
          },
        ],
      },
    ],
    expenseRate: 10,
    profitRate: 15,
    cutAmount: 0,
    notes: '',
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
  }
}

function runOne(label: string, budgetLabel: string, doc: QuoteDoc) {
  const before = calcTotals(doc)
  const meta = enforceBudgetHardConstraint(doc, budgetLabel)
  const after = calcTotals(doc)

  console.log(`\n[CASE] ${label}`)
  console.log('budgetLabel:', budgetLabel)
  console.log('before grand:', before.grand.toLocaleString('ko-KR'))
  console.log('after grand:', after.grand.toLocaleString('ko-KR'))
  console.log('budgetCeilingKRW:', meta.budgetCeilingKRW?.toLocaleString('ko-KR') ?? 'null')
  console.log('budgetFit:', meta.budgetFit)
  console.log('optionalRemoved:', meta.adjustments.optionalRemoved)
  if (!meta.budgetFit) console.log('warning:', meta.warning || '(no warning)')
}

// 1) 상한(3,000,000원)보다 큰 합계에서, optional 제거/인원 축소/단가 하향으로 fit이 되는지
runOne(
  'small budget should fit',
  '소규모(300만원 이하)',
  makeQuoteDoc(true),
)

// 1-2) 3,000,000–5,000,000 범위(상한 5,000,000)에 대해 fit이 되는지
runOne(
  'mid budget should fit (ceiling 5,000,000)',
  '3,000,000~5,000,000 KRW',
  makeQuoteDoc(true),
)

// 1-3) 5,000,000–10,000,000 범위(상한 10,000,000)에 대해 fit이 되는지
runOne(
  'large budget should fit (ceiling 10,000,000)',
  '5,000,000~10,000,000 KRW',
  makeQuoteDoc(true),
)

// 2) 너무 낮은 상한에서 최소 viable조차 fit이 불가하면 budgetFit=false + warning이 나오는지
runOne(
  'impossible budget should warn',
  '1,000,000~1,500,000 KRW',
  makeQuoteDoc(true),
)


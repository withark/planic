/**
 * 모의(AI_MODE=mock) 생성 경로의 벽시계·meta.totalMs 상한 검증.
 * 실 LLM 비용 없이 파이프라인·보강 로직이 과도하게 느려지면 실패합니다.
 *
 * NODE_ENV=production 이더라도 VERCEL_ENV=development 로 비운영으로 간주해 mock 분기를 탑니다.
 */
import assert from 'node:assert/strict'
import type { GenerateInput } from '../lib/ai/types'
import type { QuoteDoc } from '../lib/types'

process.env.AI_MODE = 'mock'
process.env.VERCEL_ENV = 'development'

function baseDoc(): QuoteDoc {
  return {
    eventName: '사내 타운홀',
    clientName: '플래닉',
    clientManager: '홍길동',
    clientTel: '010-0000-0000',
    quoteDate: '2026-03-28',
    eventDate: '2026-04-20',
    eventDuration: '2시간',
    venue: '잠실',
    headcount: '120명',
    eventType: '기업행사 / 타운홀',
    quoteItems: [],
    expenseRate: 10,
    profitRate: 10,
    cutAmount: 0,
    notes: '기본 메모',
    paymentTerms: '계약금 50% 선입금',
    validDays: 30,
    program: {
      concept: '개요',
      programRows: [],
      timeline: [],
      staffing: [],
      tips: [],
      cueRows: [],
      cueSummary: '',
    },
    scenario: {
      summaryTop: '',
      opening: '',
      development: '',
      mainPoints: [],
      closing: '',
      directionNotes: '',
    },
    planning: {
      overview: '',
      scope: '',
      approach: '',
      operationPlan: '',
      deliverablesPlan: '',
      staffingConditions: '',
      risksAndCautions: '',
      checklist: [],
    },
    quoteTemplate: 'default',
  }
}

function baseInput(target: GenerateInput['documentTarget'], existingDoc?: QuoteDoc): GenerateInput {
  return {
    documentTarget: target,
    eventName: '사내 타운홀',
    clientName: '플래닉',
    clientManager: '홍길동',
    clientTel: '010-0000-0000',
    quoteDate: '2026-03-28',
    eventDate: '2026-04-20',
    eventDuration: '2시간',
    eventStartHHmm: '14:00',
    eventEndHHmm: '16:00',
    headcount: '120명',
    venue: '잠실',
    eventType: '기업행사 / 타운홀',
    budget: '중규모 (300~1,000만원)',
    requirements: '대표 발표, 질의응답',
    briefGoal: '메시지 정렬',
    briefNotes: 'VIP 좌석',
    prices: [],
    settings: {
      name: '플래닉',
      biz: '123-45-67890',
      ceo: '대표',
      contact: '담당자',
      tel: '02-000-0000',
      addr: '서울',
      expenseRate: 10,
      profitRate: 10,
      validDays: 30,
      paymentTerms: '계약금 50%',
    },
    references: [],
    existingDoc,
    userPlan: 'PREMIUM',
  }
}

async function main() {
  const maxMs = Math.max(500, Number.parseInt(process.env.GENERATION_SPEED_MOCK_MAX_MS || '8000', 10))

  const { generateQuoteWithMeta } = await import('../lib/ai/ai')

  const cases: { label: string; input: GenerateInput }[] = [
    { label: 'estimate', input: baseInput('estimate') },
    { label: 'planning', input: baseInput('planning', baseDoc()) },
    { label: 'program', input: baseInput('program', baseDoc()) },
  ]

  for (const { label, input } of cases) {
    const t0 = performance.now()
    const { meta } = await generateQuoteWithMeta(input)
    const wall = performance.now() - t0
    assert.ok(meta.totalMs <= maxMs, `${label}: meta.totalMs ${meta.totalMs} > ${maxMs}`)
    assert.ok(wall <= maxMs + 500, `${label}: wall ${wall.toFixed(0)}ms > ${maxMs + 500}`)
    console.log(`[generation-speed-mock] ${label} ok totalMs=${meta.totalMs} wall=${wall.toFixed(0)}ms`)
  }

  console.log('test:generation-speed-mock passed')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

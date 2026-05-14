/**
 * QuoteDoc → 각 워드(.docx) 출력 매핑 스모크.
 *
 * 실제 saveAs/Packer.toBlob은 브라우저 전용이라 호출하지 않고,
 * lib/export/exportDocxFromQuoteDoc.ts의 매핑 헬퍼만 단위로 검증한다.
 * - QuoteDoc → ProposalContent / EmceeContent / CuesheetContent
 * - briefEnrich fallback (tagline/highlights)
 * - includeQuote / allowEmptyProgram 옵션
 */
import assert from 'node:assert/strict'
import {
  toProposalContent,
  toEmceeContent,
  toCuesheetContent,
} from '../lib/export/exportDocxFromQuoteDoc'
import type { QuoteDoc } from '../lib/types'

function baseDoc(): QuoteDoc {
  return {
    eventName: '2026 봄 워크숍',
    clientName: '플래닉 주식회사',
    clientManager: '김담당',
    clientTel: '010-1234-5678',
    quoteDate: '2026-05-01',
    eventDate: '2026-06-12',
    eventDuration: '5시간',
    venue: '서울 강남구 OO센터',
    headcount: '120명',
    eventType: '워크숍',
    quoteItems: [
      {
        category: '인건비',
        items: [
          {
            name: '진행 MC',
            spec: '경력 5년 이상',
            qty: 1,
            unit: '인',
            unitPrice: 800_000,
            total: 800_000,
            note: '',
          },
        ],
      },
      {
        category: '운영',
        items: [
          {
            name: '음향 시스템',
            spec: 'PA 1조',
            qty: 1,
            unit: '식',
            unitPrice: 500_000,
            total: 500_000,
            note: '',
          },
        ],
      },
    ],
    expenseRate: 10,
    profitRate: 0,
    cutAmount: 0,
    notes: '점심 식사 포함 여부 확인 필요\n주차장 60대 이상',
    paymentTerms: '계산서 발행 후 30일 내',
    validDays: 14,
    program: {
      concept: '협업과 성과를 동시에. 팀 단위 미션과 회고로 한 해의 방향을 정합니다.',
      programRows: [
        {
          kind: '오프닝',
          content: '환영사 및 일정 안내',
          tone: '격식 있게',
          image: '',
          time: '09:30',
          audience: '전체',
          notes: '',
        },
        {
          kind: '팀빌딩 미션',
          content: '4개 부스 회전식 협업 미션',
          tone: '경쾌하게',
          image: '',
          time: '10:30',
          audience: '팀별',
          notes: '비전탑·줄다리기 강조',
        },
      ],
      timeline: [
        { time: '09:30', content: '환영', detail: '입장 안내', manager: 'MC' },
        { time: '10:30', content: '미션', detail: '4개 부스 회전', manager: '운영팀' },
      ],
      staffing: [
        { role: '진행 MC', count: 1, note: '경력 5년 이상' },
        { role: '운영 스태프', count: 3, note: '부스별 1인' },
      ],
      tips: ['VIP 동선 별도 안내', '점심 도시락 11:30 사전 배치', '비가 와도 실내 부스로 전환'],
      cueRows: [
        {
          time: '09:30',
          order: '1',
          content: '오프닝',
          staff: 'MC',
          prep: '마이크 ON',
          script: '안녕하세요, 2026 봄 워크숍에 오신 여러분 환영합니다.',
          special: '음향 BGM 페이드인',
        },
      ],
      cueSummary: '오프닝/미션/클로징 3블록',
    },
    scenario: {
      summaryTop: '한 해의 방향을 함께 세우는 협업 워크숍',
      opening: '환영사와 함께 행사 톤을 잡습니다.',
      development: '4개 부스 회전 미션으로 협업을 체험합니다.',
      mainPoints: ['비전탑 부스 강조', '줄다리기 결과 시상', 'VIP 의전 동선 분리'],
      closing: '한 해의 다짐을 공유하며 마무리합니다.',
      directionNotes: '조명은 따뜻한 톤, 음악은 미디엄 템포로.',
    },
    emceeScript: {
      summaryTop: '환영부터 시상까지 끊김 없는 진행',
      hostGuidelines: '진중하지만 따뜻한 톤, 호칭은 ‘여러분’ 일관 사용',
      lines: [
        {
          order: '1',
          time: '09:30',
          segment: '오프닝',
          script: '안녕하세요, 2026 봄 워크숍을 시작하겠습니다.',
          notes: '음향 BGM 페이드인',
        },
        {
          order: '2',
          time: '11:30',
          segment: '시상',
          script: '오늘 가장 활약하신 팀을 시상합니다.',
          notes: '시상품 사전 준비',
        },
      ],
    },
    planning: {
      overview: '협업·성과·방향성을 동시에 다루는 1일 워크숍.',
      scope: '인원 120명, 4개 부스 운영, 점심 포함.',
      approach: '회전식 미션 + 팀별 회고 + 시상으로 몰입과 보상의 균형 설계.',
      operationPlan: '오프닝-미션-점심-회고-시상-클로징.',
      deliverablesPlan: '운영 큐시트·진행 대본·결과 보고서.',
      staffingConditions: 'MC 1명, 운영 3명, 음향 1명.',
      risksAndCautions: '우천 시 실내 전환, 일정 지연 시 미션 단축.',
      checklist: ['음향 점검', 'VIP 의전 동선', '시상품 사전 배치'],
      subtitle: '함께 그리는 봄날의 방향',
      backgroundStats: [
        { value: '120', label: '참여 인원', detail: '4팀 × 30명' },
        { value: '4', label: '부스', detail: '회전식 미션' },
      ],
      programOverviewRows: [
        { label: '목표', value: '협업 강화', detail: '4개 부스 회전' },
        { label: '인원', value: '120명' },
      ],
      actionProgramBlocks: [
        {
          order: 1,
          dayLabel: 'D-day',
          title: '오프닝',
          description: '환영사 및 일정 안내',
          timeRange: '09:30 ~ 10:00',
          participants: '전체',
          accent: 'blue',
        },
      ],
      actionPlanTable: [
        { step: 'D-30', timing: '5월 12일', content: '현장 답사', owner: '운영팀' },
        { step: 'D-7', timing: '6월 5일', content: '리허설', owner: 'MC·운영' },
      ],
      expectedEffectsShortTerm: ['팀 단합 강화', '한 해 방향성 공유'],
      expectedEffectsLongTerm: ['협업 문화 정착', '리더십 파이프라인 강화'],
    },
    briefEnrich: {
      oneLiner: '함께 그리는 봄날의 방향',
      keyConcepts: ['협업', '회고', '시상', '몰입'],
      mustHaveDetails: ['VIP 의전 동선 분리', '4개 부스 회전 미션', '점심 도시락 11:30 배치'],
      toneGuide: '진중하지만 따뜻한 톤',
    },
  }
}

function emptyProgramDoc(): QuoteDoc {
  const d = baseDoc()
  d.program.programRows = []
  d.program.concept = ''
  d.program.tips = []
  return d
}

async function main() {
  const doc = baseDoc()

  // 1) Proposal 매핑 — program 본문이 있으면 program.tips를 highlight로
  const proposal = toProposalContent(doc, { includeQuote: true, budget: '8,000,000' })
  assert.equal(proposal.eventName, '2026 봄 워크숍', 'proposal eventName')
  assert.equal(proposal.contact, '010-1234-5678', 'proposal contact')
  assert.equal(proposal.budget, '8,000,000', 'proposal budget option')
  assert.ok(proposal.tagline.length > 0, 'proposal tagline non-empty')
  assert.ok(proposal.highlights.length === 3, 'proposal highlights from program.tips')
  assert.equal(proposal.programFlow.length, 2, 'proposal programFlow rows')
  assert.ok(proposal.quote, 'proposal quote present when includeQuote=true')
  assert.equal(proposal.quote!.items.length, 2, 'proposal quote items flattened')
  assert.ok(proposal.quote!.items[0].name.startsWith('[인건비]'), 'proposal quote category prefix')
  assert.deepEqual(proposal.followUp, [], 'proposal followUp empty (no fake paymentTerms)')

  // 2) Proposal 매핑 — program 본문이 비면 briefEnrich로 fallback
  const fallback = toProposalContent(emptyProgramDoc())
  assert.equal(fallback.tagline, '함께 그리는 봄날의 방향', 'tagline fallback to briefEnrich.oneLiner')
  assert.ok(fallback.highlights.length > 0, 'highlights fallback to briefEnrich')
  assert.ok(
    fallback.highlights.includes('협업') || fallback.highlights.includes('VIP 의전 동선 분리'),
    'highlights include enrich concepts or mustHave',
  )

  // 3) Emcee 매핑
  const emcee = toEmceeContent(doc)
  assert.equal(emcee.eventName, '2026 봄 워크숍', 'emcee eventName')
  assert.equal(emcee.segments.length, 2, 'emcee segments count')
  assert.equal(emcee.segments[0].stage, '오프닝', 'emcee segment stage')
  assert.equal(emcee.segments[0].sequence, 1, 'emcee segment sequence parsed from order')

  // 4) Cuesheet 매핑
  const cuesheet = toCuesheetContent(doc)
  assert.equal(cuesheet.rows.length, 1, 'cuesheet rows count')
  assert.equal(cuesheet.rows[0].program, '오프닝', 'cuesheet program from content')
  assert.equal(cuesheet.rows[0].staff, 'MC', 'cuesheet staff')
  assert.equal(cuesheet.rows[0].equipment, '마이크 ON', 'cuesheet equipment from prep')

  console.log('smoke-docx-exports passed')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

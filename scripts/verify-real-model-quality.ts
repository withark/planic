import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { generateQuote, type GenerateInput, type QuoteDoc } from '../lib/ai/ai'
import { getEnv } from '../lib/env'

type VerificationStatus = 'PASS' | 'FAIL' | 'BLOCKED'

interface ModeResult {
  mode: 'userStyle' | 'aiTemplate'
  categories: string[]
  itemNames: string[]
  notes: string
  paymentTerms: string
  quoteTemplate: string
  quoteItemCount: number
  hasPositivePriceItem: boolean
}

interface CaseResult {
  caseId: string
  caseName: string
  userStyle: ModeResult
  aiTemplate: ModeResult
  styleLearningCheck: { status: VerificationStatus; reason: string }
  templateModeCheck: { status: VerificationStatus; reason: string }
  outputQualityCheck: { status: VerificationStatus; reason: string }
}

function hasApiKey(): boolean {
  const env = getEnv()
  return Boolean(env.OPENAI_API_KEY || env.ANTHROPIC_API_KEY)
}

function toModeResult(mode: 'userStyle' | 'aiTemplate', doc: QuoteDoc): ModeResult {
  const quoteItems = doc.quoteItems || []
  const items = quoteItems.flatMap(c => c.items || [])
  return {
    mode,
    categories: quoteItems.map(c => c.category),
    itemNames: items.map(i => i.name),
    notes: doc.notes || '',
    paymentTerms: doc.paymentTerms || '',
    quoteTemplate: doc.quoteTemplate || '',
    quoteItemCount: items.length,
    hasPositivePriceItem: items.some(i => (i.unitPrice || 0) > 0 && (i.total || 0) > 0),
  }
}

function includesAny(texts: string[], terms: string[]): boolean {
  const joined = texts.join(' ').toLowerCase()
  return terms.some(t => joined.includes(t.toLowerCase()))
}

function classifyStyleLearning(user: ModeResult, styleKeywords: string[]): { status: VerificationStatus; reason: string } {
  const matched = includesAny([...user.categories, ...user.itemNames, user.notes], styleKeywords)
  return matched
    ? { status: 'PASS', reason: `학습 스타일 키워드 반영 확인(${styleKeywords.join(', ')})` }
    : { status: 'FAIL', reason: '학습 스타일 키워드 반영이 약함' }
}

function classifyTemplateMode(
  ai: ModeResult,
  styleKeywords: string[],
  templateKeywords: string[],
): { status: VerificationStatus; reason: string } {
  const hasStyleLeak = includesAny([...ai.categories, ...ai.itemNames, ai.notes], styleKeywords)
  const hasTemplateSignal = includesAny([...ai.categories, ...ai.itemNames, ai.notes], templateKeywords)
  if (hasStyleLeak) return { status: 'FAIL', reason: 'AI 템플릿 모드에 사용자 스타일 누수 징후' }
  if (!hasTemplateSignal) return { status: 'FAIL', reason: 'AI 템플릿 모드 시그널이 약함' }
  return { status: 'PASS', reason: '사용자 스타일 비의존 + 템플릿 시그널 확인' }
}

function classifyOutputQuality(user: ModeResult, ai: ModeResult): { status: VerificationStatus; reason: string } {
  const bothHaveItems = user.quoteItemCount > 0 && ai.quoteItemCount > 0
  const bothHavePrice = user.hasPositivePriceItem && ai.hasPositivePriceItem
  if (!bothHaveItems) return { status: 'FAIL', reason: '견적 항목이 비어 있음' }
  if (!bothHavePrice) return { status: 'FAIL', reason: '유효한 금액 항목이 없음' }
  return { status: 'PASS', reason: '양 모드 모두 최소 품질(항목/금액) 충족' }
}

async function runCase(
  caseId: string,
  caseName: string,
  base: Omit<GenerateInput, 'styleMode' | 'references'>,
  referenceSummary: Record<string, unknown>,
  styleKeywords: string[],
  templateKeywords: string[],
): Promise<CaseResult> {
  const references = [
    {
      id: `${caseId}-ref-1`,
      filename: `${caseId}-reference.xlsx`,
      summary: JSON.stringify(referenceSummary),
      rawText: JSON.stringify(referenceSummary),
      uploadedAt: new Date().toISOString(),
      userId: 'quality-verification',
    },
  ]

  const userDoc = await generateQuote({
    ...base,
    styleMode: 'userStyle',
    references,
  } as GenerateInput)
  const aiDoc = await generateQuote({
    ...base,
    styleMode: 'aiTemplate',
    references: [],
  } as GenerateInput)

  const user = toModeResult('userStyle', userDoc)
  const ai = toModeResult('aiTemplate', aiDoc)

  return {
    caseId,
    caseName,
    userStyle: user,
    aiTemplate: ai,
    styleLearningCheck: classifyStyleLearning(user, styleKeywords),
    templateModeCheck: classifyTemplateMode(ai, styleKeywords, templateKeywords),
    outputQualityCheck: classifyOutputQuality(user, ai),
  }
}

async function main() {
  const isMock = (process.env.AI_MODE || '').trim().toLowerCase() === 'mock'
  if (isMock) {
    throw new Error('실모델 검증 모드에서 AI_MODE=mock은 허용되지 않습니다.')
  }
  if (!hasApiKey()) {
    throw new Error('실모델 검증에 필요한 API 키가 없습니다. OPENAI_API_KEY 또는 ANTHROPIC_API_KEY를 설정하세요.')
  }

  const commonBase = {
    clientName: '플래닉',
    clientManager: '운영팀',
    clientTel: '02-0000-0000',
    quoteDate: '2026-03-20',
    eventDate: '2026-04-10',
    eventDuration: '2시간',
    eventStartHHmm: '14:00',
    eventEndHHmm: '16:00',
    headcount: '120명',
    venue: '코엑스 컨퍼런스룸',
    eventType: '포럼',
    budget: '30000000',
    requirements: '브랜드 톤이 드러나는 차분한 진행, 세션 전환 매끄럽게',
    prices: [
      {
        name: '인건비/운영',
        items: [
          { name: '총괄 PM', spec: '행사 총괄', unit: '식', price: 1800000 },
          { name: '진행요원', spec: '현장 운영', unit: '명', price: 250000 },
        ],
      },
      {
        name: '무대/장비',
        items: [
          { name: '음향 오퍼레이터', spec: '메인 세션', unit: '식', price: 700000 },
          { name: '기본 조명', spec: '세션 무대', unit: '식', price: 1200000 },
        ],
      },
    ],
    settings: {
      name: '플래닉',
      biz: '000-00-00000',
      ceo: '대표',
      contact: '운영팀',
      tel: '02-0000-0000',
      addr: '서울',
      expenseRate: 5,
      profitRate: 10,
      validDays: 15,
      paymentTerms: '계약금 50%, 잔금 50%',
    },
    taskOrderRefs: [],
    scenarioRefs: [],
    documentTarget: 'estimate' as const,
  }

  const cases = await Promise.all([
    runCase(
      'case-a',
      'B2B 파트너 포럼',
      {
        ...commonBase,
        eventName: '2026 플래닉 파트너 데이',
      } as any,
      {
        namingRules: '명사형 단문, 운영 역할 중심 표기(예: 총괄 PM, 등록데스크 운영)',
        categoryOrder: ['인건비/운영', '무대/장비', '홍보물'],
        unitPricingStyle: '식/명 단위, 원 단위 정수 표기',
        toneStyle: '실무형, 짧고 단정한 문장',
        proposalPhraseStyle: '조건/제외사항을 불릿으로 명확히 기재',
        oneLineSummary: '운영 중심 카테고리와 명사형 네이밍을 일관 적용',
      },
      ['총괄 PM', '등록데스크', '인건비/운영'],
      ['표준', '템플릿', '기본'],
    ),
    runCase(
      'case-b',
      '브랜드 런칭 쇼케이스',
      {
        ...commonBase,
        eventName: '2026 신제품 런칭 쇼케이스',
        eventType: '런칭',
        headcount: '300명',
        requirements: '몰입형 무대 연출과 쇼케이스 전환을 강조',
      } as any,
      {
        namingRules: '연출/퍼포먼스 중심 명칭(예: 오프닝 퍼포먼스, 메인 쇼케이스)',
        categoryOrder: ['무대/연출', '인건비/운영', '기술/장비'],
        unitPricingStyle: '식/회/세트 단위, 금액은 정수 원',
        toneStyle: '공연 연출 중심, 강한 키워드 사용',
        proposalPhraseStyle: '연출 의도와 전환 포인트를 짧게 강조',
        oneLineSummary: '연출 중심 카테고리와 강한 키워드 톤',
      },
      ['오프닝 퍼포먼스', '무대/연출', '메인 쇼케이스'],
      ['표준', '템플릿', '기본'],
    ),
  ])

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'real-model-only',
    summary: {
      styleLearning: cases.every(c => c.styleLearningCheck.status === 'PASS') ? 'PASS' : 'FAIL',
      aiTemplateMode: cases.every(c => c.templateModeCheck.status === 'PASS') ? 'PASS' : 'FAIL',
      outputQuality: cases.every(c => c.outputQualityCheck.status === 'PASS') ? 'PASS' : 'FAIL',
    },
    cases,
  }

  const outDir = join(process.cwd(), 'tmp-e2e')
  mkdirSync(outDir, { recursive: true })
  const outFile = join(outDir, 'real-model-quality-report.json')
  writeFileSync(outFile, JSON.stringify(report, null, 2))
  console.log(`REAL_MODEL_REPORT=${outFile}`)
  console.log(JSON.stringify(report, null, 2))
}

main().catch(err => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`REAL_MODEL_VERIFY_ERROR=${message}`)
  process.exit(1)
})

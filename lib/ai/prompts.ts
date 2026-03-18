import type { GenerateInput, QuoteDoc } from './types'

export const GENERATION_SYSTEM_PROMPT = `너는 한국 행사·이벤트 업계의 시니어 기획/운영/견적 담당자다.
반드시 구조(표/행/열/필드)를 우선하여, 운영자가 바로 쓸 수 있는 수준의 밀도와 구체성을 가진 문서를 만든다.
출력은 설명 없이 "단일 JSON 객체"만 허용한다.`

export function buildPriceContext(prices: GenerateInput['prices']): string {
  if (!prices.length) return ''
  const lines = ['[내 단가표 — 이 단가를 반드시 우선 사용하세요]']
  prices.forEach(cat => {
    lines.push(`\n▸ ${cat.name}`)
    cat.items.forEach(it => {
      const t = it.types?.length ? ` [적용: ${it.types.join(', ')}]` : ''
      lines.push(
        `  - ${it.name}(${it.spec || ''}) / ${it.unit} / ${it.price.toLocaleString('ko-KR')}원${
          it.note ? ' / ' + it.note : ''
        }${t}`,
      )
    })
  })
  return lines.join('\n')
}

export function buildReferenceContext(refs: GenerateInput['references']): string {
  if (!refs.length) return ''
  const lines = ['\n[참고 견적서 학습 자료 — 구성 방식 참고용]']
  refs.slice(0, 3).forEach(r => lines.push(`\n▸ ${r.filename}\n${r.summary}`))
  return lines.join('\n')
}

export function buildTaskOrderContext(refs: NonNullable<GenerateInput['taskOrderRefs']>): string {
  if (!refs.length) return ''
  const lines = ['\n[과업지시서·기획 참고 — 반드시 반영하여 견적서·기획안 작성]']
  refs.slice(0, 3).forEach(r => {
    lines.push(`\n▸ ${r.filename}\n${r.summary}\n--- 원문 일부 ---\n${r.rawText.slice(0, 2000)}`)
  })
  return lines.join('\n')
}

export function buildCuesheetSampleContext(text: string | undefined): string {
  if (!text?.trim()) return ''
  const clipped = text.length > 6000 ? text.slice(0, 6000) + '\n...(이하 생략)' : text
  const imageNote = /\[이미지 파일 전용 샘플\]|OCR 미지원/.test(text)
    ? '\n[주의] 샘플이 이미지뿐이면 표 텍스트가 없음 → 일반 행사 큐시트 표 형식(시간·순서·담당·준비물·멘트)으로 작성.\n'
    : ''
  return `\n[큐시트 샘플 자료 — 열 구조·톤을 cueRows·cueSummary에 맞출 것]${imageNote}\n${clipped}\n`
}

function buildTabSampleBlock(args: {
  title: string
  structure?: string
  raw?: string
  rawMax?: number
  purpose: string
}): string {
  const { title, structure, raw, rawMax = 5000, purpose } = args
  const blocks: string[] = []
  if (structure?.trim()) {
    blocks.push(`\n[${title} 샘플 구조 요약(파싱 결과) — ${purpose}]\n${structure.trim()}\n`)
  }
  if (raw?.trim()) {
    const clipped = raw.length > rawMax ? raw.slice(0, rawMax) + '\n...(이하 생략)' : raw
    blocks.push(`\n[${title} 샘플 원문 일부 — ${purpose}]\n${clipped}\n`)
  }
  return blocks.join('\n')
}

export function buildScenarioRefsContext(refs: GenerateInput['scenarioRefs']): string {
  if (!refs?.length) return ''
  const lines = ['\n[시나리오·PPT 참고 — 슬라이드 순서·톤·연출 흐름을 scenario 필드에 구조적으로 반영]']
  refs.slice(0, 2).forEach(r => {
    const body = (r.rawText || '').slice(0, 8000)
    lines.push(`\n▸ ${r.filename}\n요약: ${r.summary}\n--- 원문/슬라이드 텍스트 ---\n${body}`)
  })
  return lines.join('\n')
}

export function buildGeneratePrompt(input: GenerateInput): string {
  const priceCtx = buildPriceContext(input.prices)
  const refCtx = buildReferenceContext(input.references)
  const taskOrderCtx = buildTaskOrderContext(input.taskOrderRefs ?? [])
  const proposalSampleCtx = buildTabSampleBlock({
    title: '제안 프로그램(기획안/구성표)',
    structure: input.proposalSampleStructure,
    raw: input.proposalSampleContext,
    rawMax: 6000,
    purpose: 'program.programRows의 열/섹션/밀도(실무 디테일) 참고',
  })
  const timetableSampleCtx = buildTabSampleBlock({
    title: '타임테이블',
    structure: input.timetableSampleStructure,
    raw: input.timetableSampleContext,
    rawMax: 5000,
    purpose: 'program.timeline의 행 구성(시간/역할/공정/동선) 참고. 단, 시간값은 폼 입력을 절대 우선',
  })
  const cueCtx = buildCuesheetSampleContext(input.cuesheetSampleContext)
  const cueStructureCtx = buildTabSampleBlock({
    title: '큐시트',
    structure: input.cuesheetSampleStructure,
    raw: undefined,
    purpose: 'program.cueRows 열 구조(시간/순서/담당/장비/멘트/특이사항) 우선 반영',
  })
  const scenarioSampleCtx = buildTabSampleBlock({
    title: '시나리오(기준 양식)',
    structure: input.scenarioSampleStructure,
    raw: input.scenarioSampleContext,
    rawMax: 6000,
    purpose: '장면 흐름/장소 이동/멘트 포인트/체크포인트를 scenario에 구조적으로 반영',
  })
  const scenCtx = buildScenarioRefsContext(input.scenarioRefs)
  const { expenseRate, profitRate, validDays, paymentTerms } = input.settings

  const start = input.eventStartHHmm?.trim()
  const end = input.eventEndHHmm?.trim()
  const timeRule =
    start && end
      ? `\n[타임테이블 절대 규칙] 행사 실제 시작 ${start}, 종료 ${end} (24시간 표기). program.timeline 각 행의 time은 반드시 ${start} 이상 ${end} 이하만 사용. 예시 금지: 09:00, 14:00 등 폼과 무관한 시각. 첫 일정은 ${start}, 마지막은 ${end}에 가깝게.`
      : `\n[타임테이블] eventDuration(${input.eventDuration})에 맞춰 현실적인 HH:mm 나열.`

  return `행사 전문 기획사 견적 담당자로서 아래 정보를 바탕으로 견적서와 프로그램·큐시트·시나리오까지 JSON으로만 출력하세요. 다른 텍스트 없이 순수 JSON만.

행사: ${input.eventName}
주최: ${input.clientName || '미입력'} / 담당: ${input.clientManager || ''} / 연락처: ${input.clientTel || ''}
견적일: ${input.quoteDate}
날짜: ${input.eventDate} / 행사 시간(소요): ${input.eventDuration} / 인원: ${input.headcount} / 장소: ${input.venue || '미정'}
종류: ${input.eventType} / 예산: ${input.budget}
요청: ${input.requirements || '일반 행사'}
${start && end ? `폼 입력 시작·종료 시각(반드시 타임라인에 반영): ${start} ~ ${end}` : ''}

${priceCtx}
${refCtx}
${taskOrderCtx}
${proposalSampleCtx}
${timetableSampleCtx}
${cueCtx}
${cueStructureCtx}
${scenarioSampleCtx}
${scenCtx}
${timeRule}

${taskOrderCtx ? '[과업지시서 반영] 과업 범위를 견적 항목·program에 반영.\n' : ''}
${(() => {
  const q = input.engineQuality
  if (!q || (!q.structureFirst && !q.toneFirst && !q.outputFormatTemplate && !q.sampleWeightNote && !q.qualityBoost)) return ''
  const lines = ['\n[관리자·엔진 강화 지시 — 반드시 반영]']
  if (q.structureFirst) lines.push('- 구조 우선: 표·행·열 배치를 문장 톤보다 우선해 programRows·cueRows·timeline을 채울 것.')
  if (q.toneFirst) lines.push('- 문체 우선: 톤·멘트·연출 문구를 구조 수정보다 우선할 것.')
  if (q.outputFormatTemplate?.trim()) lines.push(`- 출력 포맷: ${q.outputFormatTemplate.trim()}`)
  if (q.sampleWeightNote?.trim()) lines.push(`- 샘플 반영: ${q.sampleWeightNote.trim()}`)
  if (q.qualityBoost?.trim()) lines.push(q.qualityBoost.trim())
  return lines.join('\n')
})()}
[중요] 단가표 항목은 그 단가 그대로. 없는 항목만 시장 평균. 인력은 행사 시간에 맞게.
각 항목 kind: "인건비"|"필수"|"선택1"|"선택2"
제경비율: ${expenseRate}%, 이윤율: ${profitRate}%

[program]
- concept: 2~4문장 요약(보조). 표가 메인.
- programRows: 제안 프로그램 구성표. 행마다 kind(프로그램 종류), content(내용), tone(성격), image(비어있거나 "(이미지 슬롯)"), time(해당 구간 시각 있으면 HH:mm), audience(대상/인원), notes(비고). 최소 6행. 각 행 content/notes는 실무 수준으로 구체화(운영 계획/준비사항/스텝 역할을 반영).
- timeline: time은 ${start && end ? `${start}~${end} 사이 HH:mm만` : 'HH:mm'}, content, detail, manager. programRows와 같은 행 수·순서에 맞출 것.
- cueRows: 큐시트 운영표. time, order(순번), content(진행 내용), staff(담당), prep(준비물/장비), script(멘트/체크), special(특이사항). 샘플 큐시트 열 순서를 최대한 따를 것. 최소 timeline과 동일 행 수. 각 행은 현장 실행 가능할 정도로 구체적으로.
- cueSummary: 상단 운영 요약(2~4줄). 포함: 핵심 흐름, 리허설/체크인/무전, 핵심 장비, 리스크 1~2개, 투입 인력 요약(역할×인원).
- staffing, tips: 기존과 동일.

[scenario] PPT/시나리오 참고가 있으면 그 흐름·톤을 따름. 단순 3단 구성이 아니라 장면/시간/장소/멘트를 구조화.
- summaryTop, opening, development, mainPoints(문자열 배열 4~8개), closing, directionNotes(연출 메모).
- scenes: 장면 배열. 각 장면은 { "seq":1, "time":"HH:mm", "place":"", "title":"", "flow":"", "mcScript":"", "opsNotes":"", "checkpoints":["",""] }.
- scenes는 최소 6개 이상. time은 타임테이블과 모순되지 않게(가능하면 timeline과 정렬). 장소 이동/귀가 안내/마감 멘트 포함.

JSON 형식 (필드 누락 금지):
{
  "eventName": "",
  "clientName": "",
  "clientManager": "",
  "clientTel": "",
  "quoteDate": "${input.quoteDate}",
  "eventDate": "",
  "eventDuration": "${input.eventDuration}",
  "venue": "",
  "headcount": "",
  "eventType": "${input.eventType}",
  "quoteItems": [{"category":"","items":[{"name":"","spec":"","qty":1,"unit":"식","unitPrice":0,"total":0,"note":"","kind":"필수"}]}],
  "expenseRate": ${expenseRate},
  "profitRate": ${profitRate},
  "cutAmount": 0,
  "notes": "",
  "paymentTerms": "${String(paymentTerms).replace(/\n/g, '\\n')}",
  "validDays": ${validDays},
  "program": {
    "concept": "",
    "programRows": [{"kind":"","content":"","tone":"","image":"","time":"","audience":"","notes":""}],
    "timeline": [{"time":"${start || '18:00'}","content":"","detail":"","manager":""}],
    "staffing": [{"role":"","count":1,"note":""}],
    "tips": [""],
    "cueRows": [{"time":"","order":"1","content":"","staff":"","prep":"","script":"","special":""}],
    "cueSummary": ""
  },
  "scenario": {
    "summaryTop": "",
    "opening": "",
    "development": "",
    "mainPoints": ["",""],
    "closing": "",
    "directionNotes": "",
    "scenes": [{"seq":1,"time":"","place":"","title":"","flow":"","mcScript":"","opsNotes":"","checkpoints":["",""]}]
  }
}`
}

/** @deprecated normalizeQuoteDoc 사용 권장 */
export function ensureProgramFallback(doc: QuoteDoc): QuoteDoc {
  return doc
}

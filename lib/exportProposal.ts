import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { saveAs } from 'file-saver'

// ── 색상 상수 ────────────────────────────────────────────
const NAVY       = '1C2B4A'
const MID_BLUE   = '2E4E8A'
const LIGHT_BLUE = 'E8EEF7'
const ACCENT     = 'D6E4F7'   // infoTable 홀수 행 배경
const GRAY       = 'F5F5F5'
const TEXT       = '333333'
const FONT       = '맑은 고딕'

// ── 타입 ────────────────────────────────────────────────
export interface ProposalData {
  clientName:   string
  contact:      string
  eventName:    string
  eventDate:    string
  eventPlace:   string
  headcount:    string
  budget:       string
  eventType:    string
  requirements: string  // 줄바꿈(\n) 포함 가능
  followUp:     string  // 줄바꿈(\n) 포함 가능
  notes:        string
}

// ── 오늘 날짜 한국 형식 ──────────────────────────────────
function todayKor(): string {
  const d = new Date()
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

// ── 헬퍼: Paragraph ──────────────────────────────────────
function h1(text: string, pageBreak = false): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, bold: true, size: 32, color: NAVY })],
    spacing: { before: pageBreak ? 0 : 320, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY } },
    pageBreakBefore: pageBreak,
  })
}

function body(
  text: string,
  opts?: {
    color?: string
    size?: number
    italic?: boolean
    bold?: boolean
    align?: (typeof AlignmentType)[keyof typeof AlignmentType]
  },
): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: FONT,
        size: opts?.size ?? 22,
        color: opts?.color ?? TEXT,
        italics: opts?.italic,
        bold: opts?.bold,
      }),
    ],
    alignment: opts?.align,
    spacing: { after: 80 },
  })
}

function bulletP(text: string, indent = false): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, size: 20, color: TEXT })],
    bullet: { level: indent ? 1 : 0 },
    spacing: { after: 60 },
  })
}

function gap(size = 120): Paragraph {
  return new Paragraph({ text: '', spacing: { after: size } })
}

function divider(): Paragraph {
  return new Paragraph({
    text: '',
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E0E0E0' } },
    spacing: { before: 80, after: 120 },
  })
}

// ── 헬퍼: Table ──────────────────────────────────────────
function infoTable(rows: [string, string][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:           { style: BorderStyle.SINGLE, size: 4, color: 'D0D8E8' },
      bottom:        { style: BorderStyle.SINGLE, size: 4, color: 'D0D8E8' },
      left:          { style: BorderStyle.SINGLE, size: 4, color: 'D0D8E8' },
      right:         { style: BorderStyle.SINGLE, size: 4, color: 'D0D8E8' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'D0D8E8' },
      insideVertical:   { style: BorderStyle.SINGLE, size: 4, color: 'D0D8E8' },
    },
    rows: rows.map(([label, value], i) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 22, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: LIGHT_BLUE, fill: LIGHT_BLUE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: label, font: FONT, bold: true, size: 20, color: NAVY })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
          }),
          new TableCell({
            width: { size: 78, type: WidthType.PERCENTAGE },
            shading: i % 2 === 1 ? { type: ShadingType.SOLID, color: ACCENT, fill: ACCENT } : undefined,
            children: [
              new Paragraph({
                children: [new TextRun({ text: value || '–', font: FONT, size: 20, color: TEXT })],
              }),
            ],
            margins: { top: 100, bottom: 100, left: 160, right: 120 },
          }),
        ],
      }),
    ),
  })
}

function makeHeaderRow(cols: string[], widths?: number[]): TableRow {
  return new TableRow({
    tableHeader: true,
    children: cols.map((col, i) =>
      new TableCell({
        width: widths ? { size: widths[i], type: WidthType.PERCENTAGE } : undefined,
        shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
        children: [
          new Paragraph({
            children: [new TextRun({ text: col, font: FONT, bold: true, size: 18, color: 'FFFFFF' })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
      }),
    ),
  })
}

function makeDataRow(cells: string[], shade: boolean, rightAlignCols?: number[], widths?: number[]): TableRow {
  return new TableRow({
    children: cells.map((c, i) =>
      new TableCell({
        width: widths ? { size: widths[i], type: WidthType.PERCENTAGE } : undefined,
        shading: shade ? { type: ShadingType.SOLID, color: GRAY, fill: GRAY } : undefined,
        children: [
          new Paragraph({
            children: [new TextRun({ text: c, font: FONT, size: 18, color: TEXT })],
            alignment: rightAlignCols?.includes(i) ? AlignmentType.RIGHT : AlignmentType.LEFT,
          }),
        ],
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
      }),
    ),
  })
}

// 열 너비: 시간 10%, 소요 8%, 프로그램 20%, 세부내용 37%, 형태 13%, 담당 12%
const PROGRAM_COL_WIDTHS = [10, 8, 20, 37, 13, 12]

function programTable(rows: string[][]): Table {
  const header   = makeHeaderRow(['시간', '소요', '프로그램', '세부내용', '형태', '담당'], PROGRAM_COL_WIDTHS)
  const dataRows = rows.map((r, i) => makeDataRow(r, i % 2 === 0, [], PROGRAM_COL_WIDTHS))
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...dataRows],
  })
}

// 열 너비: 항목 20%, 내용 35%, 단가 22%, 합계 23%
const BUDGET_COL_WIDTHS = [20, 35, 22, 23]

function budgetTable(rows: string[][], totalStr: string): Table {
  const header   = makeHeaderRow(['항목', '내용', '단가(원)', '합계(원)'], BUDGET_COL_WIDTHS)
  const dataRows = rows.map((r, i) => makeDataRow(r, i % 2 === 0, [2, 3], BUDGET_COL_WIDTHS))
  const totalRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 3,
        shading: { type: ShadingType.SOLID, color: LIGHT_BLUE, fill: LIGHT_BLUE },
        children: [
          new Paragraph({
            children: [new TextRun({ text: '합  계', font: FONT, bold: true, size: 20, color: NAVY })],
            alignment: AlignmentType.RIGHT,
          }),
        ],
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
      }),
      new TableCell({
        shading: { type: ShadingType.SOLID, color: LIGHT_BLUE, fill: LIGHT_BLUE },
        children: [
          new Paragraph({
            children: [new TextRun({ text: totalStr, font: FONT, bold: true, size: 20, color: NAVY })],
            alignment: AlignmentType.RIGHT,
          }),
        ],
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
      }),
    ],
  })
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...dataRows, totalRow],
  })
}

// ── 메인 함수 ────────────────────────────────────────────
export async function exportProposal(data: ProposalData): Promise<void> {
  // 인원수 파싱 (예: "30명" → 30, "30명~50명" → 30)
  const headNum = parseInt(data.headcount.replace(/[^\d]/g, ''), 10) || 0
  const mealCost    = headNum > 0 ? 15000 * headNum : 0
  const mealCostStr = headNum > 0 ? mealCost.toLocaleString('ko-KR') : '협의'
  const mealUnitStr = headNum > 0 ? `15,000 × ${headNum}명` : '15,000 × 인원수'

  // 예산 상한 파싱 (예: "중규모(300~1000만원)" → 대략 500만, 아닐 경우 합산)
  const totalBudget = 1_000_000 + 600_000 + mealCost + 300_000 + 300_000 + 200_000
  const totalStr    = totalBudget > 2_400_000 ? totalBudget.toLocaleString('ko-KR') : '협의'

  const reqLines    = data.requirements.split('\n').filter((l) => l.trim())
  const followLines = data.followUp.split('\n').filter((l) => l.trim())
  const noteLines   = data.notes.split('\n').filter((l) => l.trim())

  // 행사 시간 파싱 (eventDate에서 연월일만 추출)
  const eventDateDisplay = data.eventDate || '미정'

  const DEFAULT_PROGRAM = [
    ['09:00', '30분', '이동·출발',        '버스 대절, 현장 집결 및 이동',          '전체',   ''],
    ['09:30', '60분', '오리엔테이션',     '일정 안내, 팀 구성, 아이스브레이킹',    '전체',   ''],
    ['10:30', '90분', '메인 프로그램',    data.eventType ? `${data.eventType} 주요 활동` : '행사 유형에 맞는 주요 활동', '팀활동', ''],
    ['12:00', '60분', '중    식',         '현지 식당 또는 도시락',                  '전체',   ''],
    ['13:00', '90분', '오후 프로그램',    '체험·견학·워크숍·발표 등',              '팀/전체', ''],
    ['14:30', '60분', '정리·소감 나눔',   '실행계획 작성, 팀별 발표, 마무리',       '전체',   ''],
    ['15:30', '–',   '귀환 출발',         '이동 및 해산',                           '전체',   ''],
  ]

  const BUDGET_ROWS = [
    ['프로그램 운영비', '강사·퍼실리테이터 1명',   '1,000,000',       '1,000,000'],
    ['이동비',          '버스 대절 1대',            '600,000',         '600,000'],
    ['식비',            `중식 1식 (${data.headcount || '인원 미정'})`, mealUnitStr, mealCostStr],
    ['소모품·기념품',   '활동 재료 일체',           '300,000',         '300,000'],
    ['진행 스태프',     '현장 운영 지원 2인',       '150,000 × 2',     '300,000'],
    ['예비비',          '불가항력 대비',            '–',               '200,000'],
  ]

  const children: Array<Paragraph | Table> = [
    // ── 타이틀 블록 ──────────────────────────
    new Paragraph({
      children: [new TextRun({ text: '행 사 기 획 제 안 서', font: FONT, bold: true, size: 56, color: NAVY })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 160 },
    }),
    new Paragraph({
      children: [new TextRun({ text: data.eventName || '행사명 미정', font: FONT, size: 38, color: MID_BLUE, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${data.clientName || '(고객사명)'}  |  ${eventDateDisplay}  |  작성일: ${todayKor()}`, font: FONT, size: 20, color: '888888' }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    divider(),

    // ── 1. 행사 개요 ──────────────────────────
    h1('1. 행사 개요'),
    infoTable([
      ['고  객  명', data.clientName  || '–'],
      ['연  락  처', data.contact     || '–'],
      ['행  사  명', data.eventName   || '–'],
      ['행  사  일', data.eventDate   || '–'],
      ['행사 장소',  data.eventPlace  || '–'],
      ['예상 인원',  data.headcount   || '–'],
      ['예    산',   data.budget      || '–'],
      ['행사 유형',  data.eventType   || '–'],
    ]),

    // ── 2. 주요 요구사항 ──────────────────────
    gap(),
    h1('2. 주요 요구사항', true),
    ...(reqLines.length > 0
      ? reqLines.map((l) => bulletP(l))
      : [
          bulletP('행사 목적 및 주요 활동 내용'),
          bulletP('참석자 특성 및 고려사항'),
          bulletP('특수 요청사항 (VIP 동선, 장애인 편의 등)'),
          body('※ 구체적인 요구사항은 미팅 후 업데이트됩니다.', { color: '999999', size: 18, italic: true }),
        ]),

    // ── 3. 프로그램 구성 (안) ────────────────
    gap(),
    h1('3. 프로그램 구성 (안)', true),
    body('아래 일정은 제안 초안이며 협의 후 조정 가능합니다.', { color: '777777', size: 18, italic: true }),
    gap(80),
    programTable(DEFAULT_PROGRAM),
    gap(80),
    body('※ 시간·순서·세부내용은 고객사 요청에 따라 맞춤 조정합니다.', { color: '999999', size: 18 }),

    // ── 4. 예산 계획 (안) ────────────────────
    gap(),
    h1('4. 예산 계획 (안)', true),
    body(
      `기준 인원: ${data.headcount || '미정'}  |  기준 예산: ${data.budget || '협의'}`,
      { color: '555555', size: 20, bold: true },
    ),
    gap(80),
    budgetTable(BUDGET_ROWS, totalStr),
    gap(80),
    body(
      `* 총 예산 ${data.budget || '협의'} 범위 내 조정 가능하며, 세부 항목은 협의 후 확정합니다.`,
      { color: '888888', size: 18 },
    ),
    body(
      '* 식비·이동비는 인원·거리에 따라 변동 가능합니다.',
      { color: '888888', size: 18 },
    ),

    // ── 5. 팔로업 계획 ────────────────────────
    gap(),
    h1('5. 팔로업 계획'),
    ...(followLines.length > 0
      ? followLines.map((l) => bulletP(l))
      : [
          bulletP('제안서 검토 후 미팅 일정 조율'),
          bulletP('최종 프로그램·예산 협의 및 계약'),
          bulletP('D-30: 현장 사전 답사 및 최종 일정 확정'),
          bulletP('D-7: 리허설 및 진행 스태프 브리핑'),
          bulletP('행사 종료 후 결과 보고서 제출'),
        ]),
  ]

  // ── 6. 특이사항 (비어있지 않을 때만) ──────
  if (noteLines.length > 0) {
    children.push(gap(), h1('6. 특이사항'))
    noteLines.forEach((l) => children.push(bulletP(l)))
  }

  // ── 7. 제안사 소개 ────────────────────────
  children.push(
    gap(),
    h1('7. 제안사 소개', true),
    body(
      '위드아크(WITH ARK)는 조직 개발 및 팀빌딩 전문 기업으로, 공공기관·지자체·대기업을 대상으로 체험형 갈등 관리 및 역량 강화 프로그램을 운영하고 있습니다.',
    ),
    gap(60),
    bulletP('주민자치·지방행정 조직 대상 워크숍 다수 수행'),
    bulletP('갈등 관리 체험 프로그램 자체 개발·운영'),
    bulletP('행사 기획부터 현장 운영까지 원스톱 제공'),
    bulletP('전국 네트워크 기반 신속한 현장 지원 가능'),
    gap(),
    divider(),

    // ── 마무리 ────────────────────────────────
    body('본 제안서는 귀 기관의 요청 사항을 바탕으로 작성된 초안입니다.', {
      color: '666666',
      italic: true,
      align: AlignmentType.CENTER,
    }),
    body('세부 내용은 협의를 통해 조정 가능하며, 최선의 행사를 함께 만들어 가겠습니다.', {
      color: '666666',
      italic: true,
      align: AlignmentType.CENTER,
    }),
    gap(),
    new Paragraph({
      children: [new TextRun({ text: '위드아크(WITH ARK)', font: FONT, bold: true, size: 28, color: NAVY })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: `작성일: ${todayKor()}`, font: FONT, size: 18, color: '999999' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
  )

  // ── 문서 조립 ─────────────────────────────
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `위드아크(WITH ARK)  |  ${data.eventName || '행사 제안서'}`,
                    font: FONT,
                    size: 18,
                    color: '999999',
                  }),
                ],
                alignment: AlignmentType.RIGHT,
                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES],
                    font: FONT,
                    size: 18,
                    color: '999999',
                  }),
                  new TextRun({
                    text: `    ㅣ    ${data.clientName || ''} 귀중`,
                    font: FONT,
                    size: 18,
                    color: 'BBBBBB',
                  }),
                ],
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
              }),
            ],
          }),
        },
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const safeName = (data.clientName || '고객').replace(/\s/g, '_')
  const safeDate = (data.eventDate || '미정').replace(/\./g, '-').replace(/년|월|일| /g, '')
  saveAs(blob, `제안서_${safeName}_${safeDate}.docx`)
}

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'

const COLORS = {
  NAVY: '1C2B4A',
  MID_BLUE: '2E4E8A',
  LIGHT_BLUE: 'E8EEF7',
  GRAY: 'F5F5F5',
  TEXT: '333333',
  MUTED: '7A7A7A',
  BORDER: 'D7DFEC',
}

const FONT_FAMILY = 'Malgun Gothic'
const PAGE_MARGIN = 1134

function textRun(text, overrides = {}) {
  return new TextRun({
    text: text ?? '',
    font: FONT_FAMILY,
    color: COLORS.TEXT,
    size: 22,
    ...overrides,
  })
}

function makeCell(text, options = {}) {
  const {
    fill,
    bold = false,
    align = AlignmentType.LEFT,
    size = 22,
    color = COLORS.TEXT,
    width,
  } = options

  return new TableCell({
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: fill ? { fill, color: 'auto' } : undefined,
    margins: {
      top: 120,
      bottom: 120,
      left: 140,
      right: 140,
    },
    verticalAlign: 'center',
    children: [
      new Paragraph({
        alignment: align,
        children: [
          textRun(String(text ?? ''), {
            bold,
            size,
            color,
          }),
        ],
      }),
    ],
  })
}

function parseHeadcountNumber(value) {
  const matches = String(value || '').match(/\d[\d,]*/g)
  if (!matches?.length) return 0
  return Math.max(
    ...matches
      .map((part) => Number(part.replace(/,/g, '')))
      .filter((num) => Number.isFinite(num)),
    0,
  )
}

function formatWon(value) {
  return Number(value || 0).toLocaleString('ko-KR')
}

export async function generateProposal(data) {
  const safeData = {
    clientName: data?.clientName?.trim() || '–',
    contact: data?.contact?.trim() || '–',
    eventName: data?.eventName?.trim() || '행사명 미정',
    eventDate: data?.eventDate?.trim() || '일정 미정',
    eventPlace: data?.eventPlace?.trim() || '장소 미정',
    headcount: data?.headcount?.trim() || '미정',
    budget: data?.budget?.trim() || '협의',
    eventType: data?.eventType?.trim() || '기타',
    requirements: data?.requirements || '',
    followUp: data?.followUp || '',
    notes: data?.notes || '',
  }

  const bulletItems = (value) =>
    String(value || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

  const headcountNumber = parseHeadcountNumber(safeData.headcount)
  const mealTotal = headcountNumber > 0 ? headcountNumber * 15000 : 0

  const budgetRows = [
    ['프로그램 운영비', '강사·퍼실리테이터', '1,000,000', '1,000,000'],
    ['이동비', '버스 대절 1대', '600,000', '600,000'],
    ['식비', '중식 1식', `15,000 × ${headcountNumber > 0 ? headcountNumber.toLocaleString('ko-KR') : '인원'}`, mealTotal > 0 ? formatWon(mealTotal) : '협의'],
    ['소모품·기념품', '활동 재료 일체', '300,000', '300,000'],
    ['진행 스태프', '현장 운영 지원', '150,000 × 2', '300,000'],
    ['예비비', '–', '–', '200,000'],
  ]

  const totalBudget =
    1000000 +
    600000 +
    mealTotal +
    300000 +
    300000 +
    200000

  const programRows = [
    ['09:00', '30분', '이동 출발', '버스 대절, 현장 이동', '전체', ''],
    ['09:30', '60분', '오리엔테이션', '일정 안내, 팀 구성', '전체', ''],
    ['10:30', '90분', '주요 프로그램', '행사유형에 맞는 메인 활동', '팀활동', ''],
    ['12:00', '60분', '중식', '현지 식당 또는 도시락', '전체', ''],
    ['13:00', '90분', '오후 프로그램', '체험·견학·워크숍 등', '전체', ''],
    ['14:30', '60분', '정리 및 소감 나눔', '실행계획 작성, 마무리', '전체', ''],
    ['15:30', '–', '귀환 출발', '이동 및 해산', '전체', ''],
  ]

  const heading1 = (text) =>
    new Paragraph({
      spacing: { before: 240, after: 140 },
      border: {
        bottom: {
          color: COLORS.NAVY,
          size: 18,
          style: BorderStyle.SINGLE,
        },
      },
      children: [
        textRun(text, {
          bold: true,
          color: COLORS.NAVY,
          size: 64,
        }),
      ],
    })

  const heading2 = (text) =>
    new Paragraph({
      spacing: { before: 120, after: 120 },
      children: [
        textRun('■ ', {
          bold: true,
          color: COLORS.MID_BLUE,
          size: 48,
        }),
        textRun(text, {
          bold: true,
          color: COLORS.NAVY,
          size: 48,
        }),
      ],
    })

  const body = (text) =>
    new Paragraph({
      spacing: { after: 100 },
      children: [textRun(String(text ?? ''), { size: 22 })],
    })

  const bullet = (text) =>
    new Paragraph({
      numbering: {
        reference: 'dash-bullets',
        level: 0,
      },
      spacing: { after: 80 },
      children: [textRun(String(text ?? ''), { size: 22 })],
    })

  const gap = () =>
    new Paragraph({
      spacing: { after: 120 },
      children: [textRun(' ', { size: 8 })],
    })

  const infoTable = (rows) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: rows.map(([label, value]) =>
        new TableRow({
          children: [
            makeCell(label, {
              fill: COLORS.LIGHT_BLUE,
              bold: true,
              width: 2400,
              color: COLORS.NAVY,
            }),
            makeCell(value || '–', {
              width: 7200,
            }),
          ],
        }),
      ),
    })

  const programTable = (rows) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            makeCell('시간', { fill: COLORS.LIGHT_BLUE, bold: true, color: COLORS.NAVY }),
            makeCell('소요', { fill: COLORS.LIGHT_BLUE, bold: true, color: COLORS.NAVY }),
            makeCell('프로그램', { fill: COLORS.LIGHT_BLUE, bold: true, color: COLORS.NAVY }),
            makeCell('세부내용', { fill: COLORS.LIGHT_BLUE, bold: true, color: COLORS.NAVY }),
            makeCell('형태', { fill: COLORS.LIGHT_BLUE, bold: true, color: COLORS.NAVY }),
            makeCell('담당', { fill: COLORS.LIGHT_BLUE, bold: true, color: COLORS.NAVY }),
          ],
        }),
        ...rows.map((row, index) =>
          new TableRow({
            children: row.map((value) =>
              makeCell(value || '', {
                fill: index % 2 === 1 ? COLORS.GRAY : undefined,
              }),
            ),
          }),
        ),
      ],
    })

  const budgetTable = (rows) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            makeCell('항목', { fill: COLORS.LIGHT_BLUE, bold: true, color: COLORS.NAVY }),
            makeCell('내용', { fill: COLORS.LIGHT_BLUE, bold: true, color: COLORS.NAVY }),
            makeCell('단가(원)', { fill: COLORS.LIGHT_BLUE, bold: true, color: COLORS.NAVY }),
            makeCell('합계(원)', { fill: COLORS.LIGHT_BLUE, bold: true, color: COLORS.NAVY }),
          ],
        }),
        ...rows.map((row, index) =>
          new TableRow({
            children: row.map((value) =>
              makeCell(value || '', {
                fill: index % 2 === 1 ? COLORS.GRAY : undefined,
              }),
            ),
          }),
        ),
        new TableRow({
          children: [
            makeCell('합계', {
              fill: COLORS.LIGHT_BLUE,
              bold: true,
              color: COLORS.NAVY,
            }),
            makeCell('', { fill: COLORS.LIGHT_BLUE }),
            makeCell('', { fill: COLORS.LIGHT_BLUE }),
            makeCell(formatWon(totalBudget), {
              fill: COLORS.LIGHT_BLUE,
              bold: true,
              color: COLORS.NAVY,
            }),
          ],
        }),
      ],
    })

  const sections = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 160 },
      children: [
        textRun('행사 기획 제안서', {
          bold: true,
          size: 104,
          color: COLORS.NAVY,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        textRun(safeData.eventName, {
          bold: true,
          size: 72,
          color: COLORS.MID_BLUE,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
      children: [
        textRun(`${safeData.clientName}  |  ${safeData.eventDate}`, {
          size: 44,
          color: COLORS.MUTED,
        }),
      ],
    }),

    heading1('1. 행사 개요'),
    infoTable([
      ['고객명', safeData.clientName],
      ['연락처', safeData.contact || '–'],
      ['행사명', safeData.eventName],
      ['행사일', safeData.eventDate],
      ['행사장소', safeData.eventPlace],
      ['예상인원', safeData.headcount],
      ['예산', safeData.budget],
      ['행사유형', safeData.eventType],
    ]),

    heading1('2. 주요 요구사항'),
    ...(
      bulletItems(safeData.requirements).length
        ? bulletItems(safeData.requirements).map((line) => bullet(line))
        : [body('별도 요청사항은 협의 단계에서 구체화합니다.')]
    ),

    heading1('3. 프로그램 구성 (안)'),
    programTable(programRows),

    heading1('4. 예산 계획 (안)'),
    budgetTable(budgetRows),

    heading1('5. 팔로업 계획'),
    ...(
      bulletItems(safeData.followUp).length
        ? bulletItems(safeData.followUp).map((line) => bullet(line))
        : [body('행사 후 결과 정리와 후속 실행 항목을 협의에 따라 정리합니다.')]
    ),

    ...(bulletItems(safeData.notes).length
      ? [
          heading1('6. 특이사항'),
          ...bulletItems(safeData.notes).map((line) => bullet(line)),
        ]
      : []),

    heading1('7. 제안사 소개'),
    heading2('위드아크(WITH ARK)'),
    body('위드아크는 공공기관, 기업, 조직의 참여형 프로그램을 기획하고 운영하는 전문 파트너입니다.'),
    body('행사의 목적과 대상에 맞는 흐름 설계부터 운영 실행, 결과 정리까지 한 번에 연결합니다.'),
    bullet('공공기관 워크숍 수행 실적'),
    bullet('갈등 관리 프로그램 자체 개발'),
    bullet('원스톱 기획·운영'),

    gap(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 220, after: 80 },
      children: [
        textRun('본 제안서는 귀 기관의 요청 사항을 바탕으로 작성된 초안입니다.', {
          italics: true,
          color: COLORS.MUTED,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        textRun('세부 내용은 협의를 통해 조정 가능하며, 최선의 행사를 함께 만들어 가겠습니다.', {
          italics: true,
          color: COLORS.MUTED,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        textRun('위드아크(WITH ARK)', {
          bold: true,
          color: COLORS.NAVY,
          size: 24,
        }),
      ],
    }),
  ]

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'dash-bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '-',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 420, hanging: 240 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: PAGE_MARGIN,
              right: PAGE_MARGIN,
              bottom: PAGE_MARGIN,
              left: PAGE_MARGIN,
            },
            size: {
              width: 11906,
              height: 16838,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  textRun('위드아크(WITH ARK)  |  행사 제안서', {
                    size: 18,
                    color: '999999',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  textRun('', { size: 18, color: '888888' }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT_FAMILY,
                    size: 18,
                    color: '888888',
                  }),
                  textRun(' / ', { size: 18, color: '888888' }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    font: FONT_FAMILY,
                    size: 18,
                    color: '888888',
                  }),
                ],
              }),
            ],
          }),
        },
        children: sections,
      },
    ],
    styles: {
      default: {
        document: {
          run: {
            font: FONT_FAMILY,
            color: COLORS.TEXT,
            size: 22,
          },
          paragraph: {
            spacing: {
              line: 320,
            },
          },
        },
      },
    },
  })

  return Packer.toBlob(doc)
}

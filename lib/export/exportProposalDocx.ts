import type { ProposalContent, QuoteData, QuoteLineItem } from '@/lib/types/doc-content'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { saveAs } from 'file-saver'

// ── 색상 ──────────────────────────────────────────────────────────
const NAVY       = '1C2B4A'
const MID_BLUE   = '2E4E8A'
const LIGHT_BLUE = 'E8EEF7'
const ACCENT     = 'D6E4F7'
const GRAY       = 'F5F5F5'
const TEXT       = '333333'
const FONT       = '맑은 고딕'

function s(v: unknown): string { return String(v ?? '').trim() }

function todayKor(): string {
  const d = new Date()
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

// ── 단락 헬퍼 ────────────────────────────────────────────────────
function secH(text: string, pageBreak = false): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, bold: true, size: 30, color: NAVY })],
    spacing: { before: pageBreak ? 0 : 280, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY } },
    pageBreakBefore: pageBreak,
  })
}

function subH(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: `▶ ${text}`, font: FONT, bold: true, size: 22, color: MID_BLUE })],
    spacing: { before: 160, after: 80 },
  })
}

function bodyP(
  text: string,
  opts?: { color?: string; size?: number; italic?: boolean; bold?: boolean; center?: boolean },
): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: FONT,
        size: opts?.size ?? 20,
        color: opts?.color ?? TEXT,
        italics: opts?.italic,
        bold: opts?.bold,
      }),
    ],
    alignment: opts?.center ? AlignmentType.CENTER : undefined,
    spacing: { after: 80 },
  })
}

function bulletP(text: string, level = 0): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, size: 20, color: TEXT })],
    bullet: { level },
    spacing: { after: 60 },
  })
}

function gap(n = 120): Paragraph {
  return new Paragraph({ text: '', spacing: { after: n } })
}

function divider(): Paragraph {
  return new Paragraph({
    text: '',
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E0E0E0' } },
    spacing: { before: 80, after: 120 },
  })
}

// ── 테이블 헬퍼 ───────────────────────────────────────────────────
function infoTable(rows: [string, string][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value], i) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 22, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: LIGHT_BLUE, fill: LIGHT_BLUE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: label, font: FONT, bold: true, size: 18, color: NAVY })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            margins: { top: 90, bottom: 90, left: 120, right: 120 },
          }),
          new TableCell({
            width: { size: 78, type: WidthType.PERCENTAGE },
            shading: i % 2 === 1
              ? { type: ShadingType.SOLID, color: ACCENT, fill: ACCENT }
              : undefined,
            children: [
              new Paragraph({
                children: [new TextRun({ text: s(value) || '–', font: FONT, size: 18, color: TEXT })],
              }),
            ],
            margins: { top: 90, bottom: 90, left: 160, right: 120 },
          }),
        ],
      }),
    ),
  })
}

// 프로그램 흐름 테이블: 단계(15) / 프로그램명(22) / 세부내용(48) / 소요(15)
const PROG_W = [15, 22, 48, 15]

function programTable(rows: { stage: string; name: string; detail: string; duration: string }[]): Table {
  const hdr = new TableRow({
    tableHeader: true,
    children: ['단계 구분', '프로그램명', '세부 내용', '소요 시간'].map((col, i) =>
      new TableCell({
        width: { size: PROG_W[i], type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
        children: [
          new Paragraph({
            children: [new TextRun({ text: col, font: FONT, bold: true, size: 17, color: 'FFFFFF' })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
      }),
    ),
  })

  const dataRows = rows.map((r, i) => {
    const shade = i % 2 === 0 ? GRAY : undefined
    return new TableRow({
      children: [s(r.stage), s(r.name), s(r.detail), s(r.duration)].map((text, ci) =>
        new TableCell({
          width: { size: PROG_W[ci], type: WidthType.PERCENTAGE },
          shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
          children: [
            new Paragraph({
              children: [new TextRun({ text, font: FONT, size: 18, color: TEXT })],
            }),
          ],
          margins: { top: 70, bottom: 70, left: 100, right: 100 },
        }),
      ),
    })
  })

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [hdr, ...dataRows] })
}

// 시상 방안 비교 테이블
function awardTable(
  options: { option: string; method: string; detail: string; examples: string[]; pros: string[] }[],
): Table {
  const hdr = new TableRow({
    tableHeader: true,
    children: ['안', '방식', '세부 내용'].map((col, i) =>
      new TableCell({
        width: { size: [8, 22, 70][i], type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
        children: [
          new Paragraph({
            children: [new TextRun({ text: col, font: FONT, bold: true, size: 17, color: 'FFFFFF' })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
      }),
    ),
  })

  const dataRows = options.map((opt, i) => {
    const shade = i % 2 === 0 ? GRAY : undefined
    const detailLines = [
      opt.detail,
      ...(opt.examples ?? []).map((e) => `예시 — ${e}`),
      ...(opt.pros ?? []).map((p) => `· ${p}`),
    ].filter(Boolean)

    return new TableRow({
      children: [
        new TableCell({
          width: { size: 8, type: WidthType.PERCENTAGE },
          shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
          children: [
            new Paragraph({
              children: [new TextRun({ text: s(opt.option), font: FONT, bold: true, size: 18, color: NAVY })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          margins: { top: 80, bottom: 80, left: 80, right: 80 },
        }),
        new TableCell({
          width: { size: 22, type: WidthType.PERCENTAGE },
          shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
          children: [
            new Paragraph({
              children: [new TextRun({ text: s(opt.method), font: FONT, bold: true, size: 18, color: TEXT })],
            }),
          ],
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
        }),
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
          shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
          children: detailLines.map((line) =>
            new Paragraph({
              children: [new TextRun({ text: line, font: FONT, size: 17, color: TEXT })],
              spacing: { after: 40 },
            }),
          ),
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
        }),
      ],
    })
  })

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [hdr, ...dataRows] })
}

// 단순 타임테이블
function simpleTimeTable(
  rows: { time: string; label: string; merged?: boolean; assignments?: string[] }[],
): Table {
  const hdr = new TableRow({
    tableHeader: true,
    children: ['시간', '구분 / 활동'].map((col, i) =>
      new TableCell({
        width: { size: [18, 82][i], type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
        children: [
          new Paragraph({
            children: [new TextRun({ text: col, font: FONT, bold: true, size: 17, color: 'FFFFFF' })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
      }),
    ),
  })
  const dataRows = rows.map((r, i) => {
    const shade = i % 2 === 0 ? GRAY : undefined
    const detail =
      !r.assignments?.length || r.merged
        ? s(r.label)
        : `${s(r.label)}\n${r.assignments.join('  /  ')}`
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
          children: [
            new Paragraph({
              children: [new TextRun({ text: s(r.time), font: FONT, size: 17, color: TEXT })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          margins: { top: 70, bottom: 70, left: 80, right: 80 },
        }),
        new TableCell({
          width: { size: 82, type: WidthType.PERCENTAGE },
          shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
          children: detail.split('\n').map((line) =>
            new Paragraph({
              children: [new TextRun({ text: line, font: FONT, size: 18, color: TEXT })],
              spacing: { after: 40 },
            }),
          ),
          margins: { top: 70, bottom: 70, left: 100, right: 100 },
        }),
      ],
    })
  })
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [hdr, ...dataRows] })
}

// 그룹 로테이션 타임테이블
function rotationTable(
  groups: string[],
  rows: { time: string; label: string; merged?: boolean; assignments?: string[] }[],
): Table {
  const colCount = 1 + groups.length
  const timeW = 14
  const groupW = Math.floor((100 - timeW) / groups.length)

  const hdrCells = [
    new TableCell({
      width: { size: timeW, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
      children: [
        new Paragraph({
          children: [new TextRun({ text: '시간', font: FONT, bold: true, size: 17, color: 'FFFFFF' })],
          alignment: AlignmentType.CENTER,
        }),
      ],
      margins: { top: 80, bottom: 80, left: 80, right: 80 },
    }),
    ...groups.map((g) =>
      new TableCell({
        width: { size: groupW, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
        children: [
          new Paragraph({
            children: [new TextRun({ text: g, font: FONT, bold: true, size: 17, color: 'FFFFFF' })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        margins: { top: 80, bottom: 80, left: 80, right: 80 },
      }),
    ),
  ]

  const dataRows = rows.map((r, ri) => {
    const shade = ri % 2 === 0 ? GRAY : undefined

    if (r.merged) {
      return new TableRow({
        children: [
          new TableCell({
            columnSpan: colCount,
            shading: { type: ShadingType.SOLID, color: LIGHT_BLUE, fill: LIGHT_BLUE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: s(r.label), font: FONT, bold: true, size: 17, color: NAVY })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
          }),
        ],
      })
    }

    return new TableRow({
      children: [
        new TableCell({
          width: { size: timeW, type: WidthType.PERCENTAGE },
          shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
          children: [
            new Paragraph({
              children: [new TextRun({ text: s(r.time), font: FONT, size: 17, color: TEXT })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          margins: { top: 70, bottom: 70, left: 80, right: 80 },
        }),
        ...groups.map((_, gi) =>
          new TableCell({
            width: { size: groupW, type: WidthType.PERCENTAGE },
            shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: s(r.assignments?.[gi] ?? ''),
                    font: FONT, size: 17, color: TEXT,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            margins: { top: 70, bottom: 70, left: 80, right: 80 },
          }),
        ),
      ],
    })
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ tableHeader: true, children: hdrCells }), ...dataRows],
  })
}

// 준비물 테이블
function materialsTable(items: { name: string; quantity: string }[]): Table {
  const hdr = new TableRow({
    tableHeader: true,
    children: ['품목', '수량 / 비고'].map((col, i) =>
      new TableCell({
        width: { size: [55, 45][i], type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
        children: [
          new Paragraph({
            children: [new TextRun({ text: col, font: FONT, bold: true, size: 17, color: 'FFFFFF' })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
      }),
    ),
  })
  const dataRows = items.map((item, i) => {
    const shade = i % 2 === 0 ? GRAY : undefined
    return new TableRow({
      children: [s(item.name), s(item.quantity)].map((text, ci) =>
        new TableCell({
          width: { size: [55, 45][ci], type: WidthType.PERCENTAGE },
          shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
          children: [
            new Paragraph({
              children: [new TextRun({ text, font: FONT, size: 17, color: TEXT })],
            }),
          ],
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
        }),
      ),
    })
  })
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [hdr, ...dataRows] })
}

// ── 숫자 포맷 ──────────────────────────────────────────────────────
function numFmt(n: number): string {
  return n > 0 ? n.toLocaleString('ko-KR') : '–'
}

// ── 견적서 섹션 ───────────────────────────────────────────────────
const QW = [40, 20, 8, 8, 24] as const // 항목명/단가/수량/단위/금액

function quoteItemRow(item: QuoteLineItem, idx: number): TableRow[] {
  const shade = idx % 2 === 0 ? GRAY : undefined
  const amt   = item.unitPrice * item.quantity
  const rows: TableRow[] = []

  rows.push(
    new TableRow({
      children: [
        // 항목명
        new TableCell({
          width: { size: QW[0], type: WidthType.PERCENTAGE },
          shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
          children: [
            new Paragraph({
              children: [new TextRun({ text: s(item.name), font: FONT, size: 18, color: TEXT, bold: true })],
            }),
          ],
          margins: { top: 70, bottom: 70, left: 100, right: 100 },
        }),
        // 단가
        new TableCell({
          width: { size: QW[1], type: WidthType.PERCENTAGE },
          shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
          children: [
            new Paragraph({
              children: [new TextRun({ text: item.unitPrice > 0 ? numFmt(item.unitPrice) : '–', font: FONT, size: 17, color: TEXT })],
              alignment: AlignmentType.RIGHT,
            }),
          ],
          margins: { top: 70, bottom: 70, left: 80, right: 100 },
        }),
        // 수량
        new TableCell({
          width: { size: QW[2], type: WidthType.PERCENTAGE },
          shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
          children: [
            new Paragraph({
              children: [new TextRun({ text: String(item.quantity), font: FONT, size: 17, color: TEXT })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          margins: { top: 70, bottom: 70, left: 60, right: 60 },
        }),
        // 단위
        new TableCell({
          width: { size: QW[3], type: WidthType.PERCENTAGE },
          shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
          children: [
            new Paragraph({
              children: [new TextRun({ text: s(item.unit), font: FONT, size: 17, color: TEXT })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          margins: { top: 70, bottom: 70, left: 60, right: 60 },
        }),
        // 금액
        new TableCell({
          width: { size: QW[4], type: WidthType.PERCENTAGE },
          shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
          children: [
            new Paragraph({
              children: [new TextRun({ text: amt > 0 ? numFmt(amt) : '–', font: FONT, size: 17, color: TEXT, bold: true })],
              alignment: AlignmentType.RIGHT,
            }),
          ],
          margins: { top: 70, bottom: 70, left: 80, right: 100 },
        }),
      ],
    }),
  )

  // 세부항목 행 (있을 때만)
  if (item.subItems?.length) {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 5,
            shading: { type: ShadingType.SOLID, color: LIGHT_BLUE, fill: LIGHT_BLUE },
            children: item.subItems.map((sub) =>
              new Paragraph({
                children: [
                  new TextRun({
                    text: `    ${sub.startsWith('·') || sub.startsWith('•') ? '' : '· '}${sub}`,
                    font: FONT, size: 16, color: '555555',
                  }),
                ],
                spacing: { after: 20 },
              }),
            ),
            margins: { top: 50, bottom: 50, left: 140, right: 100 },
          }),
        ],
      }),
    )
  }

  return rows
}

function quoteTableHeader(headerColor: string): TableRow {
  return new TableRow({
    tableHeader: true,
    children: ['항  목  명', '단  가 (원)', '수 량', '단 위', '금  액 (원)'].map((col, i) =>
      new TableCell({
        width: { size: QW[i], type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: headerColor, fill: headerColor },
        children: [
          new Paragraph({
            children: [new TextRun({ text: col, font: FONT, bold: true, size: 17, color: 'FFFFFF' })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
      }),
    ),
  })
}

function quoteSummaryRows(quote: QuoteData): TableRow[] {
  const subtotal  = (quote.items ?? []).reduce((s, it) => s + it.unitPrice * it.quantity, 0)
  const expense   = Math.round(subtotal * (quote.expenseRate / 100))
  const subtotal2 = subtotal + expense
  const profit    = quote.profitAmount
  const supplyAmt = subtotal2 + profit
  const vat       = quote.includeVat ? Math.round(supplyAmt * 0.1) : 0
  const total     = supplyAmt + vat

  const rows: Array<{ label: string; value: number; isTotal?: boolean; isBold?: boolean }> = [
    { label: '소  계',                        value: subtotal },
    { label: `제경비 (${quote.expenseRate}%)`, value: expense },
    { label: '소  계',                        value: subtotal2 },
    { label: '기업이윤',                       value: profit },
    { label: '공급가액',                       value: supplyAmt, isBold: true },
  ]
  if (quote.includeVat) rows.push({ label: '부가세 VAT (10%)', value: vat })
  rows.push({ label: quote.includeVat ? '합  계 (VAT 포함)' : '합  계', value: total, isTotal: true })

  return rows.map(({ label, value, isTotal, isBold }) =>
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          shading: {
            type: ShadingType.SOLID,
            color: isTotal ? NAVY : LIGHT_BLUE,
            fill:  isTotal ? NAVY : LIGHT_BLUE,
          },
          children: [
            new Paragraph({
              children: [new TextRun({ text: label, font: FONT, bold: true, size: isTotal ? 19 : 17, color: isTotal ? 'FFFFFF' : NAVY })],
              alignment: AlignmentType.RIGHT,
            }),
          ],
          margins: { top: 80, bottom: 80, left: 100, right: 120 },
        }),
        new TableCell({
          shading: {
            type: ShadingType.SOLID,
            color: isTotal ? NAVY : (isBold ? ACCENT : 'FFFFFF'),
            fill:  isTotal ? NAVY : (isBold ? ACCENT : 'FFFFFF'),
          },
          children: [
            new Paragraph({
              children: [new TextRun({
                text: value > 0 ? numFmt(value) : '–',
                font: FONT, bold: isBold || isTotal,
                size: isTotal ? 19 : 17,
                color: isTotal ? 'FFFFFF' : TEXT,
              })],
              alignment: AlignmentType.RIGHT,
            }),
          ],
          margins: { top: 80, bottom: 80, left: 80, right: 120 },
        }),
      ],
    }),
  )
}

function quoteSection(quote: QuoteData): Array<Paragraph | Table> {
  const result: Array<Paragraph | Table> = []

  // 업체 정보
  const companyRows: [string, string][] = []
  if (quote.companyName)    companyRows.push(['업 체 명', quote.companyName])
  if (quote.representative) companyRows.push(['대 표 자', quote.representative])
  if (quote.contact)        companyRows.push(['연 락 처', quote.contact])
  if (companyRows.length) {
    result.push(infoTable(companyRows))
    result.push(gap(140))
  }

  // 주요 항목 테이블
  const itemRows = (quote.items ?? []).flatMap((item, i) => quoteItemRow(item, i))
  const summaryRows = quoteSummaryRows(quote)

  result.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [quoteTableHeader(NAVY), ...itemRows, ...summaryRows],
    }),
  )

  // 선택 항목
  const optItems = quote.optionalItems ?? []
  if (optItems.length > 0) {
    const optTotal = optItems.reduce((s, it) => s + it.unitPrice * it.quantity, 0)
    result.push(gap(140), subH('선택 항목 (별도)'))

    const optRows = optItems.flatMap((item, i) => quoteItemRow(item, i))
    result.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [quoteTableHeader(MID_BLUE), ...optRows],
      }),
    )

    if (optTotal > 0) {
      result.push(
        gap(60),
        new Paragraph({
          children: [
            new TextRun({ text: '선택항목 합계:  ', font: FONT, size: 17, color: '555555' }),
            new TextRun({ text: `${numFmt(optTotal)}원`, font: FONT, size: 17, color: TEXT, bold: true }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 60 },
        }),
      )
    }
  }

  return result
}

// ── 메인 export 함수 ──────────────────────────────────────────────
export async function exportProposalDocx(content: ProposalContent): Promise<void> {
  const children: Array<Paragraph | Table> = []

  // ── 타이틀
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '행 사 기 획 제 안 서', font: FONT, bold: true, size: 52, color: NAVY })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 320, after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: s(content.eventName), font: FONT, size: 34, color: MID_BLUE, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
  )

  if (content.tagline) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: s(content.tagline), font: FONT, size: 22, color: '555555', italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }),
    )
  }

  if (content.highlights?.length) {
    children.push(
      new Paragraph({
        children: content.highlights
          .map((h, i) => [
            new TextRun({ text: s(h), font: FONT, size: 20, color: MID_BLUE }),
            ...(i < content.highlights.length - 1
              ? [new TextRun({ text: '  ·  ', font: FONT, size: 20, color: 'BBBBBB' })]
              : []),
          ])
          .flat(),
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }),
    )
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${s(content.clientName) || '(고객사)'}  |  ${s(content.eventDate) || '날짜 미정'}  |  작성일: ${todayKor()}`,
          font: FONT, size: 18, color: '888888',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    divider(),
  )

  // ── 1. 행사 개요
  children.push(secH('1. 행사 개요'))
  children.push(
    infoTable([
      ['고  객  명', s(content.clientName)],
      ['연  락  처', s(content.contact)],
      ['행  사  명', s(content.eventName)],
      ['행  사  일', s(content.eventDate)],
      ['행사 장소',  s(content.eventPlace)],
      ['예상 인원',  s(content.headcount)],
      ['예    산',   s(content.budget)],
      ['행사 유형',  s(content.eventType)],
    ]),
  )

  // ── 2. 프로그램 진행 흐름
  children.push(gap(), secH('2. 프로그램 진행 흐름', true))
  if (content.programFlow?.length) {
    children.push(programTable(content.programFlow))
  }

  // ── 3. 운영 시스템
  let nextSec = 3
  if (content.operationSystem) {
    children.push(gap(), secH(`${nextSec}. 운영 시스템 안내`, true))
    children.push(subH(s(content.operationSystem.title)))
    ;(content.operationSystem.rules ?? []).forEach((r) => children.push(bulletP(r)))
    if (content.operationSystem.note) {
      children.push(bodyP(s(content.operationSystem.note), { color: '888888', italic: true }))
    }
    nextSec++
  }

  // ── 시상 방안
  if (content.awardOptions?.length) {
    children.push(gap(), secH(`${nextSec}. 시상 방안`, true))
    children.push(awardTable(content.awardOptions))
    children.push(gap(80), bodyP('※ 두 안 병행 가능 · 최종 시상 방식은 사전 협의 후 확정', { color: '888888', size: 17, italic: true }))
    nextSec++
  }

  // ── 타임테이블
  if (content.timetable) {
    children.push(gap(), secH(`${nextSec}. 진행 타임테이블`, true))
    nextSec++

    if (content.timetable.structureNote) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `【 운영 구조 】  ${s(content.timetable.structureNote)}`,
              font: FONT, size: 19, color: '444444', bold: true,
            }),
          ],
          spacing: { before: 80, after: 120 },
          shading: { type: ShadingType.SOLID, color: 'F0F4FB', fill: 'F0F4FB' },
        }),
      )
    }

    for (const session of content.timetable.sessions ?? []) {
      if (session.label) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: s(session.label), font: FONT, bold: true, size: 20, color: MID_BLUE })],
            spacing: { before: 120, after: 80 },
          }),
        )
      }
      if (session.groups?.length) {
        children.push(rotationTable(session.groups, session.rows ?? []))
      } else {
        children.push(simpleTimeTable(session.rows ?? []))
      }
      children.push(gap(80))
    }

    for (const note of content.timetable.footerNotes ?? []) {
      children.push(bodyP(`※ ${note}`, { color: '888888', size: 17 }))
    }
  }

  // ── 준비물 목록
  if (content.materialsList?.length) {
    children.push(gap(), secH(`${nextSec}. 부스별 필요 준비물`, true))
    nextSec++

    for (const cat of content.materialsList) {
      children.push(subH(s(cat.category)))
      children.push(materialsTable(cat.items ?? []))
      children.push(gap(80))
    }

    if (content.staffingNote) {
      children.push(bodyP(`※ 운영 참고: ${s(content.staffingNote)}`, { color: '666666', size: 18 }))
    }
  }

  // ── 팔로업 / 특이사항
  const followUp = content.followUp ?? []
  const notes    = content.notes ?? []

  if (followUp.length) {
    children.push(gap(), secH(`${nextSec}. 팔로업 계획`))
    nextSec++
    followUp.forEach((l) => children.push(bulletP(s(l))))
  }

  if (notes.length) {
    children.push(gap(), secH(`${nextSec}. 특이사항`))
    nextSec++
    notes.forEach((l) => children.push(bulletP(s(l))))
  }

  // ── 견적서
  if (content.quote && content.quote.items?.length > 0) {
    children.push(gap(), secH(`${nextSec}. 견적서`, true))
    nextSec++
    children.push(...quoteSection(content.quote))
  }

  // ── 제안사 소개
  children.push(
    gap(),
    secH('제안사 소개', true),
    bodyP('위드아크(WITH ARK)는 조직 개발 및 팀빌딩 전문 기업으로, 공공기관·지자체·대기업을 대상으로 체험형 프로그램을 운영하고 있습니다.'),
    gap(60),
    bulletP('주민자치·지방행정 조직 대상 워크숍 다수 수행'),
    bulletP('갈등 관리 체험 프로그램 자체 개발·운영'),
    bulletP('행사 기획부터 현장 운영까지 원스톱 제공'),
    bulletP('전국 네트워크 기반 신속한 현장 지원 가능'),
    gap(),
    divider(),
    bodyP('본 제안서는 귀 기관의 요청 사항을 바탕으로 작성된 초안입니다.', { color: '666666', italic: true, center: true }),
    bodyP('세부 내용은 협의를 통해 조정 가능하며, 최선의 행사를 함께 만들어 가겠습니다.', { color: '666666', italic: true, center: true }),
    gap(),
    new Paragraph({
      children: [new TextRun({ text: '위드아크(WITH ARK)', font: FONT, bold: true, size: 26, color: NAVY })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: `작성일: ${todayKor()}`, font: FONT, size: 17, color: '999999' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    }),
  )

  // ── 문서 조립
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
                    text: `위드아크(WITH ARK)  |  ${s(content.eventName) || '행사 제안서'}`,
                    font: FONT, size: 17, color: '999999',
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
                    font: FONT, size: 17, color: '999999',
                  }),
                  new TextRun({
                    text: `    |    ${s(content.clientName) || ''} 귀중`,
                    font: FONT, size: 17, color: 'CCCCCC',
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
  const name = s(content.clientName || '고객').replace(/\s/g, '_')
  const date = s(content.eventDate || '미정').replace(/[\s.년월일]/g, '-').replace(/-+/g, '-').replace(/-$/, '')
  saveAs(blob, `제안서_${name}_${date}.docx`)
}

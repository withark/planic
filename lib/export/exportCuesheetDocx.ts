import type { QuoteDoc } from '@/lib/types'
import {
  AlignmentType,
  Document,
  Footer,
  Header,
  Packer,
  Paragraph,
  PageOrientation,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { saveAs } from 'file-saver'

const NAVY = '1C2B4A'
const GRAY = 'F5F5F5'
const FONT = '맑은 고딕'
const TEXT = '333333'

function safeStr(v: unknown): string {
  return String(v ?? '').trim()
}

function headerPara(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, color: NAVY, bold: true, size: 18 })],
    alignment: AlignmentType.LEFT,
  })
}

function cellPara(text: string, opts?: { bold?: boolean; white?: boolean }): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: safeStr(text),
        font: FONT,
        size: 16,
        color: opts?.white ? 'FFFFFF' : TEXT,
        bold: opts?.bold,
      }),
    ],
  })
}

const COL_WIDTHS = [8, 6, 18, 26, 12, 15, 15] // 합계 100%

function makeHeaderRow(cols: string[]): TableRow {
  return new TableRow({
    tableHeader: true,
    children: cols.map((col, i) =>
      new TableCell({
        width: { size: COL_WIDTHS[i], type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
        children: [cellPara(col, { bold: true, white: true })],
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
      }),
    ),
  })
}

function makeSectionRow(label: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        columnSpan: 7,
        shading: { type: ShadingType.SOLID, color: '2E4E8A', fill: '2E4E8A' },
        children: [cellPara(label, { bold: true, white: true })],
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
      }),
    ],
  })
}

function makeDataRow(
  cells: string[],
  shade: boolean,
): TableRow {
  return new TableRow({
    children: cells.map((c, i) =>
      new TableCell({
        width: { size: COL_WIDTHS[i], type: WidthType.PERCENTAGE },
        shading: shade ? { type: ShadingType.SOLID, color: GRAY, fill: GRAY } : undefined,
        children: [cellPara(c)],
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
      }),
    ),
  })
}

export async function exportCuesheetDocx(doc: QuoteDoc): Promise<void> {
  const cueRows = doc.program?.cueRows ?? []

  const COLS = ['시간', '소요', '프로그램', '세부내용', '형태', '담당', '비고']

  const tableRows: TableRow[] = [makeHeaderRow(COLS)]

  if (cueRows.length > 0) {
    let rowIdx = 0
    cueRows.forEach((row) => {
      tableRows.push(
        makeDataRow(
          [
            safeStr(row.time),
            safeStr((row as any).duration ?? ''),
            safeStr(row.content),
            safeStr((row as any).detail ?? row.prep ?? ''),
            safeStr((row as any).format ?? row.staff ?? ''),
            '',
            '',
          ],
          rowIdx++ % 2 === 0,
        ),
      )
    })
  } else {
    const defaults = [
      ['09:00', '30분', '등록 및 접수', '참가자 등록, 명찰 배부', '운영팀', '', ''],
      ['09:30', '20분', '오프닝 / 식순', '사회자 인사, 행사 안내', '사회자', '', ''],
      ['09:50', '50분', '메인 프로그램 1', '주요 순서 진행', '진행팀', '', ''],
      ['10:40', '20분', '휴식', '자유 시간', '전체', '', ''],
      ['11:00', '60분', '메인 프로그램 2', '세부 진행', '진행팀', '', ''],
      ['12:00', '60분', '중식', '식사 및 네트워킹', '전체', '', ''],
      ['13:00', '90분', '오후 프로그램', '오후 세션 진행', '진행팀', '', ''],
      ['14:30', '30분', '마무리 및 시상', '결과 발표, 시상식', '사회자', '', ''],
      ['15:00', '', '해산', '귀환 이동', '운영팀', '', ''],
    ]
    defaults.forEach((row, i) => tableRows.push(makeDataRow(row, i % 2 === 0)))
  }

  const cuesheetTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  })

  const docx = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 16838, height: 11906, orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `큐시트  ·  ${safeStr(doc.eventName || '행사')}`,
                    font: FONT,
                    color: NAVY,
                    bold: true,
                    size: 20,
                  }),
                  new TextRun({
                    text: `    ${safeStr(doc.eventDate || '')}  ${safeStr(doc.venue || '')}`,
                    font: FONT,
                    color: '888888',
                    size: 16,
                  }),
                ],
                alignment: AlignmentType.LEFT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: '위드아크(WITH ARK) · 행사 운영팀', font: FONT, color: 'AAAAAA', size: 14 }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        children: [cuesheetTable],
      },
    ],
  })

  const blob = await Packer.toBlob(docx)
  const eventName = safeStr(doc.eventName || '행사').replace(/\s/g, '_')
  const eventDate = safeStr(doc.eventDate || '미정').replace(/\./g, '-')
  saveAs(blob, `큐시트_${eventName}_${eventDate}.docx`)
}

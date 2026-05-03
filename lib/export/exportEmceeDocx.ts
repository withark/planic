import type { QuoteDoc } from '@/lib/types'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
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

const NAVY = '1C2B4A'
const LIGHT_BLUE = 'E8EEF7'
const GRAY = 'F5F5F5'
const FONT = '맑은 고딕'
const TEXT = '333333'

function safeStr(v: unknown): string {
  return String(v ?? '').trim()
}

function cellPara(text: string, opts?: { bold?: boolean; white?: boolean; size?: number; wrap?: boolean }): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: safeStr(text),
        font: FONT,
        size: opts?.size ?? 18,
        color: opts?.white ? 'FFFFFF' : TEXT,
        bold: opts?.bold,
      }),
    ],
  })
}

// 컬럼 너비: 순서(4) / 시간(7) / 구간(12) / 멘트(52) / 큐(13) / 비고(12)
const COL_WIDTHS = [4, 7, 12, 52, 13, 12]

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

function makeScriptRow(cells: string[], shade: boolean): TableRow {
  return new TableRow({
    children: cells.map((c, i) =>
      new TableCell({
        width: { size: COL_WIDTHS[i], type: WidthType.PERCENTAGE },
        shading: shade ? { type: ShadingType.SOLID, color: GRAY, fill: GRAY } : undefined,
        children: [
          new Paragraph({
            children: [new TextRun({ text: safeStr(c), font: FONT, size: 17, color: TEXT })],
          }),
        ],
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
      }),
    ),
  })
}

function summaryBox(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: safeStr(text), font: FONT, size: 19, color: NAVY, bold: true })],
    shading: { type: ShadingType.SOLID, color: LIGHT_BLUE, fill: LIGHT_BLUE },
    spacing: { before: 120, after: 120 },
    border: {
      top: { style: BorderStyle.SINGLE, size: 6, color: NAVY },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: NAVY },
      left: { style: BorderStyle.SINGLE, size: 6, color: NAVY },
      right: { style: BorderStyle.SINGLE, size: 6, color: NAVY },
    },
  })
}

function guideBox(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: `📌 MC 지침: ${safeStr(text)}`, font: FONT, size: 17, color: '555555' })],
    shading: { type: ShadingType.SOLID, color: 'FFF8E7', fill: 'FFF8E7' },
    spacing: { before: 80, after: 200 },
  })
}

export async function exportEmceeDocx(doc: QuoteDoc): Promise<void> {
  const emcee = doc.emceeScript
  const scriptLines = emcee?.lines ?? []
  const summaryTop = safeStr(emcee?.summaryTop ?? `${doc.eventName || '행사'} 사회자 멘트`)
  const hostGuidelines = safeStr(emcee?.hostGuidelines ?? '')

  const COLS = ['순서', '시간', '구간', '멘트', '큐', '비고']
  const tableRows: TableRow[] = [makeHeaderRow(COLS)]

  if (scriptLines.length > 0) {
    scriptLines.forEach((line, i) => {
      tableRows.push(
        makeScriptRow(
          [
            safeStr(line.order),
            safeStr(line.time),
            safeStr(line.segment),
            safeStr(line.script),
            safeStr(line.notes),
            '',
          ],
          i % 2 === 0,
        ),
      )
    })
  } else {
    const defaults = [
      ['1', '09:30', '오프닝', '안녕하세요! 오늘 행사의 사회를 맡은 ___ 입니다. 먼저 행사장에 찾아주신 여러분께 진심으로 감사드립니다.', '음악 페이드아웃', ''],
      ['2', '09:35', '소개', '오늘 이 자리를 마련해 주신 ___에 대해 소개드리겠습니다. (소개 멘트)', '조명 변경', ''],
      ['3', '09:40', '개회 선언', '그럼, 지금부터 (행사명)을 시작하겠습니다!', '기립 유도', ''],
      ['4', '09:45', '메인 순서 진행', '다음 순서는 ___입니다. (세부 멘트)', '슬라이드 준비', ''],
      ['5', '10:30', '휴식 안내', '잠시 10분간 휴식 시간을 갖겠습니다. 참가자분들은 자유롭게 이동해 주시기 바랍니다.', '음악 BGM', ''],
      ['6', '11:30', '마무리', '오늘 함께해 주신 모든 분들께 감사드리며, 이것으로 (행사명) 행사를 마치겠습니다. 감사합니다!', '클로징 음악', ''],
    ]
    defaults.forEach((row, i) => tableRows.push(makeScriptRow(row, i % 2 === 0)))
  }

  const scriptTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  })

  const children: Array<Paragraph | Table> = []

  children.push(summaryBox(summaryTop))
  if (hostGuidelines) children.push(guideBox(hostGuidelines))
  children.push(scriptTable)

  const docx = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 900, bottom: 900, left: 1000, right: 1000 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `사회자 멘트  ·  ${safeStr(doc.eventName || '행사')}`,
                    font: FONT,
                    color: NAVY,
                    bold: true,
                    size: 20,
                  }),
                  new TextRun({
                    text: `    ${safeStr(doc.eventDate || '')}`,
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
                  new TextRun({ text: '위드아크(WITH ARK) · MC 대본', font: FONT, color: 'AAAAAA', size: 14 }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(docx)
  const eventName = safeStr(doc.eventName || '행사').replace(/\s/g, '_')
  const eventDate = safeStr(doc.eventDate || '미정').replace(/\./g, '-')
  saveAs(blob, `사회자멘트_${eventName}_${eventDate}.docx`)
}

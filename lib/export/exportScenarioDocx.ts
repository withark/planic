/**
 * 시나리오/연출 흐름(scenario) 전용 Word(.docx) export.
 * QuoteDoc.scenario(opening/development/mainPoints/closing/directionNotes/summaryTop)을 워드로 옮긴다.
 */
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
import type { QuoteDoc } from '@/lib/types'

const NAVY = '1C2B4A'
const MID_BLUE = '2E4E8A'
const LIGHT_BLUE = 'E8EEF7'
const TEXT = '333333'
const FONT = '맑은 고딕'

function s(v: unknown): string {
  return String(v ?? '').trim()
}

function todayKor(): string {
  const d = new Date()
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

function secH(text: string, pageBreak = false): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, bold: true, size: 30, color: NAVY })],
    spacing: { before: pageBreak ? 0 : 280, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: NAVY } },
    pageBreakBefore: pageBreak,
  })
}

function body(text: string, opts?: { color?: string; size?: number; italic?: boolean; bold?: boolean }): Paragraph {
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
    spacing: { after: 80 },
  })
}

function bulletP(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, size: 20, color: TEXT })],
    bullet: { level: 0 },
    spacing: { after: 60 },
  })
}

function gap(after = 120): Paragraph {
  return new Paragraph({ text: '', spacing: { after } })
}

function paragraphBlock(text: string | undefined): Paragraph[] {
  const t = s(text)
  if (!t) return []
  return t
    .split(/\n+/u)
    .filter((line) => line.trim().length > 0)
    .map((line) => body(line.trim()))
}

function infoTable(rows: [string, string][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'D0D8E8' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D0D8E8' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'D0D8E8' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'D0D8E8' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'D0D8E8' },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'D0D8E8' },
    },
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 24, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: LIGHT_BLUE, fill: LIGHT_BLUE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: label, font: FONT, bold: true, size: 18, color: NAVY })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
            }),
            new TableCell({
              width: { size: 76, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: value || '–', font: FONT, size: 18, color: TEXT })],
                }),
              ],
              margins: { top: 80, bottom: 80, left: 140, right: 120 },
            }),
          ],
        }),
    ),
  })
}

export interface ScenarioDocxOptions {
  companyName?: string
  companyContact?: string
}

export async function exportScenarioDocx(doc: QuoteDoc, options?: ScenarioDocxOptions): Promise<void> {
  const scenario = doc.scenario
  if (!scenario) {
    throw new Error('시나리오 본문이 비어 있습니다. 먼저 시나리오를 생성해 주세요.')
  }

  const children: Array<Paragraph | Table> = []

  children.push(
    new Paragraph({
      children: [new TextRun({ text: '행 사 시 나 리 오', font: FONT, bold: true, size: 52, color: NAVY })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 320, after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: s(doc.eventName) || '행사명 미정', font: FONT, size: 32, color: MID_BLUE, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
  )

  if (scenario.summaryTop) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: s(scenario.summaryTop), font: FONT, size: 22, color: '444444', italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }),
    )
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${s(doc.clientName) || '의뢰처 미정'}  |  ${s(doc.eventDate) || '일정 미정'}  |  ${s(doc.venue) || '장소 미정'}  |  작성일: ${todayKor()}`,
          font: FONT,
          size: 18,
          color: '888888',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      text: '',
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
      spacing: { before: 60, after: 120 },
    }),
  )

  children.push(secH('1. 행사 개요'))
  children.push(
    infoTable([
      ['의 뢰 처', s(doc.clientName)],
      ['행 사 명', s(doc.eventName)],
      ['행 사 일', s(doc.eventDate)],
      ['장    소', s(doc.venue)],
      ['예상 인원', s(doc.headcount)],
      ['행사 유형', s(doc.eventType)],
    ]),
  )

  if (s(scenario.opening)) {
    children.push(gap(), secH('2. 오프닝'))
    children.push(...paragraphBlock(scenario.opening))
  }

  if (s(scenario.development)) {
    children.push(gap(), secH('3. 전개'))
    children.push(...paragraphBlock(scenario.development))
  }

  const points = (scenario.mainPoints ?? []).map((l) => s(l)).filter(Boolean)
  if (points.length) {
    children.push(gap(), secH('4. 핵심 포인트'))
    points.forEach((line) => children.push(bulletP(line)))
  }

  if (s(scenario.closing)) {
    children.push(gap(), secH('5. 마무리'))
    children.push(...paragraphBlock(scenario.closing))
  }

  if (s(scenario.directionNotes)) {
    children.push(gap(), secH('6. 연출 노트'))
    children.push(...paragraphBlock(scenario.directionNotes))
  }

  if (s(doc.notes)) {
    children.push(gap(), secH('7. 비고'))
    children.push(...paragraphBlock(doc.notes))
  }

  const docx = new Document({
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
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${options?.companyName?.trim() ? `${options.companyName.trim()}  |  ` : ''}${s(doc.eventName) || '시나리오'}`,
                    font: FONT,
                    size: 16,
                    color: '999999',
                  }),
                ],
                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
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
                  new TextRun({
                    children: [PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES],
                    font: FONT,
                    size: 16,
                    color: '999999',
                  }),
                  ...(options?.companyContact?.trim()
                    ? [
                        new TextRun({
                          text: `    |    ${options.companyContact.trim()}`,
                          font: FONT,
                          size: 16,
                          color: 'AAAAAA',
                        }),
                      ]
                    : []),
                ],
                border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
              }),
            ],
          }),
        },
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(docx)
  const safeName = (s(doc.clientName) || '고객').replace(/\s+/g, '_')
  const safeDate = (s(doc.eventDate) || '미정').replace(/\./g, '-').replace(/[년월일\s]/g, '')
  saveAs(blob, `시나리오_${safeName}_${safeDate}.docx`)
}

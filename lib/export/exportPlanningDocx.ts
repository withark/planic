/**
 * 기획 문서(planning) 전용 Word(.docx) export.
 * QuoteDoc.planning 본문(배경·프로그램 개요·세부 액션·액션 플랜·기대 효과)을 워드 본문에 그대로 옮긴다.
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
import type {
  PlanningActionBlock,
  PlanningActionPlanRow,
  PlanningOverviewRow,
  PlanningStatItem,
  QuoteDoc,
} from '@/lib/types'

const NAVY = '1C2B4A'
const MID_BLUE = '2E4E8A'
const LIGHT_BLUE = 'E8EEF7'
const GRAY = 'F5F5F5'
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

function bulletP(text: string, indent = false): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, size: 20, color: TEXT })],
    bullet: { level: indent ? 1 : 0 },
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

function dataTable(headers: string[], rows: string[][], widths?: number[]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (col, i) =>
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
  const dataRows = rows.map(
    (r, i) =>
      new TableRow({
        children: r.map(
          (c, j) =>
            new TableCell({
              width: widths ? { size: widths[j], type: WidthType.PERCENTAGE } : undefined,
              shading: i % 2 === 0 ? { type: ShadingType.SOLID, color: GRAY, fill: GRAY } : undefined,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: c || '–', font: FONT, size: 18, color: TEXT })],
                }),
              ],
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
            }),
        ),
      }),
  )
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  })
}

function statsRowTable(stats: PlanningStatItem[]): Table {
  const cellsPerRow = Math.min(3, stats.length || 1)
  const widthPct = Math.floor(100 / cellsPerRow)
  const rows: TableRow[] = []
  for (let i = 0; i < stats.length; i += cellsPerRow) {
    const slice = stats.slice(i, i + cellsPerRow)
    while (slice.length < cellsPerRow) slice.push({ value: '', label: '', detail: '' })
    rows.push(
      new TableRow({
        children: slice.map(
          (st) =>
            new TableCell({
              width: { size: widthPct, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: LIGHT_BLUE, fill: LIGHT_BLUE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: s(st.value) || '–', font: FONT, bold: true, size: 32, color: NAVY })],
                  spacing: { after: 60 },
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: s(st.label), font: FONT, bold: true, size: 18, color: MID_BLUE })],
                  spacing: { after: 60 },
                }),
                ...(st.detail
                  ? [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: s(st.detail), font: FONT, size: 16, color: '555555' })],
                      }),
                    ]
                  : []),
              ],
              margins: { top: 120, bottom: 120, left: 120, right: 120 },
            }),
        ),
      }),
    )
  }
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
    rows,
  })
}

export async function exportPlanningDocx(doc: QuoteDoc): Promise<void> {
  const planning = doc.planning
  if (!planning) {
    throw new Error('기획 본문이 비어 있습니다. 먼저 기획 문서를 생성해 주세요.')
  }

  const children: Array<Paragraph | Table> = []

  children.push(
    new Paragraph({
      children: [new TextRun({ text: '행 사 기 획 문 서', font: FONT, bold: true, size: 52, color: NAVY })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 320, after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: s(doc.eventName) || '행사명 미정', font: FONT, size: 32, color: MID_BLUE, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
  )
  if (planning.subtitle) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: s(planning.subtitle), font: FONT, size: 22, color: '555555', italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }),
    )
  }
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${s(doc.clientName) || '의뢰처 미정'}  |  ${s(doc.eventDate) || '일정 미정'}  |  작성일: ${todayKor()}`,
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

  if (planning.backgroundStats?.length) {
    children.push(gap(), secH('2. 배경 · 핵심 지표'))
    children.push(statsRowTable(planning.backgroundStats))
  }

  if (s(planning.overview)) {
    children.push(gap(), secH('3. 개요'))
    children.push(...paragraphBlock(planning.overview))
  }

  if (s(planning.scope)) {
    children.push(gap(), secH('4. 범위'))
    children.push(...paragraphBlock(planning.scope))
  }

  if (s(planning.approach)) {
    children.push(gap(), secH('5. 접근 방식'))
    children.push(...paragraphBlock(planning.approach))
  }

  if (planning.programOverviewRows?.length) {
    children.push(gap(), secH('6. 프로그램 개요'))
    children.push(
      dataTable(
        ['구분', '내용', '비고'],
        planning.programOverviewRows.map((r: PlanningOverviewRow) => [s(r.label), s(r.value), s(r.detail)]),
        [20, 55, 25],
      ),
    )
  }

  if (planning.actionProgramBlocks?.length) {
    children.push(gap(), secH('7. 세부 액션 프로그램'))
    children.push(
      dataTable(
        ['순서', '일자', '제목', '내용', '시간', '대상'],
        planning.actionProgramBlocks.map((b: PlanningActionBlock) => [
          String(b.order ?? ''),
          s(b.dayLabel),
          s(b.title),
          s(b.description),
          s(b.timeRange),
          s(b.participants),
        ]),
        [8, 12, 20, 35, 13, 12],
      ),
    )
  }

  if (s(planning.operationPlan)) {
    children.push(gap(), secH('8. 운영 계획'))
    children.push(...paragraphBlock(planning.operationPlan))
  }

  if (planning.actionPlanTable?.length) {
    children.push(gap(), secH('9. 액션 플랜 (D-day)'))
    children.push(
      dataTable(
        ['단계', '시점', '내용', '담당'],
        planning.actionPlanTable.map((r: PlanningActionPlanRow) => [s(r.step), s(r.timing), s(r.content), s(r.owner)]),
        [12, 18, 50, 20],
      ),
    )
  }

  if (s(planning.deliverablesPlan)) {
    children.push(gap(), secH('10. 산출물 계획'))
    children.push(...paragraphBlock(planning.deliverablesPlan))
  }

  if (s(planning.staffingConditions)) {
    children.push(gap(), secH('11. 투입 인력 / 운영 조건'))
    children.push(...paragraphBlock(planning.staffingConditions))
  }

  if (s(planning.risksAndCautions)) {
    children.push(gap(), secH('12. 리스크 · 주의 사항'))
    children.push(...paragraphBlock(planning.risksAndCautions))
  }

  if (planning.checklist?.length) {
    children.push(gap(), secH('13. 체크리스트'))
    planning.checklist
      .map((line) => s(line))
      .filter(Boolean)
      .forEach((line) => children.push(bulletP(line)))
  }

  const shortEffects = planning.expectedEffectsShortTerm?.filter((l) => s(l)) ?? []
  const longEffects = planning.expectedEffectsLongTerm?.filter((l) => s(l)) ?? []
  if (shortEffects.length || longEffects.length) {
    children.push(gap(), secH('14. 기대 효과'))
    if (shortEffects.length) {
      children.push(body('단기 효과', { bold: true, color: MID_BLUE, size: 22 }))
      shortEffects.forEach((line) => children.push(bulletP(line)))
    }
    if (longEffects.length) {
      children.push(gap(60), body('장기 효과', { bold: true, color: MID_BLUE, size: 22 }))
      longEffects.forEach((line) => children.push(bulletP(line)))
    }
  }

  if (s(doc.notes)) {
    children.push(gap(), secH('15. 비고'))
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
                    text: `${s(doc.eventName) || '행사 기획 문서'}`,
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
  saveAs(blob, `기획문서_${safeName}_${safeDate}.docx`)
}

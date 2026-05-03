import type { QuoteDoc } from '@/lib/types'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  PageNumber,
  PageOrientation,
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
const MID_BLUE = '2E4E8A'
const LIGHT_BLUE = 'E8EEF7'
const GRAY = 'F5F5F5'
const TEXT = '333333'
const FONT = '맑은 고딕'

function safeStr(v: unknown): string {
  return String(v ?? '').trim()
}

function navyPara(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: safeStr(text), font: FONT, color: NAVY, bold: true, size: 22 })],
    spacing: { before: 200, after: 80 },
    shading: { type: ShadingType.SOLID, color: LIGHT_BLUE, fill: LIGHT_BLUE },
  })
}

function sectionHeading(num: string, title: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${num}. ${title}`, font: FONT, color: NAVY, bold: true, size: 24 }),
    ],
    spacing: { before: 320, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: MID_BLUE } },
  })
}

function bodyPara(text: string, opts?: { bold?: boolean; size?: number }): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: safeStr(text),
        font: FONT,
        color: TEXT,
        bold: opts?.bold,
        size: opts?.size ?? 20,
      }),
    ],
    spacing: { after: 80 },
  })
}

function bulletPara(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: safeStr(text), font: FONT, color: TEXT, size: 20 })],
    bullet: { level: 0 },
    spacing: { after: 60 },
  })
}

function makeRow(cells: Array<{ text: string; header?: boolean; shade?: string }>): TableRow {
  return new TableRow({
    children: cells.map(
      (c) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: safeStr(c.text),
                  font: FONT,
                  bold: c.header,
                  color: c.header ? 'FFFFFF' : TEXT,
                  size: 18,
                }),
              ],
            }),
          ],
          shading: c.header
            ? { type: ShadingType.SOLID, color: NAVY, fill: NAVY }
            : c.shade
              ? { type: ShadingType.SOLID, color: c.shade, fill: c.shade }
              : undefined,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
        }),
    ),
  })
}

function overviewTable(doc: QuoteDoc, extra: { budget: string }): Table {
  const rows = [
    ['고객명', safeStr(doc.clientName)],
    ['행사명', safeStr(doc.eventName)],
    ['행사일', safeStr(doc.eventDate)],
    ['장소', safeStr(doc.venue)],
    ['인원', safeStr(doc.headcount)],
    ['예산', safeStr(extra.budget) || '협의'],
    ['행사 유형', safeStr(doc.eventType)],
  ]
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: label, font: FONT, bold: true, color: NAVY, size: 18 })],
              }),
            ],
            shading: { type: ShadingType.SOLID, color: LIGHT_BLUE, fill: LIGHT_BLUE },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
          }),
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: value, font: FONT, color: TEXT, size: 18 })],
              }),
            ],
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
          }),
        ],
      }),
    ),
  })
}

function timelineTable(rows: Array<{ time?: string; content?: string; detail?: string; manager?: string }>): Table {
  const header = makeRow([
    { text: '시간', header: true },
    { text: '프로그램', header: true },
    { text: '세부내용', header: true },
    { text: '담당', header: true },
  ])
  const body = rows.map((r, i) =>
    makeRow([
      { text: safeStr(r.time), shade: i % 2 === 0 ? GRAY : undefined },
      { text: safeStr(r.content), shade: i % 2 === 0 ? GRAY : undefined },
      { text: safeStr(r.detail), shade: i % 2 === 0 ? GRAY : undefined },
      { text: safeStr(r.manager), shade: i % 2 === 0 ? GRAY : undefined },
    ]),
  )
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...body],
  })
}

function defaultTimeline(): Table {
  const items = [
    ['이동', '집결지 이동', ''],
    ['오리엔테이션', '행사 안내 및 팀 구성', ''],
    ['메인 프로그램', '주요 프로그램 진행', ''],
    ['중식', '식사 및 휴식', ''],
    ['오후 프로그램', '오후 세션 진행', ''],
    ['정리', '마무리 및 시상', ''],
    ['귀환', '귀환 이동', ''],
  ]
  const header = makeRow([
    { text: '구분', header: true },
    { text: '프로그램', header: true },
    { text: '비고', header: true },
  ])
  const body = items.map(([section, program, note], i) =>
    makeRow([
      { text: section, shade: i % 2 === 0 ? GRAY : undefined },
      { text: program, shade: i % 2 === 0 ? GRAY : undefined },
      { text: note, shade: i % 2 === 0 ? GRAY : undefined },
    ]),
  )
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...body] })
}

function quoteTable(doc: QuoteDoc): Table {
  const header = makeRow([
    { text: '구분', header: true },
    { text: '소계 (원)', header: true },
  ])
  const rows = (doc.quoteItems ?? []).map((cat, i) => {
    const subtotal = (cat.items ?? []).reduce((s, item) => s + (Number(item.total) || 0), 0)
    return makeRow([
      { text: safeStr(cat.category), shade: i % 2 === 0 ? GRAY : undefined },
      {
        text: subtotal > 0 ? subtotal.toLocaleString('ko-KR') : '협의',
        shade: i % 2 === 0 ? GRAY : undefined,
      },
    ])
  })
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...rows] })
}

function defaultBudgetTable(budget: string): Table {
  const items = [
    ['진행비', '35%'],
    ['인건비', '25%'],
    ['장비·시설', '20%'],
    ['식음료', '15%'],
    ['기타', '5%'],
  ]
  const header = makeRow([
    { text: '항목', header: true },
    { text: '비율', header: true },
    { text: '비고', header: true },
  ])
  const body = items.map(([item, ratio], i) =>
    makeRow([
      { text: item, shade: i % 2 === 0 ? GRAY : undefined },
      { text: ratio, shade: i % 2 === 0 ? GRAY : undefined },
      { text: i === 0 ? safeStr(budget) || '협의' : '', shade: i % 2 === 0 ? GRAY : undefined },
    ]),
  )
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...body] })
}

export async function exportProposalDocx(
  doc: QuoteDoc,
  extraData: { budget: string; followUp: string; notes: string },
): Promise<void> {
  const timeline = doc.program?.timeline ?? []
  const hasTimeline = timeline.length > 0
  const hasQuoteItems = (doc.quoteItems ?? []).length > 0

  const reqLines = safeStr(doc.notes || extraData.notes || '')
    .split('\n')
    .filter(Boolean)
  const followUpLines = safeStr(extraData.followUp).split('\n').filter(Boolean)

  const children: Array<Paragraph | Table> = []

  // 타이틀
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '행사 기획 제안서', font: FONT, color: NAVY, bold: true, size: 48 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 120 },
    }),
  )
  children.push(
    new Paragraph({
      children: [new TextRun({ text: safeStr(doc.eventName), font: FONT, color: MID_BLUE, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
  )
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${safeStr(doc.clientName) || '고객사'}  ·  ${safeStr(doc.eventDate) || '날짜 미정'}`,
          font: FONT,
          color: '666666',
          size: 20,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  )

  // 1. 행사 개요
  children.push(sectionHeading('1', '행사 개요'))
  children.push(overviewTable(doc, { budget: extraData.budget }))

  // 2. 주요 요구사항
  if (reqLines.length > 0) {
    children.push(sectionHeading('2', '주요 요구사항'))
    reqLines.forEach((line) => children.push(bulletPara(line)))
  }

  // 3. 프로그램 구성 (안)
  children.push(sectionHeading('3', '프로그램 구성 (안)'))
  children.push(hasTimeline ? timelineTable(timeline) : defaultTimeline())

  // 4. 견적 요약
  children.push(sectionHeading('4', '견적 요약'))
  children.push(hasQuoteItems ? quoteTable(doc) : defaultBudgetTable(extraData.budget))

  // 5. 팔로업 계획
  if (followUpLines.length > 0) {
    children.push(sectionHeading('5', '팔로업 계획'))
    followUpLines.forEach((line) => children.push(bulletPara(line)))
  }

  // 6. 특이사항
  const notesLines = safeStr(extraData.notes).split('\n').filter(Boolean)
  if (notesLines.length > 0) {
    children.push(sectionHeading('6', '특이사항'))
    notesLines.forEach((line) => children.push(bulletPara(line)))
  }

  // 7. 제안사 소개
  children.push(sectionHeading('7', '제안사 소개'))
  children.push(
    bodyPara(
      '(주)위드아크는 기업 행사 전문 기획 파트너입니다. 체육대회·워크숍·시상식·세미나 등 다양한 행사를 기획·진행해 왔으며, ' +
        '고객사의 요구에 맞는 맞춤형 프로그램과 운영 서비스를 제공합니다.',
    ),
  )

  // 마무리
  children.push(new Paragraph({ text: '', spacing: { before: 400 } }))
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '본 제안서는 협의 과정에서 조정될 수 있으며, 최종 내용은 계약서로 확정됩니다.',
          font: FONT,
          color: NAVY,
          bold: true,
          italics: true,
          size: 18,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
  )

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
                children: [
                  new TextRun({ text: '위드아크(WITH ARK)  |  행사 제안서', font: FONT, color: '888888', size: 16 }),
                ],
                alignment: AlignmentType.RIGHT,
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
                    children: ['- ', PageNumber.CURRENT, ' -'],
                    font: FONT,
                    size: 16,
                    color: '888888',
                  }),
                ],
                alignment: AlignmentType.CENTER,
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
  saveAs(blob, `제안서_${eventName}_${eventDate}.docx`)
}

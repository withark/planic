import type { CuesheetContent } from '@/lib/types/doc-content'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
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

const NAVY  = '1C2B4A'
const GRAY  = 'F5F5F5'
const FONT  = '맑은 고딕'
const TEXT  = '333333'
const LIGHT = 'E8EEF7'

function s(v: unknown): string { return String(v ?? '').trim() }

function todayKor(): string {
  const d = new Date()
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

function gap(n = 100): Paragraph {
  return new Paragraph({ text: '', spacing: { after: n } })
}

function bodyP(text: string, opts?: { size?: number; color?: string; bold?: boolean; center?: boolean }): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, size: opts?.size ?? 18, color: opts?.color ?? TEXT, bold: opts?.bold })],
    alignment: opts?.center ? AlignmentType.CENTER : undefined,
    spacing: { after: 60 },
  })
}

// 열 너비: 시간(8) / 소요(6) / 프로그램(16) / 세부내용(26) / 형태(10) / 담당(11) / 장비(13) / 비고(10)
const COL_W = [8, 6, 16, 26, 10, 11, 13, 10]
const COL_HEADERS = ['시간', '소요', '프로그램', '세부 내용', '형태', '담당', '장비', '비고']

function cuesheetTable(rows: CuesheetContent['rows']): Table {
  const hdr = new TableRow({
    tableHeader: true,
    children: COL_HEADERS.map((col, i) =>
      new TableCell({
        width: { size: COL_W[i], type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
        children: [
          new Paragraph({
            children: [new TextRun({ text: col, font: FONT, bold: true, size: 16, color: 'FFFFFF' })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        margins: { top: 70, bottom: 70, left: 80, right: 80 },
      }),
    ),
  })

  const dataRows = rows.map((r, i) => {
    const shade = i % 2 === 0 ? GRAY : undefined
    const cells = [
      s(r.time),
      s(r.duration),
      s(r.program),
      s(r.detail),
      s(r.format),
      s(r.staff),
      s(r.equipment ?? ''),
      s(r.notes ?? ''),
    ]
    return new TableRow({
      children: cells.map((text, ci) =>
        new TableCell({
          width: { size: COL_W[ci], type: WidthType.PERCENTAGE },
          shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
          children: [
            new Paragraph({
              children: [new TextRun({ text, font: FONT, size: 16, color: TEXT })],
            }),
          ],
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
        }),
      ),
    })
  })

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [hdr, ...dataRows] })
}

function staffInfoTable(content: CuesheetContent): Table {
  const rows: [string, string][] = [
    ['행  사  명', s(content.eventName)],
    ['행  사  일', s(content.eventDate)],
    ['행사 장소',  s(content.eventPlace)],
    ['예상 인원',  s(content.headcount)],
    ['큐시트 형태', s(content.cuesheetType)],
    ['작  성  일', todayKor()],
  ]

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value], i) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 18, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT },
            children: [
              new Paragraph({
                children: [new TextRun({ text: label, font: FONT, bold: true, size: 16, color: NAVY })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            margins: { top: 70, bottom: 70, left: 100, right: 100 },
          }),
          new TableCell({
            width: { size: 32, type: WidthType.PERCENTAGE },
            shading: i % 2 === 1 ? { type: ShadingType.SOLID, color: 'F0F4FB', fill: 'F0F4FB' } : undefined,
            children: [
              new Paragraph({
                children: [new TextRun({ text: s(value) || '–', font: FONT, size: 16, color: TEXT })],
              }),
            ],
            margins: { top: 70, bottom: 70, left: 120, right: 100 },
          }),
        ],
      }),
    ),
  })
}

export async function exportCuesheetDocx(content: CuesheetContent): Promise<void> {
  const children: Array<Paragraph | Table> = []

  // 타이틀
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '행 사 운 영 큐 시 트', font: FONT, bold: true, size: 40, color: NAVY })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: s(content.eventName), font: FONT, size: 26, color: '2E4E8A', bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${s(content.eventDate) || '날짜 미정'}  |  ${s(content.eventPlace) || '장소 미정'}  |  ${s(content.headcount) || '인원 미정'}  |  작성일: ${todayKor()}`,
          font: FONT, size: 16, color: '888888',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      text: '',
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
      spacing: { before: 60, after: 120 },
    }),
  )

  // 기본 정보 테이블
  children.push(staffInfoTable(content))
  children.push(gap(120))

  // 스태프 목록
  if (content.staffList?.length) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '■ 운영 인력', font: FONT, bold: true, size: 19, color: NAVY })],
        spacing: { before: 80, after: 60 },
      }),
    )
    content.staffList.forEach((staff) =>
      children.push(
        new Paragraph({
          children: [new TextRun({ text: staff, font: FONT, size: 17, color: TEXT })],
          bullet: { level: 0 },
          spacing: { after: 40 },
        }),
      ),
    )
    children.push(gap(100))
  }

  // 메인 큐시트 테이블
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '■ 진행 큐시트', font: FONT, bold: true, size: 19, color: NAVY })],
      spacing: { before: 80, after: 60 },
    }),
    cuesheetTable(content.rows ?? []),
  )

  // 비고
  if (content.notes?.length) {
    children.push(gap(120))
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '■ 운영 유의사항', font: FONT, bold: true, size: 19, color: NAVY })],
        spacing: { before: 80, after: 60 },
      }),
    )
    content.notes.forEach((note) =>
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `※ ${note}`, font: FONT, size: 17, color: '555555' })],
          spacing: { after: 60 },
        }),
      ),
    )
  }

  // 문서 조립 (A4 가로)
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 16838, height: 11906, orientation: PageOrientation.LANDSCAPE },
            margin: { top: 900, bottom: 900, left: 1000, right: 1000 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `위드아크(WITH ARK)  |  ${s(content.eventName)} 큐시트`, font: FONT, size: 16, color: '999999' }),
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
                    font: FONT, size: 16, color: '999999',
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
  const name = s(content.eventName || '행사').replace(/\s/g, '_')
  const date = s(content.eventDate || '미정').replace(/[\s.년월일]/g, '-').replace(/-+/g, '-').replace(/-$/, '')
  saveAs(blob, `큐시트_${name}_${date}.docx`)
}

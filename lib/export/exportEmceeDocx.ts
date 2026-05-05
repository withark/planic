import type { EmceeContent } from '@/lib/types/doc-content'
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

const NAVY  = '1C2B4A'
const GRAY  = 'F5F5F5'
const FONT  = '맑은 고딕'
const TEXT  = '333333'
const LIGHT = 'E8EEF7'
const BLUE  = '2E4E8A'

function s(v: unknown): string { return String(v ?? '').trim() }

function todayKor(): string {
  const d = new Date()
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

function gap(n = 100): Paragraph {
  return new Paragraph({ text: '', spacing: { after: n } })
}

// 열 너비: 순서(5) / 시간(7) / 구간(14) / 멘트(52) / 큐(13) / 비고(9)
const COL_W = [5, 7, 14, 52, 13, 9]
const COL_HEADERS = ['순서', '시간', '구간', '멘트 (사회자 대본)', '큐 / 지시', '비고']

function scriptTable(segments: EmceeContent['segments']): Table {
  const hdr = new TableRow({
    tableHeader: true,
    children: COL_HEADERS.map((col, i) =>
      new TableCell({
        width: { size: COL_W[i], type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
        children: [
          new Paragraph({
            children: [new TextRun({ text: col, font: FONT, bold: true, size: 17, color: 'FFFFFF' })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        margins: { top: 80, bottom: 80, left: 80, right: 80 },
      }),
    ),
  })

  const dataRows = segments.map((seg, i) => {
    const shade = i % 2 === 0 ? GRAY : undefined
    return new TableRow({
      children: [
        // 순서
        new TableCell({
          width: { size: COL_W[0], type: WidthType.PERCENTAGE },
          shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
          children: [
            new Paragraph({
              children: [new TextRun({ text: String(seg.sequence), font: FONT, size: 17, color: TEXT, bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          margins: { top: 70, bottom: 70, left: 60, right: 60 },
        }),
        // 시간
        new TableCell({
          width: { size: COL_W[1], type: WidthType.PERCENTAGE },
          shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
          children: [
            new Paragraph({
              children: [new TextRun({ text: s(seg.time ?? ''), font: FONT, size: 17, color: TEXT })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          margins: { top: 70, bottom: 70, left: 60, right: 60 },
        }),
        // 구간
        new TableCell({
          width: { size: COL_W[2], type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: LIGHT, fill: LIGHT },
          children: [
            new Paragraph({
              children: [new TextRun({ text: s(seg.stage), font: FONT, size: 17, color: NAVY, bold: true })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          margins: { top: 70, bottom: 70, left: 80, right: 80 },
        }),
        // 멘트 — 긴 텍스트, 줄바꿈 지원
        new TableCell({
          width: { size: COL_W[3], type: WidthType.PERCENTAGE },
          shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
          children: s(seg.script)
            .split('\n')
            .filter(Boolean)
            .map((line) =>
              new Paragraph({
                children: [new TextRun({ text: line, font: FONT, size: 18, color: TEXT })],
                spacing: { after: 60 },
              }),
            ),
          margins: { top: 80, bottom: 80, left: 120, right: 100 },
        }),
        // 큐
        new TableCell({
          width: { size: COL_W[4], type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: 'FFF8E1', fill: 'FFF8E1' },
          children: [
            new Paragraph({
              children: [new TextRun({ text: s(seg.cue ?? ''), font: FONT, size: 16, color: '7B5800' })],
            }),
          ],
          margins: { top: 70, bottom: 70, left: 80, right: 80 },
        }),
        // 비고
        new TableCell({
          width: { size: COL_W[5], type: WidthType.PERCENTAGE },
          shading: shade ? { type: ShadingType.SOLID, color: shade, fill: shade } : undefined,
          children: [
            new Paragraph({
              children: [new TextRun({ text: s(seg.notes ?? ''), font: FONT, size: 15, color: '888888' })],
            }),
          ],
          margins: { top: 70, bottom: 70, left: 80, right: 80 },
        }),
      ],
    })
  })

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [hdr, ...dataRows] })
}

function infoTable(content: EmceeContent): Table {
  const rows: [string, string][] = [
    ['행  사  명', s(content.eventName)],
    ['행  사  일', s(content.eventDate)],
    ['대  본  톤', s(content.tone)],
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
                children: [new TextRun({ text: label, font: FONT, bold: true, size: 17, color: NAVY })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
          }),
          new TableCell({
            width: { size: 32, type: WidthType.PERCENTAGE },
            shading: i % 2 === 1 ? { type: ShadingType.SOLID, color: 'F0F4FB', fill: 'F0F4FB' } : undefined,
            children: [
              new Paragraph({
                children: [new TextRun({ text: s(value) || '–', font: FONT, size: 17, color: TEXT })],
              }),
            ],
            margins: { top: 80, bottom: 80, left: 120, right: 100 },
          }),
        ],
      }),
    ),
  })
}

export async function exportEmceeDocx(content: EmceeContent): Promise<void> {
  const children: Array<Paragraph | Table> = []

  // 타이틀
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '사 회 자 진 행 대 본', font: FONT, bold: true, size: 44, color: NAVY })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: s(content.eventName), font: FONT, size: 28, color: BLUE, bold: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${s(content.eventDate) || '날짜 미정'}  |  톤: ${s(content.tone)}  |  작성일: ${todayKor()}`,
          font: FONT, size: 17, color: '888888',
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
  children.push(infoTable(content))
  children.push(gap(120))

  // 안내문
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: '※ 본 대본은 실제 진행 흐름에 맞게 수정·보완하여 사용하시기 바랍니다.', font: FONT, size: 16, color: '888888', italics: true }),
      ],
      spacing: { before: 0, after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `※ 큐(CUE) 란은 음향·조명·영상 담당자에게 전달되는 신호입니다. 색상은 참고용입니다.`, font: FONT, size: 16, color: '888888', italics: true }),
      ],
      spacing: { after: 120 },
    }),
  )

  // 메인 스크립트 테이블
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '■ 진행 대본', font: FONT, bold: true, size: 20, color: NAVY })],
      spacing: { before: 80, after: 80 },
    }),
    scriptTable(content.segments ?? []),
  )

  // 특이사항
  if (content.notes?.length) {
    children.push(gap(140))
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '■ 진행 유의사항', font: FONT, bold: true, size: 20, color: NAVY })],
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

  // 문서 조립 (A4 세로)
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `위드아크(WITH ARK)  |  ${s(content.eventName)} 사회자 대본  (${s(content.tone)})`, font: FONT, size: 16, color: '999999' }),
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
  saveAs(blob, `사회자대본_${name}_${date}.docx`)
}

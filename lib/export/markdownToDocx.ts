/**
 * 마크다운 텍스트 → docx Buffer 변환.
 * 지원: # h1, ## h2, ### h3, **bold**, 표(|), - 불릿, 1. 번호 목록, --- 구분선, 일반 문단
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
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  ShadingType,
} from 'docx'

const FONT = '맑은 고딕'
const NAVY = '1C2B4A'
const LIGHT_GRAY = 'F5F7FA'
const TEXT = '2D2D2D'
const ACCENT = '2E5B9A'

// ── 인라인 파싱 ─────────────────────────────────────────────

type Span = { text: string; bold?: boolean; italic?: boolean }

function parseInline(raw: string): Span[] {
  const spans: Span[] = []
  // **bold** or *italic*
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    if (m.index > last) spans.push({ text: raw.slice(last, m.index) })
    if (m[0].startsWith('**')) spans.push({ text: m[2], bold: true })
    else spans.push({ text: m[3], italic: true })
    last = m.index + m[0].length
  }
  if (last < raw.length) spans.push({ text: raw.slice(last) })
  return spans.filter(s => s.text)
}

function makeRuns(raw: string, extra?: { bold?: boolean; color?: string; size?: number }): TextRun[] {
  return parseInline(raw).map(
    s =>
      new TextRun({
        text: s.text,
        font: FONT,
        bold: extra?.bold || s.bold,
        italics: s.italic,
        color: extra?.color ?? TEXT,
        size: extra?.size ?? 22,
      }),
  )
}

// ── 단락 생성 헬퍼 ───────────────────────────────────────────

function h1(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, bold: true, size: 40, color: NAVY })],
    spacing: { before: 480, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: NAVY } },
  })
}

function h2(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, bold: true, size: 30, color: NAVY })],
    spacing: { before: 360, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT } },
  })
}

function h3(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: FONT, bold: true, size: 24, color: ACCENT })],
    spacing: { before: 240, after: 80 },
  })
}

function body(raw: string): Paragraph {
  return new Paragraph({
    children: makeRuns(raw),
    spacing: { before: 60, after: 60 },
  })
}

function bullet(raw: string, level = 0): Paragraph {
  return new Paragraph({
    children: makeRuns(raw),
    bullet: { level },
    spacing: { before: 40, after: 40 },
  })
}

function numbered(raw: string, level = 0): Paragraph {
  return new Paragraph({
    children: makeRuns(raw),
    numbering: { reference: 'default-numbering', level },
    spacing: { before: 40, after: 40 },
  })
}

function hr(): Paragraph {
  return new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
    spacing: { before: 160, after: 160 },
  })
}

function empty(): Paragraph {
  return new Paragraph({ children: [], spacing: { before: 40, after: 40 } })
}

// ── 표 파싱 ──────────────────────────────────────────────────

function isTableRow(line: string) {
  return line.trim().startsWith('|') && line.trim().endsWith('|')
}

function isSeparatorRow(line: string) {
  return /^\|[\s\-:|]+\|$/.test(line.trim())
}

function parseCells(line: string): string[] {
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map(c => c.trim())
}

function buildTable(rows: string[]): Table {
  const dataRows = rows.filter(r => !isSeparatorRow(r))
  const [headerRow, ...bodyRows] = dataRows

  const headCells = parseCells(headerRow ?? '')
  const colCount = headCells.length
  const colWidths = Array(colCount).fill(Math.floor(9000 / colCount))

  const makeHeaderRow = () =>
    new TableRow({
      children: headCells.map(
        (cell, i) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: cell, font: FONT, bold: true, size: 20, color: 'FFFFFF' }),
                ],
                alignment: AlignmentType.LEFT,
              }),
            ],
            width: { size: colWidths[i]!, type: WidthType.DXA },
            shading: { type: ShadingType.SOLID, color: NAVY, fill: NAVY },
          }),
      ),
    })

  const makeBodyRow = (line: string, isEven: boolean) => {
    const cells = parseCells(line)
    const bg = isEven ? LIGHT_GRAY : 'FFFFFF'
    return new TableRow({
      children: Array.from({ length: colCount }, (_, i) => {
        const cellText = cells[i] ?? ''
        return new TableCell({
          children: [
            new Paragraph({
              children: makeRuns(cellText, { size: 20 }),
              spacing: { before: 40, after: 40 },
            }),
          ],
          width: { size: colWidths[i]!, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: bg, fill: bg },
        })
      }),
    })
  }

  return new Table({
    rows: [makeHeaderRow(), ...bodyRows.map((r, i) => makeBodyRow(r, i % 2 === 0))],
    width: { size: 9000, type: WidthType.DXA },
  })
}

// ── 메인 변환 ────────────────────────────────────────────────

export async function markdownToDocxBuffer(
  markdown: string,
  meta: { title?: string; date?: string },
): Promise<Buffer> {
  const lines = markdown.split('\n')
  const children: (Paragraph | Table)[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]!

    // 표 블록 수집
    if (isTableRow(line)) {
      const tableLines: string[] = []
      while (i < lines.length && isTableRow(lines[i]!)) {
        tableLines.push(lines[i]!)
        i++
      }
      if (tableLines.length >= 2) {
        children.push(buildTable(tableLines))
        children.push(empty())
      }
      continue
    }

    const trimmed = line.trim()

    if (trimmed.startsWith('# ')) {
      children.push(h1(trimmed.slice(2).trim()))
    } else if (trimmed.startsWith('## ')) {
      children.push(h2(trimmed.slice(3).trim()))
    } else if (trimmed.startsWith('### ')) {
      children.push(h3(trimmed.slice(4).trim()))
    } else if (trimmed.startsWith('#### ')) {
      children.push(h3(trimmed.slice(5).trim()))
    } else if (/^[-*]\s/.test(trimmed)) {
      children.push(bullet(trimmed.slice(2).trim()))
    } else if (/^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s/, '')
      children.push(numbered(text))
    } else if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      children.push(hr())
    } else if (trimmed === '') {
      children.push(empty())
    } else {
      children.push(body(trimmed))
    }

    i++
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: meta.title ?? '기획 제안서',
                    font: FONT,
                    size: 18,
                    color: '999999',
                  }),
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
                  new TextRun({ text: meta.date ?? '', font: FONT, size: 16, color: '999999' }),
                  new TextRun({ text: '   ', font: FONT, size: 16 }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: '999999' }),
                  new TextRun({ text: ' / ', font: FONT, size: 16, color: '999999' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: '999999' }),
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

  return Buffer.from(await Packer.toBuffer(doc))
}

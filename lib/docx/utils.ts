// lib/docx/utils.ts — planic.cloud 공유 유틸 (docx-js 템플릿)

import {
  AlignmentType,
  BorderStyle,
  Footer,
  Header,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  PageOrientation,
  type IBorderOptions,
  type INumberingOptions,
} from 'docx'

export const COLORS: Record<string, string> = {
  brandBlue: '1E3A5F',
  brandAccent: 'E8A020',
  lightBlue: 'EBF0F7',
  midBlue: 'C5D3E8',
  gray: '666666',
  lightGray: 'F5F5F5',
  white: 'FFFFFF',
}

export const borders = {
  solid: (color = 'CCCCCC'): Record<'top' | 'bottom' | 'left' | 'right', IBorderOptions> => {
    const b = { style: BorderStyle.SINGLE, size: 1, color }
    return { top: b, bottom: b, left: b, right: b }
  },
  none: (): Record<'top' | 'bottom' | 'left' | 'right', IBorderOptions> => {
    const b = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
    return { top: b, bottom: b, left: b, right: b }
  },
}

export function paragraph(
  text: string,
  {
    bold = false,
    size = 22,
    color = '333333',
    align = AlignmentType.LEFT,
    spaceBefore = 80,
    spaceAfter = 80,
  } = {},
) {
  return new Paragraph({
    spacing: { before: spaceBefore, after: spaceAfter },
    alignment: align,
    children: [new TextRun({ text, font: 'Arial', size, bold, color })],
  })
}

export function heading1(text: string) {
  return new Paragraph({
    spacing: { before: 480, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: COLORS.brandAccent, space: 4 } },
    children: [new TextRun({ text, font: 'Arial', size: 32, bold: true, color: COLORS.brandBlue })],
  })
}

export function heading2(text: string) {
  return new Paragraph({
    spacing: { before: 320, after: 120 },
    children: [new TextRun({ text, font: 'Arial', size: 26, bold: true, color: COLORS.brandBlue })],
  })
}

export function spacer(count = 1) {
  return Array.from({ length: count }, () =>
    new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: '' })] }),
  )
}

type CellOpts = {
  fill?: string
  bold?: boolean
  color?: string
  align?: (typeof AlignmentType)[keyof typeof AlignmentType]
  size?: number
}

export function cell(text: unknown, width: number, opts: CellOpts = {}) {
  const {
    fill = COLORS.white,
    bold = false,
    color = '333333',
    align = AlignmentType.LEFT,
    size = 20,
  } = opts
  return new TableCell({
    borders: borders.solid(),
    width: { size: width, type: WidthType.DXA },
    shading: { fill, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 160, right: 160 },
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text: String(text ?? ''), font: 'Arial', size, bold, color })],
      }),
    ],
  })
}

export function headerCell(text: unknown, width: number) {
  return cell(text, width, {
    fill: COLORS.brandBlue,
    bold: true,
    color: COLORS.white,
    align: AlignmentType.CENTER,
  })
}

export function labelCell(text: unknown, width: number) {
  return cell(text, width, {
    fill: COLORS.lightBlue,
    bold: true,
    color: COLORS.brandBlue,
  })
}

export function infoRow(label: unknown, value: unknown) {
  return new TableRow({
    children: [labelCell(label, 2520), cell(value, 7118)],
  })
}

export function makeHeader(companyName: string, docTitle: string) {
  return new Header({
    children: [
      new Table({
        width: { size: 9638, type: WidthType.DXA },
        columnWidths: [6500, 3138],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: borders.none(),
                width: { size: 6500, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: companyName,
                        font: 'Arial',
                        size: 20,
                        bold: true,
                        color: COLORS.brandBlue,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                borders: borders.none(),
                width: { size: 3138, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({ text: docTitle, font: 'Arial', size: 18, color: COLORS.gray }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.brandBlue, space: 2 } },
        spacing: { before: 80, after: 0 },
        children: [new TextRun({ text: '' })],
      }),
    ],
  })
}

export function makeFooter(companyName: string, contact: string, email: string) {
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.midBlue, space: 4 } },
        spacing: { before: 80 },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `${companyName}  |  ${contact}  |  ${email}        `,
            font: 'Arial',
            size: 16,
            color: COLORS.gray,
          }),
          new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: COLORS.gray }),
          new TextRun({ text: ' / ', font: 'Arial', size: 16, color: COLORS.gray }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 16, color: COLORS.gray }),
        ],
      }),
    ],
  })
}

export const PAGE_A4 = {
  size: { width: 11906, height: 16838 },
  margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 },
}

export const PAGE_A4_LANDSCAPE = {
  size: {
    width: 16838,
    height: 11906,
    orientation: PageOrientation.LANDSCAPE,
  },
  margin: { top: 720, right: 720, bottom: 720, left: 720 },
}

export const BASE_STYLES = {
  default: { document: { run: { font: 'Arial', size: 22 } } },
  paragraphStyles: [
    {
      id: 'Heading1',
      name: 'Heading 1',
      basedOn: 'Normal',
      next: 'Normal',
      quickFormat: true,
      run: { size: 32, bold: true, font: 'Arial', color: COLORS.brandBlue },
      paragraph: { spacing: { before: 480, after: 160 }, outlineLevel: 0 },
    },
    {
      id: 'Heading2',
      name: 'Heading 2',
      basedOn: 'Normal',
      next: 'Normal',
      quickFormat: true,
      run: { size: 26, bold: true, font: 'Arial', color: COLORS.brandBlue },
      paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 1 },
    },
  ],
}

export const NUMBERING_CONFIG = {
  config: [
    {
      reference: 'bullets',
      levels: [
        {
          level: 0,
          format: 'bullet',
          text: '▸',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 600, hanging: 300 } } },
        },
      ],
    },
  ],
} as const satisfies INumberingOptions

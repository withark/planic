import type ExcelJS from 'exceljs'
import type { QuoteDoc, CompanySettings } from '@/lib/types'
import { getQuoteDateForFilename } from '@/lib/calc'
import { KIND_ORDER, groupQuoteItemsByKind } from '@/lib/quoteGroup'

export type ExcelExportView = 'quote' | 'timeline' | 'program' | 'planning' | 'scenario' | 'cuesheet'

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const DEFAULT_FONT = 'Malgun Gothic'
const TABLE_HEADER_BG = '1F3864'
const SECTION_BG = 'D6E4F7'
const SUBTOTAL_BG = 'D6E4F7'
const TOTAL_BG = '1F3864'

type BorderStyle = 'thin' | 'medium' | 'thick'

export async function exportToExcel(
  doc: QuoteDoc,
  company?: CompanySettings | null,
  view: ExcelExportView = 'quote',
) {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()

  const date = getQuoteDateForFilename(doc.quoteDate)
  const name = doc.eventName.replace(/\s/g, '_')

  if (view === 'quote') {
    buildQuoteSheet(ExcelJS, workbook, doc, company)
    buildQuoteProgramPlanSheet(ExcelJS, workbook, doc)
    await downloadWorkbook(workbook, `견적서_${name}_${date}.xlsx`)
    return
  }

  if (view === 'timeline') {
    buildTimelineSheet(ExcelJS, workbook, doc)
    await downloadWorkbook(workbook, `견적서_${name}_${date}_타임테이블.xlsx`)
    return
  }

  if (view === 'program') {
    buildProgramSheet(ExcelJS, workbook, doc)
    await downloadWorkbook(workbook, `프로그램제안서_${name}_${date}.xlsx`)
    return
  }

  if (view === 'planning') {
    buildPlanningSheet(ExcelJS, workbook, doc)
    await downloadWorkbook(workbook, `기획문서_${name}_${date}.xlsx`)
    return
  }

  if (view === 'scenario') {
    buildScenarioSheet(ExcelJS, workbook, doc)
    await downloadWorkbook(workbook, `시나리오_${name}_${date}.xlsx`)
    return
  }

  buildCueSheetSheet(ExcelJS, workbook, doc)
  await downloadWorkbook(workbook, `큐시트_${name}_${date}.xlsx`)
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: EXCEL_MIME })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function baseBorder() {
  return {
    top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
    bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
    left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
    right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
  } as const
}

function borderByStyle(style: BorderStyle) {
  return {
    top: { style, color: { argb: 'FF000000' } },
    bottom: { style, color: { argb: 'FF000000' } },
    left: { style, color: { argb: 'FF000000' } },
    right: { style, color: { argb: 'FF000000' } },
  } as const
}

function roundToHundred(value: number) {
  return Math.round((value || 0) / 100) * 100
}

function toNumber(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function setCell(
  ws: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: string | number,
  opts: {
    bold?: boolean
    align?: 'left' | 'center' | 'right'
    bg?: string
    size?: number
    numFmt?: string
    color?: string
    italic?: boolean
  } = {},
) {
  const cell = ws.getCell(row, col)
  cell.value = value
  cell.font = {
    name: DEFAULT_FONT,
    size: opts.size || 10,
    bold: opts.bold || false,
    italic: opts.italic || false,
    ...(opts.color ? { color: { argb: `FF${opts.color}` } } : {}),
  }
  cell.alignment = {
    horizontal: opts.align || 'left',
    vertical: 'middle',
    wrapText: true,
  }
  cell.border = baseBorder()
  if (opts.bg) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${opts.bg}` },
    }
  }
  if (opts.numFmt) cell.numFmt = opts.numFmt
}

function colName(col: number) {
  let n = col
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

function ref(row: number, col: number) {
  return `${colName(col)}${row}`
}

function setFormulaCell(
  ws: ExcelJS.Worksheet,
  row: number,
  col: number,
  formula: string,
  opts: {
    bold?: boolean
    align?: 'left' | 'center' | 'right'
    bg?: string
    size?: number
    numFmt?: string
    color?: string
    italic?: boolean
  } = {},
) {
  setCell(ws, row, col, 0, opts)
  ws.getCell(row, col).value = { formula }
}

function merge(ws: ExcelJS.Worksheet, row1: number, col1: number, row2: number, col2: number) {
  ws.mergeCells(row1, col1, row2, col2)
}

function applyOuterBorder(
  ws: ExcelJS.Worksheet,
  rowStart: number,
  colStart: number,
  rowEnd: number,
  colEnd: number,
  style: BorderStyle,
) {
  for (let row = rowStart; row <= rowEnd; row += 1) {
    for (let col = colStart; col <= colEnd; col += 1) {
      const cell = ws.getCell(row, col)
      const border = cell.border || {}
      const next = { ...border }
      if (row === rowStart) next.top = { style, color: { argb: 'FF000000' } }
      if (row === rowEnd) next.bottom = { style, color: { argb: 'FF000000' } }
      if (col === colStart) next.left = { style, color: { argb: 'FF000000' } }
      if (col === colEnd) next.right = { style, color: { argb: 'FF000000' } }
      cell.border = next
    }
  }
}

function applyBorderRange(
  ws: ExcelJS.Worksheet,
  rowStart: number,
  colStart: number,
  rowEnd: number,
  colEnd: number,
  style: BorderStyle,
) {
  const border = borderByStyle(style)
  for (let row = rowStart; row <= rowEnd; row += 1) {
    for (let col = colStart; col <= colEnd; col += 1) {
      ws.getCell(row, col).border = border
    }
  }
}

function buildQuoteSheet(
  ExcelJS: typeof import('exceljs'),
  workbook: ExcelJS.Workbook,
  doc: QuoteDoc,
  company?: CompanySettings | null,
) {
  const ws = workbook.addWorksheet('견적서')
  let r = 1
  ws.columns = [
    { width: 10 },
    { width: 18 },
    { width: 28 },
    { width: 7 },
    { width: 7 },
    { width: 13 },
    { width: 7 },
    { width: 13 },
    { width: 11 },
    { width: 13 },
    { width: 20 },
  ]
  ws.pageSetup = {
    paperSize: 9,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: {
      left: 0.19685,
      right: 0.19685,
      top: 0.3937,
      bottom: 0.3937,
      header: 0.2,
      footer: 0.2,
    },
  }

  const isOutsourceOrExtra = (text: string) => /(외주|추가)/i.test(text)
  const isVatExempt = (text: string) => /(면세|부가세\s*면제|vat\s*exempt)/i.test(text)
  const byKind = groupQuoteItemsByKind(doc)
  const kindSubtotals: number[] = []
  const outsourceRows: number[] = []
  let zebra = 0

  merge(ws, r, 1, r + 2, 2)
  setCell(ws, r, 1, '[ LOGO ]', { bold: true, align: 'center', bg: 'F5F5F5' })
  setCell(ws, r, 3, '견  적  서', { bold: true, align: 'center', size: 20 })
  merge(ws, r, 3, r + 2, 8)
  ;[
    ['작성자', company?.contact || company?.ceo || '-'],
    ['작성일자', doc.quoteDate || '-'],
    ['행사일자', doc.eventDate || '-'],
  ].forEach(([label, value], idx) => {
    const row = r + idx
    setCell(ws, row, 9, label, { bold: true, align: 'center', bg: SECTION_BG })
    setCell(ws, row, 10, value, { align: 'center' })
    merge(ws, row, 10, row, 11)
  })
  ws.getRow(1).height = 30
  ws.getRow(2).height = 28
  ws.getRow(3).height = 28
  applyOuterBorder(ws, 1, 1, 3, 11, 'medium')
  r = 5

  const infoStart = r
  setCell(ws, r, 1, '수신(발주처)', { bold: true, align: 'center', bg: TABLE_HEADER_BG, color: 'FFFFFF' })
  merge(ws, r, 1, r, 5)
  setCell(ws, r, 6, '공급자', { bold: true, align: 'center', bg: TABLE_HEADER_BG, color: 'FFFFFF' })
  merge(ws, r, 6, r, 11)
  r += 1

  const leftRows: Array<[string, string]> = [
    ['업체명', doc.clientName || '-'],
    ['담당자', doc.clientManager || '-'],
    ['연락처', doc.clientTel || '-'],
    ['행사명', doc.eventName || '-'],
    ['행사종류', doc.eventType || '-'],
    ['행사일', doc.eventDate || '-'],
    ['행사시간', doc.eventDuration || '-'],
    ['장소', doc.venue || '-'],
    ['참석인원', doc.headcount || '-'],
  ]
  const rightRows: Array<[string, string]> = [
    ['사업자번호', company?.biz || '-'],
    ['상호명', company?.name || '-'],
    ['대표자', company?.ceo || '-'],
    ['소재지', company?.addr || '-'],
    ['업태', '서비스업'],
    ['종목', '행사·컨벤션 및 행사 대행업'],
    ['담당자', company?.contact || '-'],
    ['전화번호', company?.tel || '-'],
    ['도장', `${company?.ceo || '대표자'} (인)`],
  ]

  for (let i = 0; i < leftRows.length; i += 1) {
    setCell(ws, r, 1, leftRows[i][0], { bg: 'F7F9FC', bold: true, align: 'center' })
    setCell(ws, r, 2, leftRows[i][1], { align: 'left' })
    merge(ws, r, 2, r, 5)

    const right = rightRows[i]
    if (right) {
      setCell(ws, r, 6, right[0], { bg: 'F7F9FC', bold: true, align: 'center' })
      setCell(ws, r, 7, right[1], { align: 'left' })
      merge(ws, r, 7, r, 10)
      if (i === rightRows.length - 1) {
        setCell(ws, r, 11, '◯', { align: 'center', size: 14 })
      } else {
        setCell(ws, r, 11, '', { bg: 'FFFFFF' })
      }
    }
    ws.getRow(r).height = 20
    r += 1
  }
  applyBorderRange(ws, infoStart, 1, r - 1, 11, 'thin')
  applyOuterBorder(ws, infoStart, 1, r - 1, 5, 'medium')
  applyOuterBorder(ws, infoStart, 6, r - 1, 11, 'medium')
  r += 1

  const tableHeaderRow = r
  ;['구분', '항목', '상세 내역', '수량', '단위', '단가', '기간', '금액', '부가세', '합계', '비고'].forEach((label, idx) => {
    setCell(ws, r, idx + 1, label, {
      bold: true,
      align: 'center',
      bg: TABLE_HEADER_BG,
      color: 'FFFFFF',
    })
  })
  ws.getRow(r).height = 24
  r += 1

  KIND_ORDER.forEach((kind) => {
    const rows = byKind.get(kind) || []
    const normal = rows.filter((item) => !isOutsourceOrExtra(`${item.name} ${item.spec} ${item.note}`))
    const split = rows.filter((item) => isOutsourceOrExtra(`${item.name} ${item.spec} ${item.note}`))

    const kindStart = r
    normal.forEach((item) => {
      const qty = Math.max(1, Math.round(toNumber(item.qty || 1)))
      const unitPrice = roundToHundred(toNumber(item.unitPrice || 0))
      const period = 1
      const exempt = isVatExempt(`${item.name} ${item.spec} ${item.note}`)
      const striped = zebra % 2 === 1
      const bg = striped ? 'F5F9FF' : 'FFFFFF'

      setCell(ws, r, 1, kind, { align: 'center', bg })
      setCell(ws, r, 2, item.name || '', { bg })
      setCell(ws, r, 3, item.spec || '', { bg })
      setCell(ws, r, 4, qty, { align: 'center', numFmt: '#,##0', bg })
      setCell(ws, r, 5, item.unit || '식', { align: 'center', bg })
      setCell(ws, r, 6, unitPrice, { align: 'right', numFmt: '#,##0', bg })
      setCell(ws, r, 7, period, { align: 'center', numFmt: '#,##0', bg })
      setFormulaCell(ws, r, 8, `${ref(r, 4)}*${ref(r, 6)}*${ref(r, 7)}`, { align: 'right', numFmt: '#,##0', bg })
      if (exempt) {
        setCell(ws, r, 9, 0, { align: 'right', numFmt: '#,##0', bg })
      } else {
        setFormulaCell(ws, r, 9, `${ref(r, 8)}*0.1`, { align: 'right', numFmt: '#,##0', bg })
      }
      setFormulaCell(ws, r, 10, `${ref(r, 8)}+${ref(r, 9)}`, { align: 'right', numFmt: '#,##0', bg })
      setCell(ws, r, 11, item.note || '', { bg })
      ws.getRow(r).height = 26
      zebra += 1
      r += 1
    })

    if (normal.length > 0) {
      merge(ws, kindStart, 1, r - 1, 1)
      ws.getCell(kindStart, 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      ws.getCell(kindStart, 1).font = { name: DEFAULT_FONT, size: 10, bold: true }
    }

    setCell(ws, r, 1, `${kind} 소계`, { bold: true, bg: SUBTOTAL_BG, align: 'right' })
    merge(ws, r, 1, r, 9)
    if (normal.length > 0) {
      setFormulaCell(ws, r, 10, `SUM(${ref(kindStart, 10)}:${ref(r - 1, 10)})`, {
        bold: true,
        align: 'right',
        bg: SUBTOTAL_BG,
        numFmt: '#,##0',
      })
    } else {
      setCell(ws, r, 10, 0, { bold: true, align: 'right', bg: SUBTOTAL_BG, numFmt: '#,##0' })
    }
    setCell(ws, r, 11, '', { bg: SUBTOTAL_BG })
    kindSubtotals.push(r)
    ws.getRow(r).height = 22
    r += 1

    split.forEach((item) => {
      const qty = Math.max(1, Math.round(toNumber(item.qty || 1)))
      const unitPrice = roundToHundred(toNumber(item.unitPrice || 0))
      const period = 1
      const exempt = isVatExempt(`${item.name} ${item.spec} ${item.note}`)
      setCell(ws, r, 1, kind, { align: 'center', bg: 'F5F5F5', italic: true, color: '888888' })
      setCell(ws, r, 2, item.name || '', { bg: 'F5F5F5', italic: true, color: '888888' })
      setCell(ws, r, 3, item.spec || '', { bg: 'F5F5F5', italic: true, color: '888888' })
      setCell(ws, r, 4, qty, { align: 'center', numFmt: '#,##0', bg: 'F5F5F5', italic: true, color: '888888' })
      setCell(ws, r, 5, item.unit || '식', { align: 'center', bg: 'F5F5F5', italic: true, color: '888888' })
      setCell(ws, r, 6, unitPrice, {
        align: 'right',
        numFmt: '#,##0',
        bg: 'F5F5F5',
        italic: true,
        color: '888888',
      })
      setCell(ws, r, 7, period, { align: 'center', numFmt: '#,##0', bg: 'F5F5F5', italic: true, color: '888888' })
      setFormulaCell(ws, r, 8, `${ref(r, 4)}*${ref(r, 6)}*${ref(r, 7)}`, {
        align: 'right',
        numFmt: '#,##0',
        bg: 'F5F5F5',
        italic: true,
        color: '888888',
      })
      if (exempt) {
        setCell(ws, r, 9, 0, { align: 'right', numFmt: '#,##0', bg: 'F5F5F5', italic: true, color: '888888' })
      } else {
        setFormulaCell(ws, r, 9, `${ref(r, 8)}*0.1`, {
          align: 'right',
          numFmt: '#,##0',
          bg: 'F5F5F5',
          italic: true,
          color: '888888',
        })
      }
      setFormulaCell(ws, r, 10, `${ref(r, 8)}+${ref(r, 9)}`, {
        align: 'right',
        numFmt: '#,##0',
        bg: 'F5F5F5',
        italic: true,
        color: '888888',
      })
      setCell(ws, r, 11, `※ 합계 별도${item.note ? ` / ${item.note}` : ''}`, {
        bg: 'F5F5F5',
        italic: true,
        color: '888888',
      })
      outsourceRows.push(r)
      ws.getRow(r).height = 24
      r += 1
    })
  })
  applyBorderRange(ws, tableHeaderRow, 1, r - 1, 11, 'thin')
  applyOuterBorder(ws, tableHeaderRow, 1, r - 1, 11, 'medium')

  r += 1
  const totalStart = r
  const partialRow = r
  const mgmtRow = r + 1
  const profitRow = r + 2
  const vatRow = r + 3
  const grossRow = r + 4
  const cutRow = r + 5
  const finalRow = r + 6
  const subtotalFormula = kindSubtotals.length > 0 ? kindSubtotals.map((row) => ref(row, 10)).join('+') : '0'

  setCell(ws, partialRow, 8, '부분합계 (외주 제외)', { bold: true, align: 'right', bg: 'F7F9FC' })
  merge(ws, partialRow, 8, partialRow, 9)
  setFormulaCell(ws, partialRow, 10, subtotalFormula, { bold: true, align: 'right', numFmt: '#,##0', bg: 'F7F9FC' })
  merge(ws, partialRow, 10, partialRow, 11)

  setCell(ws, mgmtRow, 8, '일반관리비 (7%)', { align: 'right', bg: 'F7F9FC' })
  merge(ws, mgmtRow, 8, mgmtRow, 9)
  setFormulaCell(ws, mgmtRow, 10, `${ref(partialRow, 10)}*0.07`, { align: 'right', numFmt: '#,##0', bg: 'F7F9FC' })
  merge(ws, mgmtRow, 10, mgmtRow, 11)

  setCell(ws, profitRow, 8, '기업이윤 (7%)', { align: 'right', bg: 'F7F9FC' })
  merge(ws, profitRow, 8, profitRow, 9)
  setFormulaCell(ws, profitRow, 10, `${ref(partialRow, 10)}*0.07`, { align: 'right', numFmt: '#,##0', bg: 'F7F9FC' })
  merge(ws, profitRow, 10, profitRow, 11)

  setCell(ws, vatRow, 8, '부가세 (10%)', { align: 'right', bg: 'F7F9FC' })
  merge(ws, vatRow, 8, vatRow, 9)
  setFormulaCell(ws, vatRow, 10, `(${ref(partialRow, 10)}+${ref(mgmtRow, 10)}+${ref(profitRow, 10)})*0.1`, {
    align: 'right',
    numFmt: '#,##0',
    bg: 'F7F9FC',
  })
  merge(ws, vatRow, 10, vatRow, 11)

  setCell(ws, grossRow, 8, '소계 (VAT 포함)', { align: 'right', bg: 'F7F9FC' })
  merge(ws, grossRow, 8, grossRow, 9)
  setFormulaCell(ws, grossRow, 10, `${ref(partialRow, 10)}+${ref(mgmtRow, 10)}+${ref(profitRow, 10)}+${ref(vatRow, 10)}`, {
    align: 'right',
    numFmt: '#,##0',
    bg: 'F7F9FC',
  })
  merge(ws, grossRow, 10, grossRow, 11)

  setCell(ws, cutRow, 8, '만원 단위 절사', { align: 'right', bg: 'F7F9FC' })
  merge(ws, cutRow, 8, cutRow, 9)
  setFormulaCell(ws, cutRow, 10, `MOD(${ref(grossRow, 10)},10000)`, { align: 'right', numFmt: '#,##0', bg: 'F7F9FC' })
  merge(ws, cutRow, 10, cutRow, 11)

  setCell(ws, finalRow, 8, '최종 합계', {
    bold: true,
    align: 'right',
    bg: TOTAL_BG,
    color: 'FFFFFF',
    size: 14,
  })
  merge(ws, finalRow, 8, finalRow, 9)
  setFormulaCell(ws, finalRow, 10, `${ref(grossRow, 10)}-${ref(cutRow, 10)}`, {
    bold: true,
    align: 'right',
    numFmt: '#,##0',
    bg: TOTAL_BG,
    color: 'C9522A',
    size: 14,
  })
  merge(ws, finalRow, 10, finalRow, 11)
  ws.getRow(finalRow).height = 28
  applyBorderRange(ws, totalStart, 8, finalRow, 11, 'thin')
  applyOuterBorder(ws, totalStart, 8, finalRow, 11, 'medium')

  r = finalRow + 2
  const paymentStart = r
  const outsourceFormula = outsourceRows.length > 0 ? `SUM(${outsourceRows.map((row) => ref(row, 10)).join(',')})` : '0'

  setCell(ws, r, 1, '결제 조건', { bold: true, align: 'center', bg: TABLE_HEADER_BG, color: 'FFFFFF' })
  merge(ws, r, 1, r, 11)
  r += 1

  setCell(ws, r, 1, '선금 (60%)', { bold: true, bg: 'F7F9FC' })
  merge(ws, r, 1, r, 3)
  setFormulaCell(ws, r, 4, `${ref(finalRow, 10)}*0.6`, { align: 'right', numFmt: '#,##0' })
  merge(ws, r, 4, r, 6)
  setCell(ws, r, 7, '잔금 (40%)', { bold: true, bg: 'F7F9FC' })
  merge(ws, r, 7, r, 9)
  setFormulaCell(ws, r, 10, `${ref(finalRow, 10)}*0.4`, { align: 'right', numFmt: '#,##0' })
  merge(ws, r, 10, r, 11)
  r += 1

  setCell(ws, r, 1, '외주/추가금 별도 정산', { bold: true, bg: 'F5F5F5', italic: true, color: '888888' })
  merge(ws, r, 1, r, 3)
  setFormulaCell(ws, r, 4, outsourceFormula, {
    align: 'right',
    numFmt: '#,##0',
    bg: 'F5F5F5',
    italic: true,
    color: '888888',
  })
  merge(ws, r, 4, r, 6)
  setCell(ws, r, 7, '외주/추가금 부가세 (10%)', { bold: true, bg: 'F5F5F5', italic: true, color: '888888' })
  merge(ws, r, 7, r, 9)
  setFormulaCell(ws, r, 10, `${ref(r, 4)}*0.1`, {
    align: 'right',
    numFmt: '#,##0',
    bg: 'F5F5F5',
    italic: true,
    color: '888888',
  })
  merge(ws, r, 10, r, 11)
  r += 1

  setCell(ws, r, 1, '계좌 정보', { bold: true, bg: 'F7F9FC' })
  merge(ws, r, 1, r, 3)
  setCell(ws, r, 4, doc.paymentTerms || company?.name || '추후 안내', { align: 'left' })
  merge(ws, r, 4, r, 11)
  ws.getRow(r).height = 24
  applyBorderRange(ws, paymentStart, 1, r, 11, 'thin')
  applyOuterBorder(ws, paymentStart, 1, r, 11, 'medium')

  r += 2
  const signStart = r
  setCell(ws, r, 1, '위와 같이 견적합니다.', { bold: true, align: 'left' })
  merge(ws, r, 1, r, 8)
  setCell(ws, r, 9, company?.name || '공급자', { align: 'center' })
  merge(ws, r, 9, r, 11)
  r += 1
  setCell(ws, r, 9, `${company?.ceo || '대표자'} (인)`, { align: 'center' })
  merge(ws, r, 9, r, 10)
  setCell(ws, r, 11, '◯', { align: 'center', size: 14 })
  applyBorderRange(ws, signStart, 1, r, 11, 'thin')
  applyOuterBorder(ws, signStart, 1, r, 11, 'medium')

  ws.pageSetup.printArea = `A1:K${r}`

  ws.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.font) {
        cell.font = { name: DEFAULT_FONT, size: 10 }
      }
    })
  })
}

function buildQuoteProgramPlanSheet(
  ExcelJS: typeof import('exceljs'),
  workbook: ExcelJS.Workbook,
  doc: QuoteDoc,
) {
  const ws = workbook.addWorksheet('기획안')
  ws.columns = [
    { width: 28 },
    { width: 32 },
    { width: 8 },
    { width: 8 },
    { width: 14 },
    { width: 14 },
    { width: 24 },
    { width: 0, hidden: true },
  ]

  let r = 1
  setCell(ws, r, 1, '프로그램 기획안', { bold: true, size: 18, align: 'center' })
  merge(ws, r, 1, r, 8)
  ws.getRow(r).height = 40
  r += 2

  setCell(ws, r, 1, '행사명', { bold: true, bg: SECTION_BG })
  merge(ws, r, 1, r, 2)
  setCell(ws, r, 3, doc.eventName || '')
  merge(ws, r, 3, r, 8)
  ws.getRow(r).height = 22
  r += 1

  setCell(ws, r, 1, '행사 유형', { bold: true, bg: SECTION_BG })
  merge(ws, r, 1, r, 2)
  setCell(ws, r, 3, doc.eventType || '')
  merge(ws, r, 3, r, 8)
  ws.getRow(r).height = 22
  r += 1

  setCell(ws, r, 1, '프로그램 컨셉', { bold: true, bg: SECTION_BG })
  merge(ws, r, 1, r, 2)
  setCell(ws, r, 3, doc.program?.concept || '')
  merge(ws, r, 3, r, 8)
  ws.getRow(r).height = 22
  r += 2

  const headerRow = r
  ;['구분', '내용', '성격', '시간', '대상', '비고'].forEach((label, idx) => {
    setCell(ws, r, idx + 1, label, {
      bold: true,
      align: 'center',
      bg: TABLE_HEADER_BG,
      color: 'FFFFFF',
    })
  })
  merge(ws, r, 7, r, 8)
  ws.getRow(r).height = 22
  r += 1

  ;(doc.program?.programRows || []).forEach((rowValue) => {
    setCell(ws, r, 1, rowValue.kind || '')
    setCell(ws, r, 2, rowValue.content || '')
    setCell(ws, r, 3, rowValue.tone || '', { align: 'center' })
    setCell(ws, r, 4, rowValue.time || '', { align: 'center' })
    setCell(ws, r, 5, rowValue.audience || '')
    setCell(ws, r, 6, rowValue.notes || '')
    setCell(ws, r, 7, '')
    merge(ws, r, 7, r, 8)
    ws.getRow(r).height = 18
    r += 1
  })

  if (r === headerRow + 1) {
    setCell(ws, r, 1, '등록된 프로그램 항목이 없습니다.', { align: 'center' })
    merge(ws, r, 1, r, 8)
    ws.getRow(r).height = 22
    r += 1
  }

  applyOuterBorder(ws, headerRow, 1, r - 1, 8, 'thin')
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.font) {
        cell.font = { name: DEFAULT_FONT, size: 10 }
      }
      if (!cell.border) {
        cell.border = borderByStyle('thin')
      }
    })
  })
}

function buildTimelineSheet(
  ExcelJS: typeof import('exceljs'),
  workbook: ExcelJS.Workbook,
  doc: QuoteDoc,
) {
  const ws = workbook.addWorksheet('타임테이블')
  ws.columns = [
    { width: 14 },
    { width: 28 },
    { width: 28 },
    { width: 16 },
  ]

  const rows: Array<Array<string>> = [
    [`${doc.eventName} — 타임테이블`],
    ['생성 시 입력한 시작·종료 시각에 맞춰 배치됩니다. 수정하면 즉시 반영됩니다.'],
    [],
    ['시간 (HH:mm)', '내용', '세부', '담당'],
  ]

  ;(doc.program?.timeline || []).forEach((item) => {
    rows.push([item.time || '', item.content || '', item.detail || '', item.manager || ''])
  })

  rows.forEach((values) => {
    const row = ws.addRow(values)
    row.eachCell((cell) => {
      cell.font = { name: DEFAULT_FONT, size: 10, bold: row.number === 4 }
      cell.alignment = { vertical: 'middle', wrapText: true }
      cell.border = baseBorder()
      if (row.number === 4) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD5D5CE' },
        }
      }
    })
  })
}

function buildProgramSheet(
  ExcelJS: typeof import('exceljs'),
  workbook: ExcelJS.Workbook,
  doc: QuoteDoc,
) {
  const ws = workbook.addWorksheet('프로그램 제안')
  ws.columns = [
    { width: 16 },
    { width: 28 },
    { width: 18 },
    { width: 12 },
    { width: 14 },
    { width: 28 },
  ]

  const introRows = [
    ['행사명', doc.eventName],
    ['행사 유형', doc.eventType],
    ['장소', doc.venue || '미정'],
    ['예상 인원', doc.headcount || '미정'],
    ['프로그램 컨셉', doc.program?.concept || ''],
  ]
  introRows.forEach((values) => {
    const row = ws.addRow(values)
    row.eachCell((cell, index) => {
      cell.font = { name: DEFAULT_FONT, size: 10, bold: index === 1 }
      cell.alignment = { vertical: 'middle', wrapText: true }
      cell.border = baseBorder()
    })
  })

  ws.addRow([])
  const header = ws.addRow(['구분', '내용', '성격', '시간', '대상', '비고'])
  header.eachCell((cell) => {
    cell.font = { name: DEFAULT_FONT, size: 10, bold: true }
    cell.alignment = { vertical: 'middle', wrapText: true }
    cell.border = baseBorder()
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD5D5CE' } }
  })

  ;(doc.program?.programRows || []).forEach((rowValue) => {
    const row = ws.addRow([
      rowValue.kind || '',
      rowValue.content || '',
      rowValue.tone || '',
      rowValue.time || '',
      rowValue.audience || '',
      rowValue.notes || '',
    ])
    row.eachCell((cell) => {
      cell.font = { name: DEFAULT_FONT, size: 10 }
      cell.alignment = { vertical: 'middle', wrapText: true }
      cell.border = baseBorder()
    })
  })

  ws.addRow([])
  ws.addRow(['투입 인력', '', '']).eachCell((cell, index) => {
    if (index === 1) {
      cell.font = { name: DEFAULT_FONT, size: 10, bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDE8' } }
      cell.border = baseBorder()
    }
  })
  const staffingHeader = ws.addRow(['역할', '인원', '비고'])
  staffingHeader.eachCell((cell) => {
    cell.font = { name: DEFAULT_FONT, size: 10, bold: true }
    cell.alignment = { vertical: 'middle', wrapText: true }
    cell.border = baseBorder()
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD5D5CE' } }
  })
  ;(doc.program?.staffing || []).forEach((item) => {
    const row = ws.addRow([item.role || '', `${item.count ?? ''}명`, item.note || ''])
    row.eachCell((cell) => {
      cell.font = { name: DEFAULT_FONT, size: 10 }
      cell.alignment = { vertical: 'middle', wrapText: true }
      cell.border = baseBorder()
    })
  })

  if ((doc.program?.tips || []).length > 0) {
    ws.addRow([])
    const title = ws.addRow(['운영 팁'])
    title.eachCell((cell, index) => {
      if (index === 1) {
        cell.font = { name: DEFAULT_FONT, size: 10, bold: true }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDE8' } }
        cell.border = baseBorder()
      }
    })
    ;(doc.program?.tips || []).forEach((tip) => {
      const row = ws.addRow([tip])
      row.eachCell((cell) => {
        cell.font = { name: DEFAULT_FONT, size: 10 }
        cell.alignment = { vertical: 'middle', wrapText: true }
        cell.border = baseBorder()
      })
    })
  }
}

function buildPlanningSheet(
  ExcelJS: typeof import('exceljs'),
  workbook: ExcelJS.Workbook,
  doc: QuoteDoc,
) {
  const ws = workbook.addWorksheet('기획 문서')
  ws.columns = [{ width: 18 }, { width: 80 }]
  const planning = doc.planning
  const rows: Array<[string, string]> = [
    ['행사명', doc.eventName],
    ['개요', planning?.overview || ''],
    ['범위', planning?.scope || ''],
    ['접근 방식', planning?.approach || ''],
    ['운영 계획', planning?.operationPlan || ''],
    ['산출물 계획', planning?.deliverablesPlan || ''],
    ['인력/조건', planning?.staffingConditions || ''],
    ['리스크/주의', planning?.risksAndCautions || ''],
    ['체크리스트', (planning?.checklist || []).join('\n')],
  ]
  rows.forEach(([label, value], index) => {
    const row = ws.addRow([label, value])
    row.eachCell((cell, cellIndex) => {
      cell.font = { name: DEFAULT_FONT, size: 10, bold: cellIndex === 1 }
      cell.alignment = { vertical: 'top', wrapText: true }
      cell.border = baseBorder()
      if (cellIndex === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: index === 0 ? 'FFD5D5CE' : 'FFE8EDE8' },
        }
      }
    })
  })
}

function buildScenarioSheet(
  ExcelJS: typeof import('exceljs'),
  workbook: ExcelJS.Workbook,
  doc: QuoteDoc,
) {
  const ws = workbook.addWorksheet('시나리오')
  ws.columns = [{ width: 18 }, { width: 80 }]
  const scenario = doc.scenario
  const rows: Array<[string, string]> = [
    ['행사명', doc.eventName],
    ['상단 요약', scenario?.summaryTop || ''],
    ['오프닝', scenario?.opening || ''],
    ['전개', scenario?.development || ''],
    ['핵심 포인트', (scenario?.mainPoints || []).join('\n')],
    ['클로징', scenario?.closing || ''],
    ['연출/운영 노트', scenario?.directionNotes || ''],
  ]
  rows.forEach(([label, value], index) => {
    const row = ws.addRow([label, value])
    row.eachCell((cell, cellIndex) => {
      cell.font = { name: DEFAULT_FONT, size: 10, bold: cellIndex === 1 }
      cell.alignment = { vertical: 'top', wrapText: true }
      cell.border = baseBorder()
      if (cellIndex === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: index === 0 ? 'FFD5D5CE' : 'FFE8EDE8' },
        }
      }
    })
  })
}

function buildCueSheetSheet(
  ExcelJS: typeof import('exceljs'),
  workbook: ExcelJS.Workbook,
  doc: QuoteDoc,
) {
  const ws = workbook.addWorksheet('큐시트')
  ws.columns = [
    { width: 10 },
    { width: 8 },
    { width: 24 },
    { width: 16 },
    { width: 24 },
    { width: 24 },
    { width: 24 },
  ]
  ws.addRow(['행사명', doc.eventName])
  ws.addRow(['큐시트 요약', doc.program?.cueSummary || ''])
  ws.addRow([])

  const header = ws.addRow(['시간', '순서', '내용', '담당', '준비', '스크립트', '특이사항'])
  header.eachCell((cell) => {
    cell.font = { name: DEFAULT_FONT, size: 10, bold: true }
    cell.alignment = { vertical: 'middle', wrapText: true }
    cell.border = baseBorder()
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD5D5CE' } }
  })

  ;(doc.program?.cueRows || []).forEach((rowValue) => {
    const row = ws.addRow([
      rowValue.time || '',
      rowValue.order || '',
      rowValue.content || '',
      rowValue.staff || '',
      rowValue.prep || '',
      rowValue.script || '',
      rowValue.special || '',
    ])
    row.eachCell((cell) => {
      cell.font = { name: DEFAULT_FONT, size: 10 }
      cell.alignment = { vertical: 'top', wrapText: true }
      cell.border = baseBorder()
    })
  })
}

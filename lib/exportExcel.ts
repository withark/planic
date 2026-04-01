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
  } = {},
) {
  const cell = ws.getCell(row, col)
  cell.value = value
  cell.font = {
    name: DEFAULT_FONT,
    size: opts.size || 10,
    bold: opts.bold || false,
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
      left: 0.2,
      right: 0.2,
      top: 0.39,
      bottom: 0.39,
      header: 0.2,
      footer: 0.2,
    },
  }

  const OUTSOURCE_PATTERN = /(외주|추가금|합계\s*별도|별도\s*정산|A\/B|A,B)/i
  const TAX_EXEMPT_PATTERN = /(면세|부가세\s*면제|vat\s*면제)/i
  const kindLabelMap: Record<string, string> = {
    인건비: '인건비',
    필수: '필수항목',
    선택1: '선택항목1',
    선택2: '선택항목2',
  }

  const sumRefs = (refs: string[]) => (refs.length > 0 ? `SUM(${refs.join(',')})` : '0')

  let r = 1

  merge(ws, r, 1, r + 3, 3)
  setCell(ws, r, 1, '[ LOGO ]', { align: 'center', bold: true, bg: 'F5F9FF' })
  ws.getCell(r, 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }

  merge(ws, r, 4, r + 3, 8)
  setCell(ws, r, 4, '견  적  서', { align: 'center', bold: true, size: 20 })
  ws.getCell(r, 4).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }

  const writer = company?.contact || company?.name || '담당자'
  setCell(ws, r, 9, '작성자', { bold: true, align: 'center', bg: SECTION_BG })
  merge(ws, r, 9, r, 10)
  setCell(ws, r, 11, writer, { align: 'center' })
  setCell(ws, r + 1, 9, '작성일자', { bold: true, align: 'center', bg: SECTION_BG })
  merge(ws, r + 1, 9, r + 1, 10)
  setCell(ws, r + 1, 11, doc.quoteDate || '', { align: 'center' })
  setCell(ws, r + 2, 9, '행사일자', { bold: true, align: 'center', bg: SECTION_BG })
  merge(ws, r + 2, 9, r + 2, 10)
  setCell(ws, r + 2, 11, doc.eventDate || '', { align: 'center' })
  setCell(ws, r + 3, 9, '유효기간', { bold: true, align: 'center', bg: SECTION_BG })
  merge(ws, r + 3, 9, r + 3, 10)
  setCell(ws, r + 3, 11, `${doc.validDays || 0}일`, { align: 'center' })

  ws.getRow(1).height = 24
  ws.getRow(2).height = 24
  ws.getRow(3).height = 24
  ws.getRow(4).height = 24
  applyOuterBorder(ws, 1, 1, 4, 11, 'medium')

  r = 6
  const partyBlockStart = r
  setCell(ws, r, 1, '수신', { bold: true, align: 'center', bg: SECTION_BG })
  merge(ws, r, 1, r, 5)
  setCell(ws, r, 6, '공급자', { bold: true, align: 'center', bg: SECTION_BG })
  merge(ws, r, 6, r, 11)
  ws.getRow(r).height = 22
  r += 1

  const receiverRows: Array<[string, string]> = [
    ['업체명', doc.clientName],
    ['담당자', doc.clientManager],
    ['연락처', doc.clientTel],
    ['행사명', doc.eventName],
    ['행사종류', doc.eventType],
    ['행사일', doc.eventDate],
    ['행사시간', doc.eventDuration],
    ['장소', doc.venue],
    ['참석인원', doc.headcount],
  ]
  const supplierRows: Array<[string, string]> = [
    ['사업자번호', company?.biz || '—'],
    ['상호명', company?.name || '—'],
    ['대표자', company?.ceo || '—'],
    ['소재지', company?.addr || '—'],
    ['업태', '서비스업'],
    ['종목', '행사 기획 / 운영'],
    ['담당자', company?.contact || '—'],
    ['전화번호', company?.tel || '—'],
  ]

  const maxRows = Math.max(receiverRows.length, supplierRows.length)
  for (let i = 0; i < maxRows; i += 1) {
    const receiver = receiverRows[i]
    const supplier = supplierRows[i]
    if (receiver) {
      setCell(ws, r, 1, receiver[0], { bold: true, bg: 'F5F9FF' })
      merge(ws, r, 1, r, 2)
      setCell(ws, r, 3, receiver[1] || '')
      merge(ws, r, 3, r, 5)
    }
    if (supplier) {
      setCell(ws, r, 6, supplier[0], { bold: true, bg: 'F5F9FF' })
      merge(ws, r, 6, r, 7)
      setCell(ws, r, 8, supplier[1] || '')
      merge(ws, r, 8, r, 11)
    }
    ws.getRow(r).height = 20
    r += 1
  }

  setCell(ws, r, 6, '대표자명', { bold: true, bg: 'F5F9FF', align: 'center' })
  merge(ws, r, 6, r, 7)
  setCell(ws, r, 8, `${company?.ceo || '대표자'} (인)`, { align: 'center' })
  merge(ws, r, 8, r, 9)
  merge(ws, r, 10, r + 1, 11)
  setCell(ws, r, 10, '◯', { align: 'center', size: 16 })
  ws.getCell(r, 10).alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(r).height = 22
  ws.getRow(r + 1).height = 22

  applyBorderRange(ws, partyBlockStart, 1, r + 1, 11, 'thin')
  applyOuterBorder(ws, partyBlockStart, 1, r + 1, 5, 'medium')
  applyOuterBorder(ws, partyBlockStart, 6, r + 1, 11, 'medium')

  r += 3
  const tableHeaderRow = r
  ;['구분', '항목', '상세 내역', '수량', '단위', '단가', '기간', '금액', '부가세', '합계', '비고'].forEach(
    (label, idx) => {
      setCell(ws, r, idx + 1, label, {
        bold: true,
        align: 'center',
        bg: TABLE_HEADER_BG,
        color: 'FFFFFF',
      })
    },
  )
  ws.getRow(r).height = 24
  r += 1

  const byKind = groupQuoteItemsByKind(doc)
  const subtotalRefs: string[] = []
  const separateTotalRefs: string[] = []

  KIND_ORDER.forEach((kind) => {
    const items = byKind.get(kind) || []
    const groupStartRow = r
    const groupIncludedRefs: string[] = []
    let hasItems = false

    ;(items.length > 0 ? items : [{ name: '항목 없음', spec: '', qty: 0, unit: '', unitPrice: 0, total: 0, note: '' }]).forEach(
      (item, idx) => {
        hasItems = true
        const sourceText = `${item.name || ''} ${item.spec || ''} ${item.note || ''}`
        const isSeparate = OUTSOURCE_PATTERN.test(sourceText)
        const isTaxExempt = TAX_EXEMPT_PATTERN.test(sourceText)
        const qty = Math.max(0, Math.round(toNumber(item.qty || 1)))
        const period = Math.max(0, Math.round(toNumber(item.total && item.qty && item.unitPrice ? item.total / ((item.qty || 1) * (item.unitPrice || 1)) : 1) || 1))
        const bg = isSeparate ? 'F5F5F5' : idx % 2 === 1 ? 'F5F9FF' : undefined
        const note = isSeparate ? `${item.note ? `${item.note} / ` : ''}※ 합계 별도` : item.note || ''

        setCell(ws, r, 1, kindLabelMap[kind], { align: 'center', bg })
        setCell(ws, r, 2, item.name || '', { bg, ...(isSeparate ? { color: '888888' } : {}) })
        setCell(ws, r, 3, item.spec || '', { bg, ...(isSeparate ? { color: '888888' } : {}) })
        ws.getCell(r, 3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
        setCell(ws, r, 4, qty, { align: 'center', numFmt: '#,##0', bg })
        setCell(ws, r, 5, item.unit || '식', { align: 'center', bg })
        setCell(ws, r, 6, toNumber(item.unitPrice || 0), { align: 'right', numFmt: '#,##0', bg })
        setCell(ws, r, 7, period, { align: 'center', numFmt: '#,##0', bg })
        setCell(ws, r, 8, 0, { align: 'right', numFmt: '#,##0', bg, ...(isSeparate ? { color: '888888' } : {}) })
        ws.getCell(r, 8).value = { formula: `D${r}*F${r}*G${r}` }
        setCell(ws, r, 9, 0, { align: 'right', numFmt: '#,##0', bg, ...(isSeparate ? { color: '888888' } : {}) })
        ws.getCell(r, 9).value = { formula: isTaxExempt ? '0' : `H${r}*0.1` }
        setCell(ws, r, 10, 0, { align: 'right', numFmt: '#,##0', bg, ...(isSeparate ? { color: '888888' } : {}) })
        ws.getCell(r, 10).value = { formula: `H${r}+I${r}` }
        setCell(ws, r, 11, note, { bg, ...(isSeparate ? { color: '888888' } : {}) })

        if (isSeparate) {
          ws.getRow(r).eachCell((cell) => {
            cell.font = { ...(cell.font || { name: DEFAULT_FONT, size: 10 }), italic: true, color: { argb: 'FF888888' } }
          })
          separateTotalRefs.push(`J${r}`)
        } else {
          groupIncludedRefs.push(`J${r}`)
        }
        ws.getRow(r).height = 20
        r += 1
      },
    )

    if (hasItems) {
      merge(ws, groupStartRow, 1, r - 1, 1)
      ws.getCell(groupStartRow, 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    }

    setCell(ws, r, 1, '', { bg: SUBTOTAL_BG })
    setCell(ws, r, 2, `${kindLabelMap[kind]} 소계`, { bold: true, bg: SUBTOTAL_BG })
    merge(ws, r, 2, r, 9)
    setCell(ws, r, 10, 0, { bold: true, align: 'right', numFmt: '#,##0', bg: SUBTOTAL_BG })
    ws.getCell(r, 10).value = { formula: sumRefs(groupIncludedRefs) }
    setCell(ws, r, 11, '', { bg: SUBTOTAL_BG })
    ws.getRow(r).height = 22
    subtotalRefs.push(`J${r}`)
    r += 1
  })

  if (separateTotalRefs.length > 0) {
    setCell(ws, r, 1, '별도', { align: 'center', bg: 'F5F5F5', color: '888888' })
    setCell(ws, r, 2, '외주/추가 항목 합계 (합계 별도)', { bg: 'F5F5F5', color: '888888', bold: true })
    merge(ws, r, 2, r, 9)
    setCell(ws, r, 10, 0, { align: 'right', numFmt: '#,##0', bg: 'F5F5F5', color: '888888' })
    ws.getCell(r, 10).value = { formula: sumRefs(separateTotalRefs) }
    setCell(ws, r, 11, '※ 합계 별도', { bg: 'F5F5F5', color: '888888' })
    ws.getRow(r).eachCell((cell) => {
      cell.font = { ...(cell.font || { name: DEFAULT_FONT, size: 10 }), italic: true, color: { argb: 'FF888888' } }
    })
    ws.getRow(r).height = 22
    r += 1
  }

  const tableEndRow = r - 1
  applyBorderRange(ws, tableHeaderRow, 1, tableEndRow, 11, 'thin')
  applyOuterBorder(ws, tableHeaderRow, 1, tableEndRow, 11, 'medium')

  r += 1
  const totalBlockStart = r
  const partialRow = r
  const mgmtRow = r + 1
  const profitRow = r + 2
  const vatRow = r + 3
  const subtotalVatRow = r + 4
  const cutRow = r + 5
  const finalRow = r + 6

  const totalRows: Array<[number, string]> = [
    [partialRow, '부분합계 (외주 제외)'],
    [mgmtRow, '일반관리비 (7%)'],
    [profitRow, '기업이윤 (7%)'],
    [vatRow, '부가세 (10%)'],
    [subtotalVatRow, '소계 (VAT 포함)'],
    [cutRow, '만원 단위 절사'],
    [finalRow, '최종 합계'],
  ]

  totalRows.forEach(([rowNo, label], index) => {
    const isFinal = rowNo === finalRow
    const bg = isFinal ? TOTAL_BG : index % 2 === 0 ? 'F5F9FF' : undefined
    setCell(ws, rowNo, 8, label, {
      align: 'right',
      bold: isFinal,
      bg,
      color: isFinal ? 'FFFFFF' : undefined,
      size: isFinal ? 14 : 10,
    })
    merge(ws, rowNo, 8, rowNo, 10)
    setCell(ws, rowNo, 11, 0, {
      align: 'right',
      numFmt: '#,##0',
      bold: isFinal,
      bg,
      color: isFinal ? 'C9522A' : undefined,
      size: isFinal ? 14 : 10,
    })
  })

  ws.getCell(partialRow, 11).value = { formula: sumRefs(subtotalRefs) }
  ws.getCell(mgmtRow, 11).value = { formula: `K${partialRow}*0.07` }
  ws.getCell(profitRow, 11).value = { formula: `K${partialRow}*0.07` }
  ws.getCell(vatRow, 11).value = { formula: `(K${partialRow}+K${mgmtRow}+K${profitRow})*0.1` }
  ws.getCell(subtotalVatRow, 11).value = { formula: `K${partialRow}+K${mgmtRow}+K${profitRow}+K${vatRow}` }
  ws.getCell(cutRow, 11).value = { formula: `MOD(K${subtotalVatRow},10000)` }
  ws.getCell(finalRow, 11).value = { formula: `K${subtotalVatRow}-K${cutRow}` }

  applyBorderRange(ws, totalBlockStart, 8, finalRow, 11, 'thin')
  applyOuterBorder(ws, totalBlockStart, 8, finalRow, 11, 'medium')

  r = finalRow + 2
  const paymentBlockStart = r
  setCell(ws, r, 8, '결제 조건', { bold: true, align: 'center', bg: SECTION_BG })
  merge(ws, r, 8, r, 11)
  ws.getRow(r).height = 22
  r += 1

  setCell(ws, r, 8, '선금 (60%)', { align: 'right', bg: 'F5F9FF' })
  merge(ws, r, 8, r, 10)
  setCell(ws, r, 11, 0, { align: 'right', numFmt: '#,##0' })
  ws.getCell(r, 11).value = { formula: `K${finalRow}*0.6` }
  const prepayRow = r
  r += 1

  setCell(ws, r, 8, '잔금 (40%)', { align: 'right' })
  merge(ws, r, 8, r, 10)
  setCell(ws, r, 11, 0, { align: 'right', numFmt: '#,##0' })
  ws.getCell(r, 11).value = { formula: `K${finalRow}*0.4` }
  r += 1

  setCell(ws, r, 8, '외주/추가금 별도 정산', { align: 'right', bg: 'F5F5F5', color: '888888' })
  merge(ws, r, 8, r, 10)
  setCell(ws, r, 11, 0, { align: 'right', numFmt: '#,##0', bg: 'F5F5F5', color: '888888' })
  ws.getCell(r, 11).value = { formula: sumRefs(separateTotalRefs) }
  const separateAmountRow = r
  r += 1

  setCell(ws, r, 8, '외주/추가금 부가세 (10%)', { align: 'right', bg: 'F5F5F5', color: '888888' })
  merge(ws, r, 8, r, 10)
  setCell(ws, r, 11, 0, { align: 'right', numFmt: '#,##0', bg: 'F5F5F5', color: '888888' })
  ws.getCell(r, 11).value = { formula: `K${separateAmountRow}*0.1` }
  r += 1

  setCell(ws, r, 8, '계좌 정보', { align: 'right', bold: true, bg: 'F5F9FF' })
  merge(ws, r, 8, r, 9)
  setCell(ws, r, 10, doc.paymentTerms || '결제 계좌 정보를 입력하세요.', {})
  merge(ws, r, 10, r, 11)
  ws.getCell(r, 10).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
  ws.getRow(r).height = 24
  applyBorderRange(ws, paymentBlockStart, 8, r, 11, 'thin')
  applyOuterBorder(ws, paymentBlockStart, 8, r, 11, 'medium')

  r += 2
  const signStart = r
  setCell(ws, r, 1, '위와 같이 견적합니다.', { align: 'center', bold: true })
  merge(ws, r, 1, r, 11)
  ws.getRow(r).height = 24
  r += 1

  setCell(ws, r, 7, `공급자: ${company?.name || '상호명'}`, { align: 'center' })
  merge(ws, r, 7, r, 9)
  setCell(ws, r, 10, `대표자: ${company?.ceo || '대표자'} (인)`, { align: 'center' })
  merge(ws, r, 10, r, 11)
  ws.getRow(r).height = 24
  applyOuterBorder(ws, signStart, 1, r, 11, 'medium')

  applyOuterBorder(ws, prepayRow, 8, prepayRow + 3, 11, 'thin')

  ws.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.font) cell.font = { name: DEFAULT_FONT, size: 10 }
      if (!cell.alignment) cell.alignment = { vertical: 'middle', wrapText: true }
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

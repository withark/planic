import type { QuoteDoc } from '@/lib/types'
import { getQuoteDateForFilename } from '@/lib/calc'
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'

function safeText(v: unknown): string {
  return String(v ?? '').replace(/\r\n/g, '\n')
}

function filename(doc: QuoteDoc): string {
  const date = getQuoteDateForFilename(doc.quoteDate)
  const name = safeText(doc.eventName || '행사').replace(/\s/g, '_')
  return `기획안_${name}_${date}.docx`
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 240, after: 120 },
  })
}

function para(text: string, opts?: { bold?: boolean }): Paragraph {
  const t = safeText(text)
  if (!t.trim()) return new Paragraph({ text: '' })
  return new Paragraph({
    children: [
      new TextRun({
        text: t,
        bold: !!opts?.bold,
      }),
    ],
    spacing: { after: 120 },
  })
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: safeText(text) })],
    bullet: { level: 0 },
    spacing: { after: 60 },
  })
}

function makeTable(
  headers: string[],
  rows: Array<Array<string>>,
): Table {
  const headerRow = new TableRow({
    children: headers.map((h) =>
      new TableCell({
        width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
        children: [para(h, { bold: true })],
      }),
    ),
  })

  const bodyRows = rows.map(
    (r) =>
      new TableRow({
        children: r.map((c) =>
          new TableCell({
            width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
            children: [para(c)],
          }),
        ),
      }),
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  })
}

/** 기획안(planning) 워드(.docx) 다운로드 */
export async function exportPlanningToWord(doc: QuoteDoc): Promise<void> {
  const p = doc.planning
  if (!p) throw new Error('기획 문서 데이터가 없습니다.')

  const children: Array<Paragraph | Table> = []

  children.push(heading(`기획 제안서 · ${safeText(doc.eventName || '행사')}`, HeadingLevel.TITLE))
  if (p.subtitle?.trim()) children.push(para(p.subtitle, { bold: true }))

  const stats = p.backgroundStats || []
  if (stats.length > 0) {
    children.push(heading('1. 배경 및 필요성', HeadingLevel.HEADING_1))
    children.push(
      makeTable(
        ['수치/지표', '제목', '설명'],
        stats.map((s) => [safeText(s.value || '—'), safeText(s.label || '—'), safeText(s.detail || '')]),
      ),
    )
  }

  const overview = p.programOverviewRows || []
  if (overview.length > 0) {
    children.push(heading('2. 프로그램 개요', HeadingLevel.HEADING_1))
    children.push(
      makeTable(
        ['항목', '내용', '세부'],
        overview.map((r) => [safeText(r.label || ''), safeText(r.value || ''), safeText(r.detail || '')]),
      ),
    )
  }

  const blocks = p.actionProgramBlocks || []
  if (blocks.length > 0) {
    children.push(heading('3. 세부 액션 프로그램', HeadingLevel.HEADING_1))
    blocks.forEach((b) => {
      children.push(heading(`${String(b.order).padStart(2, '0')}. ${safeText(b.title || '')}`, HeadingLevel.HEADING_2))
      if (b.dayLabel?.trim()) children.push(para(b.dayLabel, { bold: true }))
      if (b.description?.trim()) children.push(para(b.description))
      const meta = [`시간: ${safeText(b.timeRange || '')}`, `대상: ${safeText(b.participants || '')}`]
        .map((x) => x.trim())
        .filter((x) => x !== '시간:' && x !== '대상:' && !x.endsWith(':'))
      if (meta.length > 0) meta.forEach((m) => children.push(bullet(m)))
    })
  }

  const apt = p.actionPlanTable || []
  if (apt.length > 0) {
    children.push(heading('4. 액션 플랜', HeadingLevel.HEADING_1))
    children.push(
      makeTable(
        ['단계', '시기', '주요 내용', '담당'],
        apt.map((r) => [safeText(r.step || ''), safeText(r.timing || ''), safeText(r.content || ''), safeText(r.owner || '')]),
      ),
    )
  }

  const st = p.expectedEffectsShortTerm || []
  const lt = p.expectedEffectsLongTerm || []
  if (st.length > 0 || lt.length > 0) {
    children.push(heading('5. 기대 효과', HeadingLevel.HEADING_1))
    if (st.length > 0) {
      children.push(heading('단기 효과', HeadingLevel.HEADING_2))
      st.filter((x) => safeText(x).trim()).forEach((x) => children.push(bullet(x)))
    }
    if (lt.length > 0) {
      children.push(heading('장기 효과', HeadingLevel.HEADING_2))
      lt.filter((x) => safeText(x).trim()).forEach((x) => children.push(bullet(x)))
    }
  }

  children.push(heading('6. 본문 섹션', HeadingLevel.HEADING_1))
  ;[
    ['개요', p.overview],
    ['범위', p.scope],
    ['접근/전략', p.approach],
    ['운영 계획', p.operationPlan],
    ['산출물 계획', p.deliverablesPlan],
    ['인력/조건', p.staffingConditions],
    ['리스크/주의', p.risksAndCautions],
  ].forEach(([label, val]) => {
    if (!safeText(val).trim()) return
    children.push(heading(label, HeadingLevel.HEADING_2))
    children.push(para(safeText(val)))
  })

  const checklist = (p.checklist || []).map((x) => safeText(x).trim()).filter(Boolean)
  if (checklist.length > 0) {
    children.push(heading('체크리스트', HeadingLevel.HEADING_2))
    checklist.forEach((x) => children.push(bullet(x)))
  }

  const docx = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(docx)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename(doc)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}


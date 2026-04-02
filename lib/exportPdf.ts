import type { QuoteDoc, CompanySettings } from '@/lib/types'
import { calcTotals, fmtKRW, getQuoteDateForFilename } from '@/lib/calc'
import { KIND_ORDER, groupQuoteItemsByKind, subtotalsByKind } from '@/lib/quoteGroup'
import { getQuoteTemplate } from '@/lib/quoteTemplates'

/** PDF 저장 시 파일명·오프스크린 HTML 분기 (견적서 기본) */
export type PdfExportDocumentKind =
  | 'estimate'
  | 'planning'
  | 'scenario'
  | 'program'
  | 'timetable'
  | 'cuesheet'
  | 'emceeScript'

/** QuoteResult 탭 → PDF 종류 (프로그램 탭 + 큐시트 편집기면 큐시트 PDF) */
export type QuoteResultDocTab =
  | 'estimate'
  | 'program'
  | 'timetable'
  | 'planning'
  | 'scenario'
  | 'emceeScript'

export function pdfKindFromQuoteTab(
  tab: QuoteResultDocTab,
  opts?: { showCueSheetEditor?: boolean },
): PdfExportDocumentKind {
  switch (tab) {
    case 'estimate':
      return 'estimate'
    case 'timetable':
      return 'timetable'
    case 'planning':
      return 'planning'
    case 'scenario':
      return 'scenario'
    case 'emceeScript':
      return 'emceeScript'
    case 'program':
      return opts?.showCueSheetEditor ? 'cuesheet' : 'program'
    default:
      return 'estimate'
  }
}

function pdfFilename(doc: QuoteDoc, kind: PdfExportDocumentKind): string {
  const date = getQuoteDateForFilename(doc.quoteDate)
  const name = doc.eventName.replace(/\s/g, '_')
  const prefix =
    kind === 'planning'
      ? '기획안'
      : kind === 'scenario'
        ? '시나리오'
        : kind === 'program'
          ? '프로그램제안'
          : kind === 'timetable'
            ? '타임테이블'
            : kind === 'cuesheet'
              ? '큐시트'
              : kind === 'emceeScript'
                ? '사회자멘트'
                : '견적서'
  return `${prefix}_${name}_${date}.pdf`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// html2canvas + jsPDF를 동적 import (클라이언트 전용)
export async function exportToPdf(
  doc: QuoteDoc,
  company?: CompanySettings | null,
  kind: PdfExportDocumentKind = 'estimate',
) {
  const liveQuoteEl = document.querySelector('.quote-wrapper') as HTMLElement | null
  if (liveQuoteEl) {
    await exportElementToPdf(liveQuoteEl, doc, kind)
    return
  }

  const [html2canvas, { jsPDF }] = await Promise.all([
    import('html2canvas').then(m => m.default),
    import('jspdf'),
  ])

  // 임시 DOM 생성
  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed; top: -9999px; left: -9999px;
    width: 794px; padding: 40px; padding-bottom: 80px;
    background: white; font-family: 'Pretendard', sans-serif;
    font-size: 12px; color: #111;
  `
  container.innerHTML = buildPdfFallbackHtml(doc, company, kind)
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      scale: 2, useCORS: true, logging: false,
      backgroundColor: '#ffffff',
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgH  = (canvas.height * pageW) / canvas.width

    let yPos = 0
    while (yPos < imgH) {
      if (yPos > 0) pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, -yPos, pageW, imgH)
      yPos += pageH
    }

    pdf.save(pdfFilename(doc, kind))
  } finally {
    document.body.removeChild(container)
  }
}

export async function exportElementToPdf(
  el: HTMLElement,
  doc: QuoteDoc,
  kind: PdfExportDocumentKind = 'estimate',
): Promise<void> {
  const [html2canvas, { jsPDF }] = await Promise.all([
    import('html2canvas').then(m => m.default),
    import('jspdf'),
  ])
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const imgH = (canvas.height * pageW) / canvas.width
  let yPos = 0
  while (yPos < imgH) {
    if (yPos > 0) pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, -yPos, pageW, imgH)
    yPos += pageH
  }
  pdf.save(pdfFilename(doc, kind))
}

function buildPdfFallbackHtml(
  doc: QuoteDoc,
  company: CompanySettings | null | undefined,
  kind: PdfExportDocumentKind,
): string {
  if (kind === 'estimate') return buildHtml(doc, company)
  const tpl = getQuoteTemplate(doc.quoteTemplate as import('@/lib/quoteTemplates').QuoteTemplateId)
  if (kind === 'planning') return wrapFrame(buildPlanningFullPdfHtml(doc), tpl)
  if (kind === 'scenario') return wrapFrame(buildScenarioPdfHtml(doc), tpl)
  if (kind === 'program') return wrapFrame(buildProgramHtmlForPdf(doc), tpl)
  if (kind === 'timetable') return wrapFrame(buildTimetablePdfHtml(doc), tpl)
  if (kind === 'cuesheet') return wrapFrame(buildCuePdfHtml(doc), tpl)
  if (kind === 'emceeScript') return wrapFrame(buildEmceePdfHtml(doc), tpl)
  return buildHtml(doc, company)
}

function buildPlanningFullPdfHtml(doc: QuoteDoc): string {
  const p = doc.planning
  if (!p) {
    return `<div style="padding:24px;font-size:12px;color:#666;">기획 문서 데이터가 없습니다.</div>`
  }
  const parts: string[] = []
  const h = (t: string) =>
    `<div style="font-size:12px;font-weight:700;color:#1e3a8a;border-bottom:2px solid #93c5fd;padding-bottom:4px;margin:16px 0 8px;">${t}</div>`

  parts.push(`<div style="text-align:center;border-bottom:4px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px;">
    <div style="font-size:20px;font-weight:700;color:#1e3a5f;">${escapeHtml(doc.eventName)}</div>
    ${p.subtitle ? `<div style="margin-top:8px;font-size:12px;font-weight:600;color:#d97706;">${escapeHtml(p.subtitle)}</div>` : ''}
    <div style="margin-top:6px;font-size:10px;color:#64748b;">기획 제안서</div>
  </div>`)

  const stats = p.backgroundStats || []
  if (stats.length) {
    parts.push(h('1. 배경 및 필요성'))
    parts.push(
      `<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px;">
      <tbody>${stats
        .map(
          (s) =>
            `<tr><td style="border:1px solid #e2e8f0;padding:10px;width:28%;text-align:center;font-weight:700;color:#d97706;font-size:18px;vertical-align:top;">${escapeHtml(s.value || '—')}</td>
            <td style="border:1px solid #e2e8f0;padding:10px;vertical-align:top;"><div style="font-weight:600;">${escapeHtml(s.label || '')}</div>${s.detail ? `<div style="margin-top:6px;color:#475569;font-size:10px;">${escapeHtml(s.detail)}</div>` : ''}</td></tr>`,
        )
        .join('')}</tbody></table>`,
    )
  }

  const ov = p.programOverviewRows || []
  if (ov.length) {
    parts.push(h('2. 프로그램 개요'))
    parts.push(
      `<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px;">
      <tbody>${ov
        .map(
          (row, idx) =>
            `<tr style="background:${idx % 2 === 0 ? '#f8fafc' : '#fff'}">
            <td style="border:1px solid #e2e8f0;padding:8px;width:26%;font-weight:600;color:#1e3a5f;">${escapeHtml(row.label)}</td>
            <td style="border:1px solid #e2e8f0;padding:8px;"><div style="font-weight:500;">${escapeHtml(row.value)}</div>${row.detail ? `<div style="margin-top:4px;color:#64748b;font-size:10px;">${escapeHtml(row.detail)}</div>` : ''}</td></tr>`,
        )
        .join('')}</tbody></table>`,
    )
  }

  const blocks = p.actionProgramBlocks || []
  if (blocks.length) {
    parts.push(h('3. 세부 액션 프로그램'))
    const bar: Record<string, string> = {
      blue: '#1d4ed8',
      orange: '#d97706',
      green: '#059669',
      yellow: '#ca8a04',
      slate: '#475569',
    }
    blocks.forEach((b) => {
      const c = bar[b.accent || 'blue'] || bar.blue
      parts.push(`<div style="display:flex;border:1px solid #e2e8f0;margin-bottom:10px;border-radius:8px;overflow:hidden;">
        <div style="width:40px;min-width:40px;background:#1e293b;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;">${String(b.order).padStart(2, '0')}</div>
        <div style="flex:1;border-left:6px solid ${c};padding:10px 12px;background:#fafafa;">
          <div style="font-size:10px;font-weight:700;color:#d97706;">${escapeHtml(b.dayLabel)}</div>
          <div style="font-size:12px;font-weight:700;margin-top:4px;color:#0f172a;">${escapeHtml(b.title)}</div>
          <div style="margin-top:8px;font-size:11px;line-height:1.55;color:#334155;white-space:pre-wrap;">${escapeHtml(b.description)}</div>
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:10px;color:#64748b;">
            <span style="font-weight:600;color:#94a3b8;">시간</span> ${escapeHtml(b.timeRange)} · <span style="font-weight:600;color:#94a3b8;">대상</span> ${escapeHtml(b.participants)}
          </div>
        </div>
      </div>`)
    })
  }

  const apt = p.actionPlanTable || []
  if (apt.length) {
    parts.push(h('4. 액션 플랜'))
    parts.push(
      `<table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:12px;">
      <thead><tr style="background:#1e3a5f;color:#fff;">
        <th style="padding:6px 8px;text-align:left;">단계</th>
        <th style="padding:6px 8px;text-align:left;">시기</th>
        <th style="padding:6px 8px;text-align:left;">주요 내용</th>
        <th style="padding:6px 8px;text-align:left;">담당</th>
      </tr></thead>
      <tbody>${apt
        .map(
          (row, i) =>
            `<tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'}">
            <td style="border:1px solid #e2e8f0;padding:6px 8px;font-weight:600;color:#d97706;">${escapeHtml(row.step)}</td>
            <td style="border:1px solid #e2e8f0;padding:6px 8px;">${escapeHtml(row.timing)}</td>
            <td style="border:1px solid #e2e8f0;padding:6px 8px;">${escapeHtml(row.content)}</td>
            <td style="border:1px solid #e2e8f0;padding:6px 8px;color:#64748b;">${escapeHtml(row.owner)}</td>
          </tr>`,
        )
        .join('')}</tbody></table>`,
    )
  }

  const st = p.expectedEffectsShortTerm || []
  const lt = p.expectedEffectsLongTerm || []
  if (st.length || lt.length) {
    parts.push(h('5. 기대 효과'))
    parts.push(`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
      <div style="border:1px solid #fcd34d;background:#fffbeb;padding:12px;border-radius:8px;">
        <div style="font-size:10px;font-weight:700;color:#b45309;margin-bottom:6px;">단기 효과</div>
        <ul style="margin:0;padding-left:18px;font-size:11px;color:#1e293b;line-height:1.5;">${st.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
      </div>
      <div style="border:1px solid #6ee7b7;background:#ecfdf5;padding:12px;border-radius:8px;">
        <div style="font-size:10px;font-weight:700;color:#047857;margin-bottom:6px;">장기 효과</div>
        <ul style="margin:0;padding-left:18px;font-size:11px;color:#1e293b;line-height:1.5;">${lt.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
      </div>
    </div>`)
  }

  parts.push(h('6. 본문 섹션'))
  const narrative: Array<[string, string]> = [
    ['개요', p.overview],
    ['범위', p.scope],
    ['접근/전략', p.approach],
    ['운영 계획', p.operationPlan],
    ['산출물 계획', p.deliverablesPlan],
    ['인력/조건', p.staffingConditions],
    ['리스크/주의', p.risksAndCautions],
    ['체크리스트', (p.checklist || []).join('\n')],
  ]
  narrative.forEach(([label, val]) => {
    if (!(val || '').trim()) return
    parts.push(
      `<div style="margin-bottom:10px;"><div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;">${escapeHtml(label)}</div>
      <div style="font-size:11px;line-height:1.6;color:#334155;white-space:pre-wrap;border:1px solid #e2e8f0;padding:10px;border-radius:6px;background:#fff;">${escapeHtml(val)}</div></div>`,
    )
  })

  return `<div style="font-family:'Malgun Gothic',Pretendard,sans-serif;">${parts.join('')}</div>`
}

function buildScenarioPdfHtml(doc: QuoteDoc): string {
  const s = doc.scenario
  if (!s) return `<div style="padding:24px;">시나리오 데이터가 없습니다.</div>`
  const box = (title: string, body: string) =>
    body.trim()
      ? `<div style="margin-bottom:12px;"><div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;">${escapeHtml(title)}</div>
        <div style="font-size:11px;line-height:1.6;border:1px solid #e2e8f0;padding:10px;border-radius:8px;background:#fafafa;white-space:pre-wrap;">${escapeHtml(body)}</div></div>`
      : ''
  const points = (s.mainPoints || []).filter((x) => (x || '').trim()).map((x) => `<li>${escapeHtml(x)}</li>`).join('')
  return `<div style="font-family:'Malgun Gothic',Pretendard,sans-serif;">
    <div style="font-size:16px;font-weight:700;margin-bottom:8px;color:#1e3a5f;">시나리오 · ${escapeHtml(doc.eventName)}</div>
    ${box('한 줄 요약', s.summaryTop)}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
      <div>${box('오프닝', s.opening)}</div>
      <div>${box('전개', s.development)}</div>
    </div>
    ${points ? `<div style="margin-bottom:12px;"><div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;">핵심 포인트</div><ul style="margin:0;padding-left:18px;font-size:11px;line-height:1.5;">${points}</ul></div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div>${box('클로징', s.closing)}</div>
      <div>${box('진행 메모/방향성', s.directionNotes)}</div>
    </div>
  </div>`
}

function buildProgramHtmlForPdf(doc: QuoteDoc): string {
  return `<div style="margin-top:0;">${buildProgramHtml(doc).replace('margin-top:72px', 'margin-top:0')}</div>`
}

function buildTimetablePdfHtml(doc: QuoteDoc): string {
  const rows = (doc.program?.timeline || [])
    .map(
      (t) =>
        `<tr style="border-bottom:1px solid #eee">
      <td style="padding:6px 8px;font-size:10px;font-weight:500">${escapeHtml(t.time || '—')}</td>
      <td style="padding:6px 8px">${escapeHtml(t.content || '')}</td>
      <td style="padding:6px 8px;color:#666;font-size:10px">${escapeHtml(t.detail || '')}</td>
      <td style="padding:6px 8px;font-size:10px">${escapeHtml(t.manager || '')}</td>
    </tr>`,
    )
    .join('')
  return `<div style="font-family:'Malgun Gothic',Pretendard,sans-serif;">
    <div style="font-size:16px;font-weight:700;margin-bottom:8px;color:#1e3a5f;">진행 타임테이블</div>
    <div style="font-size:11px;color:#666;margin-bottom:12px;">${escapeHtml(doc.eventName)}</div>
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead><tr style="background:#e8e8e3;border-bottom:2px solid #ccc">
        <th style="padding:6px 8px;text-align:left;">시간</th>
        <th style="padding:6px 8px;text-align:left;">내용</th>
        <th style="padding:6px 8px;text-align:left;">세부</th>
        <th style="padding:6px 8px;text-align:left;">담당</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="4" style="padding:8px;color:#888;">일정 없음</td></tr>'}</tbody>
    </table>
  </div>`
}

function buildCuePdfHtml(doc: QuoteDoc): string {
  const cueRows = doc.program?.cueRows || []
  const rows = cueRows
    .map(
      (row) =>
        `<tr>
      <td style="border:1px solid #e5e7eb;padding:6px;font-size:10px;">${escapeHtml(row.time)}</td>
      <td style="border:1px solid #e5e7eb;padding:6px;font-size:10px;">${escapeHtml(row.order)}</td>
      <td style="border:1px solid #e5e7eb;padding:6px;font-size:10px;">${escapeHtml(row.content)}</td>
      <td style="border:1px solid #e5e7eb;padding:6px;font-size:10px;">${escapeHtml(row.staff)}</td>
      <td style="border:1px solid #e5e7eb;padding:6px;font-size:10px;">${escapeHtml(row.prep)}</td>
      <td style="border:1px solid #e5e7eb;padding:6px;font-size:10px;">${escapeHtml(row.script)}</td>
      <td style="border:1px solid #e5e7eb;padding:6px;font-size:10px;">${escapeHtml(row.special)}</td>
    </tr>`,
    )
    .join('')
  return `<div style="font-family:'Malgun Gothic',Pretendard,sans-serif;">
    <div style="font-size:16px;font-weight:700;margin-bottom:8px;color:#1e3a5f;">큐시트 · ${escapeHtml(doc.eventName)}</div>
    ${doc.program?.cueSummary ? `<div style="font-size:11px;margin-bottom:12px;line-height:1.5;color:#475569;">${escapeHtml(doc.program.cueSummary)}</div>` : ''}
    <table style="width:100%;border-collapse:collapse;font-size:9px;">
      <thead><tr style="background:#1e3a5f;color:#fff;">
        <th style="padding:4px 6px;text-align:left;">시간</th>
        <th style="padding:4px 6px;text-align:left;">순서</th>
        <th style="padding:4px 6px;text-align:left;">내용</th>
        <th style="padding:4px 6px;text-align:left;">담당</th>
        <th style="padding:4px 6px;text-align:left;">준비</th>
        <th style="padding:4px 6px;text-align:left;">대본</th>
        <th style="padding:4px 6px;text-align:left;">특이</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="7" style="padding:8px;color:#888;">큐 행 없음</td></tr>'}</tbody>
    </table>
  </div>`
}

function buildEmceePdfHtml(doc: QuoteDoc): string {
  const e = doc.emceeScript
  if (!e) return `<div style="padding:24px;">사회자 멘트 데이터가 없습니다.</div>`
  const lines = (e.lines || [])
    .map(
      (line) =>
        `<tr>
      <td style="border:1px solid #e5e7eb;padding:6px;font-size:10px;vertical-align:top;">${escapeHtml(line.order)}</td>
      <td style="border:1px solid #e5e7eb;padding:6px;font-size:10px;vertical-align:top;">${escapeHtml(line.time)}</td>
      <td style="border:1px solid #e5e7eb;padding:6px;font-size:10px;vertical-align:top;">${escapeHtml(line.segment)}</td>
      <td style="border:1px solid #e5e7eb;padding:6px;font-size:10px;vertical-align:top;white-space:pre-wrap;">${escapeHtml(line.script)}</td>
      <td style="border:1px solid #e5e7eb;padding:6px;font-size:10px;vertical-align:top;">${escapeHtml(line.notes)}</td>
    </tr>`,
    )
    .join('')
  return `<div style="font-family:'Malgun Gothic',Pretendard,sans-serif;">
    <div style="font-size:16px;font-weight:700;margin-bottom:8px;color:#1e3a5f;">사회자 멘트 · ${escapeHtml(doc.eventName)}</div>
    ${box('한 줄 요약', e.summaryTop)}
    ${e.hostGuidelines?.trim() ? `<div style="margin-bottom:12px;"><div style="font-size:10px;font-weight:700;color:#64748b;">MC 지침</div>
      <div style="font-size:11px;line-height:1.6;border:1px solid #e2e8f0;padding:10px;border-radius:8px;white-space:pre-wrap;">${escapeHtml(e.hostGuidelines)}</div></div>` : ''}
    <table style="width:100%;border-collapse:collapse;font-size:10px;">
      <thead><tr style="background:#1e3a5f;color:#fff;">
        <th style="padding:6px;text-align:left;">순서</th>
        <th style="padding:6px;text-align:left;">시간</th>
        <th style="padding:6px;text-align:left;">구간</th>
        <th style="padding:6px;text-align:left;">멘트</th>
        <th style="padding:6px;text-align:left;">큐</th>
      </tr></thead>
      <tbody>${lines || '<tr><td colspan="5" style="padding:8px;color:#888;">멘트 행 없음</td></tr>'}</tbody>
    </table>
  </div>`
}

function box(title: string, body: string): string {
  return body.trim()
    ? `<div style="margin-bottom:12px;"><div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;">${escapeHtml(title)}</div>
        <div style="font-size:11px;line-height:1.6;border:1px solid #e2e8f0;padding:10px;border-radius:8px;background:#fafafa;white-space:pre-wrap;">${escapeHtml(body)}</div></div>`
    : ''
}

function boxStyle(tpl: import('@/lib/quoteTemplates').QuoteTemplateMeta, isTotal = false): string {
  const { accentBorder, totalBg } = tpl.pdf
  if (tpl.pdf.infoBox === 'flat')
    return `border:1px solid #ddd;border-left:4px solid ${accentBorder};background:transparent;border-radius:0;padding:12px`
  if (tpl.pdf.infoBox === 'card')
    return `background:#fff;border-radius:12px;padding:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border:1px solid #eee`
  return isTotal ? `background:${totalBg};padding:8px 12px;border-radius:8px` : `background:#f8f8f5;border-radius:8px;padding:12px`
}

function wrapFrame(html: string, tpl: import('@/lib/quoteTemplates').QuoteTemplateMeta): string {
  const { accentBorder } = tpl.pdf
  if (tpl.pdf.frame === 'border')
    return `<div style="border:2px solid ${accentBorder};padding:24px;border-radius:4px;">${html}</div>`
  if (tpl.pdf.frame === 'card')
    return `<div style="box-shadow:0 4px 20px rgba(0,0,0,0.08);border-radius:16px;padding:28px;border:1px solid #eee;">${html}</div>`
  return html
}

function buildProgramHtml(doc: QuoteDoc): string {
  const p = doc.program || { concept: '', timeline: [], staffing: [], tips: [] }
  const timelineRows = (p.timeline || []).map(t => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:6px 8px;font-size:10px;font-weight:500">${t.time || '—'}</td>
      <td style="padding:6px 8px">${t.content || ''}</td>
      <td style="padding:6px 8px;color:#666;font-size:10px">${t.detail || ''}</td>
      <td style="padding:6px 8px;font-size:10px">${t.manager || ''}</td>
    </tr>`).join('')
  const staffingRows = (p.staffing || []).map(s => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:6px 8px">${s.role || ''}</td>
      <td style="padding:6px 8px;text-align:center">${s.count ?? ''}명</td>
      <td style="padding:6px 8px;color:#666;font-size:10px">${s.note || ''}</td>
    </tr>`).join('')
  const tipsHtml = (p.tips || []).length
    ? `<div style="margin-top:12px;"><div style="font-size:9px;font-weight:700;color:#999;letter-spacing:.05em;margin-bottom:6px">진행 팁 / 주의사항</div><div style="font-size:11px;color:#555;line-height:1.6">${(p.tips || []).map(t => `· ${t}`).join('<br/>')}</div></div>`
    : ''
  return `
  <div style="margin-top:72px;padding-top:32px;padding-bottom:48px;border-top:2px solid #333;">
    <div style="font-size:14px;font-weight:700;color:#111;margin-bottom:4px;">프로그램 제안서 · 큐시트</div>
    <div style="font-size:10px;color:#666;margin-bottom:12px;">(견적 금액 산정 근거 자료)</div>
    ${p.concept ? `<p style="font-size:11px;color:#555;margin-bottom:12px;">${p.concept}</p>` : ''}
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px;">
      <thead><tr style="background:#e8e8e3;border-bottom:2px solid #ccc">
        <th style="padding:6px 8px;text-align:left;">시간</th><th style="padding:6px 8px;text-align:left;">내용</th><th style="padding:6px 8px;text-align:left;">세부</th><th style="padding:6px 8px;text-align:left;">담당</th>
      </tr></thead><tbody>${timelineRows || '<tr><td colspan="4" style="padding:8px;color:#888;">진행 일정 없음</td></tr>'}</tbody>
    </table>
    <div style="font-size:10px;font-weight:700;color:#555;margin-bottom:6px;">투입 인력</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:11px;">
      <thead><tr style="background:#f0f0eb;"><th style="padding:6px 8px;text-align:left;">역할</th><th style="padding:6px 8px;text-align:center;">인원</th><th style="padding:6px 8px;text-align:left;">비고</th></tr></thead><tbody>${staffingRows || '<tr><td colspan="3" style="padding:8px;color:#888;">—</td></tr>'}</tbody>
    </table>
    ${tipsHtml}
  </div>`
}

function buildHtml(doc: QuoteDoc, company?: CompanySettings | null): string {
  const T  = calcTotals(doc)
  const sn = company?.name || doc.eventName + ' 기획'
  const tpl = getQuoteTemplate(doc.quoteTemplate as import('@/lib/quoteTemplates').QuoteTemplateId)
  const { sectionBg, sectionText, accentBorder, totalBg } = tpl.pdf
  const infoBox = boxStyle(tpl)
  const totalBox = boxStyle(tpl, true)

  const byKind = groupQuoteItemsByKind(doc)
  const subByKind = subtotalsByKind(doc)
  const tableCellBorder = tpl.pdf.tableStyle === 'bordered' ? 'border:1px solid #ddd;' : ''
  const rows = KIND_ORDER.map(kind => `
    <tr style="background:${sectionBg};border-top:1px solid ${accentBorder}">
      <td colspan="7" style="padding:6px 8px;font-size:10px;font-weight:600;color:${sectionText};letter-spacing:.05em;${tableCellBorder}">${kind}</td>
    </tr>
    ${(byKind.get(kind) || []).map(it => `
    <tr style="border-bottom:0.5px solid #eee">
      <td style="padding:6px 8px;${tableCellBorder}">${it.name}</td>
      <td style="padding:6px 8px;color:#888;${tableCellBorder}">${it.spec||''}</td>
      <td style="padding:6px 8px;text-align:right;${tableCellBorder}">${it.qty}</td>
      <td style="padding:6px 8px;${tableCellBorder}">${it.unit||'식'}</td>
      <td style="padding:6px 8px;text-align:right;${tableCellBorder}">${fmtKRW(it.unitPrice)}</td>
      <td style="padding:6px 8px;text-align:right;font-weight:500;${tableCellBorder}">${fmtKRW(it.total)}</td>
      <td style="padding:6px 8px;color:#888;font-size:10px;${tableCellBorder}">${it.note||''}</td>
    </tr>`).join('')}
    <tr style="background:#f5f5f0;border-bottom:1px solid #ddd">
      <td colspan="5" style="padding:5px 8px;text-align:right;font-size:10px;font-weight:600;color:#555;${tableCellBorder}">소계</td>
      <td style="padding:5px 8px;text-align:right;font-weight:600;${tableCellBorder}">${fmtKRW(subByKind.get(kind) ?? 0)}</td>
      <td style="padding:5px 8px;${tableCellBorder}"></td>
    </tr>
  `).join('')

  const quotePart = `
  <div style="border-bottom:2px solid ${accentBorder};padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end">
    <div>
      <div style="font-size:22px;font-weight:600;letter-spacing:.2em;color:${sectionText}">견 적 서</div>
      <div style="color:#888;margin-top:4px;font-size:11px">${doc.eventName} · ${doc.clientName}</div>
    </div>
    <div style="text-align:right;font-size:11px;color:#666;line-height:1.8">
      <div>견적일: <strong style="color:#111">${doc.quoteDate}</strong></div>
      <div>유효기간: ${doc.validDays}일</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
    <div style="${infoBox}">
      <div style="font-size:9px;font-weight:700;color:#999;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">수신 (발주처)</div>
      ${[
        ['업체명',doc.clientName],['담당자',doc.clientManager],['연락처',doc.clientTel],
        ['행사명',doc.eventName],['행사 종류',doc.eventType],
        ['행사일',doc.eventDate],['행사 시간',doc.eventDuration],
        ['장소',doc.venue],['참석인원',doc.headcount],
      ].map(([l,v])=>`
      <div style="display:flex;gap:6px;margin-bottom:3px;font-size:11px">
        <span style="color:#aaa;min-width:56px;flex-shrink:0">${l}</span>
        <span style="color:#333">${v||'—'}</span>
      </div>`).join('')}
    </div>
    <div style="${infoBox}">
      <div style="font-size:9px;font-weight:700;color:#999;letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px">공급자</div>
      ${[
        ['상호명', company?.name ?? '—'], ['사업자번호', company?.biz ?? '—'],
        ['대표자', company?.ceo ?? '—'], ['담당자', company?.contact ?? '—'],
        ['연락처', company?.tel ?? '—'], ['주소', company?.addr ?? '—'],
      ].map(([l,v])=>`
      <div style="display:flex;gap:6px;margin-bottom:3px;font-size:11px">
        <span style="color:#aaa;min-width:56px;flex-shrink:0">${l}</span>
        <span style="color:#333">${v||'—'}</span>
      </div>`).join('')}
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    <thead>
      <tr style="background:#e8e8e3;border-bottom:1px solid #ccc">
        <th style="padding:7px 8px;text-align:left;font-size:10px;color:#666;font-weight:600;${tableCellBorder}">항목명</th>
        <th style="padding:7px 8px;text-align:left;font-size:10px;color:#666;font-weight:600;${tableCellBorder}">규격/내용</th>
        <th style="padding:7px 8px;text-align:right;font-size:10px;color:#666;font-weight:600;${tableCellBorder}">수량</th>
        <th style="padding:7px 8px;text-align:left;font-size:10px;color:#666;font-weight:600;${tableCellBorder}">단위</th>
        <th style="padding:7px 8px;text-align:right;font-size:10px;color:#666;font-weight:600;${tableCellBorder}">단가</th>
        <th style="padding:7px 8px;text-align:right;font-size:10px;color:#666;font-weight:600;${tableCellBorder}">금액</th>
        <th style="padding:7px 8px;text-align:left;font-size:10px;color:#666;font-weight:600;${tableCellBorder}">비고</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
    <div style="min-width:200px;font-size:11px;${totalBox}">
      ${[
        ['소계',fmtKRW(T.sub)+'원'],
        [`제경비(${doc.expenseRate}%)`,fmtKRW(T.exp)+'원'],
        [`이윤(${doc.profitRate}%)`,fmtKRW(T.prof)+'원'],
        ['부가세(10%)',fmtKRW(T.vat)+'원'],
        ['절사 (공제)',`-${fmtKRW(doc.cutAmount)}원`],
      ].map(([l,v])=>`
      <div style="display:flex;justify-content:space-between;padding:2px 4px;color:#666">${l}<span>${v}</span></div>
      `).join('')}
      <div style="display:flex;justify-content:space-between;padding:6px 4px;font-size:14px;font-weight:700;border-top:1.5px solid #333;margin-top:4px">
        <span>합계 금액</span><span>${fmtKRW(T.grand)}원</span>
      </div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
    <div style="${infoBox}">
      <div style="font-size:9px;font-weight:700;color:#999;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px">계약 조건/특이사항</div>
      <div style="font-size:11px;color:#555;line-height:1.7;white-space:pre-line">${doc.notes||''}</div>
    </div>
    <div style="${infoBox}">
      <div style="font-size:9px;font-weight:700;color:#999;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px">결제 조건</div>
      <div style="font-size:11px;color:#555;line-height:1.7;white-space:pre-line">${doc.paymentTerms||''}</div>
    </div>
  </div>

  <div style="display:flex;justify-content:flex-end;margin-bottom:48px">
    <div style="border:1px solid #ccc;border-radius:8px;padding:10px 24px;text-align:center;min-width:120px">
      <div style="font-size:10px;color:#aaa;margin-bottom:20px">공급자 확인</div>
      <div style="font-size:11px;font-weight:600;border-bottom:1px solid #ccc;padding-bottom:4px">${sn}</div>
    </div>
  </div>`

  const programPart = buildProgramHtml(doc)
  return wrapFrame(quotePart + programPart, tpl)
}

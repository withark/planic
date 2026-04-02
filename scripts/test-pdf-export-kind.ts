/**
 * pdfKindFromQuoteTab 매핑 스모크 (서버·브라우저 불필요)
 * 실행: npm run test:pdf-kind
 */
import {
  pdfKindFromQuoteTab,
  type PdfExportDocumentKind,
  type QuoteResultDocTab,
} from '../lib/pdf-export-kind'

function assertEq<T>(a: T, b: T, msg: string) {
  if (a !== b) throw new Error(`${msg}: expected ${String(b)}, got ${String(a)}`)
}

const cases: Array<{
  tab: QuoteResultDocTab
  cue?: boolean
  want: PdfExportDocumentKind
}> = [
  { tab: 'estimate', want: 'estimate' },
  { tab: 'timetable', want: 'timetable' },
  { tab: 'planning', want: 'planning' },
  { tab: 'scenario', want: 'scenario' },
  { tab: 'emceeScript', want: 'emceeScript' },
  { tab: 'program', want: 'program' },
  { tab: 'program', cue: true, want: 'cuesheet' },
]

for (const { tab, cue, want } of cases) {
  const got = pdfKindFromQuoteTab(tab, { showCueSheetEditor: cue })
  assertEq(got, want, `${tab} cue=${cue ?? false}`)
}

console.log('ok: pdfKindFromQuoteTab', cases.length, 'cases')

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

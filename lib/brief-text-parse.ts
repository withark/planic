/**
 * 사용자가 카톡·메모에서 붙여 넣은 비정형 텍스트에서 공통 패턴만 추출합니다.
 * 법적 정확성은 사용자 확인 단계에서 보완합니다.
 */

export type ParsedLooseBrief = {
  raw: string
  bizNumbers: string[]
  phones: string[]
  /** 금액·단가로 보이는 줄 */
  priceLines: string[]
  supplierHint?: string
  representativeHint?: string
  /** 나머지 전체(재편집용) */
  remainder: string
}

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)]
}

export function parseLooseBrief(text: string): ParsedLooseBrief {
  const raw = text.trim()
  const lines = raw.split(/\r?\n/).map((l) => l.trim())

  const bizNumbers = uniq([...raw.matchAll(/\d{3}-\d{2}-\d{5}/g)].map((m) => m[0]))
  const phones = uniq(
    [...raw.matchAll(/(?:010|011|016|017|018|019)-\d{3,4}-\d{4}/g)].map((m) => m[0]),
  )

  const priceLines = lines.filter(
    (l) =>
      l.length > 0 &&
      (/만원|\d{1,3}(?:,\d{3})+\s*원|VAT|부가세|vat/i.test(l) || /^\s*\d+\s*명/.test(l)),
  )

  let supplierHint: string | undefined
  let representativeHint: string | undefined

  for (const line of lines) {
    const s = line.match(/(?:공급자|업체|수신|발주)\s*[:：]\s*(.+)/i)
    if (s) supplierHint = s[1].trim()
    const r = line.match(/대표(?:이사)?\s*[:：]?\s*(.+)/)
    if (r) representativeHint = r[1].trim()
    const biz = line.match(/사업자(?:등록)?(?:번호)?\s*[:：]?\s*(\d{3}-\d{2}-\d{5})/)
    if (biz && !bizNumbers.includes(biz[1])) bizNumbers.push(biz[1])
  }

  return {
    raw,
    bizNumbers,
    phones,
    priceLines,
    supplierHint,
    representativeHint,
    remainder: raw,
  }
}

/** 견적 원문·금액 줄이 함께 있는 지 여부(업체 원문 모드 유도) */
export function looksLikeVendorQuoteBlock(parsed: ParsedLooseBrief): boolean {
  if (parsed.priceLines.length >= 1 && (parsed.bizNumbers.length >= 1 || /공급|대표|사업자/i.test(parsed.raw))) {
    return true
  }
  if (parsed.priceLines.length >= 2) return true
  return false
}

/** 주제형 생성기(기획·프로그램·시나리오·큐시트·사회자 등) 공통: 붙여넣기 → 필드 매핑 */
export type TopicGoalMapped = {
  topic: string
  goal: string
  notes: string
  headcount: string
  venue: string
}

export function mapPastedTextToTopicGoalFields(text: string): TopicGoalMapped {
  const trimmed = text.trim()
  const p = parseLooseBrief(trimmed)
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  const topic =
    (p.supplierHint && p.supplierHint.slice(0, 120)) ||
    (lines[0] && lines[0].length <= 120 ? lines[0] : '행사')

  const goal =
    lines.length > 1
      ? lines.slice(1).join('\n').slice(0, 2000)
      : '붙여 넣은 내용 전체를 바탕으로 목적과 요구를 반영합니다.'

  const hc = trimmed.match(/(\d{1,3}(?:,\d{3})?)\s*명/)
  const venueM = trimmed.match(/(?:장소|행사장|venue)\s*[:：]\s*(.+)/i)

  return {
    topic,
    goal: goal.slice(0, 2000),
    notes: trimmed,
    headcount: hc ? hc[1].replace(/,/g, '') : '',
    venue: venueM ? venueM[1].trim().slice(0, 200) : '',
  }
}

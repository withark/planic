/**
 * 견적「추가 메모」에 적힌 자연어에서 품목 제외 의도를 뽑는다.
 * fixed-v2 단가표 전개 시 LLM 출력이 덮어씌워지므로, 메모 기반 필터는 여기서 적용한다.
 */

/** 줄 끝 부정(앞부분을 품목 나열로 간주) */
const LINE_END_NEG =
  /^(.+?)\s*(없어도\s*(?:됨|됩니다|돼|돼요)|없음|불필요|제외(?:\s*해(?:주세요)?)?|미포함|필요\s*없(?:음|음요)?|안\s*해도|빼(?:고|주세요| 주세요)?|제거|no\s*need|exclude|omit)\s*\.?$/i

/** 한 줄 또는 문장 끝의 부정 표현 앞을 품목 후보로 분해 */
function splitListPart(s: string): string[] {
  return s
    .split(/[,\n·\/]+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2)
}

/**
 * requirements + briefNotes에 대해 견적 품목명과 매칭할 제외 키워드(부분 문자열) 목록.
 */
function stripPromptDecorators(line: string): string {
  return line
    .replace(/^추가\s*메모\s*[:：]\s*/i, '')
    .replace(/^요청\s*사항\s*[:：]\s*/i, '')
    .trim()
}

export function extractLineItemExclusionKeywords(...memos: (string | undefined)[]): string[] {
  const combined = memos.map((m) => (m || '').trim()).filter(Boolean).join('\n')
  if (!combined) return []

  const keywords = new Set<string>()
  const lines = combined
    .split(/\n+/)
    .map((l) => stripPromptDecorators(l.trim()))
    .filter(Boolean)

  for (const line of lines) {
    const tailNeg = line.match(LINE_END_NEG)
    if (tailNeg) {
      splitListPart(tailNeg[1]).forEach((k) => keywords.add(k))
      continue
    }
    const colon = line.match(/^(?:제외|빼|미포함)\s*[:：]\s*(.+)$/i)
    if (colon) {
      splitListPart(colon[1]).forEach((k) => keywords.add(k))
    }
  }

  return [...keywords].filter((k) => k.length >= 2 && !/^(및|또는|등|그리고)$/.test(k))
}

function normalizeForMatch(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

/**
 * 품목명이 사용자 제외 키워드 중 하나에 해당하면 true.
 */
export function lineItemMatchesExclusionKeyword(itemName: string, keywords: string[]): boolean {
  if (!keywords.length) return false
  const itemN = normalizeForMatch(itemName)
  if (!itemN) return false
  for (const kw of keywords) {
    const kn = normalizeForMatch(kw)
    if (!kn || kn.length < 2) continue
    if (itemN.includes(kn) || kn.includes(itemN)) return true
  }
  return false
}

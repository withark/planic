export function extractJsonPayload(raw: string): string {
  const text = (raw || '').trim()
  if (!text) throw new Error('AI 응답이 비어 있습니다.')

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenceMatch?.[1]) return fenceMatch[1].trim()

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1).trim()
  }

  const firstBracket = text.indexOf('[')
  const lastBracket = text.lastIndexOf(']')
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    return text.slice(firstBracket, lastBracket + 1).trim()
  }

  return text
}

/**
 * LLM이 JSON string 필드 안에 literal 줄바꿈·탭·제어문자를 넣으면
 * JSON.parse가 실패한다. 문자 단위로 스캔해 string 내부만 이스케이프.
 */
export function sanitizeJsonLiteralControlChars(raw: string): string {
  let result = ''
  let inString = false
  let escaped = false
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]
    if (escaped) {
      result += c
      escaped = false
      continue
    }
    if (c === '\\' && inString) {
      result += c
      escaped = true
      continue
    }
    if (c === '"') {
      inString = !inString
      result += c
      continue
    }
    if (inString) {
      if (c === '\n') { result += '\\n'; continue }
      if (c === '\r') { result += '\\r'; continue }
      if (c === '\t') { result += '\\t'; continue }
      // 기타 제어문자(0x00-0x1f)
      if (c.charCodeAt(0) < 0x20) { result += `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`; continue }
    }
    result += c
  }
  return result
}

export function parseAiJson<T>(raw: string): T {
  const extracted = extractJsonPayload(raw)
  const sanitized = sanitizeJsonLiteralControlChars(extracted)
  const candidates = [sanitized, extracted, raw]
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T
    } catch {
      // try next candidate
    }
  }
  throw new Error('AI 응답 파싱 실패')
}

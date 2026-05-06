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

export function parseAiJson<T>(raw: string): T {
  const candidates = [raw, extractJsonPayload(raw)]
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T
    } catch {
      // try next candidate
    }
  }
  throw new Error('AI 응답 파싱 실패')
}

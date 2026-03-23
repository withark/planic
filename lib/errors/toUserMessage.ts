type AnyRecord = Record<string, unknown>

function isRecord(v: unknown): v is AnyRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function pickFirstString(obj: AnyRecord, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v
  }
  return undefined
}

/**
 * 어떤 형태의 에러든 사용자에게 보여줄 문자열로 변환한다.
 * - UI에 객체가 그대로 렌더링되어 "[object Object]"가 되는 것을 방지
 */
export function toUserMessage(input: unknown, fallback = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'): string {
  const classify = (raw: string): string | null => {
    const lowered = raw.toLowerCase()
    if (
      lowered.includes('insufficient credit') ||
      lowered.includes('credit balance is too low') ||
      lowered.includes('insufficient_quota') ||
      lowered.includes('quota') ||
      lowered.includes('billing')
    ) {
      return 'AI 크레딧이 부족합니다. 결제/플랜에서 크레딧 상태를 확인해 주세요.'
    }
    if (lowered.includes('timeout') || lowered.includes('etimedout')) {
      return '외부 AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'
    }
    if (
      lowered.includes('api key') ||
      lowered.includes('authentication') ||
      lowered.includes('unauthorized') ||
      lowered.includes('forbidden')
    ) {
      return 'AI 연동 인증에 실패했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.'
    }
    return null
  }

  if (typeof input === 'string') {
    const classified = classify(input)
    if (classified) return classified
    try {
      const parsed = JSON.parse(input)
      if (isRecord(parsed)) return toUserMessage(parsed, fallback)
    } catch {
      // noop
    }
    return input
  }
  if (input instanceof Error) {
    const classified = classify(input.message || '')
    return classified || input.message || fallback
  }

  // fetch()에서 res.json()으로 받은 표준 응답 { ok:false, error:{ message } }
  if (isRecord(input)) {
    const direct = pickFirstString(input, ['message', 'error', 'detail', 'details', 'reason'])
    if (direct) return direct

    const err = (input as AnyRecord).error
    if (typeof err === 'string') return err
    if (isRecord(err)) {
      const msg = pickFirstString(err, ['message', 'error', 'detail', 'reason'])
      if (msg) return classify(msg) || msg
      const codeMsg = pickFirstString(err, ['code'])
      if (codeMsg) {
        if (codeMsg === 'INVALID_TASK_ORDER_BASE' || codeMsg === 'INVALID_EXISTING_DOC') {
          return '선택한 원본 문서를 찾을 수 없습니다. 목록에서 다시 선택해 주세요.'
        }
      }
    }

    // zod flatten / validation issues
    const issues = (input as AnyRecord).issues
    if (Array.isArray(issues) && issues.length > 0) {
      const m = (issues[0] as AnyRecord)?.message
      if (typeof m === 'string' && m.trim()) return m
    }
    const details = (input as AnyRecord).details
    if (isRecord(details)) {
      const m = pickFirstString(details, ['message', 'error', 'detail'])
      if (m) return m
      const fieldErrors = details.fieldErrors
      if (isRecord(fieldErrors)) {
        for (const v of Object.values(fieldErrors)) {
          if (Array.isArray(v) && typeof v[0] === 'string' && v[0].trim()) return v[0]
        }
      }
      const formErrors = details.formErrors
      if (Array.isArray(formErrors) && typeof formErrors[0] === 'string' && formErrors[0].trim()) return formErrors[0]
    }
  }

  return fallback
}


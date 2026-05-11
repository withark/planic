export type AdminJsonOk<T> = { ok: true; status: number; data: T }
export type AdminJsonErr = { ok: false; status: number; message: string; unauthorized?: boolean }

/**
 * 관리자 API용 fetch — 쿠키 포함, JSON 파싱, 401·오류 메시지를 통일합니다.
 */
export async function adminJson<T = unknown>(
  input: string,
  init?: RequestInit,
): Promise<AdminJsonOk<T> | AdminJsonErr> {
  try {
    const r = await fetch(input, {
      credentials: 'include',
      cache: 'no-store',
      ...init,
    })
    const res = (await r.json().catch(() => ({}))) as {
      ok?: boolean
      data?: T
      error?: { message?: string } | string
    }
    if (r.status === 401) {
      return {
        ok: false,
        status: 401,
        unauthorized: true,
        message: '세션이 만료되었거나 권한이 없습니다. 다시 로그인해 주세요.',
      }
    }
    if (res?.ok === true && 'data' in res) {
      return { ok: true, status: r.status, data: res.data as T }
    }
    const err = res?.error
    const msg =
      (typeof err === 'object' &&
        err &&
        'message' in err &&
        typeof (err as { message?: string }).message === 'string' &&
        (err as { message: string }).message) ||
      (typeof err === 'string' ? err : null) ||
      '요청이 실패했습니다.'
    return { ok: false, status: r.status, message: msg }
  } catch {
    return { ok: false, status: 0, message: '네트워크 오류가 발생했습니다.' }
  }
}

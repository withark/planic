import { NextResponse } from 'next/server'

export function okResponse<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return NextResponse.json(
    { ok: false, error: { code, message, details } },
    { status },
  )
}


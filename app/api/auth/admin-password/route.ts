import { NextRequest, NextResponse } from 'next/server'
import { parseAdminSession, changeAdminPassword } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  const session = parseAdminSession(request.headers.get('cookie'))
  if (!session) {
    return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const current = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
    const next_ = typeof body?.newPassword === 'string' ? body.newPassword : ''
    const result = await changeAdminPassword(current, next_)
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[admin-password]', e)
    return NextResponse.json({ ok: false, error: '비밀번호 변경 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

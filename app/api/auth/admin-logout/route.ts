import { NextResponse } from 'next/server'
import { getAdminSessionCookie } from '@/lib/admin-auth'

export async function POST() {
  const res = NextResponse.json({ ok: true, redirect: '/admin' })
  res.headers.set('Set-Cookie', getAdminSessionCookie())
  return res
}

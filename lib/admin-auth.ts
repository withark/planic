import { createHmac, scryptSync, timingSafeEqual } from 'crypto'
import { getDb, hasDatabase, initDb } from '@/lib/db/client'

const ADMIN_USER = 'admin'
const COOKIE_NAME = 'planic_admin'
const KV_KEY_ADMIN_HASH = 'admin_password_hash'
const DEFAULT_PASSWORD = 'admin'

function getSecret(): string {
  return process.env.NEXTAUTH_SECRET || process.env.ADMIN_SECRET || 'dev-admin-secret-min-32-chars'
}

function getEnvPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || DEFAULT_PASSWORD
}

function hashPassword(password: string): string {
  const salt = getSecret()
  return scryptSync(password, salt, 64).toString('base64')
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const h = hashPassword(password)
    if (h.length !== storedHash.length) return false
    return timingSafeEqual(Buffer.from(h, 'base64'), Buffer.from(storedHash, 'base64'))
  } catch {
    return false
  }
}

export async function getStoredAdminHash(): Promise<string | null> {
  if (!hasDatabase()) return null
  await initDb()
  const sql = getDb()
  const rows = await sql`SELECT value FROM app_kv WHERE key = ${KV_KEY_ADMIN_HASH}`
  if (rows.length === 0) return null
  const v = (rows[0] as { value: unknown })?.value
  if (typeof v === 'string') return v
  if (v && typeof v === 'object' && 'hash' in v) return (v as { hash: string }).hash
  return null
}

export async function setStoredAdminHash(hash: string): Promise<void> {
  await initDb()
  const sql = getDb()
  await sql`
    INSERT INTO app_kv (key, value) VALUES (${KV_KEY_ADMIN_HASH}, ${JSON.stringify(hash)}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `
}

/** 아이디가 admin이고 비밀번호가 맞으면 true */
export async function verifyAdmin(username: string, password: string): Promise<boolean> {
  if (username !== ADMIN_USER || !password) return false
  const stored = await getStoredAdminHash()
  if (stored) {
    return verifyPassword(password, stored)
  }
  return password === getEnvPassword()
}

/** 비밀번호 변경: 현재 비밀번호 검증 후 새 해시 저장. DB 없으면 false */
export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const valid = await verifyAdmin(ADMIN_USER, currentPassword)
  if (!valid) return { ok: false, error: '현재 비밀번호가 올바르지 않습니다.' }
  if (!newPassword || newPassword.length < 4) return { ok: false, error: '새 비밀번호는 4자 이상이어야 합니다.' }
  if (!hasDatabase()) return { ok: false, error: 'DB가 설정되지 않아 저장할 수 없습니다.' }
  const hash = hashPassword(newPassword)
  await setStoredAdminHash(hash)
  return { ok: true }
}

function signPayload(payload: object): string {
  const data = JSON.stringify(payload)
  const sig = createHmac('sha256', getSecret()).update(data).digest('hex')
  return Buffer.from(JSON.stringify({ data, sig })).toString('base64url')
}

function verifyPayload(token: string): { user: string } | null {
  try {
    const raw = JSON.parse(Buffer.from(token, 'base64url').toString()) as { data?: string; sig?: string }
    if (!raw.data || !raw.sig) return null
    const expected = createHmac('sha256', getSecret()).update(raw.data).digest('hex')
    if (raw.sig !== expected) return null
    const parsed = JSON.parse(raw.data) as { user?: string; exp?: number }
    if (parsed.user !== ADMIN_USER) return null
    if (parsed.exp && parsed.exp < Date.now() / 1000) return null
    return { user: parsed.user }
  } catch {
    return null
  }
}

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7 // 7일

export function createAdminSessionCookie(): string {
  const payload = {
    user: ADMIN_USER,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
  }
  const value = signPayload(payload)
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SEC}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
}

export function getAdminSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

export function parseAdminSession(cookieHeader: string | null): { user: string } | null {
  if (!cookieHeader) return null
  const m = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  const token = m?.[1]?.trim()
  if (!token) return null
  return verifyPayload(token)
}

/** 서버 컴포넌트용: 쿠키 값만 넘겨서 세션 확인 */
export function parseAdminSessionFromValue(cookieValue: string | undefined): { user: string } | null {
  if (!cookieValue?.trim()) return null
  return verifyPayload(cookieValue.trim())
}

export { COOKIE_NAME }

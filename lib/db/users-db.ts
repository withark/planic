import { getDb, initDb } from './client'

export type DbUser = {
  id: string
  email: string
  name: string
  image: string
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  authProvider: string
  isAdmin: boolean
  isActive: boolean
}

export async function upsertUser(input: { id: string; email?: string | null; name?: string | null; image?: string | null }): Promise<void> {
  await initDb()
  const sql = getDb()
  const now = new Date().toISOString()
  await sql`
    INSERT INTO users (id, email, name, image, created_at, updated_at)
    VALUES (
      ${input.id},
      ${input.email ?? ''},
      ${input.name ?? ''},
      ${input.image ?? ''},
      ${now}::timestamptz,
      ${now}::timestamptz
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      image = EXCLUDED.image,
      updated_at = EXCLUDED.updated_at
  `
}

/** 로그인 성공 시 최근 로그인 시각·공급자 갱신 */
export async function recordUserLogin(userId: string, authProvider: string): Promise<void> {
  await initDb()
  const sql = getDb()
  const now = new Date().toISOString()
  await sql`
    UPDATE users
    SET last_login_at = ${now}::timestamptz,
        auth_provider = ${authProvider},
        updated_at = ${now}::timestamptz
    WHERE id = ${userId}
  `
}

export async function listUsersForAdmin(): Promise<DbUser[]> {
  await initDb()
  const sql = getDb()
  const rows = await sql`
    SELECT id, email, name, image, created_at, updated_at, last_login_at, auth_provider, is_admin, is_active
    FROM users
    ORDER BY created_at DESC
  `
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    email: String(r.email ?? ''),
    name: String(r.name ?? ''),
    image: String(r.image ?? ''),
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
    lastLoginAt: r.last_login_at ? new Date(r.last_login_at as string).toISOString() : null,
    authProvider: String(r.auth_provider ?? 'google'),
    isAdmin: Boolean(r.is_admin),
    isActive: r.is_active !== false,
  }))
}

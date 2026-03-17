import { getDb, hasDatabase, initDb } from './client'

export interface UserRow {
  user_id: string
  quote_count: number
  last_created_at: string
}

/** quotes 테이블 기준 사용자별 건수·최근 생성일 (관리자용) */
export async function getAdminUserStats(): Promise<UserRow[]> {
  if (!hasDatabase()) return []
  await initDb()
  const sql = getDb()
  const rows = await sql`
    SELECT user_id, COUNT(*)::int AS quote_count, MAX(created_at)::text AS last_created_at
    FROM quotes
    GROUP BY user_id
    ORDER BY last_created_at DESC
  `
  return rows as UserRow[]
}

export interface QuoteCountRow {
  total: number
  last_24h: number
  last_7d: number
}

export async function getAdminQuoteCounts(): Promise<QuoteCountRow> {
  if (!hasDatabase()) return { total: 0, last_24h: 0, last_7d: 0 }
  await initDb()
  const sql = getDb()
  const now = new Date()
  const d1 = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const [totalR, last24R, last7R] = await Promise.all([
    sql`SELECT COUNT(*)::int AS c FROM quotes`,
    sql`SELECT COUNT(*)::int AS c FROM quotes WHERE created_at >= ${d1.toISOString()}`,
    sql`SELECT COUNT(*)::int AS c FROM quotes WHERE created_at >= ${d7.toISOString()}`,
  ])
  return {
    total: (totalR[0] as { c: number })?.c ?? 0,
    last_24h: (last24R[0] as { c: number })?.c ?? 0,
    last_7d: (last7R[0] as { c: number })?.c ?? 0,
  }
}

export async function getAdminDistinctUserCount(): Promise<number> {
  if (!hasDatabase()) return 0
  await initDb()
  const sql = getDb()
  const rows = await sql`SELECT COUNT(DISTINCT user_id)::int AS c FROM quotes`
  return (rows[0] as { c: number })?.c ?? 0
}

import { getDb, hasDatabase, initDb } from './client'
import { uid } from '../calc'

export type AdminEventKind = 'error' | 'warn' | 'info'

export async function adminEventsAppend(
  kind: AdminEventKind,
  context: string,
  message: string
): Promise<void> {
  if (!hasDatabase()) return
  try {
    await initDb()
    const sql = getDb()
    const id = `ev_${Date.now()}_${uid()}`
    await sql`
      INSERT INTO admin_events (id, kind, context, message, created_at)
      VALUES (${id}, ${kind}, ${context}, ${message}, now())
    `
  } catch {
    // 로그 저장 실패 시 무시(콘솔 로그는 이미 됨)
  }
}

export interface AdminEventRow {
  id: string
  kind: string
  context: string
  message: string
  created_at: string
}

export async function adminEventsGetRecent(limit: number = 100): Promise<AdminEventRow[]> {
  if (!hasDatabase()) return []
  try {
    await initDb()
    const sql = getDb()
    const rows = await sql`
      SELECT id, kind, context, message, created_at
      FROM admin_events
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return rows as AdminEventRow[]
  } catch {
    return []
  }
}

export async function adminEventsGetErrorCountSince(since: Date): Promise<number> {
  if (!hasDatabase()) return 0
  try {
    await initDb()
    const sql = getDb()
    const rows = await sql`
      SELECT COUNT(*)::int as c FROM admin_events
      WHERE kind = 'error' AND created_at >= ${since.toISOString()}
    `
    return (rows[0] as { c: number })?.c ?? 0
  } catch {
    return 0
  }
}

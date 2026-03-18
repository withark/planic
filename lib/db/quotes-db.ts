import { getDb, initDb } from './client'
import type { HistoryRecord } from '../types'

export async function quotesDbGetAll(userId: string): Promise<HistoryRecord[]> {
  await initDb()
  const sql = getDb()
  const rows = await sql`
    SELECT payload, created_at, updated_at
    FROM quotes
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `
  return (rows as { payload: HistoryRecord; created_at: Date; updated_at: Date }[]).map((r) => {
    const rec = r.payload as HistoryRecord
    return { ...rec, savedAt: rec.savedAt || new Date(r.created_at).toISOString() }
  })
}

export async function quotesDbGetById(id: string, userId: string): Promise<HistoryRecord | undefined> {
  await initDb()
  const sql = getDb()
  const rows = await sql`
    SELECT payload
    FROM quotes
    WHERE id = ${id} AND user_id = ${userId}
  `
  if (rows.length === 0) return undefined
  return (rows[0] as { payload: HistoryRecord }).payload
}

/** 관리자: userId 없이 견적 조회 */
export async function quotesDbGetByIdAdmin(id: string): Promise<{ payload: HistoryRecord; userId: string } | undefined> {
  await initDb()
  const sql = getDb()
  const rows = await sql`
    SELECT user_id, payload
    FROM quotes
    WHERE id = ${id}
  `
  if (rows.length === 0) return undefined
  const r = rows[0] as { user_id: string; payload: HistoryRecord }
  return { userId: r.user_id, payload: r.payload }
}

export async function quotesDbAppend(record: HistoryRecord, userId: string): Promise<void> {
  await initDb()
  const sql = getDb()
  const now = new Date().toISOString()
  const payload = { ...record, savedAt: record.savedAt || now }
  await sql`
    INSERT INTO quotes (id, user_id, payload, created_at, updated_at)
    VALUES (${record.id}, ${userId}, ${JSON.stringify(payload)}::jsonb, ${now}::timestamptz, ${now}::timestamptz)
  `
}

export async function quotesDbDelete(id: string, userId: string): Promise<void> {
  await initDb()
  const sql = getDb()
  await sql`DELETE FROM quotes WHERE id = ${id} AND user_id = ${userId}`
}

export async function quotesDbClear(userId: string): Promise<void> {
  await initDb()
  const sql = getDb()
  await sql`DELETE FROM quotes WHERE user_id = ${userId}`
}

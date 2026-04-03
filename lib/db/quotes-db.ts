import { getDb, hasDatabase, initDb } from './client'
import type { HistoryRecord } from '../types'
import type { QuoteDoc } from '@/lib/types'
import { calcTotals, normalizeQuoteUnitPricesToThousand } from '@/lib/calc'
import { readDataJson, writeDataJson } from '@/lib/db/file-persistence'

function fileNameForUser(userId: string) {
  return `history_${userId}.json`
}

export async function quotesDbGetAll(userId: string): Promise<HistoryRecord[]> {
  if (!hasDatabase()) {
    const list = readDataJson<HistoryRecord[]>(fileNameForUser(userId), [])
      .map((r) => ({ ...r, savedAt: r.savedAt || new Date().toISOString() }))
      .slice()
    list.sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
    return list
  }
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
  if (!hasDatabase()) {
    const list = readDataJson<HistoryRecord[]>(fileNameForUser(userId), [])
    return list.find((h) => h.id === id)
  }
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
  if (!hasDatabase()) {
    // 로컬/테스트 환경에서는 사용자 단위 파일을 사용하므로 전체 파일을 순회하지 않습니다.
    // admin 테스크는 DB 환경에서만 의미가 있습니다.
    return undefined
  }
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
  if (!hasDatabase()) {
    const list = readDataJson<HistoryRecord[]>(fileNameForUser(userId), [])
    const now = new Date().toISOString()
    const nextRecord: HistoryRecord = { ...record, savedAt: record.savedAt || now }
    const idx = list.findIndex((r) => r.id === record.id)
    if (idx >= 0) list[idx] = nextRecord
    else list.push(nextRecord)
    writeDataJson(fileNameForUser(userId), list)
    return
  }
  await initDb()
  const sql = getDb()
  const now = new Date().toISOString()
  const payload = { ...record, savedAt: record.savedAt || now }
  await sql`
    INSERT INTO quotes (id, user_id, payload, created_at, updated_at)
    VALUES (${record.id}, ${userId}, ${JSON.stringify(payload)}::jsonb, ${now}::timestamptz, ${now}::timestamptz)
  `
}

export async function quotesDbUpdateById(input: {
  id: string
  userId: string
  doc: QuoteDoc
}): Promise<void> {
  if (!hasDatabase()) {
    const list = readDataJson<HistoryRecord[]>(fileNameForUser(input.userId), [])
    const idx = list.findIndex((r) => r.id === input.id)
    if (idx < 0) return
    const existing = list[idx]
    normalizeQuoteUnitPricesToThousand(input.doc)
    const totals = calcTotals(input.doc)
    list[idx] = {
      ...existing,
      eventName: input.doc.eventName,
      clientName: input.doc.clientName,
      quoteDate: input.doc.quoteDate,
      eventDate: input.doc.eventDate,
      duration: input.doc.eventDuration,
      type: input.doc.eventType,
      headcount: input.doc.headcount,
      total: totals.grand,
      doc: input.doc,
    }
    writeDataJson(fileNameForUser(input.userId), list)
    return
  }
  const existing = await quotesDbGetById(input.id, input.userId)
  if (!existing) return

  await initDb()
  const sql = getDb()
  const now = new Date().toISOString()
  normalizeQuoteUnitPricesToThousand(input.doc)
  const totals = calcTotals(input.doc)

  const nextPayload: HistoryRecord = {
    ...existing,
    eventName: input.doc.eventName,
    clientName: input.doc.clientName,
    quoteDate: input.doc.quoteDate,
    eventDate: input.doc.eventDate,
    duration: input.doc.eventDuration,
    type: input.doc.eventType,
    headcount: input.doc.headcount,
    total: totals.grand,
    doc: input.doc,
  }

  await sql`
    UPDATE quotes
    SET payload = ${JSON.stringify(nextPayload)}::jsonb,
        updated_at = ${now}::timestamptz
    WHERE id = ${input.id} AND user_id = ${input.userId}
  `
}

export async function quotesDbDelete(id: string, userId: string): Promise<void> {
  if (!hasDatabase()) {
    const list = readDataJson<HistoryRecord[]>(fileNameForUser(userId), [])
    const next = list.filter((r) => r.id !== id)
    writeDataJson(fileNameForUser(userId), next)
    return
  }
  await initDb()
  const sql = getDb()
  await sql`DELETE FROM quotes WHERE id = ${id} AND user_id = ${userId}`
}

export async function quotesDbClear(userId: string): Promise<void> {
  if (!hasDatabase()) {
    writeDataJson(fileNameForUser(userId), [])
    return
  }
  await initDb()
  const sql = getDb()
  await sql`DELETE FROM quotes WHERE user_id = ${userId}`
}

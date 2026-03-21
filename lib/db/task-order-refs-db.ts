import { getDb, initDb } from '@/lib/db/client'
import { uid } from '@/lib/calc'
import type { TaskOrderDoc } from '@/lib/types'

export async function listTaskOrderRefs(userId: string): Promise<TaskOrderDoc[]> {
  await initDb()
  const sql = getDb()
  const rows = await sql`
    SELECT id, filename, uploaded_at, summary, raw_text
    FROM task_order_refs
    WHERE user_id = ${userId}
    ORDER BY uploaded_at DESC
  `
  return (rows as any[]).map((r) => ({
    id: String(r.id),
    filename: String(r.filename),
    uploadedAt: new Date(r.uploaded_at).toISOString(),
    summary: String(r.summary ?? ''),
    rawText: String(r.raw_text ?? ''),
  }))
}

/** 생성 API용: 요약만 필요하므로 raw_text를 읽지 않아 I/O·메모리 비용을 줄입니다. */
export async function listTaskOrderRefsLight(userId: string): Promise<TaskOrderDoc[]> {
  await initDb()
  const sql = getDb()
  const rows = await sql`
    SELECT id, filename, uploaded_at, summary
    FROM task_order_refs
    WHERE user_id = ${userId}
    ORDER BY uploaded_at DESC
  `
  return (rows as any[]).map((r) => ({
    id: String(r.id),
    filename: String(r.filename),
    uploadedAt: new Date(r.uploaded_at).toISOString(),
    summary: String(r.summary ?? ''),
    rawText: '',
  }))
}

export async function getTaskOrderRefById(userId: string, id: string): Promise<TaskOrderDoc | undefined> {
  await initDb()
  const sql = getDb()
  const rows = await sql`
    SELECT id, filename, uploaded_at, summary, raw_text
    FROM task_order_refs
    WHERE user_id = ${userId} AND id = ${id}
    LIMIT 1
  `
  if (!rows.length) return undefined
  const r = rows[0] as any
  return {
    id: String(r.id),
    filename: String(r.filename),
    uploadedAt: new Date(r.uploaded_at).toISOString(),
    summary: String(r.summary ?? ''),
    rawText: String(r.raw_text ?? ''),
  }
}

export async function insertTaskOrderRef(userId: string, input: Omit<TaskOrderDoc, 'id'>): Promise<TaskOrderDoc> {
  await initDb()
  const sql = getDb()
  const id = uid()
  const uploadedAt = input.uploadedAt || new Date().toISOString()
  await sql`
    INSERT INTO task_order_refs (id, user_id, filename, uploaded_at, summary, raw_text)
    VALUES (${id}, ${userId}, ${input.filename}, ${uploadedAt}::timestamptz, ${input.summary}, ${input.rawText})
  `
  return { ...input, id, uploadedAt }
}

export async function deleteTaskOrderRef(userId: string, id: string): Promise<void> {
  await initDb()
  const sql = getDb()
  await sql`DELETE FROM task_order_refs WHERE user_id = ${userId} AND id = ${id}`
}


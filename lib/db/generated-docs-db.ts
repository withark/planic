import { getDb, initDb } from './client'
import { calcTotals } from '@/lib/calc'
import type { QuoteDoc } from '@/lib/types'
import { uid } from '@/lib/calc'

export type GeneratedDocType = 'estimate' | 'program' | 'timetable' | 'planning' | 'scenario' | 'cuesheet'

type GeneratedDocRow = {
  id: string
  docType: GeneratedDocType
  createdAt: string
  payload: QuoteDoc
  total?: number
}

function toGeneratedDocRow(r: Record<string, unknown>): GeneratedDocRow {
  const doc = r.payload as QuoteDoc
  const totals = doc ? calcTotals(doc) : null
  return {
    id: String(r.id),
    docType: String(r.doc_type) as GeneratedDocType,
    createdAt: new Date(r.created_at as string).toISOString(),
    payload: doc,
    total: totals?.grand ?? undefined,
  }
}

export async function insertGeneratedDoc(input: {
  userId: string
  id?: string
  docType: GeneratedDocType
  doc: QuoteDoc
}): Promise<string> {
  await initDb()
  const sql = getDb()
  const id = input.id ?? uid()
  const now = new Date().toISOString()
  await sql`
    INSERT INTO generated_docs (id, user_id, doc_type, payload, created_at, updated_at)
    VALUES (
      ${id},
      ${input.userId},
      ${input.docType},
      ${JSON.stringify(input.doc)}::jsonb,
      ${now}::timestamptz,
      ${now}::timestamptz
    )
  `
  return id
}

export async function getGeneratedDocById(input: {
  userId: string
  id: string
}): Promise<GeneratedDocRow | undefined> {
  await initDb()
  const sql = getDb()
  const rows = await sql`
    SELECT id, doc_type, payload, created_at
    FROM generated_docs
    WHERE user_id = ${input.userId} AND id = ${input.id}
    LIMIT 1
  `
  if (!rows.length) return undefined
  return toGeneratedDocRow(rows[0] as any)
}

export async function listGeneratedDocsByType(input: {
  userId: string
  docType: GeneratedDocType
  limit?: number
}): Promise<GeneratedDocRow[]> {
  await initDb()
  const sql = getDb()
  const limit = input.limit ?? 50
  const rows = await sql`
    SELECT id, doc_type, payload, created_at
    FROM generated_docs
    WHERE user_id = ${input.userId} AND doc_type = ${input.docType}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return (rows as any[]).map(toGeneratedDocRow)
}

export async function updateGeneratedDocById(input: {
  userId: string
  id: string
  doc: QuoteDoc
}): Promise<void> {
  await initDb()
  const sql = getDb()
  const now = new Date().toISOString()
  await sql`
    UPDATE generated_docs
    SET payload = ${JSON.stringify(input.doc)}::jsonb,
        updated_at = ${now}::timestamptz
    WHERE user_id = ${input.userId} AND id = ${input.id}
  `
}


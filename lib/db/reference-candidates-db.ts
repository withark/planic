import { getDb, initDb } from './client'
import { uid } from '@/lib/calc'

export type ReferenceCandidateStatus = 'pending' | 'reviewed' | 'registered' | 'discarded'

export type ReferenceCandidateRow = {
  id: string
  url: string
  title: string
  documentType: string
  status: ReferenceCandidateStatus
  rawText: string | null
  createdAt: string
  updatedAt: string
}

function mapRow(r: Record<string, unknown>): ReferenceCandidateRow {
  return {
    id: String(r.id),
    url: String(r.url ?? ''),
    title: String(r.title ?? ''),
    documentType: String(r.document_type ?? 'quote'),
    status: (r.status as ReferenceCandidateStatus) || 'pending',
    rawText: r.raw_text != null ? String(r.raw_text) : null,
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  }
}

export async function listReferenceCandidates(limit = 100): Promise<ReferenceCandidateRow[]> {
  await initDb()
  const sql = getDb()
  const rows = await sql`
    SELECT id, url, title, document_type, status, raw_text, created_at, updated_at
    FROM reference_candidates
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return (rows as Record<string, unknown>[]).map(mapRow)
}

export async function insertReferenceCandidate(input: {
  url: string
  title: string
  documentType: string
  rawText?: string | null
}): Promise<string> {
  await initDb()
  const sql = getDb()
  const id = uid()
  const now = new Date().toISOString()
  await sql`
    INSERT INTO reference_candidates (id, url, title, document_type, status, raw_text, created_at, updated_at)
    VALUES (${id}, ${input.url}, ${input.title}, ${input.documentType}, 'pending', ${input.rawText ?? null}, ${now}::timestamptz, ${now}::timestamptz)
  `
  return id
}

export async function updateReferenceCandidateStatus(
  id: string,
  status: ReferenceCandidateStatus
): Promise<void> {
  await initDb()
  const sql = getDb()
  const now = new Date().toISOString()
  await sql`
    UPDATE reference_candidates SET status = ${status}, updated_at = ${now}::timestamptz WHERE id = ${id}
  `
}

export async function getReferenceCandidateById(id: string): Promise<ReferenceCandidateRow | null> {
  await initDb()
  const sql = getDb()
  const rows = await sql`
    SELECT id, url, title, document_type, status, raw_text, created_at, updated_at
    FROM reference_candidates WHERE id = ${id}
  `
  if (rows.length === 0) return null
  return mapRow(rows[0] as Record<string, unknown>)
}

export async function updateReferenceCandidateRawText(id: string, rawText: string | null): Promise<void> {
  await initDb()
  const sql = getDb()
  const now = new Date().toISOString()
  await sql`
    UPDATE reference_candidates SET raw_text = ${rawText}, updated_at = ${now}::timestamptz WHERE id = ${id}
  `
}

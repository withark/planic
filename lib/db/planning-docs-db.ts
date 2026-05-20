/**
 * 기획 제안서(마크다운) 저장·조회.
 * generated_docs 테이블을 재사용하되 payload에 { markdownContent, input } 구조로 저장.
 */
import { getDb, hasDatabase, initDb } from './client'
import { uid } from '@/lib/calc'
import { readDataJson, writeDataJson } from '@/lib/db/file-persistence'

export type PlanningDocInput = {
  eventName: string
  eventType: string
  eventDate?: string
  venue?: string
  headcount?: string
  [key: string]: unknown
}

export type PlanningDocPayload = {
  markdownContent: string
  input: PlanningDocInput
}

export type PlanningDocRow = {
  id: string
  createdAt: string
  eventName: string
  eventType: string
  markdownContent: string
}

type FileRow = {
  id: string
  doc_type: string
  created_at: string
  updated_at?: string
  payload: PlanningDocPayload
}

function fileName(userId: string) {
  return `generated_docs_${userId}.json`
}

function toRow(r: Record<string, unknown>): PlanningDocRow {
  const payload = r.payload as PlanningDocPayload
  return {
    id: String(r.id),
    createdAt: new Date(r.created_at as string).toISOString(),
    eventName: payload?.input?.eventName ?? '',
    eventType: payload?.input?.eventType ?? '',
    markdownContent: payload?.markdownContent ?? '',
  }
}

export async function savePlanningDoc(input: {
  userId: string
  markdownContent: string
  formInput: PlanningDocInput
}): Promise<string> {
  const id = uid()
  const now = new Date().toISOString()
  const payload: PlanningDocPayload = {
    markdownContent: input.markdownContent,
    input: input.formInput,
  }

  if (!hasDatabase()) {
    const list = readDataJson<FileRow[]>(fileName(input.userId), [])
    list.push({ id, doc_type: 'planning_markdown', created_at: now, payload })
    writeDataJson(fileName(input.userId), list)
    return id
  }

  await initDb()
  const sql = getDb()
  await sql`
    INSERT INTO generated_docs (id, user_id, doc_type, payload, created_at, updated_at)
    VALUES (
      ${id},
      ${input.userId},
      ${'planning_markdown'},
      ${JSON.stringify(payload)}::jsonb,
      ${now}::timestamptz,
      ${now}::timestamptz
    )
    ON CONFLICT (id) DO NOTHING
  `
  return id
}

export async function listPlanningDocs(input: {
  userId: string
  limit?: number
}): Promise<PlanningDocRow[]> {
  const limit = input.limit ?? 20

  if (!hasDatabase()) {
    const list = readDataJson<FileRow[]>(fileName(input.userId), [])
      .filter(d => d.doc_type === 'planning_markdown')
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, limit)
    return list.map(r => toRow(r as unknown as Record<string, unknown>))
  }

  await initDb()
  const sql = getDb()
  const rows = await sql`
    SELECT id, doc_type, payload, created_at
    FROM generated_docs
    WHERE user_id = ${input.userId} AND doc_type = ${'planning_markdown'}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return (rows as Record<string, unknown>[]).map(toRow)
}

export async function getPlanningDoc(input: {
  userId: string
  id: string
}): Promise<PlanningDocRow | undefined> {
  if (!hasDatabase()) {
    const list = readDataJson<FileRow[]>(fileName(input.userId), [])
    const row = list.find(d => d.id === input.id && d.doc_type === 'planning_markdown')
    return row ? toRow(row as unknown as Record<string, unknown>) : undefined
  }

  await initDb()
  const sql = getDb()
  const rows = await sql`
    SELECT id, doc_type, payload, created_at
    FROM generated_docs
    WHERE user_id = ${input.userId} AND id = ${input.id} AND doc_type = ${'planning_markdown'}
    LIMIT 1
  `
  if (!rows.length) return undefined
  return toRow((rows as Record<string, unknown>[])[0]!)
}

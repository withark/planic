import { getDb, hasDatabase, initDb } from '@/lib/db/client'
import { uid } from '@/lib/calc'
import type { ReferenceDoc } from '@/lib/types'
import { readDataJson, writeDataJson } from '@/lib/db/file-persistence'

function fileNameForUser(userId: string) {
  return `reference_docs_${userId}.json`
}

export async function listReferenceDocs(userId: string): Promise<ReferenceDoc[]> {
  if (!hasDatabase()) {
    const list = readDataJson<ReferenceDoc[]>(fileNameForUser(userId), []).slice()
    list.sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt))
    // DB 버전과 동일하게 rawText는 응답에서 제외합니다(대역폭 절약).
    return list.map((d) => ({ ...d, rawText: '', isActive: Boolean(d.isActive) }))
  }
  await initDb()
  const sql = getDb()
  const rows = await sql`
    SELECT id, filename, uploaded_at, summary, '' as raw_text, is_active, extracted_prices
    FROM reference_docs
    WHERE user_id = ${userId}
    ORDER BY uploaded_at DESC
  `
  return (rows as any[]).map((r) => ({
    id: String(r.id),
    filename: String(r.filename),
    uploadedAt: new Date(r.uploaded_at).toISOString(),
    summary: String(r.summary ?? ''),
    rawText: String(r.raw_text ?? ''),
    isActive: Boolean(r.is_active),
    extractedPrices: Array.isArray(r.extracted_prices) ? (r.extracted_prices as any) : [],
  }))
}

/**
 * 스타일 학습/프롬프트 주입용(요약만 필요) 목록
 * - raw_text를 조회하지 않아 컨텍스트 로딩/DB IO 비용을 줄입니다.
 */
export async function listReferenceDocsForStyle(userId: string, limit = 3): Promise<ReferenceDoc[]> {
  if (!hasDatabase()) {
    const list = readDataJson<ReferenceDoc[]>(fileNameForUser(userId), [])
      .filter((d) => Boolean(d.isActive))
      .slice()
    list.sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt))
    return list.slice(0, limit).map((d) => ({ ...d, rawText: '', isActive: true }))
  }
  await initDb()
  const sql = getDb()
  const rows = await sql`
    SELECT id, filename, uploaded_at, summary, '' as raw_text, is_active, extracted_prices
    FROM reference_docs
    WHERE user_id = ${userId}
      AND is_active = true
    ORDER BY uploaded_at DESC
    LIMIT ${limit}
  `
  return (rows as any[]).map((r) => ({
    id: String(r.id),
    filename: String(r.filename),
    uploadedAt: new Date(r.uploaded_at).toISOString(),
    summary: String(r.summary ?? ''),
    rawText: '',
    isActive: Boolean(r.is_active),
    extractedPrices: Array.isArray(r.extracted_prices) ? (r.extracted_prices as any) : [],
  }))
}

export async function insertReferenceDoc(userId: string, input: Omit<ReferenceDoc, 'id'>): Promise<ReferenceDoc> {
  if (!hasDatabase()) {
    const id = uid()
    const uploadedAt = input.uploadedAt || new Date().toISOString()
    const next: ReferenceDoc = {
      ...input,
      id,
      uploadedAt,
      rawText: input.rawText || '',
      isActive: Boolean(input.isActive),
      extractedPrices: input.extractedPrices || [],
    }
    const list = readDataJson<ReferenceDoc[]>(fileNameForUser(userId), [])
    list.push(next)
    writeDataJson(fileNameForUser(userId), list)
    return next
  }
  await initDb()
  const sql = getDb()
  const id = uid()
  const uploadedAt = input.uploadedAt || new Date().toISOString()
  await sql`
    INSERT INTO reference_docs (id, user_id, filename, uploaded_at, summary, raw_text, is_active, extracted_prices)
    VALUES (
      ${id}, ${userId}, ${input.filename}, ${uploadedAt}::timestamptz, ${input.summary}, ${input.rawText},
      ${input.isActive ?? false}, ${JSON.stringify(input.extractedPrices ?? [])}::jsonb
    )
  `
  return { ...input, id, uploadedAt } as ReferenceDoc
}

export async function deleteReferenceDoc(userId: string, id: string): Promise<void> {
  if (!hasDatabase()) {
    const list = readDataJson<ReferenceDoc[]>(fileNameForUser(userId), [])
    const next = list.filter((d) => d.id !== id)
    writeDataJson(fileNameForUser(userId), next)
    return
  }
  await initDb()
  const sql = getDb()
  await sql`DELETE FROM reference_docs WHERE user_id = ${userId} AND id = ${id}`
}

export async function setActiveReferenceDoc(userId: string, id: string | null): Promise<void> {
  if (!hasDatabase()) {
    const list = readDataJson<ReferenceDoc[]>(fileNameForUser(userId), [])
    const next = list.map((d) => ({ ...d, isActive: id ? d.id === id : false }))
    writeDataJson(fileNameForUser(userId), next)
    return
  }
  await initDb()
  const sql = getDb()
  await sql`UPDATE reference_docs SET is_active = false WHERE user_id = ${userId}`
  if (!id) return
  await sql`UPDATE reference_docs SET is_active = true WHERE user_id = ${userId} AND id = ${id}`
}


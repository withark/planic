import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { hasDatabase, getDb, initDb } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')
  if (!hasDatabase()) return okResponse({ items: [] })
  await initDb()
  const sql = getDb()
  const rows = await sql`
    SELECT id, user_id, payload, created_at
    FROM quotes
    ORDER BY created_at DESC
    LIMIT 80
  `
  const items = (rows as { id: string; user_id: string; payload: Record<string, unknown>; created_at: Date }[]).map(
    (r) => {
      const p = r.payload as Record<string, unknown>
      const doc = p.doc as Record<string, unknown> | undefined
      return {
        id: r.id,
        userId: r.user_id,
        eventName: String(p.eventName ?? ''),
        total: Number(p.total ?? 0),
        createdAt: new Date(r.created_at).toISOString(),
        hasProgram: !!(doc?.program && typeof doc.program === 'object'),
        generationMeta: p.generationMeta ?? null,
      }
    },
  )
  return okResponse({ items })
}

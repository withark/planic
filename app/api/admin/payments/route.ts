import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { hasDatabase } from '@/lib/db/client'
import { listBillingOrdersAdmin } from '@/lib/billing/toss-orders-db'
import { getDb, initDb } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')
  if (!hasDatabase()) return okResponse({ orders: [], webhookByOrder: {} })
  await initDb()
  const sql = getDb()
  const orders = await listBillingOrdersAdmin(300)
  const logs = await sql`
    SELECT order_id, COUNT(*)::int AS c, MAX(received_at)::text AS last_at
    FROM billing_webhook_logs
    WHERE order_id != ''
    GROUP BY order_id
  `.catch(() => [] as { order_id: string; c: number; last_at: string }[])
  const webhookByOrder: Record<string, { count: number; lastAt: string }> = {}
  for (const r of logs as { order_id: string; c: number; last_at: string }[]) {
    webhookByOrder[String(r.order_id)] = { count: r.c, lastAt: r.last_at }
  }
  return okResponse({ orders, webhookByOrder })
}

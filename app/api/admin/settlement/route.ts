import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { hasDatabase } from '@/lib/db/client'
import { getSettlementSummary } from '@/lib/db/admin-ops-stats-db'
import { getDb, initDb } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')
  if (!hasDatabase()) return okResponse({ months: [], planShare: [] })
  try {
    const { searchParams } = new URL(req.url)
    const months = Number(searchParams.get('months') || '6')
    const now = new Date()
    const rows: { month: string; gross: number; approved: number; canceled: number }[] = []
    for (let i = 0; i < months; i++) {
      const t = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const from = new Date(t.getFullYear(), t.getMonth(), 1).toISOString()
      const to = new Date(t.getFullYear(), t.getMonth() + 1, 0, 23, 59, 59).toISOString()
      const s = await getSettlementSummary(from, to)
      rows.push({
        month: `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`,
        gross: s.grossApproved,
        approved: s.countApproved,
        canceled: s.countCanceled,
      })
    }
    await initDb()
    const sql = getDb()
    const planRows = await sql`
      SELECT plan_type, COALESCE(SUM(amount), 0)::bigint AS s, COUNT(*)::int AS c
      FROM billing_orders
      WHERE status = 'approved'
      GROUP BY plan_type
    `.catch(() => [])
    const total = (planRows as { s: bigint }[]).reduce((a, r) => a + Number(r.s ?? 0), 0)
    const planShare = (planRows as { plan_type: string; s: bigint; c: number }[]).map((r) => ({
      plan: String(r.plan_type),
      amount: Number(r.s),
      count: r.c,
      pct: total > 0 ? Math.round((Number(r.s) / total) * 1000) / 10 : 0,
    }))
    return okResponse({ months: rows.reverse(), planShare, note: '순매출=승인 합계(MVP). 수수료·정산완료는 수동 반영 권장.' })
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', '정산 요약 실패')
  }
}

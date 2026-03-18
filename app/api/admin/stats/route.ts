import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { getAdminQuoteCounts } from '@/lib/db/admin-stats-db'
import { adminEventsGetErrorCountSince } from '@/lib/db/admin-events-db'
import { hasDatabase } from '@/lib/db/client'
import { getAdminDashboardStats } from '@/lib/db/admin-operational-db'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const session = await requireAdmin(_req)
  if (!session) {
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')
  }

  try {
    const [quoteCounts, errorCount24h] = await Promise.all([
      getAdminQuoteCounts(),
      adminEventsGetErrorCountSince(new Date(Date.now() - 24 * 60 * 60 * 1000)),
    ])
    const op = hasDatabase() ? await getAdminDashboardStats() : null

    const base = {
      hasDatabase: hasDatabase(),
      quoteCountTotal: quoteCounts.total,
      quoteCountLast24h: quoteCounts.last_24h,
      quoteCountLast7d: quoteCounts.last_7d,
      errorCountLast24h: errorCount24h,
    }
    if (!op) {
      return okResponse({
        ...base,
        userCount: 0,
        activeUserCount: 0,
      })
    }
    return okResponse({
      ...base,
      ...op,
      userCount: op.usersTotal,
      activeUserCount: op.usersActive30d,
    })
  } catch (e) {
    console.error(e)
    return errorResponse(500, 'INTERNAL_ERROR', '통계 조회에 실패했습니다.')
  }
}

import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { getAdminQuoteCounts, getAdminDistinctUserCount } from '@/lib/db/admin-stats-db'
import { adminEventsGetErrorCountSince } from '@/lib/db/admin-events-db'
import { hasDatabase } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const session = await requireAdmin(_req)
  if (!session) {
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')
  }

  try {
    const [quoteCounts, userCount, errorCount24h] = await Promise.all([
      getAdminQuoteCounts(),
      getAdminDistinctUserCount(),
      adminEventsGetErrorCountSince(new Date(Date.now() - 24 * 60 * 60 * 1000)),
    ])

    return okResponse({
      userCount,
      activeUserCount: userCount,
      adminCount: 1,
      quoteCountTotal: quoteCounts.total,
      quoteCountLast24h: quoteCounts.last_24h,
      quoteCountLast7d: quoteCounts.last_7d,
      errorCountLast24h: errorCount24h,
      hasDatabase: hasDatabase(),
    })
  } catch (e) {
    return errorResponse(500, 'INTERNAL_ERROR', '통계 조회에 실패했습니다.')
  }
}

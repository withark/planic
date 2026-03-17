import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { getAdminUserStats } from '@/lib/db/admin-stats-db'
import { getAdminQuoteCounts } from '@/lib/db/admin-stats-db'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const session = await requireAdmin(_req)
  if (!session) {
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')
  }

  try {
    const [userStats, counts] = await Promise.all([
      getAdminUserStats(),
      getAdminQuoteCounts(),
    ])
    const byUser = userStats
      .map((r) => ({ userId: r.user_id, generationCount: r.quote_count, lastAt: r.last_created_at }))
      .sort((a, b) => b.generationCount - a.generationCount)
    return okResponse({
      totalGenerations: counts.total,
      last24h: counts.last_24h,
      last7d: counts.last_7d,
      byUser,
    })
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', '사용량 조회에 실패했습니다.')
  }
}

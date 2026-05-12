import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { getBriefEnrichStatsLast7d } from '@/lib/db/admin-ops-stats-db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req)
  if (!session) {
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')
  }

  try {
    const stats = await getBriefEnrichStatsLast7d()
    return okResponse(stats)
  } catch (e) {
    console.error('brief-enrich stats error', e)
    return errorResponse(500, 'INTERNAL_ERROR', 'Brief Enrich 통계 조회에 실패했습니다.')
  }
}

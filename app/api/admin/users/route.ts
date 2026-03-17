import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { getAdminUserStats } from '@/lib/db/admin-stats-db'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const session = await requireAdmin(_req)
  if (!session) {
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')
  }

  try {
    const rows = await getAdminUserStats()
    const list = rows.map((r) => ({
      userId: r.user_id,
      email: null as string | null,
      name: null as string | null,
      isAdmin: false,
      planId: null as string | null,
      status: 'active' as string,
      quoteCount: r.quote_count,
      lastActivityAt: r.last_created_at,
    }))
    return okResponse(list)
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', '사용자 목록 조회에 실패했습니다.')
  }
}

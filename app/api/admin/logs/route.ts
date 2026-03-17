import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { adminEventsGetRecent } from '@/lib/db/admin-events-db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req)
  if (!session) {
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')
  }

  try {
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 100, 200)
    const rows = await adminEventsGetRecent(limit)
    return okResponse(rows)
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', '로그 조회에 실패했습니다.')
  }
}

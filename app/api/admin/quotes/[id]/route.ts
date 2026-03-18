import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { quotesDbGetByIdAdmin } from '@/lib/db/quotes-db'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(_req)))
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')

  const { id } = await params
  if (!id) return errorResponse(400, 'BAD_REQUEST', 'id 필요')

  try {
    const row = await quotesDbGetByIdAdmin(id)
    if (!row) return errorResponse(404, 'NOT_FOUND', '견적을 찾을 수 없습니다.')
    return okResponse({ quote: row.payload, userId: row.userId })
  } catch (e) {
    console.error(e)
    return errorResponse(500, 'INTERNAL_ERROR', '견적 조회에 실패했습니다.')
  }
}

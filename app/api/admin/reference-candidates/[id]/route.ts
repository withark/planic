import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { getReferenceCandidateById, updateReferenceCandidateStatus, updateReferenceCandidateRawText } from '@/lib/db/reference-candidates-db'
import type { ReferenceCandidateStatus } from '@/lib/db/reference-candidates-db'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(_req)))
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')

  const { id } = await params
  const candidate = await getReferenceCandidateById(id)
  if (!candidate) return errorResponse(404, 'NOT_FOUND', '후보를 찾을 수 없습니다.')
  return okResponse(candidate)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(req)))
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')

  const { id } = await params
  const candidate = await getReferenceCandidateById(id)
  if (!candidate) return errorResponse(404, 'NOT_FOUND', '후보를 찾을 수 없습니다.')

  const body = await req.json().catch(() => ({}))
  if (body?.status != null) {
    const status = body.status as ReferenceCandidateStatus
    if (!['pending', 'reviewed', 'registered', 'discarded'].includes(status))
      return errorResponse(400, 'BAD_REQUEST', '유효하지 않은 status')
    await updateReferenceCandidateStatus(id, status)
  }
  if (typeof body?.rawText === 'string') {
    await updateReferenceCandidateRawText(id, body.rawText)
  }
  return okResponse(null)
}

import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { hasDatabase } from '@/lib/db/client'
import {
  listAllCuesheetSamplesAdmin,
  updateCuesheetSampleAdmin,
  archiveCuesheetSampleAdmin,
  duplicateCuesheetSampleAdmin,
  type DocumentTab,
} from '@/lib/db/cuesheet-samples-db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')
  if (!hasDatabase()) return okResponse({ samples: [] })
  try {
    const samples = await listAllCuesheetSamplesAdmin()
    return okResponse({ samples })
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', '샘플 목록 조회 실패')
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')
  if (!hasDatabase()) return errorResponse(503, 'NO_DB', 'DB 없음')
  try {
    const body = await req.json()
    const id = String(body?.id ?? '')
    if (!id) return errorResponse(400, 'BAD_REQUEST', 'id 필요')
    if (body?.action === 'archive') {
      await archiveCuesheetSampleAdmin(id)
      return okResponse(null)
    }
    if (body?.action === 'duplicate') {
      const targetUserId = String(body?.targetUserId ?? '')
      if (!targetUserId) return errorResponse(400, 'BAD_REQUEST', 'targetUserId 필요')
      const newId = await duplicateCuesheetSampleAdmin(id, targetUserId)
      return okResponse({ newId })
    }
    const tab = body?.documentTab as string
    const documentTab: DocumentTab | undefined =
      tab && ['proposal', 'timetable', 'cuesheet', 'scenario'].includes(tab) ? (tab as DocumentTab) : undefined
    await updateCuesheetSampleAdmin(id, {
      displayName: typeof body?.displayName === 'string' ? body.displayName : undefined,
      documentTab,
      description: typeof body?.description === 'string' ? body.description : undefined,
      priority: typeof body?.priority === 'number' ? body.priority : undefined,
      isActive: typeof body?.isActive === 'boolean' ? body.isActive : undefined,
    })
    return okResponse(null)
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', '샘플 수정 실패')
  }
}

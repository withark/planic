import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { hasDatabase } from '@/lib/db/client'
import { getReferenceCandidateById, updateReferenceCandidateStatus } from '@/lib/db/reference-candidates-db'
import { insertCuesheetSampleWithFile } from '@/lib/db/cuesheet-samples-db'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(_req)))
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')
  if (!hasDatabase()) return errorResponse(503, 'NO_DB', 'DB 없음')

  const { id: candidateId } = await params
  const candidate = await getReferenceCandidateById(candidateId)
  if (!candidate) return errorResponse(404, 'NOT_FOUND', '후보를 찾을 수 없습니다.')

  const body = await _req.json().catch(() => ({}))
  const targetUserId = String(body?.targetUserId ?? '').trim()
  if (!targetUserId) return errorResponse(400, 'BAD_REQUEST', 'targetUserId 필요')

  const rawText = candidate.rawText ?? ''
  if (!rawText.trim()) return errorResponse(400, 'BAD_REQUEST', '텍스트가 없습니다. 후보에 rawText를 입력하거나 URL 가져오기를 실행하세요.')

  try {
    const filename = (candidate.title || '외부자료').replace(/[/\\?%*:|"<>]/g, '_').slice(0, 80) + '.txt'
    const sample = await insertCuesheetSampleWithFile(targetUserId, {
      filename,
      ext: 'txt',
      content: Buffer.from(rawText, 'utf-8'),
    })
    await updateReferenceCandidateStatus(candidateId, 'registered')
    return okResponse({ sampleId: sample.id })
  } catch (e) {
    console.error(e)
    return errorResponse(500, 'INTERNAL_ERROR', '샘플 등록 실패')
  }
}

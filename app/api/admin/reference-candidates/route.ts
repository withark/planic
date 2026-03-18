import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { hasDatabase } from '@/lib/db/client'
import { listReferenceCandidates, insertReferenceCandidate } from '@/lib/db/reference-candidates-db'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  if (!(await requireAdmin(_req)))
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')
  if (!hasDatabase()) return okResponse({ candidates: [] })

  try {
    const candidates = await listReferenceCandidates(100)
    return okResponse({ candidates })
  } catch (e) {
    console.error(e)
    return errorResponse(500, 'INTERNAL_ERROR', '목록 조회 실패')
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')
  if (!hasDatabase()) return errorResponse(503, 'NO_DB', 'DB 없음')

  try {
    const body = await req.json()
    const url = String(body?.url ?? '').trim()
    const title = String(body?.title ?? '').trim() || url || '(제목 없음)'
    const documentType = String(body?.documentType ?? body?.document_type ?? 'quote').trim() || 'quote'
    const rawText = typeof body?.rawText === 'string' ? body.rawText : (typeof body?.raw_text === 'string' ? body.raw_text : null)

    const id = await insertReferenceCandidate({ url, title, documentType, rawText: rawText || null })
    return okResponse({ id })
  } catch (e) {
    console.error(e)
    return errorResponse(500, 'INTERNAL_ERROR', '등록 실패')
  }
}

import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { getCuesheetFile, updateParsedStructureSummary } from '@/lib/db/cuesheet-samples-db'
import { extractTextFromBuffer } from '@/lib/file-utils'

export const dynamic = 'force-dynamic'

const MAX_SUMMARY_LENGTH = 800

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin(_req)))
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')

  const { id: sampleId } = await params
  if (!sampleId) return errorResponse(400, 'BAD_REQUEST', 'id 필요')

  try {
    const file = await getCuesheetFile(sampleId)
    if (!file) return errorResponse(404, 'NOT_FOUND', '샘플 파일을 찾을 수 없습니다.')

    const fullText = await extractTextFromBuffer(file.content, file.ext, file.filename)
    const summary =
      fullText.length <= MAX_SUMMARY_LENGTH
        ? fullText
        : fullText.slice(0, MAX_SUMMARY_LENGTH) + '\n\n…(이하 생략)'

    await updateParsedStructureSummary(sampleId, summary)
    return okResponse({ ok: true, length: summary.length })
  } catch (e) {
    console.error('admin samples parse:', e)
    const msg = e instanceof Error ? e.message : String(e)
    return errorResponse(500, 'INTERNAL_ERROR', `파싱 실패: ${msg}`)
  }
}

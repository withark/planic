import { generateProposalDetail } from '@/lib/docx/templates/proposalDetail'
import { docxAttachmentResponse } from '@/lib/docx/docx-download-response'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const buffer = await generateProposalDetail(data ?? {})
    const eventName =
      typeof data?.eventName === 'string' && data.eventName.trim()
        ? String(data.eventName).trim()
        : '세부제안서'
    return docxAttachmentResponse(buffer, `[세부제안서] ${eventName}`)
  } catch (e) {
    console.error('[generate/proposal-detail]', e)
    return Response.json({ error: '문서 생성에 실패했습니다.' }, { status: 500 })
  }
}

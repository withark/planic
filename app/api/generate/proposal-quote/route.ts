import { generateProposalWithQuote } from '@/lib/docx/templates/proposalWithQuote'
import { docxAttachmentResponse } from '@/lib/docx/docx-download-response'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const buffer = await generateProposalWithQuote(data ?? {})
    const eventName =
      typeof data?.eventName === 'string' && data.eventName.trim()
        ? String(data.eventName).trim()
        : '견적제안서'
    return docxAttachmentResponse(buffer, `[견적제안서] ${eventName}`)
  } catch (e) {
    console.error('[generate/proposal-quote]', e)
    return Response.json({ error: '문서 생성에 실패했습니다.' }, { status: 500 })
  }
}

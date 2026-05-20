import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getUserIdFromSession } from '@/lib/auth-server'
import { markdownToDocxBuffer } from '@/lib/export/markdownToDocx'
import { docxAttachmentResponse } from '@/lib/docx/docx-download-response'
import { logError } from '@/lib/utils/logger'

const RequestSchema = z.object({
  markdown: z.string().min(1),
  eventName: z.string().optional().default('기획 제안서'),
})

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) {
      return new Response(
        JSON.stringify({ error: '로그인이 필요합니다.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const json = await req.json()
    const parsed = RequestSchema.safeParse(json)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: '요청 형식이 올바르지 않습니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const { markdown, eventName } = parsed.data
    const today = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

    const buffer = await markdownToDocxBuffer(markdown, {
      title: eventName,
      date: today,
    })

    return docxAttachmentResponse(buffer, `[기획제안서] ${eventName}`)
  } catch (e) {
    logError('planning.export', e)
    return new Response(
      JSON.stringify({ error: 'DOCX 생성에 실패했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

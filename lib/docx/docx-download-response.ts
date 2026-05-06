import { NextResponse } from 'next/server'

/** RFC 5987 UTF-8 파일명으로 .docx 바이너리 응답 */
export function docxAttachmentResponse(buffer: Buffer, filenameWithoutExt: string): NextResponse {
  const base =
    filenameWithoutExt.replace(/[^\w\-가-힣.\s()[\] ]/g, '_').trim() || '문서'
  const encoded = encodeURIComponent(`${base}.docx`)
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename*=UTF-8''${encoded}`,
    },
  })
}

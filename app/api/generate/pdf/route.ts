import { NextResponse } from 'next/server'

/**
 * DOCX → PDF는 LibreOffice, Puppeteer, CloudConvert 등 별도 변환 계층이 필요합니다.
 * 인프라 연동 전까지는 501과 안내 메시지를 반환합니다.
 */
export async function POST(request: Request) {
  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    /* empty body */
  }
  const type =
    body &&
    typeof body === 'object' &&
    'type' in body &&
    typeof (body as { type?: unknown }).type === 'string'
      ? (body as { type: string }).type
      : undefined

  return NextResponse.json(
    {
      error:
        'PDF 변환은 서버에 LibreOffice 설치, Puppeteer+Chromium, 또는 CloudConvert 등 외부 변환 연동이 필요합니다. 현재는 Word(.docx) 다운로드만 제공합니다.',
      docType: type,
    },
    { status: 501 },
  )
}

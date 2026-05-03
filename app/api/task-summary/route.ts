import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

interface TaskSummary {
  projectTitle: string
  orderingOrganization: string
  purpose: string
  mainScope: string
  eventRange: string
  deliverables: string
  requiredStaffing: string
  budget: string
  specialNotes: string
  oneLineSummary: string
}

async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop() ?? ''

  if (ext === 'pdf') {
    const pdfParse = (await import('pdf-parse')).default
    const result = await pdfParse(buffer)
    return result.text
  }

  if (ext === 'docx' || ext === 'doc') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  // txt, pptx 등 — 텍스트로 최대한 읽기
  return buffer.toString('utf-8').slice(0, 30000)
}

const SUMMARY_SYSTEM_PROMPT = `당신은 행사 기획 전문가입니다. 과업지시서(RFP) 문서를 분석하여 핵심 정보를 구조화된 JSON으로 요약합니다.
반드시 한국어로 응답하고, JSON 형식만 출력하세요. 마크다운 코드 블록 없이 순수 JSON만 반환하세요.`

const SUMMARY_PROMPT = (text: string) => `
다음 과업지시서 문서를 분석하여 JSON 형식으로 핵심 정보를 추출하세요.

문서 내용:
${text.slice(0, 12000)}

다음 JSON 구조로 반환하세요. 정보가 없으면 빈 문자열("") 로 두세요:
{
  "projectTitle": "사업명",
  "orderingOrganization": "발주기관",
  "purpose": "사업 목적 (2-3문장)",
  "mainScope": "주요 업무 범위 (bullet point 형식으로 개행 구분)",
  "eventRange": "행사 규모 및 일정 (인원, 날짜, 장소 등)",
  "deliverables": "산출물 목록 (개행 구분)",
  "requiredStaffing": "인력 조건 및 자격 요건",
  "budget": "예산 및 계약 금액",
  "specialNotes": "특이사항, 제약 조건, 주의사항",
  "oneLineSummary": "한 줄 요약 (30자 이내)"
}
`

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ ok: false, error: { message: '파일이 없습니다.' } }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const rawText = await extractTextFromBuffer(buffer, file.name)

    if (!rawText.trim()) {
      return NextResponse.json({ ok: false, error: { message: '파일에서 텍스트를 추출할 수 없습니다.' } }, { status: 422 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: { message: 'AI 서비스가 설정되지 않았습니다.' } },
        { status: 503 },
      )
    }

    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: SUMMARY_PROMPT(rawText) }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('AI 응답 형식 오류')
    }

    let summary: TaskSummary
    try {
      summary = JSON.parse(content.text) as TaskSummary
    } catch {
      throw new Error('AI 응답 파싱 실패')
    }

    return NextResponse.json({ ok: true, data: { summary, rawText: rawText.slice(0, 500) } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '요약 생성에 실패했습니다.'
    return NextResponse.json({ ok: false, error: { message: msg } }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { resolveAnthropicFinalModel } from '@/lib/ai/config'
import { claudeRepairJsonText, parseRepairedJson } from '@/lib/ai/claude-json-repair'
import { collectTaskSummaryQualityIssues, normalizeTaskSummaryPatch } from '@/lib/ai/document-output-quality'
import { parseAiJson } from '@/lib/ai/json-response'
import type { TaskSummary } from '@/lib/types/task-summary'

export const maxDuration = 120

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
    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json(
        { ok: false, error: { message: 'multipart/form-data 형식으로 파일을 업로드해 주세요.' } },
        { status: 400 },
      )
    }
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
      model: resolveAnthropicFinalModel(),
      max_tokens: 2000,
      system: SUMMARY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: SUMMARY_PROMPT(rawText) }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      throw new Error('AI 응답 형식 오류')
    }

    let summary = parseAiJson<TaskSummary>(content.text)
    summary = normalizeTaskSummaryPatch(summary)

    const qualityIssues = collectTaskSummaryQualityIssues(summary)
    if (qualityIssues.length > 0) {
      try {
        const repairPrompt = `다음은 과업지시서 요약 JSON입니다. 품질 검증 이슈를 모두 해결한 수정본만 출력하세요.

[품질 이슈]
${qualityIssues.map((s) => `- ${s}`).join('\n')}

[규칙]
- 모든 키를 유지하고, 빈 문자열("")은 문서에 정보가 없을 때만 사용하세요.
- oneLineSummary는 80자 이내로 유지하세요.
- 출력은 마크다운 없이 단일 JSON만.

[원본 JSON]
${JSON.stringify(summary)}`
        const repairRaw = await claudeRepairJsonText({ client, userRepairPrompt: repairPrompt, maxTokens: 3000 })
        const patch = parseRepairedJson<Partial<TaskSummary>>(repairRaw)
        summary = normalizeTaskSummaryPatch({ ...summary, ...patch })
      } catch {
        /* 1차 요약 유지 */
      }
    }

    return NextResponse.json({ ok: true, data: { summary, rawText: rawText.slice(0, 500) } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '요약 생성에 실패했습니다.'
    return NextResponse.json({ ok: false, error: { message: msg } }, { status: 500 })
  }
}

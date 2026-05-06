import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { resolveAnthropicFinalModel } from '@/lib/ai/config'
import { claudeRepairJsonText, parseRepairedJson } from '@/lib/ai/claude-json-repair'
import { collectEmceeQualityIssues } from '@/lib/ai/document-output-quality'
import { parseAiJson } from '@/lib/ai/json-response'
import type { EmceeContent } from '@/lib/types/doc-content'

export const maxDuration = 120

interface EmceeRequest {
  eventName: string
  eventDate: string
  eventPlace: string
  headcount: string
  eventType: string
  mcTone: string
  eventStartTime: string
  eventEndTime: string
  requirements: string
  restrictions: string
}

const EMCEE_SYSTEM_PROMPT = `당신은 대한민국 최고 수준의 행사 사회자이자 행사 멘트 작가입니다. 실제 현장에서 바로 읽을 수 있는 수준의 사회자 멘트 원고를 작성합니다. 멘트는 자연스럽고 현장감 있게, 요청된 톤(격식체/친근체/유머/진중한)에 맞춰 작성하세요. 반드시 한국어로 응답하고 JSON만 출력하세요.`

const buildEmceePrompt = (body: EmceeRequest): string => `
다음 행사 정보를 바탕으로 사회자 멘트 원고를 작성해 주세요.

[행사 정보]
- 행사명: ${body.eventName}
- 행사 일자: ${body.eventDate}
- 행사 장소: ${body.eventPlace}
- 참석 인원: ${body.headcount}
- 행사 유형: ${body.eventType}
- 사회자 톤: ${body.mcTone}
- 행사 시작 시간: ${body.eventStartTime}
- 행사 종료 시간: ${body.eventEndTime}
- 요청 사항: ${body.requirements || '없음'}
- 제한 사항: ${body.restrictions || '없음'}

[작성 지침]
1. 행사 시작(${body.eventStartTime})부터 종료(${body.eventEndTime})까지 전체 흐름을 커버하는 세그먼트를 생성하세요.
2. 일반적인 행사 기준 최소 8~12개 세그먼트를 작성하세요. 행사 특성에 따라 더 많이 작성해도 됩니다.
3. 각 세그먼트의 script는 사회자가 현장에서 바로 읽을 수 있는 완성된 멘트여야 합니다. 요약이 아니라 실제 대사 전문을 자연스러운 문장으로 여러 문장 작성하세요.
4. 사회자 톤을 전 세그먼트에 일관되게 적용하세요:
   - 격식체: 존댓말·경어 사용, 정중하고 격조 있는 표현
   - 친근체: 친근하고 따뜻한 말투, 청중과 가까운 느낌
   - 유머: 재치 있는 농담과 위트, 웃음을 유발하는 표현 포함
   - 진중한: 무게감 있고 진지한 표현, 감동적이고 의미 있는 말투
5. cue 필드에는 조명·음악·영상 등 AV 큐 사인을 기재하세요 (예: "조명 온 / 오프닝 BGM 시작").
6. notes 필드에는 연출 지시사항을 기재하세요 (예: "박수 유도 후 진행", "무대 위 단상 확인").
7. 청중과의 상호작용(박수 유도, 질문, 호응 유도 등)을 script 안에 자연스럽게 포함하세요.
8. time 필드는 해당 세그먼트의 예상 진행 시각을 "HH:MM" 형식으로 기재하세요.

다음 JSON 구조로만 응답하세요. 마크다운 코드 블록 없이 순수 JSON만 반환하세요:
{
  "eventName": "${body.eventName}",
  "eventDate": "${body.eventDate}",
  "tone": "${body.mcTone}",
  "segments": [
    {
      "sequence": 1,
      "time": "HH:MM",
      "stage": "세그먼트명 (예: 개회, 환영사, 오프닝 게임 등)",
      "cue": "AV/조명/음악 큐 사인",
      "script": "실제 사회자 대사 전문 (여러 문장, 자연스러운 말투)",
      "notes": "연출 지시사항"
    }
  ],
  "notes": ["전체 진행 관련 특이사항 또는 주의사항 (있을 경우)"]
}
`

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EmceeRequest

    const ss = (v: unknown) => (typeof v === 'string' ? v : String(v ?? ''))
    const eventName      = ss(body.eventName)
    const eventDate      = ss(body.eventDate)
    const eventPlace     = ss(body.eventPlace)
    const headcount      = ss(body.headcount)
    const eventType      = ss(body.eventType)
    const mcTone         = ss(body.mcTone)
    const eventStartTime = ss(body.eventStartTime)
    const eventEndTime   = ss(body.eventEndTime)
    const requirements = ss(body.requirements)
    const restrictions = ss(body.restrictions)

    if (!eventName || !eventDate || !eventPlace || !headcount || !eventType || !mcTone || !eventStartTime || !eventEndTime) {
      return NextResponse.json(
        { ok: false, error: { message: '필수 항목이 누락되었습니다.' } },
        { status: 400 },
      )
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
      max_tokens: 4000,
      system: EMCEE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildEmceePrompt(body) }],
    })

    const responseContent = message.content[0]
    if (responseContent.type !== 'text') {
      throw new Error('AI 응답 형식 오류')
    }

    const parsed = parseAiJson<Pick<EmceeContent, 'segments' | 'notes'> & Partial<EmceeContent>>(responseContent.text)

    let content: EmceeContent = {
      eventName,
      eventDate,
      tone: mcTone,
      segments: parsed.segments ?? [],
      notes: parsed.notes,
    }

    const qualityIssues = collectEmceeQualityIssues(content)
    if (qualityIssues.length > 0) {
      try {
        const repairPrompt = `다음은 사회자 멘트 원고 JSON입니다. 품질 검증 이슈를 모두 해결한 수정본만 출력하세요.

[품질 이슈]
${qualityIssues.map((s) => `- ${s}`).join('\n')}

[규칙]
- eventName, eventDate, tone 값은 절대 변경하지 마세요. (tone은 요청된 사회자 톤과 일치해야 합니다)
- 각 segments[].script는 현장에서 그대로 읽을 완성 멘트여야 합니다.
- 출력은 마크다운 없이 단일 JSON만.

[원본 JSON]
${JSON.stringify(content)}`

        const repairRaw = await claudeRepairJsonText({ client, userRepairPrompt: repairPrompt, maxTokens: 8192 })
        const repaired = parseRepairedJson<EmceeContent>(repairRaw)
        content = {
          ...repaired,
          eventName,
          eventDate,
          tone: mcTone,
          segments: Array.isArray(repaired.segments) ? repaired.segments : content.segments,
          notes: repaired.notes ?? content.notes,
        }
      } catch {
        /* 1차 결과 유지 */
      }
    }

    return NextResponse.json({ ok: true, data: { content } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '사회자 멘트 생성에 실패했습니다.'
    return NextResponse.json({ ok: false, error: { message: msg } }, { status: 500 })
  }
}

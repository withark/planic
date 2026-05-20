import { NextRequest } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { getEnv } from '@/lib/env'
import { getUserIdFromSession } from '@/lib/auth-server'
import { ensureFreeSubscription, getActiveSubscription } from '@/lib/db/subscriptions-db'
import { getOrCreateUsage } from '@/lib/db/usage-db'
import { assertQuoteGenerateAllowed, EntitlementError } from '@/lib/entitlements'
import { logError } from '@/lib/utils/logger'
import { buildPlanningMarkdownPrompt, PLANNING_SYSTEM_PROMPT } from '@/lib/ai/prompts/planningMarkdown'
import { savePlanningDoc } from '@/lib/db/planning-docs-db'
import type { PlanType } from '@/lib/plans'

export const maxDuration = 300

const RequestSchema = z.object({
  eventName: z.string().min(1, '행사명을 입력해 주세요.'),
  eventType: z.string().min(1, '행사 유형을 선택해 주세요.'),
  eventDate: z.string().optional().default(''),
  eventDuration: z.string().optional().default(''),
  eventStartTime: z.string().optional().default(''),
  eventEndTime: z.string().optional().default(''),
  venue: z.string().optional().default(''),
  headcount: z.string().optional().default(''),
  budget: z.string().optional().default(''),
  clientName: z.string().optional().default(''),
  requirements: z.string().optional().default(''),
  companyName: z.string().optional().default(''),
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

    await ensureFreeSubscription(userId)
    const sub = await getActiveSubscription(userId)
    const plan = (sub?.planType ?? 'FREE') as PlanType
    const usage = await getOrCreateUsage(userId)
    assertQuoteGenerateAllowed(plan, usage.quoteGeneratedCount)

    const json = await req.json()
    const parsed = RequestSchema.safeParse(json)
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      return new Response(
        JSON.stringify({ error: first?.message ?? '요청 형식이 올바르지 않습니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const { ANTHROPIC_API_KEY } = getEnv()
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI API 키가 설정되지 않았습니다.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const prompt = buildPlanningMarkdownPrompt(parsed.data)
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 12000,
            system: PLANNING_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: prompt }],
          })

          let fullText = ''
          for await (const event of anthropicStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              fullText += event.delta.text
              const chunk = JSON.stringify({ type: 'delta', text: event.delta.text }) + '\n'
              controller.enqueue(encoder.encode(chunk))
            }
          }

          // 생성 완료 후 DB 저장 (비동기, 실패해도 응답에 영향 없음)
          savePlanningDoc({
            userId,
            markdownContent: fullText,
            formInput: parsed.data,
          }).catch(err => logError('planning.save', err))

          controller.enqueue(encoder.encode(JSON.stringify({ type: 'done' }) + '\n'))
        } catch (e) {
          logError('planning.stream', e)
          const msg = e instanceof Error ? e.message : '생성 중 오류가 발생했습니다.'
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', message: msg }) + '\n'))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (e) {
    logError('planning.stream.outer', e)
    if (e instanceof EntitlementError) {
      return new Response(
        JSON.stringify({ error: e.message }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return new Response(
      JSON.stringify({ error: '서버 오류가 발생했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

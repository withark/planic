import { NextRequest } from 'next/server'
import { z } from 'zod'
import { okResponse, errorResponse } from '@/lib/api/response'
import { logError } from '@/lib/utils/logger'
import { getUserIdFromSession } from '@/lib/auth-server'
import { ensureFreeSubscription } from '@/lib/db/subscriptions-db'
import { kvGet, kvSet } from '@/lib/db/kv'

const ModeSchema = z.enum(['userStyle', 'aiTemplate'])

export async function GET() {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) return errorResponse(401, 'UNAUTHORIZED', '로그인이 필요합니다.')
    await ensureFreeSubscription(userId)

    const mode = await kvGet<'userStyle' | 'aiTemplate'>('estimateStyleMode', 'userStyle')
    return okResponse({ mode })
  } catch (e) {
    logError('estimate-style-mode:GET', e)
    return errorResponse(500, 'INTERNAL_ERROR', '스타일 모드를 불러오지 못했습니다.')
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) return errorResponse(401, 'UNAUTHORIZED', '로그인이 필요합니다.')
    await ensureFreeSubscription(userId)

    const body = (await req.json()) as unknown
    const parsed = ModeSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(400, 'INVALID_REQUEST', 'mode이 올바르지 않습니다.', parsed.error.flatten())
    }
    await kvSet<'userStyle' | 'aiTemplate'>('estimateStyleMode', parsed.data)
    return okResponse({ ok: true, mode: parsed.data })
  } catch (e) {
    logError('estimate-style-mode:POST', e)
    return errorResponse(500, 'INTERNAL_ERROR', '스타일 모드를 저장하지 못했습니다.')
  }
}


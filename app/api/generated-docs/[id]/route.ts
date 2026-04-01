import { NextRequest } from 'next/server'
import { okResponse, errorResponse } from '@/lib/api/response'
import { logError } from '@/lib/utils/logger'
import { getUserIdFromSession } from '@/lib/auth-server'
import { ensureFreeSubscription, getActiveSubscription } from '@/lib/db/subscriptions-db'
import { getGeneratedDocById, updateGeneratedDocById } from '@/lib/db/generated-docs-db'
import { z } from 'zod'
import type { QuoteDoc } from '@/lib/types'
import { documentAccessMessage, isDocumentAllowedForPlan, type AppDocumentType } from '@/lib/plan-access'

export const dynamic = 'force-dynamic'

const ParamsSchema = z.object({
  id: z.string().min(1),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) return errorResponse(401, 'UNAUTHORIZED', '로그인이 필요합니다.')
    await ensureFreeSubscription(userId)
    const sub = await getActiveSubscription(userId)
    const plan = sub?.planType ?? 'FREE'

    const parsed = ParamsSchema.safeParse(await params)
    if (!parsed.success) {
      return errorResponse(400, 'INVALID_REQUEST', 'id가 올바르지 않습니다.', parsed.error.flatten())
    }

    const row = await getGeneratedDocById({ userId, id: parsed.data.id })
    if (!row) return errorResponse(404, 'NOT_FOUND', '문서를 찾을 수 없습니다.')
    const docType = row.docType as AppDocumentType
    if (!isDocumentAllowedForPlan(plan, docType)) {
      return errorResponse(403, 'PLAN_UPGRADE_REQUIRED', documentAccessMessage(docType))
    }

    return okResponse({ id: row.id, docType: row.docType, createdAt: row.createdAt, doc: row.payload })
  } catch (e) {
    logError('generated-docs:[id]:GET', e)
    return errorResponse(500, 'INTERNAL_ERROR', '문서 불러오기에 실패했습니다.')
  }
}

const PatchBodySchema = z.object({
  doc: z.any(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) return errorResponse(401, 'UNAUTHORIZED', '로그인이 필요합니다.')
    await ensureFreeSubscription(userId)
    const sub = await getActiveSubscription(userId)
    const plan = sub?.planType ?? 'FREE'

    const parsedParams = ParamsSchema.safeParse(await params)
    if (!parsedParams.success) {
      return errorResponse(400, 'INVALID_REQUEST', 'id가 올바르지 않습니다.', parsedParams.error.flatten())
    }

    const parsedBody = PatchBodySchema.safeParse(await req.json())
    if (!parsedBody.success) {
      return errorResponse(400, 'INVALID_REQUEST', '요청 형식이 올바르지 않습니다.', parsedBody.error.flatten())
    }

    const existing = await getGeneratedDocById({ userId, id: parsedParams.data.id })
    if (!existing) return errorResponse(404, 'NOT_FOUND', '문서를 찾을 수 없습니다.')
    const docType = existing.docType as AppDocumentType
    if (!isDocumentAllowedForPlan(plan, docType)) {
      return errorResponse(403, 'PLAN_UPGRADE_REQUIRED', documentAccessMessage(docType))
    }

    const nextDoc = parsedBody.data.doc as QuoteDoc
    await updateGeneratedDocById({
      userId,
      id: parsedParams.data.id,
      doc: nextDoc,
    })

    return okResponse({ ok: true })
  } catch (e) {
    logError('generated-docs:[id]:PATCH', e)
    return errorResponse(500, 'INTERNAL_ERROR', '문서 저장에 실패했습니다.')
  }
}

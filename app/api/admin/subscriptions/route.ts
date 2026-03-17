import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { hasDatabase } from '@/lib/db/client'
import { kvGet, kvSet } from '@/lib/db/kv'
import { getAdminUserStats } from '@/lib/db/admin-stats-db'
import type { AdminSubscription } from '@/lib/admin-types'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const session = await requireAdmin(_req)
  if (!session) return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')

  try {
    let list: AdminSubscription[] = []
    if (hasDatabase()) {
      list = await kvGet<AdminSubscription[]>('subscriptions', [])
      if (!Array.isArray(list)) list = []
    }
    const userStats = hasDatabase() ? await getAdminUserStats() : []
    const userIds = new Set(userStats.map((r) => r.user_id))
    list.forEach((s) => userIds.add(s.userId))
    const withUser = Array.from(userIds).map((userId) => {
      const sub = list.find((s) => s.userId === userId)
      const stats = userStats.find((r) => r.user_id === userId)
      return {
        userId,
        planId: sub?.planId ?? null,
        status: sub?.status ?? 'trial',
        startedAt: sub?.startedAt ?? null,
        expiresAt: sub?.expiresAt ?? null,
        quoteCount: stats?.quote_count ?? 0,
        lastActivityAt: stats?.last_created_at ?? null,
      }
    })
    return okResponse(withUser)
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', '구독 목록 조회에 실패했습니다.')
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req)
  if (!session) return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')

  if (!hasDatabase()) return errorResponse(503, 'NO_DB', 'DB가 없어 저장할 수 없습니다.')

  try {
    const body = await req.json()
    const subs = Array.isArray(body) ? body : (body?.data && Array.isArray(body.data) ? body.data : [])
    const list = subs.map((s: { userId?: string; planId?: string; status?: string; startedAt?: string; expiresAt?: string | null }) => ({
      userId: String(s.userId ?? ''),
      planId: String(s.planId ?? 'trial'),
      status: (s.status === 'trial' || s.status === 'active' || s.status === 'cancelled' ? s.status : 'trial') as 'trial' | 'active' | 'cancelled',
      startedAt: String(s.startedAt ?? new Date().toISOString()),
      expiresAt: s.expiresAt != null ? String(s.expiresAt) : null,
    }))
    await kvSet('subscriptions', list as AdminSubscription[])
    return okResponse(null)
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', '구독 저장에 실패했습니다.')
  }
}

import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { hasDatabase, initDb, getDb } from '@/lib/db/client'
import { kvGet, kvSet } from '@/lib/db/kv'
import type { AdminSubscription } from '@/lib/admin-types'
import { getAdminDashboardStats } from '@/lib/db/admin-operational-db'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const session = await requireAdmin(_req)
  if (!session) return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')

  if (!hasDatabase()) {
    return okResponse({ stats: null, rows: [], kvSubscriptions: [] })
  }

  try {
    await initDb()
    const sql = getDb()
    const stats = await getAdminDashboardStats()

    const rows = await sql`
      SELECT id, user_id, plan_type, billing_cycle, status, started_at, expires_at, canceled_at, created_at
      FROM subscriptions
      ORDER BY created_at DESC
      LIMIT 500
    `
    const list = (rows as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      planType: String(r.plan_type),
      billingCycle: r.billing_cycle ? String(r.billing_cycle) : null,
      status: String(r.status),
      startedAt: r.started_at ? new Date(r.started_at as string).toISOString() : null,
      expiresAt: r.expires_at ? new Date(r.expires_at as string).toISOString() : null,
      canceledAt: r.canceled_at ? new Date(r.canceled_at as string).toISOString() : null,
      createdAt: new Date(r.created_at as string).toISOString(),
      trial: false,
    }))

    let kvSubscriptions: AdminSubscription[] = []
    try {
      kvSubscriptions = await kvGet<AdminSubscription[]>('subscriptions', [])
      if (!Array.isArray(kvSubscriptions)) kvSubscriptions = []
    } catch {
      kvSubscriptions = []
    }

    const recentChanges = list.slice(0, 30)

    return okResponse({
      stats: {
        paidSubscribersActive: stats.subscriptionsActivePaid,
        activePaidCount: stats.usersPaidActive,
        freeToPaidThisMonth: stats.subscriptionsFreeToPaidMonth,
        activeSubscriptionsPaid: stats.subscriptionsActivePaid,
        canceledThisMonth: stats.subscriptionsCanceledCompletedMonth,
        planSubscriberCounts: stats.planSubscriberCounts,
        planPaymentShare: stats.planPaymentShare,
        paymentFailuresMonth: stats.paymentsFailedMonth,
        paymentsApprovedToday: stats.paymentsApprovedToday,
        paymentsApprovedMonth: stats.paymentsApprovedMonth,
        revenueTodayKrw: stats.revenueTodayKrw,
        revenueMonthKrw: stats.revenueMonthKrw,
        refundsCanceledOrders30d: stats.refundsCanceledOrders30d,
        refundAmountCanceled30dKrw: stats.refundAmountCanceled30dKrw,
        paymentSuccessRateMonth: stats.paymentSuccessRateMonth,
        recentPayments: stats.recentPayments,
        recentPaymentFailures: stats.recentPaymentFailures,
        recentCanceledOrders: stats.recentCanceledOrders,
      },
      rows: list,
      recentChanges,
      kvSubscriptions,
    })
  } catch (e) {
    console.error(e)
    return errorResponse(500, 'INTERNAL_ERROR', '구독 목록 조회에 실패했습니다.')
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req)
  if (!session) return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')

  if (!hasDatabase()) return errorResponse(503, 'NO_DB', 'DB가 없어 저장할 수 없습니다.')

  try {
    const body = await req.json()
    const subs = Array.isArray(body) ? body : body?.data && Array.isArray(body.data) ? body.data : []
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

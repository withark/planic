import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { hasDatabase } from '@/lib/db/client'
import { getAdminDashboardStats } from '@/lib/db/admin-operational-db'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const session = await requireAdmin(_req)
  if (!session) return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')

  if (!hasDatabase()) {
    return okResponse(null)
  }

  try {
    const s = await getAdminDashboardStats()
    return okResponse({
      paymentsApprovedToday: s.paymentsApprovedToday,
      paymentsApprovedMonth: s.paymentsApprovedMonth,
      revenueTodayKrw: s.revenueTodayKrw,
      revenueMonthKrw: s.revenueMonthKrw,
      revenueLast7Days: s.revenueLast7Days,
      refundsCount30d: s.refundsCanceledOrders30d,
      refundAmount30dKrw: s.refundAmountCanceled30dKrw,
      settlementTargetKrw: s.revenueMonthKrw,
      paymentsFailedMonth: s.paymentsFailedMonth,
      paymentSuccessRateMonth: s.paymentSuccessRateMonth,
      planPaymentShare: s.planPaymentShare,
      recentPayments: s.recentPayments,
      recentFailures: s.recentPaymentFailures,
      recentCancels: s.recentWebhookCancels,
    })
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', '결제 통계 조회에 실패했습니다.')
  }
}

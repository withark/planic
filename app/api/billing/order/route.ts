import { NextRequest } from 'next/server'
import { errorResponse, okResponse } from '@/lib/api/response'
import { getUserIdFromSession } from '@/lib/auth-server'
import { getBillingOrderByOrderId } from '@/lib/billing/toss-orders-db'

/**
 * 결제창용 주문 정보 조회. 본인 주문만 반환.
 */
export async function GET(req: NextRequest) {
  const userId = await getUserIdFromSession()
  if (!userId) return errorResponse(401, 'UNAUTHORIZED', '로그인이 필요합니다.')

  const orderId = req.nextUrl.searchParams.get('orderId')
  if (!orderId?.trim()) return errorResponse(400, 'INVALID_REQUEST', 'orderId가 필요합니다.')

  const order = await getBillingOrderByOrderId(orderId.trim())
  if (!order) return errorResponse(404, 'NOT_FOUND', '주문을 찾을 수 없습니다.')
  if (order.userId !== userId) return errorResponse(403, 'FORBIDDEN', '해당 주문에 접근할 수 없습니다.')
  if (order.status !== 'pending') return errorResponse(400, 'INVALID_STATE', '이미 처리된 주문입니다.')

  return okResponse({
    orderId: order.orderId,
    amount: order.amount,
    planType: order.planType,
    billingCycle: order.billingCycle,
    orderName: `플래닉 ${order.planType} ${order.billingCycle === 'annual' ? '연간' : '월간'} 구독`,
  })
}

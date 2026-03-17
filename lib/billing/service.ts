import type { BillingCycle, PlanType } from '@/lib/plans'
import { getBillingMode } from '@/lib/billing/mode'
import { setActiveSubscription } from '@/lib/db/subscriptions-db'
import { amountForPlan, getAppBaseUrl, validateTossLiveEnv } from '@/lib/billing/toss-config'
import { createBillingOrder } from '@/lib/billing/toss-orders-db'
import { uid } from '@/lib/calc'

export type SubscribeResult =
  | { kind: 'mock_activated' }
  | { kind: 'live_checkout_required'; checkoutUrl: string }

function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

function expiresAtForCycle(cycle: BillingCycle): string | null {
  if (!cycle) return null
  return cycle === 'annual' ? addDaysIso(365) : addDaysIso(30)
}

export async function subscribePlan(input: {
  userId: string
  planType: Exclude<PlanType, 'FREE'>
  billingCycle: Exclude<BillingCycle, null>
}): Promise<SubscribeResult> {
  const mode = getBillingMode()

  if (mode === 'mock') {
    await setActiveSubscription({
      userId: input.userId,
      planType: input.planType,
      billingCycle: input.billingCycle,
      status: 'active',
      expiresAt: expiresAtForCycle(input.billingCycle),
    })
    return { kind: 'mock_activated' }
  }

  // live: mock 로직 미실행. 토스 결제창으로 진입하는 내부 checkout 페이지 URL만 반환.
  validateTossLiveEnv()
  const amount = amountForPlan(input.planType, input.billingCycle)
  const orderId = `planic_${uid()}`
  await createBillingOrder({
    userId: input.userId,
    orderId,
    planType: input.planType,
    billingCycle: input.billingCycle,
    amount,
  })
  const base = getAppBaseUrl()
  const checkoutUrl = `${base}/billing/checkout?orderId=${encodeURIComponent(orderId)}`
  return { kind: 'live_checkout_required', checkoutUrl }
}


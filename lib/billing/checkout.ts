import type { BillingCycle, PlanType } from '@/lib/plans'
import { getStripe, getStripePriceId, validateLiveBillingEnv } from '@/lib/billing/stripe-config'

function getBaseUrl(): string {
  const url = process.env.NEXTAUTH_URL || process.env.BILLING_BASE_URL || process.env.VERCEL_URL
  if (url) {
    const u = String(url).trim()
    return u.startsWith('http') ? u : `https://${u}`
  }
  return 'http://localhost:3000'
}

export async function createCheckoutSession(params: {
  userId: string
  planType: Exclude<PlanType, 'FREE'>
  billingCycle: Exclude<BillingCycle, null>
}): Promise<string> {
  validateLiveBillingEnv()
  const stripe = getStripe()
  const base = getBaseUrl()
  const priceId = getStripePriceId(params.planType, params.billingCycle)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: params.userId,
    metadata: {
      userId: params.userId,
      planType: params.planType,
      billingCycle: params.billingCycle,
    },
    success_url: `${base}/dashboard?checkout=success`,
    cancel_url: `${base}/plans?checkout=canceled`,
    subscription_data: {
      metadata: {
        userId: params.userId,
        planType: params.planType,
        billingCycle: params.billingCycle,
      },
    },
  })

  if (!session.url) throw new Error('결제 페이지 URL을 생성하지 못했습니다.')
  return session.url
}

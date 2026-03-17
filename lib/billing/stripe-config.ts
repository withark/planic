import Stripe from 'stripe'
import type { BillingCycle, PlanType } from '@/lib/plans'

const LIVE_REQUIRED = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_BASIC_MONTHLY',
  'STRIPE_PRICE_BASIC_ANNUAL',
  'STRIPE_PRICE_PREMIUM_MONTHLY',
  'STRIPE_PRICE_PREMIUM_ANNUAL',
] as const

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key || !key.startsWith('sk_')) throw new Error('STRIPE_SECRET_KEY가 설정되지 않았거나 올바르지 않습니다.')
    _stripe = new Stripe(key)
  }
  return _stripe
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !secret.startsWith('whsec_')) throw new Error('STRIPE_WEBHOOK_SECRET가 설정되지 않았거나 올바르지 않습니다.')
  return secret
}

export function getStripePriceId(planType: Exclude<PlanType, 'FREE'>, billingCycle: 'monthly' | 'annual'): string {
  const key =
    planType === 'BASIC'
      ? billingCycle === 'monthly'
        ? 'STRIPE_PRICE_BASIC_MONTHLY'
        : 'STRIPE_PRICE_BASIC_ANNUAL'
      : billingCycle === 'monthly'
        ? 'STRIPE_PRICE_PREMIUM_MONTHLY'
        : 'STRIPE_PRICE_PREMIUM_ANNUAL'
  const id = process.env[key]
  if (!id || !id.startsWith('price_')) throw new Error(`${key}가 설정되지 않았거나 올바른 Stripe Price ID가 아닙니다.`)
  return id
}

export function validateLiveBillingEnv(): void {
  const missing = LIVE_REQUIRED.filter((k) => !process.env[k]?.trim())
  if (missing.length > 0) {
    throw new Error(`실결제(live) 모드에는 다음 환경 변수가 필요합니다: ${missing.join(', ')}`)
  }
}

/** Stripe Price ID → 우리 planType, billingCycle */
export function priceIdToPlan(priceId: string): { planType: Exclude<PlanType, 'FREE'>; billingCycle: 'monthly' | 'annual' } | null {
  const basicMonthly = process.env.STRIPE_PRICE_BASIC_MONTHLY
  const basicAnnual = process.env.STRIPE_PRICE_BASIC_ANNUAL
  const premiumMonthly = process.env.STRIPE_PRICE_PREMIUM_MONTHLY
  const premiumAnnual = process.env.STRIPE_PRICE_PREMIUM_ANNUAL
  if (priceId === basicMonthly) return { planType: 'BASIC', billingCycle: 'monthly' }
  if (priceId === basicAnnual) return { planType: 'BASIC', billingCycle: 'annual' }
  if (priceId === premiumMonthly) return { planType: 'PREMIUM', billingCycle: 'monthly' }
  if (priceId === premiumAnnual) return { planType: 'PREMIUM', billingCycle: 'annual' }
  return null
}

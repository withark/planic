import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { getBillingMode } from '@/lib/billing/mode'
import { getStripe, getStripeWebhookSecret, priceIdToPlan } from '@/lib/billing/stripe-config'
import { recordWebhookEventIfNew } from '@/lib/billing/webhook-events'
import {
  setActiveSubscription,
  getSubscriptionByStripeSubscriptionId,
  updateSubscriptionByStripeId,
  expireSubscriptionByStripeId,
} from '@/lib/db/subscriptions-db'

export const dynamic = 'force-dynamic'

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
  if (!subscriptionId) return

  const userId = (session.client_reference_id || session.metadata?.userId) as string | undefined
  if (!userId) return

  const stripe = getStripe()
  const raw = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  })
  const subscription = raw as Stripe.Subscription & { current_period_end?: number }
  const priceId = subscription.items.data[0]?.price?.id
  if (!priceId) return

  const plan = priceIdToPlan(priceId)
  if (!plan) return

  const periodEnd = subscription.current_period_end
  const expiresAt = periodEnd != null ? new Date(periodEnd * 1000).toISOString() : null

  await setActiveSubscription({
    userId,
    planType: plan.planType,
    billingCycle: plan.billingCycle,
    status: 'active',
    expiresAt,
    stripeSubscriptionId: subscription.id,
  })
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription & { current_period_end?: number }
): Promise<void> {
  const existing = await getSubscriptionByStripeSubscriptionId(subscription.id)
  if (!existing) return

  const periodEnd = subscription.current_period_end
  const expiresAt = periodEnd != null ? new Date(periodEnd * 1000).toISOString() : null

  if (subscription.status === 'active') {
    await updateSubscriptionByStripeId(subscription.id, { expiresAt })
    return
  }
  if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    const now = new Date().toISOString()
    await updateSubscriptionByStripeId(subscription.id, {
      status: 'canceled',
      expiresAt,
      canceledAt: now,
    })
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  await expireSubscriptionByStripeId(subscription.id)
}

export async function POST(req: NextRequest) {
  if (getBillingMode() !== 'live') {
    return new Response(JSON.stringify({ error: '웹훅은 live 모드에서만 처리됩니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: string
  try {
    body = await req.text()
  } catch {
    return new Response(JSON.stringify({ error: '요청 본문을 읽을 수 없습니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return new Response(JSON.stringify({ error: 'Stripe 서명이 없습니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let event: Stripe.Event
  try {
    const secret = getStripeWebhookSecret()
    event = Stripe.webhooks.constructEvent(body, sig, secret)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '서명 검증 실패'
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const isNew = await recordWebhookEventIfNew(event.id)
  if (!isNew) {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription') await handleCheckoutSessionCompleted(session)
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(sub)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(sub)
        break
      }
      default:
        break
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

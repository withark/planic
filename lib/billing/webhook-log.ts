import { getDb, initDb } from '@/lib/db/client'
import { uid } from '@/lib/calc'

export async function logBillingWebhook(input: {
  provider: 'toss'
  eventType: string
  orderId?: string
  paymentKey?: string
  payload: unknown
}): Promise<void> {
  await initDb()
  const sql = getDb()
  const id = uid()
  await sql`
    INSERT INTO billing_webhook_logs (id, provider, event_type, order_id, payment_key, payload, received_at)
    VALUES (
      ${id},
      ${input.provider},
      ${input.eventType ?? ''},
      ${input.orderId ?? ''},
      ${input.paymentKey ?? ''},
      ${JSON.stringify(input.payload)}::jsonb,
      now()
    )
  `
}


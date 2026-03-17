import { getDb, initDb } from '@/lib/db/client'

export async function recordBillingWebhookEventIfNew(eventId: string, provider: 'toss'): Promise<boolean> {
  await initDb()
  const sql = getDb()
  try {
    await sql`
      INSERT INTO billing_webhook_events (id, provider, created_at)
      VALUES (${eventId}, ${provider}, now())
    `
    return true
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === '23505') return false
    throw e
  }
}


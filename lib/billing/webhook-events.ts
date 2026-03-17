import { getDb, initDb } from '@/lib/db/client'

/** 이미 처리한 이벤트면 false, 새 이벤트면 true. true 반환 시 호출 측에서 처리 후 완료. */
export async function recordWebhookEventIfNew(eventId: string): Promise<boolean> {
  await initDb()
  const sql = getDb()
  try {
    await sql`
      INSERT INTO stripe_webhook_events (id, processed_at)
      VALUES (${eventId}, now())
    `
    return true
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === '23505') return false // unique_violation
    throw e
  }
}

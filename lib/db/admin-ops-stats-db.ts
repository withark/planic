import { getDb, hasDatabase, initDb } from './client'

/** 대시보드·정산용 집계 */
export async function getAdminDashboardMetrics(): Promise<{
  signupsToday: number
  paymentsTodayCount: number
  revenueTodayKrw: number
  activeSubscriptions: number
  refundsLast7d: number
  webhookLogsLast24h: number
}> {
  if (!hasDatabase()) {
    return {
      signupsToday: 0,
      paymentsTodayCount: 0,
      revenueTodayKrw: 0,
      activeSubscriptions: 0,
      refundsLast7d: 0,
      webhookLogsLast24h: 0,
    }
  }
  await initDb()
  const sql = getDb()
  const startDay = new Date()
  startDay.setUTCHours(0, 0, 0, 0)
  const dayIso = startDay.toISOString()
  const d7 = new Date(Date.now() - 7 * 864e5).toISOString()
  const d24 = new Date(Date.now() - 864e5).toISOString()

  const [signups, payToday, activeSub, canceled7d, webhooks24] = await Promise.all([
    sql`
      SELECT COUNT(*)::int AS c FROM users WHERE created_at >= ${dayIso}::timestamptz
    `.catch(() => [{ c: 0 }]),
    sql`
      SELECT COUNT(*)::int AS c, COALESCE(SUM(amount), 0)::bigint AS s
      FROM billing_orders
      WHERE status = 'approved' AND approved_at >= ${dayIso}::timestamptz
    `.catch(() => [{ c: 0, s: 0 }]),
    sql`
      SELECT COUNT(*)::int AS c FROM subscriptions WHERE status = 'active'
    `.catch(() => [{ c: 0 }]),
    sql`
      SELECT COUNT(*)::int AS c FROM billing_orders
      WHERE status IN ('canceled', 'failed') AND updated_at >= ${d7}::timestamptz
    `.catch(() => [{ c: 0 }]),
    sql`
      SELECT COUNT(*)::int AS c FROM billing_webhook_logs WHERE received_at >= ${d24}::timestamptz
    `.catch(() => [{ c: 0 }]),
  ])

  const payRow = payToday[0] as { c: number; s: bigint | number }
  return {
    signupsToday: (signups[0] as { c: number })?.c ?? 0,
    paymentsTodayCount: payRow?.c ?? 0,
    revenueTodayKrw: Number(payRow?.s ?? 0),
    activeSubscriptions: (activeSub[0] as { c: number })?.c ?? 0,
    refundsLast7d: (canceled7d[0] as { c: number })?.c ?? 0,
    webhookLogsLast24h: (webhooks24[0] as { c: number })?.c ?? 0,
  }
}

export async function getSettlementSummary(from: string, to: string): Promise<{
  grossApproved: number
  countApproved: number
  countCanceled: number
  netKrw: number
}> {
  if (!hasDatabase()) return { grossApproved: 0, countApproved: 0, countCanceled: 0, netKrw: 0 }
  await initDb()
  const sql = getDb()
  const approved = await sql`
    SELECT COALESCE(SUM(amount), 0)::bigint AS s, COUNT(*)::int AS c
    FROM billing_orders
    WHERE status = 'approved' AND approved_at >= ${from}::timestamptz AND approved_at <= ${to}::timestamptz
  `
  const canceled = await sql`
    SELECT COALESCE(SUM(amount), 0)::bigint AS s, COUNT(*)::int AS c
    FROM billing_orders
    WHERE status IN ('canceled', 'failed') AND updated_at >= ${from}::timestamptz AND updated_at <= ${to}::timestamptz
  `
  const a = approved[0] as { s: bigint; c: number }
  const c = canceled[0] as { s: bigint; c: number }
  const gross = Number(a?.s ?? 0)
  return {
    grossApproved: gross,
    countApproved: a?.c ?? 0,
    countCanceled: c?.c ?? 0,
    netKrw: gross,
  }
}

export async function generationRunsFailureRateLast7d(): Promise<{ total: number; failed: number }> {
  if (!hasDatabase()) return { total: 0, failed: 0 }
  await initDb()
  const sql = getDb()
  const d7 = new Date(Date.now() - 7 * 864e5).toISOString()
  const rows = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE NOT success)::int AS failed
    FROM generation_runs
    WHERE created_at >= ${d7}::timestamptz
  `.catch(() => [{ total: 0, failed: 0 }])
  const r = rows[0] as { total: number; failed: number }
  return { total: r?.total ?? 0, failed: r?.failed ?? 0 }
}

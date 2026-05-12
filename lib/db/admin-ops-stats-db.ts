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

/**
 * Stage 0 (brief enrichment) 단계의 운영 지표를 generation_runs.engine_snapshot.briefEnrich에서 집계.
 * - applied: skipped=true가 아닌 강화 적용 건수
 * - skipped: skipped=true 또는 model이 비어 있는 건수
 * - avgLatencyMs: 적용 건의 latencyMs 평균
 * - modelBreakdown: provider/model별 적용 건수와 평균 latency
 */
export async function getBriefEnrichStatsLast7d(): Promise<{
  windowDays: number
  total: number
  applied: number
  skipped: number
  avgLatencyMs: number
  maxLatencyMs: number
  modelBreakdown: Array<{ provider: string; model: string; count: number; avgLatencyMs: number }>
}> {
  const empty = {
    windowDays: 7,
    total: 0,
    applied: 0,
    skipped: 0,
    avgLatencyMs: 0,
    maxLatencyMs: 0,
    modelBreakdown: [] as Array<{ provider: string; model: string; count: number; avgLatencyMs: number }>,
  }
  if (!hasDatabase()) return empty
  await initDb()
  const sql = getDb()
  const d7 = new Date(Date.now() - 7 * 864e5).toISOString()

  const summaryRows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE engine_snapshot ? 'briefEnrich')::int AS total,
      COUNT(*) FILTER (
        WHERE engine_snapshot ? 'briefEnrich'
        AND (engine_snapshot->'briefEnrich'->>'skipped') IS DISTINCT FROM 'true'
        AND (engine_snapshot->'briefEnrich'->>'model') IS NOT NULL
      )::int AS applied,
      COUNT(*) FILTER (
        WHERE engine_snapshot ? 'briefEnrich'
        AND (
          (engine_snapshot->'briefEnrich'->>'skipped') = 'true'
          OR (engine_snapshot->'briefEnrich'->>'model') IS NULL
        )
      )::int AS skipped,
      COALESCE(
        AVG((engine_snapshot->'briefEnrich'->>'latencyMs')::numeric)
        FILTER (WHERE (engine_snapshot->'briefEnrich'->>'latencyMs') ~ '^[0-9]+(\\.[0-9]+)?$'),
        0
      )::numeric AS avg_latency_ms,
      COALESCE(
        MAX((engine_snapshot->'briefEnrich'->>'latencyMs')::numeric)
        FILTER (WHERE (engine_snapshot->'briefEnrich'->>'latencyMs') ~ '^[0-9]+(\\.[0-9]+)?$'),
        0
      )::numeric AS max_latency_ms
    FROM generation_runs
    WHERE created_at >= ${d7}::timestamptz
  `.catch(() => [
    { total: 0, applied: 0, skipped: 0, avg_latency_ms: 0, max_latency_ms: 0 } as const,
  ])

  const s = summaryRows[0] as {
    total: number
    applied: number
    skipped: number
    avg_latency_ms: number | string
    max_latency_ms: number | string
  }

  const breakdownRows = await sql`
    SELECT
      COALESCE(engine_snapshot->'briefEnrich'->>'provider', '') AS provider,
      COALESCE(engine_snapshot->'briefEnrich'->>'model', '') AS model,
      COUNT(*)::int AS count,
      COALESCE(
        AVG((engine_snapshot->'briefEnrich'->>'latencyMs')::numeric)
        FILTER (WHERE (engine_snapshot->'briefEnrich'->>'latencyMs') ~ '^[0-9]+(\\.[0-9]+)?$'),
        0
      )::numeric AS avg_latency_ms
    FROM generation_runs
    WHERE created_at >= ${d7}::timestamptz
      AND engine_snapshot ? 'briefEnrich'
      AND (engine_snapshot->'briefEnrich'->>'model') IS NOT NULL
      AND (engine_snapshot->'briefEnrich'->>'skipped') IS DISTINCT FROM 'true'
    GROUP BY 1, 2
    ORDER BY count DESC
    LIMIT 10
  `.catch(() => [] as Array<{ provider: string; model: string; count: number; avg_latency_ms: number | string }>)

  return {
    windowDays: 7,
    total: Number(s?.total ?? 0),
    applied: Number(s?.applied ?? 0),
    skipped: Number(s?.skipped ?? 0),
    avgLatencyMs: Math.round(Number(s?.avg_latency_ms ?? 0)),
    maxLatencyMs: Math.round(Number(s?.max_latency_ms ?? 0)),
    modelBreakdown: (breakdownRows as Array<{ provider: string; model: string; count: number; avg_latency_ms: number | string }>).map(
      (row) => ({
        provider: row.provider || '',
        model: row.model || '',
        count: Number(row.count ?? 0),
        avgLatencyMs: Math.round(Number(row.avg_latency_ms ?? 0)),
      }),
    ),
  }
}

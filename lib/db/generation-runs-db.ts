import { getDb, hasDatabase, initDb } from './client'
import { uid } from '@/lib/calc'
import { logWarn } from '@/lib/utils/logger'

export type GenerationRunRow = {
  id: string
  userId: string
  quoteId: string | null
  success: boolean
  errorMessage: string
  sampleId: string
  sampleFilename: string
  cuesheetApplied: boolean
  budgetRange: string | null
  budgetCeilingKRW: number | null
  generatedFinalTotalKRW: number | null
  budgetFit: boolean | null
  engineSnapshot: Record<string, unknown>
  createdAt: string
}

export async function insertGenerationRun(input: {
  userId: string
  quoteId?: string | null
  success: boolean
  errorMessage?: string
  sampleId?: string
  sampleFilename?: string
  cuesheetApplied?: boolean
  engineSnapshot?: Record<string, unknown>
  budgetRange?: string | null
  budgetCeilingKRW?: number | null
  generatedFinalTotalKRW?: number | null
  budgetFit?: boolean | null
}): Promise<string> {
  if (!hasDatabase()) {
    logWarn('generation_runs.skip', {
      reason: 'no_database',
      hint: 'DATABASE_URL을 설정하면 관리자「생성 로그」에 기록됩니다.',
    })
    return ''
  }
  await initDb()
  const sql = getDb()
  const id = uid()
  const now = new Date().toISOString()
  await sql`
    INSERT INTO generation_runs (
      id, user_id, quote_id, success, error_message, sample_id, sample_filename,
      cuesheet_applied, budget_range, budget_ceiling_krw, generated_final_total_krw, budget_fit,
      engine_snapshot, created_at
    ) VALUES (
      ${id}, ${input.userId}, ${input.quoteId ?? null}, ${input.success},
      ${input.errorMessage ?? ''}, ${input.sampleId ?? ''}, ${input.sampleFilename ?? ''},
      ${input.cuesheetApplied ?? false}, ${input.budgetRange ?? null}, ${input.budgetCeilingKRW ?? null},
      ${input.generatedFinalTotalKRW ?? null}, ${input.budgetFit ?? null},
      ${JSON.stringify(input.engineSnapshot ?? {})}::jsonb,
      ${now}::timestamptz
    )
  `
  return id
}

export async function listGenerationRunsAdmin(limit = 200): Promise<GenerationRunRow[]> {
  if (!hasDatabase()) return []
  await initDb()
  const sql = getDb()
  const rows = await sql`
    SELECT id, user_id, quote_id, success, error_message, sample_id, sample_filename,
           cuesheet_applied,
           budget_range, budget_ceiling_krw, generated_final_total_krw, budget_fit,
           engine_snapshot, created_at
    FROM generation_runs
    ORDER BY created_at DESC
    LIMIT ${limit}
  `
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    userId: String(r.user_id),
    quoteId: r.quote_id ? String(r.quote_id) : null,
    success: Boolean(r.success),
    errorMessage: String(r.error_message ?? ''),
    sampleId: String(r.sample_id ?? ''),
    sampleFilename: String(r.sample_filename ?? ''),
    cuesheetApplied: Boolean(r.cuesheet_applied),
    budgetRange: r.budget_range != null ? String(r.budget_range) : null,
    budgetCeilingKRW: r.budget_ceiling_krw != null ? Number(r.budget_ceiling_krw) : null,
    generatedFinalTotalKRW: r.generated_final_total_krw != null ? Number(r.generated_final_total_krw) : null,
    budgetFit: r.budget_fit != null ? Boolean(r.budget_fit) : null,
    engineSnapshot: (r.engine_snapshot as Record<string, unknown>) ?? {},
    createdAt: new Date(r.created_at as string).toISOString(),
  }))
}

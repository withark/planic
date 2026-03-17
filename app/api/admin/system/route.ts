import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { hasDatabase, getDb } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const session = await requireAdmin(_req)
  if (!session) {
    return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')
  }

  try {
    let dbStatus: string = 'unconfigured'
    if (hasDatabase()) {
      try {
        const sql = getDb()
        await sql`SELECT 1`
        dbStatus = 'ok'
      } catch {
        dbStatus = 'error'
      }
    }
    return okResponse({
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      db: dbStatus,
      envSummary: {
        hasDatabase: hasDatabase(),
        nodeEnv: process.env.NODE_ENV ?? 'development',
      },
      notice: null as string | null,
    })
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', '시스템 상태 조회에 실패했습니다.')
  }
}

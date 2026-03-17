import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { okResponse, errorResponse } from '@/lib/api/response'
import { hasDatabase } from '@/lib/db/client'
import { kvGet, kvSet } from '@/lib/db/kv'
import type { AdminPlan } from '@/lib/admin-types'

export const dynamic = 'force-dynamic'

const DEFAULT_PLANS: AdminPlan[] = [
  { id: 'trial', name: '무료 체험', priceMonth: 0, generationLimit: 5, features: ['견적서·제안·큐시트 생성', 'PDF·Excel'], active: true, sortOrder: 0 },
  { id: 'starter', name: '스타터', priceMonth: 29000, generationLimit: 100, features: ['무제한 견적·참고·이력', '이메일 지원'], active: true, sortOrder: 1 },
  { id: 'pro', name: '프로', priceMonth: 79000, generationLimit: -1, features: ['팀 멤버 최대 5명', '우선 지원'], active: true, sortOrder: 2 },
]

export async function GET(_req: NextRequest) {
  const session = await requireAdmin(_req)
  if (!session) return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')

  try {
    if (!hasDatabase()) return okResponse(DEFAULT_PLANS)
    const plans = await kvGet<AdminPlan[]>('plans', [])
    const list = (Array.isArray(plans) && plans.length > 0) ? plans : DEFAULT_PLANS
    return okResponse(list)
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', '플랜 목록 조회에 실패했습니다.')
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req)
  if (!session) return errorResponse(401, 'UNAUTHORIZED', '관리자만 접근할 수 있습니다.')

  if (!hasDatabase()) return errorResponse(503, 'NO_DB', 'DB가 없어 저장할 수 없습니다.')

  try {
    const body = await req.json()
    const list = Array.isArray(body) ? (body as AdminPlan[]) : (body?.data && Array.isArray(body.data) ? body.data : [])
    const plans = list.map((p: AdminPlan) => ({
      id: String(p.id ?? ''),
      name: String(p.name ?? ''),
      priceMonth: Number(p.priceMonth ?? 0),
      generationLimit: Number(p.generationLimit ?? 0),
      features: Array.isArray(p.features) ? p.features : [],
      active: Boolean(p.active),
      sortOrder: Number(p.sortOrder ?? 0),
    }))
    await kvSet('plans', plans)
    return okResponse(null)
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', '플랜 저장에 실패했습니다.')
  }
}

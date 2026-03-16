import { NextRequest } from 'next/server'
import { z } from 'zod'
import { okResponse, errorResponse } from '@/lib/api/response'
import { pricesRepository } from '@/lib/repositories/prices-repository'
import type { PriceCategory } from '@/lib/types'
import { PricesSchema } from '@/lib/schemas/prices'
import { logError } from '@/lib/utils/logger'

const PricesBodySchema = PricesSchema

export async function GET() {
  try {
    const prices = await pricesRepository.getAll()
    return okResponse(prices)
  } catch (e) {
    logError('prices:GET', e)
    return errorResponse(500, 'INTERNAL_ERROR', '단가표 조회에 실패했습니다.')
  }
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const parsed = PricesBodySchema.safeParse(json)
    if (!parsed.success) {
      return errorResponse(400, 'INVALID_REQUEST', '단가표 형식이 올바르지 않습니다.', parsed.error.flatten())
    }
    const data: PriceCategory[] = parsed.data
    await pricesRepository.saveAll(data)
    return okResponse(null)
  } catch (e) {
    logError('prices:POST', e)
    return errorResponse(500, 'INTERNAL_ERROR', '단가표 저장에 실패했습니다.')
  }
}

import { NextRequest } from 'next/server'
import { okResponse, errorResponse } from '@/lib/api/response'
import { historyRepository } from '@/lib/repositories/history-repository'
import { logError } from '@/lib/utils/logger'
import { HistoryListSchema } from '@/lib/schemas/history'

export async function GET() {
  try {
    const list = await historyRepository.getAll()
    const parsed = HistoryListSchema.safeParse(list)
    if (!parsed.success) {
      return errorResponse(500, 'INVALID_HISTORY_DATA', '저장된 이력 데이터 형식이 올바르지 않습니다.', parsed.error.flatten())
    }
    return okResponse(parsed.data)
  } catch (e) {
    logError('history:GET', e)
    return errorResponse(500, 'INTERNAL_ERROR', '이력 조회에 실패했습니다.')
  }
}

// DELETE all
export async function DELETE(_req: NextRequest) {
  try {
    await historyRepository.clear()
    return okResponse(null)
  } catch (e) {
    logError('history:DELETE', e)
    return errorResponse(500, 'INTERNAL_ERROR', '이력 삭제에 실패했습니다.')
  }
}


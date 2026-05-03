import type { QuoteDoc } from '@/lib/types'

export function createEmptyDoc(params: {
  eventName: string
  clientName: string
  eventDate: string
  eventDuration: string
  eventStartHHmm?: string
  eventEndHHmm?: string
  headcount: string
  venue: string
  eventType: string
  requirements: string
}): QuoteDoc {
  return {
    ...params,
    clientManager: '',
    clientTel: '',
    quoteDate: new Date().toLocaleDateString('ko-KR'),
    quoteItems: [],
    expenseRate: 8,
    profitRate: 7,
    cutAmount: 0,
    notes: params.requirements,
    paymentTerms: '협의',
    validDays: 30,
    program: {
      concept: '',
      programRows: [],
      timeline: [],
      staffing: [],
      tips: [],
      cueRows: [],
      cueSummary: '',
    },
  }
}

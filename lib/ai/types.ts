import type { QuoteDoc, PriceCategory, CompanySettings, ReferenceDoc, TaskOrderDoc } from '../types'

export type { QuoteDoc, PriceCategory, CompanySettings, ReferenceDoc, TaskOrderDoc }

export interface GenerateInput {
  eventName: string
  clientName: string
  clientManager: string
  clientTel: string
  quoteDate: string
  eventDate: string
  eventDuration: string
  headcount: string
  venue: string
  eventType: string
  budget: string
  requirements: string
  prices: PriceCategory[]
  settings: CompanySettings
  references: ReferenceDoc[]
  taskOrderRefs?: TaskOrderDoc[]
}


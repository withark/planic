import { z } from 'zod'

export const HistoryRecordSchema = z.object({
  id: z.string(),
  eventName: z.string(),
  clientName: z.string(),
  quoteDate: z.string(),
  eventDate: z.string(),
  duration: z.string(),
  type: z.string(),
  headcount: z.string(),
  total: z.number(),
  savedAt: z.string(),
  doc: z.unknown().optional(),
})

export const HistoryListSchema = z.array(HistoryRecordSchema)

export type HistoryRecordInput = z.infer<typeof HistoryRecordSchema>
export type HistoryListInput = z.infer<typeof HistoryListSchema>


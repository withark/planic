import { z } from 'zod'

export const TaskOrderDocSchema = z.object({
  id: z.string(),
  filename: z.string(),
  uploadedAt: z.string(),
  summary: z.string(),
  rawText: z.string(),
})

export const TaskOrderRefsSchema = z.array(TaskOrderDocSchema)

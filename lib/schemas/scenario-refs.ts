import { z } from 'zod'

export const ScenarioRefDocSchema = z.object({
  id: z.string(),
  filename: z.string(),
  uploadedAt: z.string(),
  summary: z.string(),
  rawText: z.string(),
})

export const ScenarioRefsSchema = z.array(ScenarioRefDocSchema)

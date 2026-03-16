import { z } from 'zod'

export const CuesheetSampleSchema = z.object({
  id: z.string(),
  filename: z.string(),
  uploadedAt: z.string(),
  ext: z.string(),
})

export const CuesheetSamplesSchema = z.array(CuesheetSampleSchema)

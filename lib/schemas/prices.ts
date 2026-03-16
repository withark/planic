import { z } from 'zod'

export const PriceItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  spec: z.string(),
  unit: z.string(),
  price: z.number(),
  note: z.string(),
  types: z.array(z.string()),
})

export const PriceCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  items: z.array(PriceItemSchema),
})

export const PricesSchema = z.array(PriceCategorySchema)

export type PriceItemInput = z.infer<typeof PriceItemSchema>
export type PriceCategoryInput = z.infer<typeof PriceCategorySchema>
export type PricesInput = z.infer<typeof PricesSchema>


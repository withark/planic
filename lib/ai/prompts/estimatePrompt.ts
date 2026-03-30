import type { EventCategory } from './main'
import { getOutputSchema } from './main'

/** 견적서 JSON 스키마·규칙 블록 */
export function getEstimateOutputSchema(category: EventCategory): string {
  return getOutputSchema('estimate', category)
}

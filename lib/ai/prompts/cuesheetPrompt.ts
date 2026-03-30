import type { EventCategory } from './main'
import { getOutputSchema } from './main'

/** 큐시트 JSON 스키마·규칙 블록 */
export function getCuesheetOutputSchema(category: EventCategory): string {
  return getOutputSchema('cuesheet', category)
}

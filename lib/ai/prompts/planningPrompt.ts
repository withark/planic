import type { EventCategory } from './main'
import { getOutputSchema } from './main'

/** 기획안 JSON 스키마·규칙 블록 */
export function getPlanningOutputSchema(category: EventCategory): string {
  return getOutputSchema('planning', category)
}

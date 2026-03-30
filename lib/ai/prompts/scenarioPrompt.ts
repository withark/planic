import type { EventCategory } from './main'
import { getOutputSchema } from './main'

/** 시나리오 JSON 스키마·규칙 블록 */
export function getScenarioOutputSchema(category: EventCategory): string {
  return getOutputSchema('scenario', category)
}

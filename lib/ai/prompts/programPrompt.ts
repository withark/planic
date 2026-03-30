import type { EventCategory } from './main'
import { getOutputSchema } from './main'

/** 프로그램 제안서 JSON 스키마·규칙 블록 */
export function getProgramOutputSchema(category: EventCategory): string {
  return getOutputSchema('program', category)
}

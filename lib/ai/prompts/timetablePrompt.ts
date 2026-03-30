import type { EventCategory } from './main'
import { getOutputSchema } from './main'

/** 타임테이블 JSON 스키마·규칙 블록 */
export function getTimetableOutputSchema(category: EventCategory): string {
  return getOutputSchema('timetable', category)
}

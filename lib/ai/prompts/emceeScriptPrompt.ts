import type { EventCategory } from './main'
import { getOutputSchema } from './main'

/** 사회자 멘트 원고 JSON 스키마·규칙 블록 */
export function getEmceeScriptOutputSchema(category: EventCategory): string {
  return getOutputSchema('emceeScript', category)
}

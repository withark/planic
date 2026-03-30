/**
 * 문서 생성 파이프라인 진입점(서비스 레이어 명명).
 * 실제 오케스트레이션은 `generateQuoteWithMeta` (`lib/ai/ai.ts`)에 있습니다.
 */
export { generateQuoteWithMeta } from '../ai'
export type { GenerateTimingMeta } from '../ai'

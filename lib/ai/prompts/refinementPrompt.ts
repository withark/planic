import type { GenerateInput } from '../types'
import {
  buildDocumentExcellenceGuide,
  buildSelfCheckGuide,
  detectEventCategory,
  getOutputSchema,
} from './main'

/**
 * 2차(Claude) 문서 다듬기용 — 전체 행사 프롬프트를 다시 넣지 않고 초안 JSON + 핵심 메타만 전달합니다.
 */
export function buildDocumentRefinementPrompt(input: GenerateInput, draftJsonCompact: string): string {
  const target = input.documentTarget ?? 'estimate'
  const category = detectEventCategory(input.eventType || '', input.eventName || '')
  const schema = getOutputSchema(target, category)
  const excellence = buildDocumentExcellenceGuide(target)
  const selfCheck = buildSelfCheckGuide(target)

  const brief = [
    `행사명: ${input.eventName || ''}`,
    `유형: ${input.eventType || ''}`,
    `일자/장소: ${input.eventDate || ''} / ${input.venue || ''}`,
    `인원: ${input.headcount || ''}`,
    input.requirements ? `요청: ${input.requirements.slice(0, 800)}` : '',
    input.briefGoal ? `목표: ${input.briefGoal.slice(0, 400)}` : '',
    input.briefNotes ? `메모: ${input.briefNotes.slice(0, 400)}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return `당신은 대한민국 행사·이벤트 업계의 수석 편집자입니다.
아래 JSON 초안은 OpenAI가 생성한 구조화 초안입니다. **동일한 JSON 스키마를 유지**하면서 다음을 수행하세요.

=== 목표 ===
- 문장 표현·톤·가독성을 한 단계 끌어올립니다(제안서/실무 문서 품질).
- 논리 흐름과 섹션 간 일관성을 정리합니다.
- 금액·수량·시간(HH:mm) 등 **사실 필드는 임의로 바꾸지 말고**, 표현만 다듬습니다.
- 빈 필드·스키마 키를 제거하거나 타입을 바꾸지 마세요.

=== 행사 핵심(중복 컨텍스트 최소) ===
${brief}

=== Stage A Brief ===
${input.stageBrief ? JSON.stringify(input.stageBrief, null, 2) : '미제공'}

=== Stage B Structure Plan ===
${input.stageStructurePlan ? JSON.stringify(input.stageStructurePlan, null, 2) : '미제공'}

=== 완성도 기준 ===
${excellence}

=== 내부 점검 ===
${selfCheck}

=== 출력 스키마(반드시 준수) ===
${schema}

=== 초안 JSON ===
${draftJsonCompact}

설명·markdown 없이 **수정된 단일 JSON 객체**만 출력하세요.`.trim()
}

/**
 * 과업지시서 기반·요약 강조용 문구(프롬프트에 삽입 가능한 짧은 블록).
 * 상세 컨텍스트 조립은 `main.ts`의 `buildTaskOrderContext`와 함께 사용합니다.
 */
export function taskOrderSummaryPromptFragment(): string {
  return `[과업지시서 요약 원칙]
- 과업 범위·산출물·일정·제약을 견적/프로그램/큐에 일관되게 반영합니다.
- 원문에 없는 항목을 임의로 대량 추가하지 않고, 요청된 과업 중심으로 구성합니다.
- 단가·수량은 사용자 단가표와 과업 범위가 맞물리게 조정합니다.`
}

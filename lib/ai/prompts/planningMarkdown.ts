export type PlanningInput = {
  eventName: string
  eventType: string
  eventDate?: string
  eventDuration?: string
  eventStartTime?: string
  eventEndTime?: string
  venue?: string
  headcount?: string
  budget?: string
  clientName?: string
  requirements?: string
  companyName?: string
}

export function buildPlanningMarkdownPrompt(input: PlanningInput): string {
  const lines: string[] = []

  lines.push(`당신은 10년 경력의 전문 행사 기획자입니다.`)
  lines.push(`아래 행사 정보를 바탕으로 고객에게 제출할 수준의 기획 제안서를 작성해주세요.`)
  lines.push(``)
  lines.push(`## 행사 정보`)
  lines.push(`- 행사명: ${input.eventName}`)
  lines.push(`- 행사 유형: ${input.eventType}`)
  if (input.eventDate) lines.push(`- 행사 일시: ${input.eventDate}`)
  if (input.eventDuration) lines.push(`- 행사 시간: ${input.eventDuration}`)
  if (input.eventStartTime && input.eventEndTime) lines.push(`- 시작/종료: ${input.eventStartTime} ~ ${input.eventEndTime}`)
  if (input.venue) lines.push(`- 장소: ${input.venue}`)
  if (input.headcount) lines.push(`- 참가 인원: ${input.headcount}명`)
  if (input.budget) lines.push(`- 예산: ${input.budget}`)
  if (input.clientName) lines.push(`- 주최/클라이언트: ${input.clientName}`)
  if (input.companyName) lines.push(`- 제안사: ${input.companyName}`)
  if (input.requirements) {
    lines.push(`- 요청 사항:`)
    lines.push(`  ${input.requirements}`)
  }

  lines.push(``)
  lines.push(`## 작성 지침`)
  lines.push(`- 마크다운 형식으로 작성 (##, ###, **굵게**, 표, 불릿, 번호 목록 적극 활용)`)
  lines.push(`- 각 섹션마다 구체적인 실행 정보를 담을 것 (추상어 나열 금지)`)
  lines.push(`- 전문가다운 어투, 고객이 바로 제출 가능한 수준의 완성도`)
  lines.push(`- 분량은 충분히 (A4 기준 5~8페이지 수준)`)
  lines.push(``)
  lines.push(`## 제안서 구성 (이 순서대로 작성)`)
  lines.push(``)
  lines.push(`1. **표지 정보** — 제안서 제목, 제출일, 제안사, 주최`)
  lines.push(`2. **기획 의도** — 왜 이렇게 설계했는지, 3~5문단`)
  lines.push(`3. **행사 개요** — 표로 정리 (행사명/일시/장소/인원/목적 등)`)
  lines.push(`4. **참가자 분석** — 타겟 특성, 니즈, 기대값 구체적으로`)
  lines.push(`5. **기획 방향** — 핵심 기획 포인트 5개 이상 (① ~ ⑤ 형식)`)
  lines.push(`6. **세부 프로그램** — 각 프로그램별 블록 (목적/내용/진행 흐름/준비물)`)
  lines.push(`7. **타임테이블** — 표로 작성 (시간/구간/내용/담당)`)
  lines.push(`8. **장소 운영 계획** — 동선, 시설, 주의사항`)
  lines.push(`9. **운영 인력 계획** — 역할별 담당 구성`)
  lines.push(`10. **사회자 멘트 포인트** — 주요 구간별 멘트 방향`)
  lines.push(`11. **리스크 및 대응 계획** — 우천, 돌발 상황 등`)
  lines.push(`12. **기대 효과** — 단기/장기 효과 구분`)
  lines.push(`13. **체크리스트** — 사전 준비 항목 10개 이상`)

  return lines.join('\n')
}

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
  const hasTime = input.eventStartTime && input.eventEndTime
  const timeRange = hasTime ? `${input.eventStartTime} ~ ${input.eventEndTime}` : ''

  const lines: string[] = []

  lines.push(`아래 행사 정보를 바탕으로 **고객 제출용 기획 제안서**를 작성하세요.`)
  lines.push(``)
  lines.push(`## 행사 정보`)
  lines.push(`| 항목 | 내용 |`)
  lines.push(`|------|------|`)
  lines.push(`| 행사명 | ${input.eventName} |`)
  lines.push(`| 행사 유형 | ${input.eventType} |`)
  if (input.eventDate) lines.push(`| 행사 일자 | ${input.eventDate} |`)
  if (timeRange) lines.push(`| 시간 | ${timeRange} |`)
  if (input.venue) lines.push(`| 장소 | ${input.venue} |`)
  if (input.headcount) lines.push(`| 참가 인원 | ${input.headcount} |`)
  if (input.budget) lines.push(`| 예산 | ${input.budget} |`)
  if (input.clientName) lines.push(`| 주최 | ${input.clientName} |`)
  if (input.companyName) lines.push(`| 제안사 | ${input.companyName} |`)
  if (input.requirements) {
    lines.push(`| 요청 사항 | ${input.requirements.replace(/\n/g, ' / ')} |`)
  }
  lines.push(``)
  lines.push(`---`)
  lines.push(``)
  lines.push(`## 작성 원칙`)
  lines.push(``)
  lines.push(`- **분량**: 충분히 상세하게 (A4 기준 6~10페이지 수준)`)
  lines.push(`- **형식**: 마크다운만 사용. 코드 블록(\`\`\`) 사용 금지`)
  lines.push(`- **어조**: 전문적, 간결, 실행 가능한 정보 중심`)
  lines.push(`- **금지**: 추상적 총론("행사의 성공을 위해..."), 빈 섹션, 반복 문장`)
  lines.push(`- 각 섹션은 실무자가 바로 실행할 수 있는 구체적인 내용으로 채울 것`)
  lines.push(``)
  lines.push(`---`)
  lines.push(``)
  lines.push(`## 제안서 구성 (아래 순서와 제목을 그대로 사용)`)
  lines.push(``)
  lines.push(`### 1. 표지`)
  lines.push(`제안서 제목, 제출일, 주최, 제안사 정보를 표로 정리`)
  lines.push(``)
  lines.push(`### 2. 기획 의도`)
  lines.push(`- 이 행사를 왜 이렇게 설계했는지 3~5문단으로 서술`)
  lines.push(`- "무엇을" 이 아니라 "왜 이 방향인가"를 중심으로`)
  lines.push(`- 행사 유형과 참가자 특성에 맞춘 구체적 근거 포함`)
  lines.push(``)
  lines.push(`### 3. 행사 개요`)
  lines.push(`아래 항목을 모두 포함한 표로 정리:`)
  lines.push(`행사명 / 일시 / 장소 / 주최 / 제안사 / 참가 인원 / 행사 목적 / 주요 대상`)
  lines.push(``)
  lines.push(`### 4. 참가자 분석`)
  lines.push(`- 참가자 성향·니즈·기대값을 5개 이상 불릿으로`)
  lines.push(`- 각 항목: "어떤 사람들인가 → 무엇을 원하는가 → 어떻게 반응하는가" 구조`)
  lines.push(`- 추상 서술 금지. "임원급 참가자는 네트워킹 시간이 핵심이다" 수준의 구체성`)
  lines.push(``)
  lines.push(`### 5. 기획 방향`)
  lines.push(`- 핵심 기획 포인트 5~7개를 **① ~ ⑦** 형식으로`)
  lines.push(`- 각 포인트: "단순 X가 아닌 Y" 또는 "X를 통해 Y를 달성한다" 구조`)
  lines.push(`- 이 행사 유형(${input.eventType})에 특화된 차별점 포함`)
  lines.push(``)
  lines.push(`### 6. 세부 프로그램`)
  lines.push(`각 프로그램마다 아래 구조를 반복 (최소 4개 프로그램):`)
  lines.push(``)
  lines.push(`**[프로그램명] (HH:mm ~ HH:mm, N분)**`)
  lines.push(``)
  lines.push(`- **목적**: 이 프로그램을 하는 이유`)
  lines.push(`- **내용**: 실제 진행되는 일 (단계별로)`)
  lines.push(`- **운영 방식**: 조편성, MC 역할, 진행 도구`)
  lines.push(`- **준비물**: 필요한 장비·소품·인력`)
  lines.push(`- **주의사항**: 리스크 또는 현장 주의점`)
  lines.push(``)
  lines.push(`### 7. 전체 타임테이블`)
  lines.push(`시작부터 종료까지 전체 일정을 표로 작성:`)
  lines.push(`| 시간 | 구간명 | 세부 내용 | 담당 | 비고 |`)
  lines.push(`최소 8행 이상. 이동·준비·식사 등 실무 시간도 포함`)
  lines.push(``)
  lines.push(`### 8. 장소 운영 계획`)
  lines.push(`- 동선 계획 (등록→행사장→식사 등)`)
  lines.push(`- 시설 활용 방안 (음향, 조명, 스크린, 무대)`)
  lines.push(`- 주차·교통·이동 안내`)
  lines.push(`- 우천·돌발 상황 대응 방안`)
  lines.push(``)
  lines.push(`### 9. 운영 인력 계획`)
  lines.push(`표로 작성:`)
  lines.push(`| 역할 | 인원 | 주요 업무 | 배치 위치 |`)
  lines.push(`총괄 PM, 사회자, 스태프, 사진/영상, 식음 등 실제 필요 인력`)
  lines.push(``)
  lines.push(`### 10. 사회자 멘트 포인트`)
  lines.push(`주요 구간별 실제 멘트 방향 (최소 5개 구간):`)
  lines.push(`- 오프닝 / 프로그램 전환 / 식사 안내 / 시상 / 클로징 등`)
  lines.push(`- 각 구간: "시점 → 멘트 방향 → 핵심 메시지" 형식`)
  lines.push(``)
  lines.push(`### 11. 리스크 및 대응 계획`)
  lines.push(`표로 작성:`)
  lines.push(`| 리스크 | 가능성 | 대응 방안 | 담당 |`)
  lines.push(`우천, 참가자 불참, 장비 고장, 일정 지연 등 최소 6개`)
  lines.push(``)
  lines.push(`### 12. 기대 효과`)
  lines.push(`**단기 효과** (당일~1개월): 3개 이상`)
  lines.push(`**장기 효과** (3개월~1년): 3개 이상`)
  lines.push(`각 항목: 측정 가능한 수치나 변화로 표현`)
  lines.push(``)
  lines.push(`### 13. 사전 준비 체크리스트`)
  lines.push(`D-60 / D-30 / D-14 / D-7 / D-3 / D-1 / 당일 단계별로 구분하여 표 작성:`)
  lines.push(`| 시점 | 업무 항목 | 담당 | 완료 기준 |`)
  lines.push(`최소 15개 항목`)

  return lines.join('\n')
}

export const PLANNING_SYSTEM_PROMPT = [
  '당신은 대한민국 이벤트·행사 업계에서 15년 경력을 가진 수석 기획자입니다.',
  '삼성, LG, 현대 등 대기업 행사부터 스타트업 팀빌딩까지 다양한 행사를 기획했습니다.',
  '고객에게 직접 제출 가능한 수준의 전문적인 기획 제안서를 마크다운으로 작성합니다.',
  '추상적 표현은 절대 쓰지 않고, 실무자가 즉시 실행할 수 있는 구체적 정보만 담습니다.',
  '마크다운(제목, 표, 불릿, 강조)을 풍부하게 활용하되, 코드 블록은 사용하지 않습니다.',
].join(' ')

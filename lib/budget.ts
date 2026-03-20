export type ParsedBudgetCeiling = {
  /** 예산 상한(원). 상한이 없거나(예: "1000만원 이상") 파싱 불가면 null */
  ceilingKRW: number | null
  /** 로깅/표시에 쓸 원본 라벨 */
  selectedBudgetLabel: string
}

function extractNumbers(input: string): number[] {
  const m = (input || '').match(/\d{1,3}(?:,\d{3})*|\d+/g) || []
  return m
    .map(s => Number(s.replace(/,/g, '')))
    .filter(n => Number.isFinite(n) && n >= 0)
}

/**
 * UI에서 전달되는 budget 문자열(예: "소규모(300만원 이하)", "중규모(300~1000만원)",
 * 커스텀 입력값 "3,000,000~5,000,000" 등)을 예산 상한(KRW)으로 파싱합니다.
 */
export function parseBudgetCeilingKRW(budgetLabel: string): ParsedBudgetCeiling {
  const selectedBudgetLabel = (budgetLabel || '').trim()
  if (!selectedBudgetLabel) return { ceilingKRW: null, selectedBudgetLabel }
  if (/미정/i.test(selectedBudgetLabel)) return { ceilingKRW: null, selectedBudgetLabel }

  // "X만원 이상" 처럼 상한이 없는 경우는 강제 불가 -> null 처리
  const hasRangeDash = /~|–|—|-/.test(selectedBudgetLabel)
  const hasManwonUnit = /만원/.test(selectedBudgetLabel)
  const hasBelow = /이하/.test(selectedBudgetLabel)
  const hasAbove = /이상/.test(selectedBudgetLabel)

  const nums = extractNumbers(selectedBudgetLabel)
  if (!nums.length) return { ceilingKRW: null, selectedBudgetLabel }

  const scaled = hasManwonUnit ? nums.map(n => n * 10_000) : nums

  // range면 상한은 최대값
  if (hasRangeDash && scaled.length >= 2) {
    return { ceilingKRW: Math.max(...scaled), selectedBudgetLabel }
  }

  // "이하"는 상한 명시
  if (hasBelow) {
    return { ceilingKRW: Math.max(...scaled), selectedBudgetLabel }
  }

  // "이상"만 있고 상한이 없으면 null
  if (hasAbove && !hasBelow && !hasRangeDash) {
    return { ceilingKRW: null, selectedBudgetLabel }
  }

  // 그 외(예: 커스텀 숫자 "5000000" / "3,000,000~5,000,000")는 최댓값을 ceiling로 사용
  return { ceilingKRW: Math.max(...scaled), selectedBudgetLabel }
}


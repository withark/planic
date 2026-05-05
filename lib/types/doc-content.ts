// ── 공통 ─────────────────────────────────────────────────────────
export interface BaseEventInfo {
  clientName:  string
  contact:     string
  eventName:   string
  eventDate:   string
  eventPlace:  string
  headcount:   string
  budget:      string
  eventType:   string
}

// ── 제안서 ────────────────────────────────────────────────────────
export interface ProgramRow {
  stage:    string   // "오프닝 [전체]"
  name:     string   // 프로그램명
  detail:   string   // 세부 내용
  duration: string   // "15분"
}

export interface AwardOption {
  option:   string   // "1안"
  method:   string   // "소정의 상품 지급"
  detail:   string
  examples: string[]
  pros:     string[]
}

export interface MaterialCategory {
  category: string                                  // "공통 준비물", "부스 1 – 플레이존"
  items:    { name: string; quantity: string }[]
}

export interface TimetableRow {
  time:         string    // "09:50–10:05"
  label:        string    // 활동명
  merged?:      boolean   // true = 그룹 열 병합
  assignments?: string[]  // 그룹별 배치 (merged=false일 때)
}

export interface TimetableSession {
  label:     string          // "오전 세션  09:50 – 12:20  (반 A~E)"
  groups?:   string[]        // 그룹/반 목록
  rows:      TimetableRow[]
}

export interface ProposalContent extends BaseEventInfo {
  tagline:    string    // "부스 5종 체험  |  스탬프로 동기부여!"
  highlights: string[]  // 핵심 특징 3~5개

  programFlow: ProgramRow[]

  operationSystem?: {
    title: string
    rules: string[]
    note?: string
  }

  awardOptions?: AwardOption[]

  timetable?: {
    structureNote: string       // 운영 구조 설명 텍스트
    sessions:      TimetableSession[]
    footerNotes:   string[]
  }

  materialsList?: MaterialCategory[]

  staffingNote?: string
  followUp?:     string[]
  notes?:        string[]
  quote?:        QuoteData   // 사용자가 직접 입력한 견적
}

// ── 견적서 ────────────────────────────────────────────────────────
export interface QuoteLineItem {
  name:       string    // "사회자(MC)"
  unitPrice:  number    // 800000
  quantity:   number    // 1
  unit:       string    // "인" | "식" | "개" | "팀" | "일"
  subItems?:  string[]  // ["· 무선 핸드마이크 2EA", "· 앰프·스피커"] → 포함 처리
}

export interface QuoteData {
  companyName?:    string          // "(주)시냇가에심은나무 (위드아크)"
  representative?: string         // "이다윗 대표"
  contact?:        string         // "010-4537-2382"
  items:           QuoteLineItem[]
  optionalItems?:  QuoteLineItem[] // 선택 항목(별도)
  expenseRate:     number          // 제경비율 (기본 10 → 10%)
  profitAmount:    number          // 기업이윤 고정액 (원)
  includeVat:      boolean         // VAT 포함 여부
}

// ── 큐시트 ────────────────────────────────────────────────────────
export interface CuesheetRow {
  time:       string   // "09:00"
  duration:   string   // "15분"
  program:    string   // "오프닝"
  detail:     string   // 세부 내용
  format:     string   // "전체 / MC"
  staff:      string   // 담당
  equipment?: string   // "마이크, 스피커"
  notes?:     string
}

export interface CuesheetContent {
  eventName:    string
  eventDate:    string
  eventPlace:   string
  headcount:    string
  cuesheetType: string
  rows:         CuesheetRow[]
  staffList?:   string[]
  notes?:       string[]
}

// ── 사회자 멘트 ───────────────────────────────────────────────────
export interface EmceeSegment {
  sequence: number
  time?:    string   // "09:00"
  stage:    string   // "개회사", "오프닝" 등
  cue?:     string   // "음악 시작"
  script:   string   // 실제 멘트
  notes?:   string
}

export interface EmceeContent {
  eventName: string
  eventDate: string
  tone:      string   // "격식체" | "친근체" | "유머" | "진중한"
  segments:  EmceeSegment[]
  notes?:    string[]
}

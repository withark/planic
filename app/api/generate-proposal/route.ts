import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { ProposalContent } from '@/lib/types/doc-content'
import { parseAiJson } from '@/lib/ai/json-response'

export const maxDuration = 120

interface ProposalRequestBody {
  clientName: string
  contact: string
  eventName: string
  eventDate: string
  eventPlace: string
  headcount: string
  budget: string
  eventType: string
  requirements: string
  followUp: string
  notes: string
}

const PROPOSAL_SYSTEM_PROMPT = `당신은 대한민국 최고 수준의 행사 기획 전문가입니다. 행사 정보를 분석하여 실제 납품할 수 있는 수준의 제안서 내용을 구조화된 JSON으로 생성합니다. 반드시 한국어로 응답하고 JSON만 출력하세요.`

function buildProposalPrompt(body: ProposalRequestBody): string {
  return `
다음 행사 정보를 바탕으로 고품질 행사 제안서 JSON을 생성하세요.

## 행사 정보
- 의뢰인: ${body.clientName}
- 담당자/연락처: ${body.contact}
- 행사명: ${body.eventName}
- 행사 일시: ${body.eventDate}
- 행사 장소: ${body.eventPlace}
- 참가 인원: ${body.headcount}
- 예산: ${body.budget}
- 행사 유형: ${body.eventType}
- 요구 사항: ${body.requirements}
- 후속 조치: ${body.followUp}
- 기타 메모: ${body.notes}

## 생성 지침

각 필드를 아래 기준에 따라 풍부하고 구체적으로 작성하세요.

### tagline
- 행사의 핵심 콘셉트를 담은 창의적·마케팅 스타일의 부제
- 예시: "부스 5종 체험  |  스탬프로 동기부여!" / "팀워크의 기적  |  함께라서 가능한 도전!"
- 행사 유형과 분위기에 맞게 구체적으로 작성

### highlights
- 행사의 핵심 특징 3~5개
- 단순 나열이 아닌, 고객이 이 행사를 선택해야 하는 이유를 설득력 있게 서술
- 각 항목은 15~30자 내외의 명확한 문장

### programFlow
- 최소 6~8개 항목 (행사 규모나 복잡도에 따라 10개 이상도 가능)
- stage: 행사 단계 (예: "오프닝 [전체]", "부스 체험 [팀별]", "시상식 [전체]")
- name: 구체적인 프로그램명 (예: "웰컴 퍼포먼스 & 아이스브레이킹", "팀 미션 챌린지")
- detail: 구체적인 운영 방법, 내용, 진행 방식을 2~4문장으로 상세 기술
- duration: 예상 소요 시간 (예: "20분", "1시간 30분")
- "메인 프로그램", "서브 프로그램" 등의 모호한 표현 금지. 행사 유형에 딱 맞는 구체적 내용 작성

### operationSystem
- 스탬프 시스템, 포인트 제도, 팀 경쟁 방식 등 행사 운영의 핵심 규칙이 있다면 반드시 생성
- title: 시스템 명칭 (예: "스탬프 미션 시스템", "팀 포인트 경쟁제")
- rules: 구체적인 규칙 5~8개 (참가자가 이해할 수 있는 수준)
- note: 특이사항이나 운영 팁

### awardOptions
- 시상/보상 방안 2가지 옵션 생성
- option: "1안", "2안"
- method: 시상 방식 요약 (예: "팀 종합 순위제", "개인 미션 달성 보상제")
- detail: 상세 운영 방법
- examples: 시상품/보상 예시 3~5개 (예: ["백화점 상품권 5만원", "팀 단체 회식권"])
- pros: 이 방안의 장점 3~4개

### timetable
- structureNote: 전체 시간표 구조 설명 (예: "오전/오후 2세션 운영, 반별 순환 방식")
- sessions: 실제 시간표
  - label: 세션명 (예: "오전 세션  09:50 – 12:20")
  - groups: 운영 그룹/반 목록 (예: ["A팀", "B팀", "C팀"])
  - rows: 시간별 행
    - time: 구체적 시각 (예: "09:00–09:20")
    - label: 활동명
    - merged: 전체 동시 진행 시 true
    - assignments: 그룹별 배치 (예: ["A팀: 부스1", "B팀: 부스2"])
- 부스/팀 기반 행사라면 로테이션 배정표 포함
- footerNotes: 시간표 하단 주의사항 2~4개

### materialsList
- 카테고리별 준비물 목록 (최소 3~5개 카테고리)
- 예: "공통 준비물", "부스별 준비물", "시상 관련", "운영 장비"
- 각 items는 name과 quantity를 구체적으로 (예: { name: "스탬프 카드", quantity: "참가자 수 + 10매 여유분" })

### staffingNote
- 구체적인 인력 배치 권고안 (역할별 인원수, 담당 업무)
- 예: "총괄 MC 1명, 부스 운영 요원 부스당 1~2명, 사진 촬영 1명, 행정 지원 1명 권장"

### followUp
- 행사 종료 후 필요한 후속 조치 5개
- 구체적이고 실행 가능한 항목으로 작성

## 출력 형식

아래 JSON 구조로만 반환하세요. 마크다운 코드 블록(\`\`\`) 없이 순수 JSON만 출력하세요.

{
  "tagline": "...",
  "highlights": ["...", "...", "..."],
  "programFlow": [
    { "stage": "...", "name": "...", "detail": "...", "duration": "..." }
  ],
  "operationSystem": {
    "title": "...",
    "rules": ["...", "..."],
    "note": "..."
  },
  "awardOptions": [
    {
      "option": "1안",
      "method": "...",
      "detail": "...",
      "examples": ["...", "..."],
      "pros": ["...", "..."]
    }
  ],
  "timetable": {
    "structureNote": "...",
    "sessions": [
      {
        "label": "...",
        "groups": ["...", "..."],
        "rows": [
          { "time": "...", "label": "...", "merged": true },
          { "time": "...", "label": "...", "merged": false, "assignments": ["...", "..."] }
        ]
      }
    ],
    "footerNotes": ["...", "..."]
  },
  "materialsList": [
    {
      "category": "...",
      "items": [
        { "name": "...", "quantity": "..." }
      ]
    }
  ],
  "staffingNote": "...",
  "followUp": ["...", "...", "...", "...", "..."],
  "notes": ["...", "..."]
}
`
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ProposalRequestBody

    const ss = (v: unknown) => (typeof v === 'string' ? v : String(v ?? ''))
    const clientName   = ss(body.clientName)
    const contact      = ss(body.contact)
    const eventName    = ss(body.eventName)
    const eventDate    = ss(body.eventDate)
    const eventPlace   = ss(body.eventPlace)
    const headcount    = ss(body.headcount)
    const budget       = ss(body.budget)
    const eventType    = ss(body.eventType)
    const requirements = ss(body.requirements)
    const followUp     = ss(body.followUp)
    const notes        = ss(body.notes)

    if (!eventName) {
      return NextResponse.json(
        { ok: false, error: { message: '행사명을 입력해 주세요.' } },
        { status: 400 },
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: { message: 'AI 서비스가 설정되지 않았습니다.' } },
        { status: 503 },
      )
    }

    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: PROPOSAL_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildProposalPrompt(body),
        },
      ],
    })

    const responseContent = message.content[0]
    if (responseContent.type !== 'text') {
      throw new Error('AI 응답 형식 오류')
    }

    const parsed = parseAiJson<Omit<ProposalContent, keyof typeof baseFields>>(responseContent.text)

    const baseFields = {
      clientName,
      contact,
      eventName,
      eventDate,
      eventPlace,
      headcount,
      budget,
      eventType,
    }

    const aiParsed = parsed as Partial<ProposalContent>
    const content: ProposalContent = {
      tagline:    '',
      highlights: [],
      programFlow: [],
      ...baseFields,
      ...aiParsed,
      // Preserve user-supplied followUp/notes only if AI didn't generate them
      followUp: aiParsed.followUp ??
        (followUp ? followUp.split('\n').filter(Boolean) : []),
      notes: aiParsed.notes ??
        (notes ? notes.split('\n').filter(Boolean) : []),
    }

    return NextResponse.json({ ok: true, data: { content } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '제안서 생성에 실패했습니다.'
    return NextResponse.json({ ok: false, error: { message: msg } }, { status: 500 })
  }
}

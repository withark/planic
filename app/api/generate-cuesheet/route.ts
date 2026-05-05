import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

interface CuesheetRow {
  time: string
  duration: string
  program: string
  detail: string
  format: string
  staff: string
  equipment?: string
  notes?: string
}

interface CuesheetContent {
  eventName: string
  eventDate: string
  eventPlace: string
  headcount: string
  cuesheetType: string
  rows: CuesheetRow[]
  staffList?: string[]
  notes?: string[]
}

interface GenerateCuesheetRequest {
  eventName: string
  eventDate: string
  eventPlace: string
  headcount: string
  eventType: string
  cuesheetType: string
  eventStartTime: string
  eventEndTime: string
  requirements: string
  notes: string
}

const CUESHEET_SYSTEM_PROMPT =
  '당신은 대한민국 최고 수준의 행사 기획 전문가입니다. 행사 큐시트를 실제 현장에서 사용할 수 있는 수준으로 작성합니다. 시간·담당·장비·세부 내용이 모두 구체적이어야 합니다. 반드시 한국어로 응답하고 JSON만 출력하세요.'

function buildUserPrompt(req: GenerateCuesheetRequest): string {
  return `다음 행사 정보를 바탕으로 실제 현장에서 사용 가능한 수준의 큐시트를 JSON으로 작성하세요.

[행사 정보]
- 행사명: ${req.eventName}
- 행사일: ${req.eventDate}
- 장소: ${req.eventPlace}
- 참석 인원: ${req.headcount}
- 행사 유형: ${req.eventType}
- 큐시트 유형: ${req.cuesheetType}
- 행사 시작 시간: ${req.eventStartTime}
- 행사 종료 시간: ${req.eventEndTime}
- 요구 사항: ${req.requirements || '없음'}
- 특이사항: ${req.notes || '없음'}

[작성 지침]
1. rows 배열에 행사 시작 시간(${req.eventStartTime}) 기준 최소 1~2시간 전부터 셋업·리허설 일정을 포함하세요.
2. 행사 시작부터 종료(${req.eventEndTime})까지 전체 시간을 빠짐없이 커버하는 행을 작성하세요.
3. 최소 10~15개 이상의 row를 작성하세요. 행사 규모와 유형에 따라 더 많을 수 있습니다.
4. 각 row의 detail 필드는 "MC가 참석자를 환영하며 행사 취지를 소개한다" 수준으로 구체적이고 실행 가능해야 합니다. "진행" 같은 단어만 쓰지 마세요.
5. equipment 필드는 해당 순서에 실제로 필요한 장비 목록(예: "무선 마이크 2개, 빔프로젝터, 스크린")을 기재하세요. 장비가 필요 없는 순서는 생략 가능합니다.
6. staffList는 행사 전체에 필요한 스텝 목록을 "역할 + 인원수" 형태로 작성하세요 (예: ["MC 1인", "강사 1인", "음향 스텝 1인", "진행 스텝 3인"]).
7. notes 배열에는 현장 운영 시 반드시 유의해야 할 사항을 3개 이상 작성하세요.
8. time 필드는 "HH:MM" 형식, duration 필드는 "XX분" 또는 "XX시간" 형식으로 작성하세요.
9. format 필드는 "전체 / MC 진행", "팀별 / 강사 진행", "자유 / 스텝 안내" 등 구체적인 형태로 작성하세요.

다음 JSON 구조로만 반환하세요 (마크다운 코드 블록 없이 순수 JSON):
{
  "rows": [
    {
      "time": "HH:MM",
      "duration": "XX분",
      "program": "프로그램명",
      "detail": "구체적인 진행 내용",
      "format": "진행 형식",
      "staff": "담당 스텝",
      "equipment": "필요 장비 (선택)",
      "notes": "비고 (선택)"
    }
  ],
  "staffList": ["역할 1인", "역할 N인"],
  "notes": ["운영 유의사항 1", "운영 유의사항 N"]
}`
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateCuesheetRequest

    const {
      eventName,
      eventDate,
      eventPlace,
      headcount,
      eventType,
      cuesheetType,
      eventStartTime,
      eventEndTime,
      requirements,
      notes,
    } = body

    if (!eventName || !eventDate || !eventStartTime || !eventEndTime) {
      return NextResponse.json(
        { ok: false, error: { message: '필수 입력값이 누락되었습니다.' } },
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
      max_tokens: 3000,
      system: CUESHEET_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(body) }],
    })

    const aiContent = message.content[0]
    if (aiContent.type !== 'text') {
      throw new Error('AI 응답 형식 오류')
    }

    let parsed: { rows: CuesheetRow[]; staffList?: string[]; notes?: string[] }
    try {
      parsed = JSON.parse(aiContent.text)
    } catch {
      throw new Error('AI 응답 파싱 실패')
    }

    const content: CuesheetContent = {
      eventName,
      eventDate,
      eventPlace,
      headcount,
      cuesheetType: cuesheetType || eventType,
      rows: parsed.rows ?? [],
      staffList: parsed.staffList,
      notes: parsed.notes,
    }

    return NextResponse.json({ ok: true, data: { content } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : '큐시트 생성에 실패했습니다.'
    return NextResponse.json({ ok: false, error: { message: msg } }, { status: 500 })
  }
}

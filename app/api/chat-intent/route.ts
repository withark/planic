import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getEnv } from '@/lib/env'
import { getUserIdFromSession } from '@/lib/auth-server'
import { errorResponse, okResponse } from '@/lib/api/response'

export const maxDuration = 30

type ConversationMessage = { role: 'user' | 'assistant'; content: string }

export type ChatIntentParams = {
  eventName: string
  clientName: string
  eventType: string
  venue: string
  headcount: string
  eventDate: string
  eventDuration: string
  budget: string
  requirements: string
  documentTarget: string
}

export type ChatIntentResult =
  | { action: 'generate'; params: ChatIntentParams }
  | { action: 'modify'; params: Partial<ChatIntentParams> }
  | { action: 'clarify'; question: string }

const SYSTEM_PROMPT = `당신은 행사 문서 생성 어시스턴트입니다. 사용자 메시지에서 행사 정보를 추출하세요.

다음 JSON 형식으로만 응답하세요 (설명 없이):
{
  "action": "generate" | "clarify" | "modify",
  "question": "질문 (clarify일 때만)",
  "params": {
    "eventName": "",
    "clientName": "",
    "eventType": "체육대회|기업행사|축제|컨퍼런스|웨딩|학교행사|일반",
    "venue": "",
    "headcount": "",
    "eventDate": "",
    "eventDuration": "",
    "budget": "",
    "requirements": "",
    "documentTarget": "estimate|program|planning|cuesheet|scenario|emceeScript"
  }
}

행동 기준:
- "generate": 행사 이름이나 맥락이 있으면 바로 생성. 모르는 값은 빈 문자열. 행사 유형이 불확실하면 내용에서 추론.
- "clarify": 무슨 행사인지 전혀 알 수 없을 때만. question에 딱 한 가지만 물어봄 (한국어).
- "modify": 이미 문서가 있고 수정 요청일 때. params에 바뀌는 값만 채움.
- documentTarget: 기본 "estimate". 큐시트→"cuesheet", 시나리오→"scenario", 기획안→"planning", 사회자 멘트→"emceeScript", 프로그램→"program" 요청 시 변경.
- 날짜는 YYYY-MM-DD 형식으로 변환. 숫자 인원은 "100명" 형태로.
- 모든 값은 한국어.

eventType 추론 규칙:
- 체육대회/운동회/스포츠 행사 → "체육대회"
- 워크숍/임직원/직원/기업/사내/팀빌딩/세미나 → "기업행사"
- 축제/페스티벌/공연/콘서트 → "축제"
- 컨퍼런스/포럼/컨벤션/심포지엄 → "컨퍼런스"
- 웨딩/결혼식/돌잔치 → "웨딩"
- 학교/학생/졸업/입학/학예회 → "학교행사"
- 런칭/쇼케이스/신제품 → "기업행사"
- 기타 → "일반"

eventName 추론: 클라이언트명+행사유형 조합. 예) "삼성전자 체육대회", "스타트업 데모데이"
requirements: 특이사항, 요청 종목, 테마, 메모 등을 자유 형식으로 기재.`

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromSession()
    if (!userId) return errorResponse(401, 'UNAUTHORIZED', '로그인이 필요합니다.')

    const env = getEnv()
    if (!env.ANTHROPIC_API_KEY) return errorResponse(500, 'NO_KEY', 'AI 키가 설정되지 않았습니다.')

    const body = await req.json() as {
      message: string
      history?: ConversationMessage[]
      currentParams?: Partial<ChatIntentParams>
    }

    const { message, history = [], currentParams } = body
    if (!message?.trim()) return errorResponse(400, 'BAD_REQUEST', '메시지를 입력해 주세요.')

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

    const contextBlock = currentParams && Object.values(currentParams).some(Boolean)
      ? `\n현재 파악된 정보:\n${JSON.stringify(currentParams, null, 2)}\n`
      : ''

    const messages: Anthropic.MessageParam[] = [
      ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: `${contextBlock}사용자 메시지: "${message}"` },
    ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages,
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''

    let result: ChatIntentResult
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      result = JSON.parse(jsonMatch?.[0] ?? text) as ChatIntentResult
    } catch {
      result = { action: 'generate', params: buildFallbackParams(message) }
    }

    return okResponse(result)
  } catch (err) {
    console.error('[chat-intent]', err)
    return errorResponse(500, 'INTERNAL', '요청 처리 중 오류가 발생했습니다.')
  }
}

function buildFallbackParams(message: string): ChatIntentParams {
  return {
    eventName: message.slice(0, 40),
    clientName: '',
    eventType: '일반',
    venue: '',
    headcount: '',
    eventDate: '',
    eventDuration: '',
    budget: '',
    requirements: message,
    documentTarget: 'estimate',
  }
}

import Anthropic from '@anthropic-ai/sdk'
import { resolveAnthropicFinalModel } from '@/lib/ai/config'
import { parseAiJson } from '@/lib/ai/json-response'

const REPAIR_SYSTEM = `당신은 행사 문서 생성 파이프라인의 품질 보정기입니다.
입력으로 주어진 JSON과 검증 이슈 목록을 바탕으로, 이슈를 모두 해결한 완전한 JSON만 출력합니다.
반드시 한국어 문장을 유지하고, 마크다운·설명·코드펜스 없이 단일 JSON만 출력하세요.
원본의 필드 구조와 키 이름을 유지하고, 불필요한 키를 추가하지 마세요.`

export async function claudeRepairJsonText(params: {
  client: Anthropic
  userRepairPrompt: string
  maxTokens?: number
}): Promise<string> {
  const { client, userRepairPrompt, maxTokens = 8192 } = params
  const message = await client.messages.create({
    model: resolveAnthropicFinalModel(),
    max_tokens: maxTokens,
    system: REPAIR_SYSTEM,
    messages: [{ role: 'user', content: userRepairPrompt }],
  })
  const block = message.content[0]
  if (block.type !== 'text') throw new Error('AI 응답 형식 오류')
  return block.text
}

export function parseRepairedJson<T>(raw: string): T {
  return parseAiJson<T>(raw)
}

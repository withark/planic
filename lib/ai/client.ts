import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { getEnv } from '../env'

export type AIProvider = 'anthropic' | 'openai'

export interface CallLLMOptions {
  maxTokens?: number
  model?: string
}

export function getAIProvider(): AIProvider {
  const env = getEnv()
  const provider = env.AI_PROVIDER?.toLowerCase()
  if (provider === 'openai' || provider === 'anthropic') return provider
  if (env.OPENAI_API_KEY) return 'openai'
  return 'anthropic'
}

function getAnthropicClient(): Anthropic {
  const { ANTHROPIC_API_KEY: key } = getEnv()
  if (!key) {
    throw new Error(
      'ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local에 키를 넣거나 AI_PROVIDER=openai 와 OPENAI_API_KEY를 사용하세요.',
    )
  }
  return new Anthropic({ apiKey: key })
}

function getOpenAIClient(): OpenAI {
  const { OPENAI_API_KEY: key } = getEnv()
  if (!key) {
    throw new Error('OPENAI_API_KEY가 설정되지 않았습니다. .env.local에 키를 넣으세요.')
  }
  return new OpenAI({ apiKey: key })
}

export async function callLLM(prompt: string, opts: CallLLMOptions = {}): Promise<string> {
  const provider = getAIProvider()
  const maxTokens = opts.maxTokens ?? 4000

  if (provider === 'openai') {
    const client = getOpenAIClient()
    const { OPENAI_MODEL } = getEnv()
    const model = opts.model ?? OPENAI_MODEL ?? 'gpt-4o'
    const res = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = res.choices[0]?.message?.content
    if (text == null) throw new Error('OpenAI 응답이 비어 있습니다.')
    return text
  }

  const client = getAnthropicClient()
  const { ANTHROPIC_MODEL } = getEnv()
  const model = opts.model ?? ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'
  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  return message.content[0].type === 'text' ? message.content[0].text : ''
}


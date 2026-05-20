// lib/ai/brief-enricher.ts
//
// Stage 0 — 사용자 입력 강화(Brief Enrichment)
// -------------------------------------------------------------
// 사용자가 입력하는 행사 정보·요청사항은 보통 짧고 거칠다.
// 본 생성을 곧바로 돌리면 출력 품질이 입력 품질에 종속되므로,
// 본 생성 직전에 LLM을 1회 호출해 "좋은 문서가 나오도록" 입력을
// 다시 쓰는 단계(=Claude/OpenAI 프롬프트 강화 패턴)를 끼운다.
//
// - LLM이 실패하거나 환경변수가 막혀 있으면 graceful fallback.
// - 출력은 JSON 강제. 텍스트로 떨어지면 원본 input을 그대로 사용.
// - 결과는 GenerateInput.enrichedBrief에 부착되어 buildGeneratePrompt
//   안에서 별도 컨텍스트 블록으로 노출되며,
//   `briefGoal`·`briefNotes`·`requirements`가 비어 있으면 자동 보강된다.

import { getEffectiveEngineConfig } from './client'
import { callLLM } from './client'
import { readEnvBool } from '../env'
import type { GenerateInput } from './types'
import { logInfo, logError } from '../utils/logger'
import { sanitizeJsonLiteralControlChars } from './json-response'

export interface EnrichedBrief {
  /** 행사의 한 줄 요약(슬로건 톤 포함). */
  oneLiner: string
  /** 행사의 핵심 가치/의도 — 3~5문장으로 풀어쓴 목표. */
  enrichedGoal: string
  /** 참석자/타깃 분석 — 누가, 어떤 기대로 오는지. */
  audienceInsight: string
  /** 행사 컨셉 키워드 3~6개. */
  keyConcepts: string[]
  /** 운영상 반드시 포함해야 할 항목/장면 6~10개. */
  mustHaveDetails: string[]
  /** 흔히 빠뜨리지만 챙겨야 할 주의·리스크 항목 3~6개. */
  cautionPoints: string[]
  /** 작성 톤 가이드(예: 따뜻하지만 격식 있게). */
  toneGuide: string
  /** 문서 타깃에 특화된 추가 지시(예: 큐시트라면 큐 호출 어휘). */
  documentSpecificHints: string
  /** 원본 requirements를 행 단위로 풀어 쓴 텍스트 — 본 프롬프트가 직접 인용 가능. */
  expandedRequirements: string
  /** 강화에 사용된 모델·프로바이더 메타. */
  meta: {
    provider: string
    model: string
    latencyMs: number
    skipped?: boolean
    reason?: string
  }
}

const ENRICH_TIMEOUT_MS = 6_000
const ENRICH_MAX_TOKENS = 1_400

function clampLine(input: string | null | undefined, max = 280): string {
  const s = (input ?? '').toString().trim()
  if (!s) return ''
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

function clampArray(input: unknown, max = 8, perItem = 140): string[] {
  if (!Array.isArray(input)) return []
  const out: string[] = []
  for (const raw of input) {
    const s = clampLine(typeof raw === 'string' ? raw : String(raw ?? ''), perItem)
    if (s) out.push(s)
    if (out.length >= max) break
  }
  return out
}

function safeJsonParse(raw: string): Record<string, unknown> | null {
  const trimmed = (raw || '').trim()
  if (!trimmed) return null
  const candidates: string[] = []
  candidates.push(trimmed)
  // ```json ... ``` 블록 제거
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) candidates.push(fenced[1].trim())
  // 첫 { ~ 마지막 } 구간 추출
  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first >= 0 && last > first) candidates.push(trimmed.slice(first, last + 1))
  // 각 후보에 literal 제어문자 sanitize 버전도 추가
  const rawCandidates = [...candidates]
  for (const c of rawCandidates) {
    const s = sanitizeJsonLiteralControlChars(c)
    if (s !== c) candidates.push(s)
  }
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    } catch {
      // 다음 후보로
    }
  }
  return null
}

function pick(input: GenerateInput, target: NonNullable<GenerateInput['documentTarget']>): string {
  const labels: Record<typeof target, string> = {
    estimate: '견적서',
    program: '프로그램 제안서',
    timetable: '타임테이블',
    planning: '기획안',
    scenario: '시나리오',
    cuesheet: '큐시트',
    emceeScript: '사회자 멘트 원고',
  }
  return labels[target] ?? '문서'
}

function buildEnrichPrompt(input: GenerateInput): string {
  const target = input.documentTarget ?? 'estimate'
  const label = pick(input, target)
  const rawBrief = [
    input.briefGoal?.trim() ? `목표: ${input.briefGoal.trim()}` : '',
    input.briefNotes?.trim() ? `메모: ${input.briefNotes.trim()}` : '',
    input.requirements?.trim() ? `요청: ${input.requirements.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const eventInfo = [
    `행사명: ${input.eventName || '(미입력)'}`,
    `행사 유형: ${input.eventType || '(미입력)'}`,
    `의뢰처: ${input.clientName || '(미입력)'}`,
    `행사 일자: ${input.eventDate || '(미입력)'}`,
    `장소: ${input.venue || '(미입력)'}`,
    `예상 인원: ${input.headcount || '(미입력)'}`,
    `예산: ${input.budget || '(미입력)'}`,
    input.eventStartHHmm || input.eventEndHHmm
      ? `진행 시간: ${input.eventStartHHmm || ''}~${input.eventEndHHmm || ''}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  return `당신은 대한민국 행사·이벤트 업계의 수석 기획 컨설턴트입니다.
실무 담당자가 ${label}를 만들기 위해 입력한 짧은 정보를, 본 문서 생성용 "강화된 브리프"로 다시 정리합니다.
짧고 거친 입력만 보고 곧장 작성하면 결과 문서가 일반론적이 되기 쉬우므로, 사용자가 의도했을 법한
구체 의도를 합리적으로 추정하고 행사 유형/규모에 맞는 핵심 디테일을 미리 끌어올려 줍니다.

[규칙]
- JSON 객체만 출력. 설명·머리말·코드펜스 금지. { 로 시작 } 로 끝.
- 사용자가 명시한 사실(행사명·일정·장소·인원 등)은 절대 바꾸지 마세요. "추정해 채우기"는 의도/연출/주의점에만 적용합니다.
- 한국어로 작성. 추상 부사("원활하게", "효과적으로")만 나열하지 말고 실제 운영 동사·명사로 작성합니다.
- 사용자가 제공한 어휘(예: "비전탑", "VIP 라운지", "팀빌딩")는 가능한 한 그대로 인용해 추적 가능하게 남깁니다.
- 메모 안에 \`[보강 메모]\` 라벨이 붙은 줄은 사용자가 직전 결과를 보고 더 강조해 달라고 새로 추가한 우선 요청입니다. \`mustHaveDetails\`·\`expandedRequirements\`에 가장 먼저 반영하고, 어휘를 그대로 살려 주세요.

[출력 스키마]
{
  "oneLiner": "행사를 한 줄로 요약(슬로건 톤 허용)",
  "enrichedGoal": "행사의 핵심 가치·기대효과를 3~5문장으로 풀어쓴 텍스트",
  "audienceInsight": "참석자/타깃이 누구이고 어떤 기대를 갖고 오는지 2~3문장",
  "keyConcepts": ["컨셉 키워드 3~6개"],
  "mustHaveDetails": ["반드시 포함해야 할 항목/장면 6~10개"],
  "cautionPoints": ["흔히 빠뜨리지만 챙겨야 할 주의·리스크 3~6개"],
  "toneGuide": "작성 톤 한 문장",
  "documentSpecificHints": "${label} 특화 지시 2~4문장(어휘·구성·필수 섹션 환기)",
  "expandedRequirements": "사용자 요청을 행 단위로 풀어 쓴 텍스트(불릿·줄바꿈 허용, 본 문서가 직접 인용 가능한 수준)"
}

=== 행사 기본 정보 ===
${eventInfo}

=== 사용자 원문 입력 ===
${rawBrief || '(요청 사항 직접 입력 없음 — 행사 기본 정보만으로 합리적으로 보완해 주세요.)'}

위 정보를 바탕으로 강화된 브리프 JSON 한 개만 출력하세요.`
}

function shouldSkipEnrichment(input: GenerateInput): { skip: boolean; reason?: string } {
  if (!readEnvBool('AI_BRIEF_ENRICHMENT', true)) return { skip: true, reason: 'env_disabled' }
  if (input.cachedEngineConfig?.overlay && (input.cachedEngineConfig.overlay as { briefEnrichment?: boolean }).briefEnrichment === false) {
    return { skip: true, reason: 'admin_overlay_disabled' }
  }
  // 업체 원문 모드는 이미 원문이 매우 길고 직접 인용해야 하므로 별도 강화는 생략.
  if (input.generationMode === 'vendorBrief') return { skip: true, reason: 'vendor_brief_mode' }
  return { skip: false }
}

function applyEnrichedToInput(input: GenerateInput, enriched: EnrichedBrief): GenerateInput {
  const merged: GenerateInput = { ...input, enrichedBrief: enriched }

  // 사용자가 직접 적은 입력이 비어 있으면 강화 결과로 보강한다.
  if (!merged.briefGoal?.trim() && enriched.enrichedGoal) {
    merged.briefGoal = enriched.enrichedGoal
  }
  if (!merged.briefNotes?.trim() && enriched.mustHaveDetails.length) {
    merged.briefNotes = [
      `핵심 컨셉: ${enriched.keyConcepts.join(', ')}`.trim(),
      `필수 디테일:\n- ${enriched.mustHaveDetails.join('\n- ')}`,
      enriched.cautionPoints.length ? `주의 사항:\n- ${enriched.cautionPoints.join('\n- ')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')
  }
  if (!merged.requirements?.trim() && enriched.expandedRequirements) {
    merged.requirements = enriched.expandedRequirements
  }

  return merged
}

export async function enrichGenerateInput(input: GenerateInput): Promise<{
  input: GenerateInput
  enriched: EnrichedBrief | null
}> {
  const skip = shouldSkipEnrichment(input)
  if (skip.skip) {
    return {
      input,
      enriched: null,
    }
  }

  const engine = input.cachedEngineConfig ?? (await getEffectiveEngineConfig().catch(() => null))
  if (!engine) {
    return { input, enriched: null }
  }

  input.pipelineEmit?.({ stage: 'enrich', label: '입력을 좋은 프롬프트로 강화하는 중' })

  const t0 = Date.now()
  const prompt = buildEnrichPrompt(input)
  let raw = ''
  try {
    raw = await callLLM(prompt, {
      maxTokens: ENRICH_MAX_TOKENS,
      timeoutMs: ENRICH_TIMEOUT_MS,
      engine,
      pipelineStage: 'brief_enrich',
      systemPrompt:
        '당신은 행사 기획자의 짧은 메모를 본 문서 작성 직전 단계에서 다시 정리하는 컨설턴트입니다. JSON만 출력하세요.',
    })
  } catch (e) {
    logError('ai.briefEnrich.failed', e)
    return { input, enriched: null }
  }

  const parsed = safeJsonParse(raw)
  if (!parsed) {
    logInfo('ai.briefEnrich.parseFail', { rawHead: raw.slice(0, 200) })
    return { input, enriched: null }
  }

  const enriched: EnrichedBrief = {
    oneLiner: clampLine(parsed.oneLiner as string, 200),
    enrichedGoal: clampLine(parsed.enrichedGoal as string, 800),
    audienceInsight: clampLine(parsed.audienceInsight as string, 500),
    keyConcepts: clampArray(parsed.keyConcepts, 6, 50),
    mustHaveDetails: clampArray(parsed.mustHaveDetails, 10, 140),
    cautionPoints: clampArray(parsed.cautionPoints, 6, 140),
    toneGuide: clampLine(parsed.toneGuide as string, 200),
    documentSpecificHints: clampLine(parsed.documentSpecificHints as string, 600),
    expandedRequirements: clampLine(parsed.expandedRequirements as string, 1800),
    meta: {
      provider: engine.provider,
      model: engine.model,
      latencyMs: Date.now() - t0,
    },
  }

  // 빈 결과면 무의미 — fallback 처리
  if (
    !enriched.enrichedGoal &&
    !enriched.mustHaveDetails.length &&
    !enriched.expandedRequirements
  ) {
    return { input, enriched: null }
  }

  logInfo('ai.briefEnrich.ok', {
    provider: enriched.meta.provider,
    model: enriched.meta.model,
    latencyMs: enriched.meta.latencyMs,
    mustHave: enriched.mustHaveDetails.length,
    cautions: enriched.cautionPoints.length,
    documentTarget: input.documentTarget ?? 'estimate',
  })

  // 사용자 UI에 노출할 강화 요약을 NDJSON 스트림으로 즉시 흘려보낸다.
  // (성공·실패 모두 graceful, 본 파이프라인 영향 없음)
  try {
    input.pipelineEmit?.({
      stage: 'enrich-done',
      label: 'AI가 입력을 정리했어요',
      details: {
        kind: 'briefEnrich',
        oneLiner: enriched.oneLiner,
        toneGuide: enriched.toneGuide,
        keyConcepts: enriched.keyConcepts,
        mustHaveDetails: enriched.mustHaveDetails,
        cautionPoints: enriched.cautionPoints,
        documentSpecificHints: enriched.documentSpecificHints,
        meta: enriched.meta,
      },
    })
  } catch {
    // ignore — stream가 닫혀 있어도 본 생성은 계속
  }

  return {
    input: applyEnrichedToInput(input, enriched),
    enriched,
  }
}

export function buildEnrichedBriefPromptBlock(enriched: EnrichedBrief | undefined | null): string {
  if (!enriched) return ''
  const parts: string[] = ['=== 강화된 브리프(Stage 0 · 사용자 입력 자동 정리) ===']
  if (enriched.oneLiner) parts.push(`한 줄 요약: ${enriched.oneLiner}`)
  if (enriched.enrichedGoal) parts.push(`핵심 목표·기대효과: ${enriched.enrichedGoal}`)
  if (enriched.audienceInsight) parts.push(`참석자/타깃 분석: ${enriched.audienceInsight}`)
  if (enriched.toneGuide) parts.push(`작성 톤: ${enriched.toneGuide}`)
  if (enriched.keyConcepts.length) parts.push(`컨셉 키워드: ${enriched.keyConcepts.join(', ')}`)
  if (enriched.mustHaveDetails.length) {
    parts.push(`필수 디테일(반드시 본문에 반영):\n- ${enriched.mustHaveDetails.join('\n- ')}`)
  }
  if (enriched.cautionPoints.length) {
    parts.push(`주의·리스크(놓치면 안 되는 운영 포인트):\n- ${enriched.cautionPoints.join('\n- ')}`)
  }
  if (enriched.documentSpecificHints) {
    parts.push(`문서 타깃 특화 지시: ${enriched.documentSpecificHints}`)
  }
  if (enriched.expandedRequirements) {
    parts.push(`사용자 요청 풀어쓰기:\n${enriched.expandedRequirements}`)
  }
  parts.push(
    '- 위 강화 브리프의 어휘/필수 디테일/주의 사항을 본문의 서로 다른 섹션과 행에 분산 반영하세요.',
    '- 사용자가 직접 적은 원문이 있으면 그 표현을 우선 인용하고, 강화 브리프는 보완 자료로 사용하세요.',
  )
  return `\n${parts.join('\n')}\n`
}

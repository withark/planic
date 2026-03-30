import type { QuoteDoc } from '@/lib/types'
import { insertGeneratedDoc } from '@/lib/db/generated-docs-db'
import { insertGenerationRun } from '@/lib/db/generation-runs-db'

/** 최종 문서 + 생성 메타를 DB에 맡기는 공통 형태(인터페이스). */
export type PersistGenerationPayload = {
  userId: string
  quoteId: string
  docType: string
  doc: QuoteDoc
  generationMeta?: Record<string, unknown>
}

export async function persistFinalDocumentRow(input: {
  userId: string
  id: string
  docType: string
  doc: QuoteDoc
}): Promise<void> {
  await insertGeneratedDoc({
    userId: input.userId,
    id: input.id,
    docType: input.docType as any,
    doc: input.doc,
  }).catch(() => {})
}

export async function persistGenerationRunRow(
  input: Parameters<typeof insertGenerationRun>[0],
): Promise<string> {
  return insertGenerationRun(input)
}

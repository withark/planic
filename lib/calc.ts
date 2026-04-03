import type { QuoteDoc, QuoteLineItem } from './types'
import { isExcludedSupplyLineItem } from '@/lib/quote/supply-line-filter'

/** 견적 품목 단가를 천 원 단위로 반올림(원). 음수·비유효는 0으로. */
export function snapUnitPriceToThousandWon(unitPrice: number): number {
  const x = Math.max(0, Math.round(Number(unitPrice) || 0))
  return Math.round(x / 1000) * 1000
}

/** 저장·표시·합계용: 스냅된 단가 기준 행 금액 */
export function effectiveLineTotalWon(it: Pick<QuoteLineItem, 'qty' | 'unitPrice'>): number {
  const qRaw = Math.round(Number(it.qty || 1))
  const q = Number.isFinite(qRaw) && qRaw > 0 ? qRaw : 1
  return Math.round(q * snapUnitPriceToThousandWon(it.unitPrice ?? 0))
}

/** 문서 내 모든 품목의 unitPrice·total을 천 원 단가 규칙에 맞게 맞춤(제자리 수정). */
export function normalizeQuoteUnitPricesToThousand(doc: QuoteDoc): void {
  ;(doc.quoteItems || []).forEach((cat) =>
    (cat.items || []).forEach((it) => {
      it.unitPrice = snapUnitPriceToThousandWon(it.unitPrice ?? 0)
      it.total = effectiveLineTotalWon(it)
    }),
  )
}

export interface QuoteTotals {
  sub: number
  exp: number
  prof: number
  vat: number
  cut: number
  grand: number
}

export function calcTotals(doc: QuoteDoc): QuoteTotals {
  let sub = 0
  ;(doc.quoteItems || []).forEach(cat =>
    (cat.items || []).forEach(it => {
      it.total = effectiveLineTotalWon(it)
      if (!isExcludedSupplyLineItem(it)) sub += it.total
    })
  )
  const exp  = Math.round(sub * (doc.expenseRate || 0) / 100)
  const prof = Math.round((sub + exp) * (doc.profitRate || 0) / 100)
  const vat  = Math.round((sub + exp + prof) * 0.1)
  const pre = sub + exp + prof + vat
  const docCut = Math.round(doc.cutAmount || 0)
  const net = pre - docCut
  // 총액(VAT포함)은 항상 천 원 단위(…000원)로 맞춤(내림). 엑셀 절사 행과 동일 규칙.
  const grand =
    net >= 0 ? Math.floor(net / 1000) * 1000 : Math.ceil(net / 1000) * 1000
  const cut = pre - grand
  return { sub, exp, prof, vat, cut, grand }
}

export function fmtKRW(n: number): string {
  const x = Number(n)
  if (!Number.isFinite(x)) return '0'
  return Math.round(x).toLocaleString('ko-KR')
}

export function uid(): string {
  // 브라우저/서버 어디서든 동작하는 UUID 생성
  const c = globalThis.crypto as { randomUUID?: () => string } | undefined
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/** 견적일 문자열(한국어) → 파일명용 YYYYMMDD (8자) */
export function getQuoteDateForFilename(quoteDate: string): string {
  const digits = (quoteDate || '').replace(/\D/g, '')
  if (digits.length >= 8) return digits.slice(0, 8)
  if (digits.length === 7) {
    const y = digits.slice(0, 4)
    const m = digits.slice(4, 5).padStart(2, '0')
    const d = digits.slice(5, 7)
    return `${y}${m}${d}`
  }
  if (digits.length === 6) return `${digits.slice(0, 6)}01`
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

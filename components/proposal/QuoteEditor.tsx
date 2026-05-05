'use client'
import { useState, useCallback } from 'react'
import type { QuoteData, QuoteLineItem } from '@/lib/types/doc-content'

const UNITS = ['인', '식', '개', '팀', '일', '회', '식(VAT별도)']

function numFmt(n: number): string {
  return n > 0 ? n.toLocaleString('ko-KR') : ''
}

function parseNum(s: string): number {
  return parseInt(s.replace(/[^\d]/g, ''), 10) || 0
}

interface Props {
  value: QuoteData
  onChange: (data: QuoteData) => void
}

const DEFAULT_ITEM: QuoteLineItem = { name: '', unitPrice: 0, quantity: 1, unit: '식', subItems: [] }

export default function QuoteEditor({ value, onChange }: Props) {
  const update = useCallback(
    (patch: Partial<QuoteData>) => onChange({ ...value, ...patch }),
    [value, onChange],
  )

  // ── 항목 수정 헬퍼 ──────────────────────────────────────
  const updateItem = (idx: number, patch: Partial<QuoteLineItem>, optional = false) => {
    const key = optional ? 'optionalItems' : 'items'
    const arr = [...(optional ? (value.optionalItems ?? []) : value.items)]
    arr[idx] = { ...arr[idx], ...patch }
    update({ [key]: arr })
  }
  const addItem    = (optional = false) => {
    const key = optional ? 'optionalItems' : 'items'
    const arr = [...(optional ? (value.optionalItems ?? []) : value.items), { ...DEFAULT_ITEM }]
    update({ [key]: arr })
  }
  const removeItem = (idx: number, optional = false) => {
    const key = optional ? 'optionalItems' : 'items'
    const arr = (optional ? (value.optionalItems ?? []) : value.items).filter((_, i) => i !== idx)
    update({ [key]: arr })
  }

  // ── 합계 계산 ──────────────────────────────────────────
  const subtotal   = value.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0)
  const expense    = Math.round(subtotal * (value.expenseRate / 100))
  const subtotal2  = subtotal + expense
  const profit     = value.profitAmount
  const supplyAmt  = subtotal2 + profit
  const vat        = value.includeVat ? Math.round(supplyAmt * 0.1) : 0
  const total      = supplyAmt + vat
  const optTotal   = (value.optionalItems ?? []).reduce((s, it) => s + it.unitPrice * it.quantity, 0)

  return (
    <div className="space-y-5">
      {/* 업체 정보 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { label: '업체명', key: 'companyName', placeholder: '(주)위드아크' },
          { label: '대표자', key: 'representative', placeholder: '홍길동 대표' },
          { label: '연락처', key: 'contact', placeholder: '010-0000-0000' },
        ].map(({ label, key, placeholder }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">{label}</label>
            <input
              value={(value as unknown as Record<string, string>)[key] ?? ''}
              onChange={(e) => update({ [key]: e.target.value })}
              placeholder={placeholder}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            />
          </div>
        ))}
      </div>

      {/* 주요 항목 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">견적 항목</span>
          <button
            type="button"
            onClick={() => addItem(false)}
            className="rounded-lg bg-primary-600 px-3 py-1 text-xs font-semibold text-white hover:bg-primary-700"
          >
            + 항목 추가
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="px-3 py-2 text-left font-semibold text-xs w-[34%]">항목명</th>
                <th className="px-3 py-2 text-right font-semibold text-xs w-[20%]">단가(원)</th>
                <th className="px-3 py-2 text-center font-semibold text-xs w-[10%]">수량</th>
                <th className="px-3 py-2 text-center font-semibold text-xs w-[10%]">단위</th>
                <th className="px-3 py-2 text-right font-semibold text-xs w-[18%]">금액(원)</th>
                <th className="px-2 py-2 w-[8%]" />
              </tr>
            </thead>
            <tbody>
              {value.items.map((item, i) => (
                <>
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-2 py-1.5">
                      <input
                        value={item.name}
                        onChange={(e) => updateItem(i, { name: e.target.value })}
                        placeholder="예) 사회자(MC)"
                        className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-300 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={item.unitPrice > 0 ? numFmt(item.unitPrice) : ''}
                        onChange={(e) => updateItem(i, { unitPrice: parseNum(e.target.value) })}
                        placeholder="0"
                        className="w-full bg-transparent text-right text-sm text-slate-800 placeholder-slate-300 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(i, { quantity: parseInt(e.target.value) || 1 })}
                        className="w-full bg-transparent text-center text-sm text-slate-800 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={item.unit}
                        onChange={(e) => updateItem(i, { unit: e.target.value })}
                        className="w-full bg-transparent text-center text-sm text-slate-800 focus:outline-none"
                      >
                        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 text-right text-sm font-medium text-slate-800">
                      {numFmt(item.unitPrice * item.quantity)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="text-slate-300 hover:text-red-400 text-base leading-none"
                      >×</button>
                    </td>
                  </tr>
                  {/* 세부항목 (포함) */}
                  <tr key={`sub-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td colSpan={6} className="px-3 pb-2">
                      <textarea
                        value={(item.subItems ?? []).join('\n')}
                        onChange={(e) =>
                          updateItem(i, {
                            subItems: e.target.value.split('\n').filter(Boolean),
                          })
                        }
                        placeholder="세부항목 (줄바꿈으로 구분, 예: · 무선마이크 2EA, · 앰프/스피커)"
                        rows={1}
                        className="w-full resize-none rounded border border-slate-100 bg-slate-50 px-2 py-1 text-xs text-slate-500 placeholder-slate-300 focus:outline-none focus:border-slate-200"
                      />
                    </td>
                  </tr>
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 정산 옵션 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">제경비율 (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={value.expenseRate}
            onChange={(e) => update({ expenseRate: parseFloat(e.target.value) || 0 })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">기업이윤 (원)</label>
          <input
            value={profit > 0 ? numFmt(profit) : ''}
            onChange={(e) => update({ profitAmount: parseNum(e.target.value) })}
            placeholder="0"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={value.includeVat}
              onChange={(e) => update({ includeVat: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-primary-600"
            />
            <span className="text-sm text-slate-700">VAT(10%) 포함</span>
          </label>
        </div>
      </div>

      {/* 합계 미리보기 */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1 text-sm">
        <Row label="소계" value={subtotal} />
        <Row label={`제경비 (${value.expenseRate}%)`} value={expense} />
        <Row label="소계" value={subtotal2} />
        <Row label="기업이윤" value={profit} />
        <Row label="공급가액" value={supplyAmt} bold />
        {value.includeVat && <Row label="부가세 VAT (10%)" value={vat} />}
        <div className="border-t border-slate-200 pt-1">
          <Row label={value.includeVat ? '합계 (VAT 포함)' : '합계'} value={total} bold large />
        </div>
      </div>

      {/* 선택 항목 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">선택 항목 (별도)</span>
          <button
            type="button"
            onClick={() => addItem(true)}
            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            + 선택항목 추가
          </button>
        </div>

        {(value.optionalItems ?? []).length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-600 text-white">
                  <th className="px-3 py-2 text-left font-semibold text-xs w-[36%]">항목명</th>
                  <th className="px-3 py-2 text-right font-semibold text-xs w-[22%]">단가(원)</th>
                  <th className="px-3 py-2 text-center font-semibold text-xs w-[10%]">수량</th>
                  <th className="px-3 py-2 text-center font-semibold text-xs w-[10%]">단위</th>
                  <th className="px-3 py-2 text-right font-semibold text-xs w-[14%]">금액(원)</th>
                  <th className="px-2 py-2 w-[8%]" />
                </tr>
              </thead>
              <tbody>
                {(value.optionalItems ?? []).map((item, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-2 py-2">
                      <input
                        value={item.name}
                        onChange={(e) => updateItem(i, { name: e.target.value }, true)}
                        placeholder="예) 스케치 영상 제작"
                        className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-300 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        value={item.unitPrice > 0 ? numFmt(item.unitPrice) : ''}
                        onChange={(e) => updateItem(i, { unitPrice: parseNum(e.target.value) }, true)}
                        placeholder="0"
                        className="w-full bg-transparent text-right text-sm text-slate-800 placeholder-slate-300 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(i, { quantity: parseInt(e.target.value) || 1 }, true)}
                        className="w-full bg-transparent text-center text-sm text-slate-800 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={item.unit}
                        onChange={(e) => updateItem(i, { unit: e.target.value }, true)}
                        className="w-full bg-transparent text-center text-sm text-slate-800 focus:outline-none"
                      >
                        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2 text-right text-sm font-medium text-slate-800">
                      {numFmt(item.unitPrice * item.quantity)}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button type="button" onClick={() => removeItem(i, true)} className="text-slate-300 hover:text-red-400">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {optTotal > 0 && (
          <p className="mt-2 text-right text-xs text-slate-500">
            선택항목 합계: <span className="font-semibold text-slate-700">{numFmt(optTotal)}원</span>
          </p>
        )}
      </div>

      <p className="text-xs text-slate-400">
        ※ 견적서는 DOCX 생성 시 제안서 마지막 섹션에 자동으로 포함됩니다.
      </p>
    </div>
  )
}

function Row({
  label, value, bold, large,
}: { label: string; value: number; bold?: boolean; large?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-slate-600 ${bold ? 'font-semibold' : ''} ${large ? 'text-base' : ''}`}>
        {label}
      </span>
      <span className={`tabular-nums ${bold ? 'font-bold text-slate-900' : 'text-slate-700'} ${large ? 'text-base' : ''}`}>
        {value > 0 ? `${value.toLocaleString('ko-KR')}원` : '–'}
      </span>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { GNB } from '@/components/GNB'
import { Button, Toast } from '@/components/ui'
import type { PriceCategory } from '@/lib/types'
import { uid } from '@/lib/calc'
import clsx from 'clsx'
import { apiFetch } from '@/lib/api/client'
import { toUserMessage } from '@/lib/errors/toUserMessage'
import type { PlanType } from '@/lib/plans'
import { isFeatureAllowedForPlan } from '@/lib/plan-access'
import { PlanLockedNotice } from '@/components/plan/PlanLockedNotice'

type SheetRow = {
  id: string
  category: string
  name: string
  spec: string
  unit: string
  price: number
  note: string
}

function createEmptyRow(): SheetRow {
  return {
    id: uid(),
    category: '',
    name: '',
    spec: '',
    unit: '식',
    price: 0,
    note: '',
  }
}

function categoriesToRows(categories: PriceCategory[]): SheetRow[] {
  const rows = (categories || []).flatMap((category) =>
    (category.items || []).map((item) => ({
      id: item.id || uid(),
      category: category.name || '',
      name: item.name || '',
      spec: item.spec || '',
      unit: item.unit || '식',
      price: Number.isFinite(item.price) ? Math.max(0, Math.round(item.price)) : 0,
      note: item.note || '',
    })),
  )
  return rows.length > 0 ? rows : [createEmptyRow()]
}

function rowsToCategories(rows: SheetRow[]): PriceCategory[] {
  const buckets = new Map<string, PriceCategory>()
  const order: string[] = []

  for (const row of rows) {
    const name = row.name.trim()
    const categoryName = row.category.trim() || '기타'
    const hasMeaningful =
      name.length > 0 ||
      row.spec.trim().length > 0 ||
      row.note.trim().length > 0 ||
      row.price > 0

    if (!hasMeaningful) continue

    let category = buckets.get(categoryName)
    if (!category) {
      category = { id: uid(), name: categoryName, items: [] }
      buckets.set(categoryName, category)
      order.push(categoryName)
    }

    category.items.push({
      id: row.id || uid(),
      name: name || '항목',
      spec: row.spec.trim(),
      unit: row.unit.trim() || '식',
      price: Number.isFinite(row.price) ? Math.max(0, Math.round(row.price)) : 0,
      note: row.note.trim(),
      types: [],
    })
  }

  return order
    .map((key) => buckets.get(key))
    .filter((v): v is PriceCategory => !!v && (v.items || []).length > 0)
}

export default function PricesPage() {
  const [plan, setPlan] = useState<PlanType>('FREE')
  const [rows, setRows] = useState<SheetRow[]>([createEmptyRow()])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [toast, setToast] = useState('')
  const [lastSavedAt, setLastSavedAt] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    apiFetch<{ subscription: { planType: PlanType } }>('/api/me')
      .then((m) => setPlan(m.subscription.planType))
      .catch(() => setPlan('FREE'))
  }, [])

  const isLocked = !isFeatureAllowedForPlan(plan, 'pricingTable')

  useEffect(() => {
    if (isLocked) {
      setRows([createEmptyRow()])
      setDirty(false)
      return
    }
    apiFetch<PriceCategory[]>('/api/prices')
      .then((data) => {
        setRows(categoriesToRows(data || []))
        setDirty(false)
      })
      .catch(() => {
        setRows([createEmptyRow()])
      })
  }, [isLocked])

  const showToast = useCallback((m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 2500)
  }, [])

  const persistRows = useCallback(async (nextRows: SheetRow[], opts?: { silent?: boolean }) => {
    if (isLocked) return
    setSaving(true)
    try {
      const payload = rowsToCategories(nextRows)
      await apiFetch<null>('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setDirty(false)
      setLastSavedAt(new Date().toISOString())
      if (!opts?.silent) showToast('단가표 저장 완료!')
    } catch (e) {
      showToast(toUserMessage(e, '단가표 저장에 실패했습니다.'))
    } finally {
      setSaving(false)
    }
  }, [isLocked, showToast])

  useEffect(() => {
    if (isLocked || !dirty) return
    const timer = window.setTimeout(() => {
      void persistRows(rows, { silent: true })
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [dirty, isLocked, rows, persistRows])

  function updateRow(index: number, key: keyof SheetRow, value: string | number) {
    setRows((prev) => {
      const next = structuredClone(prev)
      if (!next[index]) return prev
      ;(next[index] as any)[key] = value
      return next
    })
    setDirty(true)
  }

  function addRow() {
    setRows((prev) => [...prev, createEmptyRow()])
    setDirty(true)
  }

  function deleteRow(index: number) {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return next.length > 0 ? next : [createEmptyRow()]
    })
    setDirty(true)
  }

  const openImportPicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const importEstimate = useCallback(async (file: File) => {
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const result = await apiFetch<{ prices: PriceCategory[]; importedCategories: number; importedItems: number }>(
        '/api/prices/import-estimate',
        { method: 'POST', body: fd as any },
      )
      const nextRows = categoriesToRows(result.prices || [])
      setRows(nextRows)
      setDirty(false)
      setLastSavedAt(new Date().toISOString())
      showToast(`업로드 반영 완료 (${result.importedCategories}개 카테고리, ${result.importedItems}개 항목)`)
    } catch (e) {
      showToast(toUserMessage(e, '견적서 단가표 불러오기에 실패했습니다.'))
    } finally {
      setImporting(false)
    }
  }, [showToast])

  const saveStateText = saving
    ? '자동 저장 중...'
    : dirty
      ? '변경사항 있음'
      : lastSavedAt
        ? `자동 저장됨 (${new Date(lastSavedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})`
        : '저장됨'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      <GNB />
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <header className="flex items-center justify-between px-6 h-14 border-b border-gray-100 flex-shrink-0 bg-white">
          <div>
            <h1 className="text-base font-semibold text-gray-900">단가표</h1>
            <p className="text-xs text-gray-500 mt-0.5">엑셀형 표에서 바로 수정하고, .xlsx 업로드로 한 번에 반영할 수 있습니다.</p>
          </div>
          <div className="flex items-center gap-3">
            {!isLocked ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void importEstimate(file)
                    e.target.value = ''
                  }}
                />
                <Button size="sm" variant="secondary" onClick={openImportPicker} disabled={importing}>
                  {importing ? '업로드 반영 중...' : '업로드(.xlsx)'}
                </Button>
              </>
            ) : (
              <span className="text-xs font-semibold text-amber-700">베이직 플랜에서 사용 가능</span>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLocked ? (
            <PlanLockedNotice
              title="단가표는 베이직부터 사용할 수 있어요."
              message="무료 플랜에서는 문서 생성 핵심 흐름을 먼저 경험할 수 있습니다. 베이직 업그레이드 시 단가표 저장/재사용이 열립니다."
              ctaLabel="베이직으로 업그레이드"
            />
          ) : null}

          {!isLocked ? (
            <>
              <div className="rounded-lg border border-primary-100 bg-primary-50/50 px-4 py-2.5 text-xs text-gray-600">
                <span className="font-medium text-primary-700">가이드</span> 입력값은 자동 저장됩니다. 직접 입력하거나 기존 견적서(.xlsx)를 업로드해 반영하세요.
              </div>
              <div className={clsx('text-xs font-medium px-1', dirty ? 'text-amber-600' : 'text-gray-500')}>
                {saveStateText}
              </div>

              <section className="rounded-xl border border-gray-100 bg-white shadow-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[16%]">카테고리</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[24%]">항목명</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[18%]">규격/내용</th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-[8%]">단위</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-[14%]">단가(원)</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[16%]">비고</th>
                        <th className="w-12" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/60 group transition-colors">
                          <td className="px-3 py-2">
                            <input
                              value={row.category}
                              onChange={(e) => updateRow(index, 'category', e.target.value)}
                              placeholder="예) 인건비"
                              className="w-full bg-transparent py-1.5 outline-none border-b border-transparent focus:border-gray-300"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.name}
                              onChange={(e) => updateRow(index, 'name', e.target.value)}
                              placeholder="예) 총괄 PM"
                              className="w-full bg-transparent py-1.5 outline-none border-b border-transparent focus:border-gray-300"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.spec}
                              onChange={(e) => updateRow(index, 'spec', e.target.value)}
                              placeholder="예) 현장 운영"
                              className="w-full bg-transparent py-1.5 outline-none border-b border-transparent focus:border-gray-300"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              value={row.unit}
                              onChange={(e) => updateRow(index, 'unit', e.target.value)}
                              className="w-14 bg-transparent py-1.5 text-center outline-none border-b border-transparent focus:border-gray-300"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step={1000}
                              value={row.price || ''}
                              onChange={(e) => updateRow(index, 'price', Math.max(0, Number(e.target.value || 0)))}
                              className="w-full bg-transparent py-1.5 text-right outline-none border-b border-transparent focus:border-gray-300 tabular-nums"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.note}
                              onChange={(e) => updateRow(index, 'note', e.target.value)}
                              placeholder="비고"
                              className="w-full bg-transparent py-1.5 outline-none border-b border-transparent focus:border-gray-300"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => deleteRow(index)}
                            >
                              삭제
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={addRow}
                  className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-t border-gray-100 transition-colors"
                >
                  + 행 추가
                </button>
              </section>
            </>
          ) : null}
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}

'use client'
import { useEffect, useState, useCallback } from 'react'
import { GNB, GNB_MOBILE_MAIN_COLUMN_PADDING } from '@/components/GNB'
import { Button, Toast } from '@/components/ui'
import { ErrorState, LoadingState } from '@/components/ui/AsyncState'
import type { HistoryRecord } from '@/lib/types'
import { fmtKRW } from '@/lib/calc'
import { apiFetch } from '@/lib/api/client'
import { toUserMessage } from '@/lib/errors/toUserMessage'

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const showToast = useCallback((m: string) => {
    setToast(m); setTimeout(() => setToast(''), 2500)
  }, [])

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const d = await apiFetch<HistoryRecord[]>('/api/history')
      setHistory([...d].reverse())
    } catch (e) {
      setHistory([])
      setFetchError(toUserMessage(e, '이력을 불러오지 못했습니다.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  async function delOne(id: string) {
    if (!confirm('삭제할까요?')) return
    try {
      await apiFetch<unknown>(`/api/history/${id}`, { method: 'DELETE' })
      setHistory(h => h.filter(r => r.id !== id))
      showToast('삭제 완료')
    } catch (e) {
      showToast(toUserMessage(e, '삭제에 실패했습니다.'))
    }
  }

  async function clearAll() {
    if (!confirm('전체 이력을 삭제할까요?')) return
    try {
      await apiFetch<unknown>('/api/history', { method: 'DELETE' })
      setHistory([])
      showToast('전체 삭제 완료')
    } catch (e) {
      showToast(toUserMessage(e, '삭제에 실패했습니다.'))
    }
  }

  // 통계
  const total    = history.length
  const totalAmt = history.reduce((s, h) => s + (h.total || 0), 0)
  const avgAmt   = total ? Math.round(totalAmt / total) : 0
  const typeMap: Record<string, number> = {}
  history.forEach(h => { typeMap[h.type || '기타'] = (typeMap[h.type || '기타'] || 0) + 1 })
  const topType = Object.entries(typeMap).sort((a,b) => b[1]-a[1])[0]?.[0] || '—'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      <GNB />
      <div className={`flex-1 flex flex-col overflow-hidden ${GNB_MOBILE_MAIN_COLUMN_PADDING}`}>
        <header className="flex items-center justify-between px-6 h-14 border-b border-gray-100 bg-white/90 flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-gray-900">작업 이력</h1>
            <p className="text-xs text-gray-500 mt-0.5">생성한 견적서가 자동으로 기록됩니다</p>
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={clearAll}
            disabled={loading || !!fetchError || history.length === 0}
          >
            전체 삭제
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? <LoadingState label="이력을 불러오는 중…" /> : null}

          {!loading && fetchError ? (
            <ErrorState message={fetchError} onRetry={() => void loadHistory()} />
          ) : null}

          {!loading && !fetchError && total > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: '총 견적 건수', value: `${total}건` },
                { label: '누적 견적액',  value: `${fmtKRW(totalAmt)}원` },
                { label: '평균 견적액',  value: `${fmtKRW(avgAmt)}원` },
                { label: '최다 행사 종류', value: topType },
              ].map(s => (
                <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-card">
                  <p className="text-xs text-gray-500 mb-1.5">{s.label}</p>
                  <p className="text-lg font-semibold tabular-nums text-gray-900">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {!loading && !fetchError && history.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-64 rounded-2xl border-2 border-dashed border-primary-200 bg-white py-16">
              <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center mb-4">
                <span className="text-lg font-medium text-primary-600">이력</span>
              </div>
              <p className="text-sm font-medium text-gray-700">견적 이력이 없습니다</p>
              <p className="text-xs text-gray-500 mt-1">견적서를 생성하면 자동으로 기록됩니다</p>
            </div>
          ) : null}

          {!loading && !fetchError && history.length > 0 ? (
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id}
                  className="flex items-center justify-between gap-4 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-card hover:shadow-card-hover transition-shadow group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{h.eventName || '행사명 없음'}</p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                      <span>견적일: {h.quoteDate || '—'}</span>
                      <span>{h.clientName || '—'}</span>
                      <span>{h.eventDate || '—'}</span>
                      <span>{h.type || '—'}</span>
                      {h.duration && <span>{h.duration}</span>}
                      {h.headcount && <span>{h.headcount}</span>}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums flex-shrink-0">
                    {fmtKRW(h.total)}원
                  </div>
                  <Button size="sm" variant="danger"
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0"
                    onClick={() => delOne(h.id)}>
                    삭제
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  )
}

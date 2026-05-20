'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GNB } from '@/components/GNB'
import { PlanningForm, type PlanningFormValues } from '@/components/planning/PlanningForm'
import { PlanningStreamView } from '@/components/planning/PlanningStreamView'
import { apiFetch } from '@/lib/api/client'
import type { CompanySettings } from '@/lib/types'

type Status = 'idle' | 'streaming' | 'done' | 'error'

export default function PlanningGeneratorPage() {
  const router = useRouter()
  const [companyName, setCompanyName] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | undefined>()
  const abortRef = useRef<AbortController | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiFetch<{ settings: CompanySettings }>('/api/settings')
      .then(r => {
        if (r?.settings?.name) setCompanyName(r.settings.name)
      })
      .catch(() => {})
  }, [])

  const handleGenerate = useCallback(async (values: PlanningFormValues) => {
    // 이전 요청 취소
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setText('')
    setError(undefined)
    setStatus('streaming')

    // 스트리밍 시작하면 결과 영역으로 스크롤
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)

    try {
      const res = await fetch('/api/planning/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        const msg = (payload as { error?: string }).error ?? '생성에 실패했습니다.'
        if (res.status === 401) {
          router.replace('/auth')
          return
        }
        setError(msg)
        setStatus('error')
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        setError('스트림을 읽을 수 없습니다.')
        setStatus('error')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          let obj: { type: string; text?: string; message?: string }
          try {
            obj = JSON.parse(trimmed)
          } catch {
            continue
          }

          if (obj.type === 'delta' && obj.text) {
            setText(prev => prev + obj.text)
          } else if (obj.type === 'done') {
            setStatus('done')
          } else if (obj.type === 'error') {
            setError(obj.message ?? '생성 중 오류가 발생했습니다.')
            setStatus('error')
          }
        }
      }

      // 스트림이 done 이벤트 없이 끝난 경우 대비
      setStatus(prev => (prev === 'streaming' ? 'done' : prev))
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return
      setError(e instanceof Error ? e.message : '네트워크 오류가 발생했습니다.')
      setStatus('error')
    }
  }, [router])

  const handleReset = () => {
    abortRef.current?.abort()
    setText('')
    setError(undefined)
    setStatus('idle')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCopy = async () => {
    if (!text) return
    await navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GNB />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">기획 제안서</h1>
          <p className="text-sm text-gray-500">
            행사 정보를 입력하면 전문 기획 제안서를 실시간으로 생성합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
          {/* 왼쪽: 입력 폼 */}
          <div className="lg:sticky lg:top-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <PlanningForm
                onSubmit={handleGenerate}
                loading={status === 'streaming'}
                companyName={companyName}
              />

              {/* 재생성 / 복사 버튼 (결과 있을 때) */}
              {status !== 'idle' && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    초기화
                  </button>
                  {status === 'done' && (
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex-1 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      텍스트 복사
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 스트리밍 결과 */}
          <div ref={resultRef}>
            {status === 'idle' ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">
                  왼쪽에서 행사 정보를 입력하고<br />생성 버튼을 눌러주세요.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm min-h-[400px]">
                <PlanningStreamView text={text} status={status} error={error} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

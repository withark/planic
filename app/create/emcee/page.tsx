'use client'
import { useState, useCallback } from 'react'
import BaseInfoForm, { type BaseFormData } from '@/components/doc-creator/BaseInfoForm'
import { Textarea, Spinner } from '@/components/ui'
import { apiFetch } from '@/lib/api/client'
import { toUserMessage } from '@/lib/errors/toUserMessage'
import { exportEmceeDocx } from '@/lib/export/exportEmceeDocx'
import type { EmceeContent } from '@/lib/types/doc-content'

const MC_TONES = ['격식체', '친근체', '유머', '진중한'] as const

const STEPS = [
  '행사 흐름 파악 중...',
  '구간별 대본 작성 중...',
  '톤 & 스타일 반영 중...',
  '큐 사인 정리 중...',
  '대본 완성 중...',
]

export default function EmceePage() {
  const [baseData, setBaseData]         = useState<BaseFormData | null>(null)
  const [mcTone, setMcTone]             = useState<string>('격식체')
  const [restrictions, setRestrictions] = useState('')

  const [generating, setGenerating]   = useState(false)
  const [stepIdx, setStepIdx]         = useState(0)
  const [error, setError]             = useState('')
  const [content, setContent]         = useState<EmceeContent | null>(null)
  const [downloading, setDownloading] = useState(false)

  const handleGenerate = useCallback(async () => {
    if (!baseData?.eventName) { setError('행사명을 입력해 주세요.'); return }
    setError('')
    setContent(null)
    setGenerating(true)
    setStepIdx(0)

    const interval = setInterval(() => {
      setStepIdx((i) => (i + 1) % STEPS.length)
    }, 2600)

    try {
      const res = await apiFetch<{ content: EmceeContent }>('/api/generate-emcee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName:      baseData.eventName,
          eventDate:      baseData.eventDate,
          eventPlace:     baseData.venue,
          headcount:      baseData.headcount,
          eventType:      baseData.eventType,
          mcTone,
          eventStartTime: baseData.eventStartTime,
          eventEndTime:   baseData.eventEndTime,
          requirements:   baseData.requirements,
          restrictions,
        }),
      })
      setContent(res.content)
    } catch (e) {
      setError(toUserMessage(e, 'AI 생성에 실패했습니다.'))
    } finally {
      clearInterval(interval)
      setGenerating(false)
    }
  }, [baseData, mcTone, restrictions])

  const handleDocx = useCallback(async () => {
    if (!content) return
    setDownloading(true)
    try {
      await exportEmceeDocx(content)
    } catch (e) {
      setError(toUserMessage(e, 'DOCX 다운로드에 실패했습니다.'))
    } finally {
      setDownloading(false)
    }
  }, [content])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">사회자 멘트 생성</h1>
        <p className="mt-1 text-sm text-slate-500">
          행사 정보와 MC 스타일을 입력하면 AI가 현장에서 바로 읽을 수 있는 구간별 대본을 만들어 드립니다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* 좌: 입력 폼 */}
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <BaseInfoForm onChange={setBaseData} />
          <div className="border-t border-slate-100 pt-4 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">MC 톤 / 스타일</label>
              <div className="flex flex-wrap gap-2">
                {MC_TONES.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setMcTone(tone)}
                    className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                      mcTone === tone
                        ? 'border-purple-400 bg-purple-100 text-purple-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>
            <Textarea label="행사 특성 / 금지사항" value={restrictions} onChange={(e) => setRestrictions(e.target.value)} rows={2}
              placeholder="사용 금지 단어, 행사 분위기, 주의사항 등" />
          </div>
        </div>

        {/* 우: 패널 */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
            <h2 className="mb-3 text-sm font-semibold text-purple-900">AI 대본 생성</h2>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              {generating ? <Spinner label={STEPS[stepIdx]} /> : 'AI로 사회자 대본 생성'}
            </button>
            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          </div>

          {content && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                <p className="text-sm font-semibold text-green-900">생성 완료</p>
              </div>
              <button
                onClick={handleDocx}
                disabled={downloading}
                className="flex w-full items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <DownloadIcon />
                {downloading ? '생성 중...' : 'DOCX 다운로드'}
              </button>

              <div className="mt-4 space-y-1 text-xs text-slate-600">
                <p>• 톤: <span className="font-semibold">{content.tone}</span></p>
                <p>• 구간 {content.segments?.length ?? 0}개 대본 생성됨</p>
                {content.notes?.length ? <p>• 유의사항 {content.notes.length}개</p> : null}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-100 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">생성 포함 내용</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-500">
              <li>• 현장에서 바로 읽는 완성형 대본</li>
              <li>• 음향·조명·영상 큐 사인 포함</li>
              <li>• 선택한 톤 일관 적용</li>
              <li>• 관객 반응 유도 지시 포함</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}

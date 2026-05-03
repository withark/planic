'use client'
import { useState, useCallback } from 'react'
import BaseInfoForm, { type BaseFormData } from '@/components/doc-creator/BaseInfoForm'
import { Textarea, Spinner } from '@/components/ui'
import { apiGenerateStream } from '@/lib/api/client'
import { toUserMessage } from '@/lib/errors/toUserMessage'
import { createEmptyDoc } from '@/lib/doc-creator/createEmptyDoc'
import { exportEmceeDocx } from '@/lib/export/exportEmceeDocx'
import { exportToExcel } from '@/lib/exportExcel'
import type { QuoteDoc } from '@/lib/types'

const MC_TONES = ['격식체', '친근체', '유머', '진중한'] as const

function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let m = (eh * 60 + em) - (sh * 60 + sm)
  if (m < 0) m += 24 * 60
  return m
}

function durationStr(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return [h > 0 ? `${h}시간` : '', m > 0 ? `${m}분` : ''].filter(Boolean).join(' ') || '미정'
}

export default function EmceePage() {
  const [baseData, setBaseData] = useState<BaseFormData | null>(null)
  const [mcTone, setMcTone] = useState<string>('격식체')
  const [restrictions, setRestrictions] = useState('')

  const [generating, setGenerating] = useState(false)
  const [stageLog, setStageLog] = useState<string[]>([])
  const [error, setError] = useState('')
  const [doc, setDoc] = useState<QuoteDoc | null>(null)

  const handleGenerate = useCallback(async () => {
    if (!baseData?.eventName) {
      setError('행사명을 입력해 주세요.')
      return
    }
    setError('')
    setStageLog([])
    setGenerating(true)

    const minutes = minutesBetween(baseData.eventStartTime, baseData.eventEndTime)
    const duration = durationStr(minutes)
    const extraReq = [
      baseData.requirements,
      mcTone ? `MC 톤: ${mcTone}` : '',
      restrictions ? `주의사항: ${restrictions}` : '',
    ].filter(Boolean).join('\n')

    const emptyDoc = createEmptyDoc({
      eventName: baseData.eventName,
      clientName: baseData.clientName,
      eventDate: baseData.eventDate,
      eventDuration: duration,
      eventStartHHmm: baseData.eventStartTime,
      eventEndHHmm: baseData.eventEndTime,
      headcount: baseData.headcount,
      venue: baseData.venue,
      eventType: baseData.eventType,
      requirements: extraReq,
    })

    try {
      const result = await apiGenerateStream(
        {
          eventName: baseData.eventName,
          clientName: baseData.clientName,
          eventDate: baseData.eventDate,
          eventDuration: duration,
          eventStartHHmm: baseData.eventStartTime,
          eventEndHHmm: baseData.eventEndTime,
          headcount: baseData.headcount,
          venue: baseData.venue,
          eventType: baseData.eventType,
          requirements: extraReq,
          documentTarget: 'emceeScript',
          existingDoc: emptyDoc,
        },
        {
          onStage: ({ label }) => setStageLog((prev) => [...prev, label]),
        },
      )
      setDoc(result.doc)
    } catch (e) {
      setError(toUserMessage(e, 'AI 생성에 실패했습니다.'))
    } finally {
      setGenerating(false)
    }
  }, [baseData, mcTone, restrictions])

  const handleDocxDownload = useCallback(async () => {
    if (!doc) return
    try {
      await exportEmceeDocx(doc)
    } catch (e) {
      setError(toUserMessage(e, 'DOCX 다운로드에 실패했습니다.'))
    }
  }, [doc])

  const handleExcelDownload = useCallback(async () => {
    if (!doc) return
    try {
      await exportToExcel(doc, null, 'emceeScript')
    } catch (e) {
      setError(toUserMessage(e, 'Excel 다운로드에 실패했습니다.'))
    }
  }, [doc])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">사회자 멘트 생성</h1>
        <p className="mt-1 text-sm text-slate-500">행사 정보와 MC 스타일을 입력하면 AI가 구간별 대본을 만들어 드립니다.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* 좌측: 입력 폼 */}
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <BaseInfoForm onChange={setBaseData} />

          <div className="border-t border-slate-100 pt-4">
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">MC 톤/스타일</label>
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
              <Textarea
                label="행사 특성 / 금지사항"
                value={restrictions}
                onChange={(e) => setRestrictions(e.target.value)}
                rows={3}
                placeholder="사용 금지 단어, 행사 분위기, 주의사항 등"
              />
            </div>
          </div>
        </div>

        {/* 우측: 생성 패널 */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5">
            <h2 className="mb-3 text-sm font-semibold text-purple-900">AI 생성</h2>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              {generating ? 'AI 생성 중...' : 'AI로 사회자 멘트 생성'}
            </button>

            {generating && (
              <div className="mt-3 space-y-1">
                <Spinner label="생성 중입니다..." />
                {stageLog.slice(-3).map((s, i) => (
                  <p key={i} className="text-xs text-purple-700">{s}</p>
                ))}
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
            )}
          </div>

          {doc && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                <p className="text-sm font-semibold text-green-900">생성 완료</p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={handleDocxDownload}
                  className="flex w-full items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-green-50"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-blue-600" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  DOCX 다운로드
                </button>
                <button
                  onClick={handleExcelDownload}
                  className="flex w-full items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-green-50"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-green-600" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Excel 다운로드
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-100 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">생성 포함 내용</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-500">
              <li>• 구간별 사회자 대본</li>
              <li>• 큐 사인 및 진행 지침</li>
              <li>• MC 스타일 반영</li>
              <li>• DOCX / Excel 다운로드</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useState, useCallback, useRef } from 'react'
import BaseInfoForm, { type BaseFormData } from '@/components/doc-creator/BaseInfoForm'
import { Textarea, Spinner } from '@/components/ui'
import { apiGenerateStream } from '@/lib/api/client'
import { toUserMessage } from '@/lib/errors/toUserMessage'
import { createEmptyDoc } from '@/lib/doc-creator/createEmptyDoc'
import { exportProposalDocx } from '@/lib/export/exportProposalDocx'
import { exportToExcel } from '@/lib/exportExcel'
import type { QuoteDoc } from '@/lib/types'

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

export default function ProposalPage() {
  const [baseData, setBaseData] = useState<BaseFormData | null>(null)
  const [budget, setBudget] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [notes, setNotes] = useState('')

  const [generating, setGenerating] = useState(false)
  const [stageLog, setStageLog] = useState<string[]>([])
  const [error, setError] = useState('')
  const [doc, setDoc] = useState<QuoteDoc | null>(null)
  const [totals, setTotals] = useState<Record<string, number>>({})

  const abortRef = useRef<AbortController | null>(null)

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
      requirements: baseData.requirements,
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
          budget,
          requirements: baseData.requirements,
          documentTarget: 'estimate',
          existingDoc: emptyDoc,
        },
        {
          onStage: ({ label }) => setStageLog((prev) => [...prev, label]),
        },
      )
      setDoc(result.doc)
      setTotals(result.totals)
    } catch (e) {
      setError(toUserMessage(e, 'AI 생성에 실패했습니다.'))
    } finally {
      setGenerating(false)
    }
  }, [baseData, budget])

  const handleDocxDownload = useCallback(async () => {
    if (!doc) return
    try {
      await exportProposalDocx(doc, { budget, followUp, notes })
    } catch (e) {
      setError(toUserMessage(e, 'DOCX 다운로드에 실패했습니다.'))
    }
  }, [doc, budget, followUp, notes])

  const handleExcelDownload = useCallback(async () => {
    if (!doc) return
    try {
      await exportToExcel(doc, null, 'quote')
    } catch (e) {
      setError(toUserMessage(e, 'Excel 다운로드에 실패했습니다.'))
    }
  }, [doc])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">제안서 생성</h1>
        <p className="mt-1 text-sm text-slate-500">행사 정보를 입력하면 AI가 제안서·견적을 포함한 완성본을 만들어 드립니다.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* 좌측: 입력 폼 */}
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <BaseInfoForm onChange={setBaseData} />

          <div className="border-t border-slate-100 pt-4">
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">예산</label>
                <input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="예: 1,500만원"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100/70"
                />
              </div>
              <Textarea
                label="팔로업 계획"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                rows={3}
                placeholder="견적 제출 후 미팅 일정, 현장 답사, 계약 절차 등"
              />
              <Textarea
                label="특이사항"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="기타 유의사항, 고객 특별 요청, 제약 조건 등"
              />
            </div>
          </div>
        </div>

        {/* 우측: 생성 패널 */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <h2 className="mb-3 text-sm font-semibold text-blue-900">AI 생성</h2>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? 'AI 생성 중...' : 'AI로 제안서 생성'}
            </button>

            {generating && (
              <div className="mt-3 space-y-1">
                <Spinner label="생성 중입니다..." />
                {stageLog.slice(-3).map((s, i) => (
                  <p key={i} className="text-xs text-blue-700">{s}</p>
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
              <li>• 행사 개요 및 일정 구성</li>
              <li>• 프로그램 타임테이블</li>
              <li>• 항목별 견적 요약</li>
              <li>• 팔로업 및 진행 계획</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

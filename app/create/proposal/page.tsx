'use client'
import { useState, useCallback } from 'react'
import BaseInfoForm, { type BaseFormData } from '@/components/doc-creator/BaseInfoForm'
import { Textarea, Spinner } from '@/components/ui'
import { apiFetch } from '@/lib/api/client'
import { toUserMessage } from '@/lib/errors/toUserMessage'
import { exportProposalDocx } from '@/lib/export/exportProposalDocx'
import type { ProposalContent, QuoteData } from '@/lib/types/doc-content'
import QuoteEditor from '@/components/proposal/QuoteEditor'

const STEPS = [
  '행사 유형 분석 중...',
  '프로그램 구성 생성 중...',
  '운영 시스템 설계 중...',
  '타임테이블 작성 중...',
  '준비물 목록 정리 중...',
  '문서 마무리 중...',
]

const DEFAULT_QUOTE: QuoteData = {
  companyName:    '',
  representative: '',
  contact:        '',
  items:          [],
  optionalItems:  [],
  expenseRate:    10,
  profitAmount:   0,
  includeVat:     true,
}

export default function ProposalPage() {
  const [baseData, setBaseData] = useState<BaseFormData | null>(null)
  const [budget, setBudget]     = useState('')
  const [followUp, setFollowUp] = useState('')
  const [notes, setNotes]       = useState('')
  const [quoteData, setQuoteData] = useState<QuoteData>(DEFAULT_QUOTE)
  const [showQuote, setShowQuote] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [stepIdx, setStepIdx]       = useState(0)
  const [error, setError]           = useState('')
  const [content, setContent]       = useState<ProposalContent | null>(null)
  const [downloading, setDownloading] = useState(false)

  const handleGenerate = useCallback(async () => {
    if (!baseData?.eventName) { setError('행사명을 입력해 주세요.'); return }
    setError('')
    setContent(null)
    setGenerating(true)
    setStepIdx(0)

    const interval = setInterval(() => {
      setStepIdx((i) => (i + 1) % STEPS.length)
    }, 2800)

    try {
      const res = await apiFetch<{ content: ProposalContent }>('/api/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName:   baseData.clientName,
          contact:      '',
          eventName:    baseData.eventName,
          eventDate:    baseData.eventDate,
          eventPlace:   baseData.venue,
          headcount:    baseData.headcount,
          budget,
          eventType:    baseData.eventType,
          requirements: baseData.requirements,
          followUp,
          notes,
        }),
      })
      setContent(res.content)
    } catch (e) {
      setError(toUserMessage(e, 'AI 생성에 실패했습니다.'))
    } finally {
      clearInterval(interval)
      setGenerating(false)
    }
  }, [baseData, budget, followUp, notes])

  const handleDocx = useCallback(async () => {
    if (!content) return
    setDownloading(true)
    try {
      const hasQuote = quoteData.items.length > 0
      await exportProposalDocx({
        ...content,
        quote: hasQuote ? quoteData : undefined,
      })
    } catch (e) {
      setError(toUserMessage(e, 'DOCX 다운로드에 실패했습니다.'))
    } finally {
      setDownloading(false)
    }
  }, [content, quoteData])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">제안서 생성</h1>
        <p className="mt-1 text-sm text-slate-500">
          행사 정보를 입력하면 AI가 프로그램·운영 시스템·타임테이블·준비물을 포함한 완성형 제안서를 만들어 드립니다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* 좌: 입력 폼 */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <BaseInfoForm onChange={setBaseData} />
            <div className="border-t border-slate-100 pt-4 space-y-4 mt-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">예산</label>
                <input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="예: 1,500만원"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100/70"
                />
              </div>
              <Textarea label="팔로업 계획" value={followUp} onChange={(e) => setFollowUp(e.target.value)} rows={2}
                placeholder="견적 제출 후 미팅 일정, 현장 답사 계획 등" />
              <Textarea label="특이사항" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                placeholder="VIP 동선, 금지사항, 특별 요청 등" />
            </div>
          </div>

          {/* 견적서 입력 섹션 (토글) */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowQuote((v) => !v)}
              className="flex w-full items-center justify-between px-6 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-primary-100 text-primary-700 text-xs font-bold">₩</span>
                견적서 작성 (선택)
              </span>
              <svg
                className={`h-4 w-4 text-slate-400 transition-transform ${showQuote ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20" fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            {showQuote && (
              <div className="border-t border-slate-100 px-6 pb-6 pt-4">
                <p className="mb-4 text-xs text-slate-500">
                  견적 항목을 입력하면 제안서 마지막 섹션에 견적서가 포함됩니다. 항목이 없으면 생략됩니다.
                </p>
                <QuoteEditor value={quoteData} onChange={setQuoteData} />
              </div>
            )}
          </div>
        </div>

        {/* 우: 패널 */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <h2 className="mb-3 text-sm font-semibold text-blue-900">AI 제안서 생성</h2>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? <Spinner label={STEPS[stepIdx]} /> : 'AI로 제안서 생성'}
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

              {/* 미리보기 요약 */}
              <div className="mt-4 space-y-1 text-xs text-slate-600">
                {content.tagline && <p className="text-slate-500 italic">{content.tagline}</p>}
                <p>• 프로그램 {content.programFlow?.length ?? 0}개 구성</p>
                {content.operationSystem && <p>• 운영 시스템: {content.operationSystem.title}</p>}
                {content.awardOptions?.length ? <p>• 시상 방안 {content.awardOptions.length}안</p> : null}
                {content.timetable && <p>• 타임테이블 {content.timetable.sessions?.length ?? 1}세션</p>}
                {content.materialsList?.length ? <p>• 준비물 {content.materialsList.length}카테고리</p> : null}
                {quoteData.items.length > 0 && <p>• 견적 항목 {quoteData.items.length}개 포함</p>}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-100 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">생성 포함 내용</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-500">
              <li>• 행사 개요 및 프로그램 흐름</li>
              <li>• 운영 방식 · 시스템 안내</li>
              <li>• 시상 방안 2~3안 비교</li>
              <li>• 팀/반별 로테이션 타임테이블</li>
              <li>• 부스별 준비물 목록</li>
              <li>• 견적서 (선택 입력 시)</li>
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

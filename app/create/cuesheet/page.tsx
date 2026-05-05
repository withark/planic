'use client'
import { useState, useCallback } from 'react'
import BaseInfoForm, { type BaseFormData } from '@/components/doc-creator/BaseInfoForm'
import { Textarea, Spinner } from '@/components/ui'
import { apiFetch } from '@/lib/api/client'
import { toUserMessage } from '@/lib/errors/toUserMessage'
import { exportCuesheetDocx } from '@/lib/export/exportCuesheetDocx'
import type { CuesheetContent } from '@/lib/types/doc-content'

const CUESHEET_TYPES = [
  '개인전 + 팀전 혼합',
  '팀 대항전',
  '전체 참여 레크레이션',
  '워크숍',
  '세미나',
  '시상식',
  '기업 행사',
  '기타',
]

const STEPS = [
  '행사 흐름 분석 중...',
  '시간별 구간 구성 중...',
  '담당자 배치 작성 중...',
  '장비 목록 정리 중...',
  '큐시트 완성 중...',
]

export default function CuesheetPage() {
  const [baseData, setBaseData]         = useState<BaseFormData | null>(null)
  const [cuesheetType, setCuesheetType] = useState('')
  const [notes, setNotes]               = useState('')

  const [generating, setGenerating]   = useState(false)
  const [stepIdx, setStepIdx]         = useState(0)
  const [error, setError]             = useState('')
  const [content, setContent]         = useState<CuesheetContent | null>(null)
  const [downloading, setDownloading] = useState(false)

  const handleGenerate = useCallback(async () => {
    if (!baseData?.eventName) { setError('행사명을 입력해 주세요.'); return }
    setError('')
    setContent(null)
    setGenerating(true)
    setStepIdx(0)

    const interval = setInterval(() => {
      setStepIdx((i) => (i + 1) % STEPS.length)
    }, 2500)

    try {
      const res = await apiFetch<{ content: CuesheetContent }>('/api/generate-cuesheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName:      baseData.eventName,
          eventDate:      baseData.eventDate,
          eventPlace:     baseData.venue,
          headcount:      baseData.headcount,
          eventType:      baseData.eventType,
          cuesheetType:   cuesheetType || baseData.eventType,
          eventStartTime: baseData.eventStartTime,
          eventEndTime:   baseData.eventEndTime,
          requirements:   baseData.requirements,
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
  }, [baseData, cuesheetType, notes])

  const handleDocx = useCallback(async () => {
    if (!content) return
    setDownloading(true)
    try {
      await exportCuesheetDocx(content)
    } catch (e) {
      setError(toUserMessage(e, 'DOCX 다운로드에 실패했습니다.'))
    } finally {
      setDownloading(false)
    }
  }, [content])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">큐시트 생성</h1>
        <p className="mt-1 text-sm text-slate-500">
          행사 정보와 진행 유형을 입력하면 AI가 시간·담당자·장비가 모두 포함된 큐시트를 만들어 드립니다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* 좌: 입력 폼 */}
        <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <BaseInfoForm onChange={setBaseData} />
          <div className="border-t border-slate-100 pt-4 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">큐시트 형태</label>
              <select
                value={cuesheetType}
                onChange={(e) => setCuesheetType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-900 shadow-sm focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-100/70"
              >
                <option value="">선택하세요 (선택사항)</option>
                {CUESHEET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Textarea label="특이사항" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="운영 주의사항, 특별 요청, VIP 동선 등" />
          </div>
        </div>

        {/* 우: 패널 */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <h2 className="mb-3 text-sm font-semibold text-green-900">AI 큐시트 생성</h2>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {generating ? <Spinner label={STEPS[stepIdx]} /> : 'AI로 큐시트 생성'}
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
                {downloading ? '생성 중...' : 'DOCX 다운로드 (A4 가로)'}
              </button>

              <div className="mt-4 space-y-1 text-xs text-slate-600">
                <p>• 큐시트 행 {content.rows?.length ?? 0}개</p>
                {content.staffList?.length ? <p>• 운영 인력: {content.staffList.join(', ')}</p> : null}
                {content.notes?.length ? <p>• 유의사항 {content.notes.length}개</p> : null}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-100 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">생성 포함 내용</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-500">
              <li>• 시작 전 셋업 시간 포함</li>
              <li>• 소요시간·담당자·장비 명시</li>
              <li>• 운영 인력 목록</li>
              <li>• A4 가로 DOCX 출력</li>
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

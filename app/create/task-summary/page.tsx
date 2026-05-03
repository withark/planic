'use client'
import { useState, useCallback, useRef } from 'react'
import { Spinner } from '@/components/ui'
import { toUserMessage } from '@/lib/errors/toUserMessage'
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  WidthType,
  Table,
  TableRow,
  TableCell,
  ShadingType,
} from 'docx'
import { saveAs } from 'file-saver'

interface TaskSummary {
  projectTitle: string
  orderingOrganization: string
  purpose: string
  mainScope: string
  eventRange: string
  deliverables: string
  requiredStaffing: string
  budget: string
  specialNotes: string
  oneLineSummary: string
}

const SUMMARY_FIELDS: Array<{ key: keyof TaskSummary; label: string; multiline?: boolean }> = [
  { key: 'projectTitle', label: '사업명' },
  { key: 'orderingOrganization', label: '발주기관' },
  { key: 'oneLineSummary', label: '한 줄 요약' },
  { key: 'purpose', label: '사업 목적', multiline: true },
  { key: 'mainScope', label: '주요 업무 범위', multiline: true },
  { key: 'eventRange', label: '행사 규모 / 일정' },
  { key: 'deliverables', label: '산출물', multiline: true },
  { key: 'requiredStaffing', label: '인력 조건' },
  { key: 'budget', label: '예산' },
  { key: 'specialNotes', label: '특이사항', multiline: true },
]

function safeStr(v: unknown): string {
  return String(v ?? '').trim()
}

async function exportSummaryDocx(summary: TaskSummary, filename: string): Promise<void> {
  const NAVY = '1C2B4A'
  const FONT = '맑은 고딕'

  function row(label: string, value: string): TableRow {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: 'E8EEF7', fill: 'E8EEF7' },
          children: [new Paragraph({ children: [new TextRun({ text: label, font: FONT, bold: true, color: NAVY, size: 18 })] })],
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
        }),
        new TableCell({
          width: { size: 75, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text: safeStr(value), font: FONT, size: 18, color: '333333' })] })],
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
        }),
      ],
    })
  }

  const docx = new Document({
    sections: [
      {
        properties: {
          page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } },
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: '과업지시서 요약', font: FONT, color: NAVY, bold: true, size: 40 })],
            heading: HeadingLevel.TITLE,
            spacing: { before: 200, after: 300 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: SUMMARY_FIELDS.map((f) => row(f.label, safeStr(summary[f.key]))),
          }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(docx)
  const baseName = filename.replace(/\.[^.]+$/, '')
  saveAs(blob, `과업지시서요약_${baseName}.docx`)
}

export default function TaskSummaryPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState<TaskSummary | null>(null)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setSummary(null)
    setError('')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0] ?? null
    if (f) {
      setFile(f)
      setSummary(null)
      setError('')
    }
  }, [])

  const handleSummarize = useCallback(async () => {
    if (!file) return
    setError('')
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/task-summary', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const json = await res.json()

      if (!res.ok || !json.ok) {
        throw new Error(json?.error?.message ?? '요약 실패')
      }

      setSummary(json.data.summary as TaskSummary)
    } catch (e) {
      setError(toUserMessage(e, '요약 생성에 실패했습니다.'))
    } finally {
      setUploading(false)
    }
  }, [file])

  const handleCopy = useCallback(async () => {
    if (!summary) return
    const text = SUMMARY_FIELDS.map((f) => `[${f.label}]\n${summary[f.key] || '-'}`).join('\n\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [summary])

  const handleDocxExport = useCallback(async () => {
    if (!summary || !file) return
    try {
      await exportSummaryDocx(summary, file.name)
    } catch (e) {
      setError(toUserMessage(e, 'Word 내보내기에 실패했습니다.'))
    }
  }, [summary, file])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">과업지시서 요약</h1>
        <p className="mt-1 text-sm text-slate-500">PDF 또는 DOCX 파일을 업로드하면 AI가 핵심 내용을 구조화해 드립니다.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* 좌측: 업로드 + 결과 */}
        <div className="space-y-5">
          {/* 파일 업로드 */}
          <div
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50 px-6 py-10 transition-colors hover:border-orange-400"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.doc,.pptx"
              className="hidden"
              onChange={handleFileChange}
            />
            <svg viewBox="0 0 24 24" className="mb-3 h-10 w-10 text-orange-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {file ? (
              <p className="text-sm font-semibold text-orange-800">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-700">파일을 드래그하거나 클릭해 업로드</p>
                <p className="mt-1 text-xs text-slate-500">PDF, DOCX, PPTX 지원 · 최대 20MB</p>
              </>
            )}
          </div>

          {/* 결과 카드 */}
          {summary && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
                  <h2 className="text-sm font-semibold text-slate-900">요약 결과</h2>
                </div>
                {summary.oneLineSummary && (
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-800">
                    {summary.oneLineSummary}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {SUMMARY_FIELDS.filter((f) => f.key !== 'oneLineSummary').map((f) => {
                  const val = summary[f.key]
                  if (!val) return null
                  return (
                    <div key={f.key} className="grid grid-cols-[120px_1fr] gap-3">
                      <dt className="text-xs font-semibold text-slate-500 pt-0.5">{f.label}</dt>
                      <dd className={`text-sm text-slate-800 ${f.multiline ? 'whitespace-pre-line' : ''}`}>{val}</dd>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* 우측: 액션 패널 */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <h2 className="mb-3 text-sm font-semibold text-orange-900">AI 요약</h2>
            <button
              onClick={handleSummarize}
              disabled={!file || uploading}
              className="w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
            >
              {uploading ? 'AI 요약 중...' : 'AI로 요약'}
            </button>

            {uploading && (
              <div className="mt-3">
                <Spinner label="문서를 분석하고 있습니다..." />
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
            )}
          </div>

          {summary && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                <p className="text-sm font-semibold text-green-900">완료</p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={handleCopy}
                  className="flex w-full items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-green-50"
                >
                  {copied ? (
                    <svg viewBox="0 0 20 20" className="h-4 w-4 text-green-600" fill="currentColor">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-7.5 8.25a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 6.902-7.599a.75.75 0 011.052-.143z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-500" fill="currentColor">
                      <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.62V16.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 017 16.5v-13z" />
                    </svg>
                  )}
                  {copied ? '복사됨!' : '요약 복사'}
                </button>
                <button
                  onClick={handleDocxExport}
                  className="flex w-full items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-green-50"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-blue-600" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Word로 내보내기
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-100 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">추출 항목</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-500">
              <li>• 사업명 · 발주기관</li>
              <li>• 목적 · 업무 범위</li>
              <li>• 행사 규모 / 일정</li>
              <li>• 산출물 · 예산</li>
              <li>• 인력 조건 · 특이사항</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

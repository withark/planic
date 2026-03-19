'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { GNB } from '@/components/GNB'
import { Btn, Toast } from '@/components/ui'
import type { ReferenceDoc } from '@/lib/types'
import { apiFetch } from '@/lib/api/client'
import { toUserMessage } from '@/lib/errors/toUserMessage'
import { MAX_UPLOAD_BYTES, formatUploadLimitText } from '@/lib/upload-limits'

type StyleMode = 'userStyle' | 'aiTemplate'

export default function ReferenceEstimatePage() {
  const [styleMode, setStyleMode] = useState<StyleMode>('userStyle')
  const [refs, setRefs] = useState<ReferenceDoc[]>([])
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const showToast = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }, [])

  useEffect(() => {
    apiFetch<{ mode: StyleMode }>('/api/estimate-style-mode')
      .then(d => setStyleMode(d.mode))
      .catch(() => setStyleMode('userStyle'))
  }, [])

  useEffect(() => {
    if (styleMode !== 'userStyle') return
    apiFetch<ReferenceDoc[]>('/api/upload-reference')
      .then(setRefs)
      .catch(() => setRefs([]))
  }, [styleMode])

  const taskCheckFileSize = (file: File) => {
    if (file.size <= MAX_UPLOAD_BYTES) return true
    showToast(`파일이 너무 큽니다. ${formatUploadLimitText()} 이하로 업로드해 주세요.`, 'err')
    return false
  }

  async function saveMode(nextMode: StyleMode) {
    setStyleMode(nextMode)
    try {
      await apiFetch<null>('/api/estimate-style-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextMode),
      } as any)
      showToast('스타일 모드 저장 완료!')
    } catch (e) {
      showToast(toUserMessage(e, '저장 실패'), 'err')
    }
  }

  async function upload(file: File) {
    if (!file) return
    if (!taskCheckFileSize(file)) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      await apiFetch<unknown>('/api/upload-reference', { method: 'POST', body: fd as any })
      const list = await apiFetch<ReferenceDoc[]>('/api/upload-reference')
      setRefs(list)
      showToast('참고 견적서 업로드 완료!')
    } catch (e) {
      showToast(toUserMessage(e, '업로드에 실패했습니다.'), 'err')
    } finally {
      setUploading(false)
    }
  }

  async function deleteRef(id: string) {
    if (!confirm('삭제할까요?')) return
    try {
      await apiFetch<null>('/api/upload-reference', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setRefs(r => r.filter(x => x.id !== id))
      showToast('삭제 완료!')
    } catch (e) {
      showToast(toUserMessage(e, '삭제 실패'), 'err')
    }
  }

  const inputRefModeText = useMemo(() => {
    return styleMode === 'userStyle'
      ? '사용자 학습 스타일 모드: 업로드한 견적서의 항목명/구성/문체를 따라가도록 학습합니다.'
      : 'AI 추천 템플릿 모드: Planic 표준 포맷을 사용하며, 사용자 업로드 학습은 적용하지 않습니다.'
  }, [styleMode])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      <GNB />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 h-14 border-b border-gray-100 bg-white/90 flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Reference Estimate</h1>
            <p className="text-xs text-gray-500 mt-0.5">사용자 스타일 학습 또는 Planic 표준 템플릿을 선택합니다.</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-sm font-semibold text-gray-900">스타일 모드</div>
                <div className="text-xs text-gray-500 mt-1">{inputRefModeText}</div>
              </div>
              <div className="min-w-[240px]">
                <select
                  value={styleMode}
                  onChange={(e) => void saveMode(e.target.value as StyleMode)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100"
                >
                  <option value="userStyle">사용자 학습 스타일</option>
                  <option value="aiTemplate">AI 추천 템플릿 모드</option>
                </select>
              </div>
            </div>
          </section>

          {styleMode === 'userStyle' ? (
            <section className="rounded-2xl border border-gray-100 bg-white shadow-card overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-slate-50/50">
                <div className="text-sm font-semibold text-gray-900">사용자 견적서 업로드</div>
                <div className="text-xs text-gray-500 mt-1">
                  업로드한 견적서로 항목명/카테고리 구조/문체 경향을 학습합니다. 큐시트/시나리오 업로드는 이 메뉴에서 하지 않습니다.
                </div>
              </div>

              <div className="p-5 space-y-4">
                <UploadBox uploading={uploading} onUpload={upload} />

                {refs.length === 0 ? (
                  <div className="text-sm text-gray-500 py-10 rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-center">
                    아직 등록된 참고 견적서가 없습니다. 파일을 업로드해 주세요.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {refs.map(r => (
                      <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-4">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 truncate">{r.filename}</div>
                          <div className="text-xs text-gray-500 mt-1">{new Date(r.uploadedAt).toLocaleString('ko-KR')}</div>
                        </div>
                        <Btn size="sm" variant="danger" onClick={() => deleteRef(r.id)}>삭제</Btn>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-primary-200 bg-primary-50/30 p-6 text-center">
              <div className="text-sm font-semibold text-primary-800">AI 추천 템플릿 모드 사용 중</div>
              <div className="text-xs text-gray-600 mt-2">
                이 모드에서는 사용자 업로드 학습을 적용하지 않습니다. 업로드/삭제는 하지 않아도 됩니다.
              </div>
            </section>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

function UploadBox({ uploading, onUpload }: { uploading: boolean; onUpload: (f: File) => Promise<void> }) {
  return (
    <div className="space-y-2">
      <input
        type="file"
        accept=".txt,.csv,.md,.pdf,.xlsx,.xls,.ppt,.pptx,.doc,.docx"
        disabled={uploading}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onUpload(f)
          e.target.value = ''
        }}
      />
      <div className="text-[11px] text-gray-500">
        지원 형식: txt/csv/md/pdf/xlsx/xls/ppt/pptx/doc/docx · 파일 크기 {formatUploadLimitText()} 이하
      </div>
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-600">
        참고 견적서가 0개인 상태에서 Estimate Generator의 스타일 모드는 기본 템플릿으로 동작합니다.
      </div>
    </div>
  )
}


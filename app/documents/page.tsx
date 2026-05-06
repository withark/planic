import type { Metadata } from 'next'
import { GNB } from '@/components/GNB'
import DocumentGenerator from '@/components/DocumentGenerator'

export const metadata: Metadata = {
  title: '템플릿 문서 생성 | Planic',
  description: '폼 데이터를 docx-js 템플릿에 주입해 서버에서 .docx 파일을 생성합니다.',
}

export default function DocumentsTemplatePage() {
  return (
    <>
      <GNB />
      <main className="min-h-screen bg-slate-50 pb-16">
        <div className="mx-auto max-w-3xl px-4 pt-10 text-center">
          <h1 className="text-2xl font-bold text-slate-900">템플릿 문서 생성</h1>
          <p className="mt-2 text-sm text-slate-600">
            AI 없이 docx-js 템플릿에 폼을 주입해 Word 문서를 내려받습니다.
          </p>
        </div>
        <DocumentGenerator />
      </main>
    </>
  )
}

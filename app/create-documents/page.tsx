import { GNB } from '@/components/GNB'
import { CORE_DOCUMENT_COUNT, TOTAL_DOCUMENT_COUNT } from '@/lib/marketing-documents'
import { CreateDocumentsHubBody } from './create-documents-hub-body'

export default function CreateDocumentsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      <GNB />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex flex-col gap-1 px-6 py-5 border-b border-gray-100 bg-white/90 flex-shrink-0">
          <h1 className="text-lg font-bold text-gray-900">문서 생성</h1>
          <p className="text-sm text-slate-600">
            핵심 {CORE_DOCUMENT_COUNT}종부터 빠르게 시작하고, 전체 {TOTAL_DOCUMENT_COUNT}종으로 확장하세요.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <CreateDocumentsHubBody />
          </div>
        </div>
      </div>
    </div>
  )
}

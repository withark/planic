import { GNB } from '@/components/GNB'
import { CreateDocumentsHubBody } from './create-documents-hub-body'

export default function CreateDocumentsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      <GNB />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex flex-col gap-1 px-6 py-5 border-b border-gray-100 bg-white/90 flex-shrink-0">
          <h1 className="text-lg font-bold text-gray-900">문서 만들기</h1>
          <p className="text-sm text-slate-600">
            유형을 고르거나 아래에서 카테고리로 좁힌 뒤, 하나만 선택하세요.
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

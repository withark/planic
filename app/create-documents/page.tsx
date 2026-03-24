import Link from 'next/link'
import { GNB } from '@/components/GNB'
import { MARKETING_DOCUMENTS } from '@/lib/marketing-documents'

const GROUP_ORDER = ['견적·금액', '기획·제안', '운영·정리', '스타일·참고'] as const

function ArrowIntoIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  )
}

export default function CreateDocumentsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      <GNB />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex flex-col gap-1 px-6 py-4 border-b border-gray-100 bg-white/90 flex-shrink-0">
          <h1 className="text-base font-semibold text-gray-900">문서 만들기</h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            견적·기획·현장 운영·참고 스타일까지, 만들 수 있는 문서를 모두 골라 쓸 수 있어요.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-10">
            {GROUP_ORDER.map((group) => {
              const items = MARKETING_DOCUMENTS.filter((d) => d.category === group)
              if (items.length === 0) return null
              return (
                <section key={group}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">{group}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((doc) => (
                      <Link
                        key={doc.href}
                        href={doc.href}
                        className="group block rounded-2xl border border-gray-100 bg-white p-5 shadow-card hover:shadow-card-hover hover:border-primary-200 transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-base font-bold text-gray-900 group-hover:text-primary-800 transition-colors">
                              {doc.title}
                            </div>
                            <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-4">{doc.desc}</p>
                          </div>
                          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-700 group-hover:bg-primary-100/80 transition-colors">
                            <ArrowIntoIcon className="w-[18px] h-[18px]" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

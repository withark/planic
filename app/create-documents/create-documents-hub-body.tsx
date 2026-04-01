'use client'

import Link from 'next/link'
import { HubDocIcon } from '@/components/hub-doc-icon'
import { CREATE_DOCUMENT_HUB_ITEMS } from '@/lib/marketing-documents'

function ArrowIntoIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
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

const QUICK_START_DOC_HREFS = ['/estimate-generator', '/planning-generator', '/cue-sheet-generator'] as const

export function CreateDocumentsHubBody() {
  const quickStartDocs = QUICK_START_DOC_HREFS.map((href) => CREATE_DOCUMENT_HUB_ITEMS.find((d) => d.href === href)).filter(Boolean)

  return (
    <>
      <section className="rounded-2xl border-2 border-primary-100 bg-white p-4 sm:p-5 shadow-card ring-1 ring-primary-50/70">
        <h2 className="text-base font-bold text-gray-900">자주 쓰는 문서</h2>
        <p className="mt-1 text-sm text-slate-600">하나만 선택해서 바로 시작하세요.</p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickStartDocs.map((doc) =>
            doc ? (
              <Link
                key={doc.href}
                href={doc.href}
                className="group flex items-stretch gap-3 rounded-2xl border-2 border-gray-100 bg-slate-50/40 p-4 min-h-[84px] hover:border-primary-200 hover:bg-white hover:shadow-card transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                <span className="flex-shrink-0 self-center w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center border border-primary-100 group-hover:bg-primary-100/80 transition-colors">
                  <HubDocIcon id={doc.hubIcon} className="w-[18px] h-[18px]" />
                </span>
                <span className="flex flex-col gap-1 min-w-0 text-left flex-1">
                  <span className="text-[10px] font-semibold text-slate-500">{doc.category}</span>
                  <span className="text-[15px] font-bold text-gray-900 group-hover:text-primary-800">{doc.title}</span>
                </span>
                <span className="flex-shrink-0 self-center w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center group-hover:bg-primary-700 transition-colors">
                  <ArrowIntoIcon className="w-[18px] h-[18px]" />
                </span>
              </Link>
            ) : null,
          )}
        </div>
      </section>

      <details className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800 outline-none marker:text-primary-700">
          전체 문서 보기
        </summary>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CREATE_DOCUMENT_HUB_ITEMS.map((doc) => (
            <Link
              key={doc.href}
              href={doc.href}
              className="group flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 text-sm hover:border-primary-200 hover:bg-primary-50/40"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold text-slate-900">{doc.title}</span>
                <span className="block text-xs text-slate-500">{doc.category}</span>
              </span>
              <span className="text-primary-700">
                <ArrowIntoIcon className="w-4 h-4" />
              </span>
            </Link>
          ))}
        </div>
      </details>
    </>
  )
}

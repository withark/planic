'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { HubDocIcon } from '@/components/hub-doc-icon'
import {
  CREATE_DOCUMENT_HUB_ITEMS,
  type MarketingDocCategory,
} from '@/lib/marketing-documents'

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

const FILTER_ALL = '전체' as const
type FilterValue = typeof FILTER_ALL | MarketingDocCategory

const FILTER_CHIPS: FilterValue[] = [FILTER_ALL, '견적·금액', '기획·제안', '운영·정리']

export function CreateDocumentsHubBody() {
  const [filter, setFilter] = useState<FilterValue>(FILTER_ALL)

  const filtered = useMemo(() => {
    if (filter === FILTER_ALL) return CREATE_DOCUMENT_HUB_ITEMS
    return CREATE_DOCUMENT_HUB_ITEMS.filter((d) => d.category === filter)
  }, [filter])

  return (
    <>
      <div
        className="flex flex-wrap gap-2 mb-5"
        role="group"
        aria-label="문서 유형 필터"
      >
        {FILTER_CHIPS.map((value) => {
          const pressed = filter === value
          return (
            <button
              key={value}
              type="button"
              aria-pressed={pressed}
              onClick={() => setFilter(value)}
              className={[
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                pressed
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-gray-200 hover:border-primary-200 hover:text-primary-800',
              ].join(' ')}
            >
              {value}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((doc) => (
          <Link
            key={doc.href}
            href={doc.href}
            className="group flex flex-col gap-4 rounded-2xl border-2 border-gray-100 bg-white p-5 sm:p-6 shadow-card hover:shadow-card-hover hover:border-primary-300 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <div className="flex items-start gap-4">
              <span className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center border border-primary-100 group-hover:bg-primary-100/80 transition-colors">
                <HubDocIcon id={doc.hubIcon} className="w-6 h-6" />
              </span>
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    {doc.category}
                  </span>
                  {doc.recommended ? (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-primary-700 bg-primary-50 border border-primary-100 px-1.5 py-0.5 rounded-md">
                      추천
                    </span>
                  ) : null}
                </div>
                <h2 className="text-lg font-bold text-gray-900 group-hover:text-primary-800 transition-colors leading-snug">
                  {doc.title}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{doc.desc}</p>
              </div>
              <span className="flex-shrink-0 self-center w-11 h-11 rounded-2xl bg-primary-600 text-white flex items-center justify-center group-hover:bg-primary-700 transition-colors">
                <ArrowIntoIcon className="w-5 h-5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { HubDocIcon } from '@/components/hub-doc-icon'
import { CREATE_DOCUMENT_HUB_ITEMS } from '@/lib/marketing-documents'
import { apiFetch } from '@/lib/api/client'
import type { PlanType } from '@/lib/plans'
import { planLabelKo } from '@/lib/plans'
import { documentAccessMessage, isDocumentAllowedForPlan, type AppDocumentType } from '@/lib/plan-access'

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

const QUICK_START_DOC_HREFS = [
  '/estimate-generator',
  '/cue-sheet-generator',
  '/emcee-script-generator',
  '/task-order-summary',
] as const

const DOC_TYPE_BY_HREF: Record<string, AppDocumentType> = {
  '/estimate-generator': 'estimate',
  '/cue-sheet-generator': 'cuesheet',
  '/emcee-script-generator': 'emceeScript',
  '/task-order-summary': 'taskOrderSummary',
}

export function CreateDocumentsHubBody() {
  const [plan, setPlan] = useState<PlanType>('FREE')
  const [planResolved, setPlanResolved] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  useEffect(() => {
    apiFetch<{ subscription: { planType: PlanType } }>('/api/me')
      .then((m) => {
        setPlan(m.subscription.planType)
        setPlanError(null)
      })
      .catch(() => {
        setPlanError('플랜 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      })
      .finally(() => setPlanResolved(true))
  }, [])

  const quickStartDocs = useMemo(
    () => QUICK_START_DOC_HREFS.map((href) => CREATE_DOCUMENT_HUB_ITEMS.find((d) => d.href === href)).filter(Boolean),
    [],
  )
  const isLocked = (href: string) => {
    if (!planResolved || planError) return false
    const docType = DOC_TYPE_BY_HREF[href]
    if (!docType) return false
    return !isDocumentAllowedForPlan(plan, docType)
  }
  const lockReason = (href: string) => {
    const docType = DOC_TYPE_BY_HREF[href]
    return docType ? documentAccessMessage(docType) : '현재 플랜에서 사용할 수 없는 문서입니다.'
  }


  return (
    <>
      <div className="mb-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        현재 플랜:{' '}
        <span className="font-semibold text-slate-900">
          {planResolved ? planLabelKo(plan) : '확인 중...'}
        </span>
        {planError ? <span className="ml-2 text-rose-600">{planError}</span> : null}
      </div>
      <section className="rounded-2xl border-2 border-primary-100 bg-white p-4 sm:p-5 shadow-card ring-1 ring-primary-50/70">
        <h2 className="text-base font-bold text-gray-900">자주 쓰는 문서</h2>
        <p className="mt-1 text-sm text-slate-600">하나만 선택해서 바로 시작하세요.</p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickStartDocs.map((doc) =>
            doc ? (
              isLocked(doc.href) ? (
                <div key={doc.href} className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-4 min-h-[84px]">
                  <div className="flex items-stretch gap-3">
                    <span className="flex-shrink-0 self-center w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200">
                      <HubDocIcon id={doc.hubIcon} className="w-[18px] h-[18px]" />
                    </span>
                    <span className="flex flex-col gap-1 min-w-0 text-left flex-1">
                      <span className="text-[10px] font-semibold text-amber-700">{doc.category}</span>
                      <span className="text-[15px] font-bold text-amber-900">{doc.title}</span>
                      <span className="text-xs text-amber-900/90">{lockReason(doc.href)}</span>
                    </span>
                    <Link href="/plans" className="self-center rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700">
                      업그레이드
                    </Link>
                  </div>
                </div>
              ) : (
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
              )
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
            isLocked(doc.href) ? (
              <div key={doc.href} className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-amber-900">{doc.title}</span>
                  <span className="block text-xs text-amber-800/90">{lockReason(doc.href)}</span>
                </span>
                <Link href="/plans" className="text-xs font-semibold text-amber-800 underline underline-offset-2">
                  업그레이드
                </Link>
              </div>
            ) : (
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
            )
          ))}
        </div>
      </details>
    </>
  )
}

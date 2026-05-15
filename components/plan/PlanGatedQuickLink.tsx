'use client'

import Link from 'next/link'
import type { PlanType } from '@/lib/plans'
import { hubDocumentLockMessage, isHubDocumentLocked } from '@/lib/plan-document-hub'

type Variant = 'primary' | 'secondary'

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    'inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors',
  secondary:
    'inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors',
}

const LOCKED_CLASS =
  'inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100/80 transition-colors'

type Props = {
  href: string
  plan: PlanType
  /** false면 플랜 조회 전 — 잠금 표시 없이 링크 허용(허브와 동일) */
  planResolved?: boolean
  variant?: Variant
  children: React.ReactNode
}

/** 대시보드·컴팩트 CTA용 — 잠긴 문서는 /plans로 안내(생성기 진입 후 막히는 혼란 방지) */
export function PlanGatedQuickLink({
  href,
  plan,
  planResolved = true,
  variant = 'secondary',
  children,
}: Props) {
  const locked = planResolved && isHubDocumentLocked(plan, href)
  const lockMessage = hubDocumentLockMessage(href)

  if (locked) {
    return (
      <Link
        href="/plans"
        className={LOCKED_CLASS}
        title={lockMessage}
        aria-label={`${typeof children === 'string' ? children : '문서'} — ${lockMessage}`}
      >
        <span>{children}</span>
        <span className="rounded-md bg-amber-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white">베이직</span>
      </Link>
    )
  }

  return (
    <Link href={href} className={VARIANT_CLASS[variant]}>
      {children}
    </Link>
  )
}

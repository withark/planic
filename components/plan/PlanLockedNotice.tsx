'use client'

import Link from 'next/link'

export function PlanLockedNotice({
  title,
  message,
  ctaLabel = '플랜 업그레이드',
  compact = false,
}: {
  title: string
  message: string
  ctaLabel?: string
  compact?: boolean
}) {
  return (
    <section
      className={`rounded-2xl border border-amber-200 bg-amber-50/70 ${
        compact ? 'px-4 py-3' : 'px-5 py-5'
      }`}
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-semibold text-amber-900">{title}</p>
      <p className="mt-1 text-sm text-amber-900/90">{message}</p>
      <Link
        href="/plans"
        className="mt-3 inline-flex items-center rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
      >
        {ctaLabel}
      </Link>
    </section>
  )
}


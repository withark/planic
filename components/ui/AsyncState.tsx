/**
 * 비동기 목록·상세 화면에서 로딩 / 오류 / 빈 목록 패턴을 통일합니다.
 */

import type { ReactNode } from 'react'

export function LoadingState({ label = '로딩 중…', className = '' }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 ${className}`}
    >
      {label}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
  retryLabel = '다시 시도',
}: {
  message: string
  onRetry?: () => void
  retryLabel?: string
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800"
    >
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-900 hover:bg-red-100/80"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

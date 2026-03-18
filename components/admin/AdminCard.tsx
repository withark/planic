'use client'

/** 운영 백오피스용 KPI/요약 카드 */
export function AdminCard({
  label,
  value,
  sub,
  danger,
  className = '',
}: {
  label: string
  value: string | number
  sub?: string
  danger?: boolean
  className?: string
}) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-3 ${className}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums text-gray-900 ${danger ? 'text-red-600' : ''}`}>
        {value}
      </p>
      {sub != null && sub !== '' && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  )
}

/** 섹션 제목 + 설명 */
export function AdminSection({
  title,
  description,
  children,
  className = '',
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={className}>
      <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-slate-500 max-w-2xl">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

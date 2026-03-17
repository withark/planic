import Link from 'next/link'

type Props = { title: string; description?: string }

export function AdminPlaceholder({ title, description }: Props) {
  return (
    <div className="max-w-lg mx-auto py-12 text-center">
      <h1 className="text-xl font-semibold text-gray-900 mb-2">{title}</h1>
      {description && (
        <p className="text-sm text-gray-500 mb-6">{description}</p>
      )}
      <p className="text-sm text-gray-400 mb-6">해당 기능은 준비 중입니다.</p>
      <Link
        href="/admin"
        className="text-sm font-medium text-primary-600 hover:text-primary-700"
      >
        ← 대시보드로
      </Link>
    </div>
  )
}

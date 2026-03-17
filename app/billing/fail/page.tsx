'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { EvQuoteLogo } from '@/components/EvQuoteLogo'

function FailContent() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code') ?? ''
  const message = searchParams.get('message') ?? '결제가 취소되었거나 실패했습니다.'

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2 text-gray-800">
          <EvQuoteLogo showText size="md" />
        </Link>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-red-600 mb-2">{message}</p>
        {code && <p className="text-sm text-slate-500 mb-4">코드: {code}</p>}
        <Link href="/plans" className="text-primary-600 font-medium hover:underline">플랜으로 돌아가기</Link>
      </main>
    </div>
  )
}

export default function BillingFailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">로딩 중...</p>
      </div>
    }>
      <FailContent />
    </Suspense>
  )
}

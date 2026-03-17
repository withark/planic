'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { EvQuoteLogo } from '@/components/EvQuoteLogo'
import { apiFetch } from '@/lib/api/client'
import { toUserMessage } from '@/lib/errors/toUserMessage'

function SuccessContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'ok' | 'fail'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amountStr = searchParams.get('amount')
    const amount = amountStr ? parseInt(amountStr, 10) : 0

    if (!paymentKey || !orderId || !amount) {
      setStatus('fail')
      setMessage('결제 정보가 올바르지 않습니다.')
      return
    }

    apiFetch<{ ok: boolean }>('/api/billing/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
      .then((res) => {
        if (res?.ok) {
          setStatus('ok')
          window.location.replace('/dashboard?checkout=success')
        } else {
          setStatus('fail')
          setMessage('결제 승인 처리에 실패했습니다.')
        }
      })
      .catch((e) => {
        setStatus('fail')
        setMessage(toUserMessage(e, '결제 승인에 실패했습니다.'))
      })
  }, [searchParams])

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2 text-gray-800">
          <EvQuoteLogo showText size="md" />
        </Link>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        {status === 'loading' && <p className="text-slate-600">결제 확인 중...</p>}
        {status === 'fail' && (
          <>
            <p className="text-red-600 mb-4">{message}</p>
            <Link href="/plans" className="text-primary-600 font-medium hover:underline">플랜으로 돌아가기</Link>
          </>
        )}
      </main>
    </div>
  )
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">처리 중...</p>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}

'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { EvQuoteLogo } from '@/components/EvQuoteLogo'
import { apiFetch } from '@/lib/api/client'
import { toUserMessage } from '@/lib/errors/toUserMessage'

type OrderInfo = { orderId: string; amount: number; planType: string; billingCycle: string; orderName: string }

function CheckoutContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [order, setOrder] = useState<OrderInfo | null>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId?.trim()) {
      setError('주문 정보가 없습니다.')
      setLoading(false)
      return
    }
    apiFetch<OrderInfo>(`/api/billing/order?orderId=${encodeURIComponent(orderId)}`)
      .then(setOrder)
      .catch((e) => setError(toUserMessage(e, '주문을 불러오지 못했습니다.')))
      .finally(() => setLoading(false))
  }, [orderId])

  useEffect(() => {
    if (!order || error) return
    const clientKey = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY
    if (!clientKey) {
      setError('결제 설정이 완료되지 않았습니다.')
      return
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const successUrl = `${origin}/billing/success`
    const failUrl = `${origin}/billing/fail`

    let cancelled = false
    import('@tosspayments/payment-sdk').then(({ loadTossPayments }) => {
      if (cancelled) return
      return loadTossPayments(clientKey)
    }).then((tossPayments) => {
      if (cancelled || !tossPayments) return
      tossPayments.requestPayment('카드', {
        amount: order.amount,
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl,
        failUrl,
      }).catch((e: unknown) => {
        if (!cancelled) setError(toUserMessage(e, '결제창을 열지 못했습니다.'))
      })
    }).catch((e: unknown) => {
      if (!cancelled) setError(toUserMessage(e, '결제 모듈을 불러오지 못했습니다.'))
    })
    return () => { cancelled = true }
  }, [order, error])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
        <p className="text-slate-600">결제 준비 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2 text-gray-800">
            <EvQuoteLogo showText size="md" />
          </Link>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/plans" className="text-primary-600 font-medium hover:underline">플랜으로 돌아가기</Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <p className="text-slate-600">결제창이 열립니다. 열리지 않으면 팝업을 허용해 주세요.</p>
    </div>
  )
}

export default function BillingCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">로딩 중...</p>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}

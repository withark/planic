'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminCard, AdminSection } from '@/components/admin/AdminCard'

type SubStats = {
  paidSubscribersActive?: number
  activePaidCount?: number
  freeToPaidThisMonth?: number
  activeSubscriptionsPaid?: number
  canceledThisMonth?: number
  planSubscriberCounts?: { planType: string; activeCount: number }[]
  planPaymentShare?: { planType: string; count: number; revenueKrw: number }[]
  paymentFailuresMonth?: number
  paymentsApprovedToday?: number
  paymentsApprovedMonth?: number
  revenueTodayKrw?: number
  revenueMonthKrw?: number
  refundsCanceledOrders30d?: number
  refundAmountCanceled30dKrw?: number
  paymentSuccessRateMonth?: number
  recentPayments?: { orderId: string; userId: string; planType: string; amount: number; approvedAt: string | null }[]
  recentPaymentFailures?: { orderId: string; userId: string; status: string; updatedAt: string }[]
  recentCanceledOrders?: { orderId: string; userId: string; amount: number; updatedAt: string }[]
}

type SubRow = {
  id: string
  userId: string
  planType: string
  billingCycle: string | null
  status: string
  startedAt: string | null
  expiresAt: string | null
  canceledAt: string | null
  createdAt: string
  trial: boolean
}

const won = (n: number) => `₩${(n ?? 0).toLocaleString('ko-KR')}`

export default function AdminSubscriptionsPage() {
  const [stats, setStats] = useState<SubStats | null>(null)
  const [rows, setRows] = useState<SubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/subscriptions')
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok && res?.data) {
          setStats(res.data.stats ?? null)
          setRows(Array.isArray(res.data.rows) ? res.data.rows : [])
        } else setError(res?.error?.message || '조회 실패')
      })
      .catch(() => setError('요청 실패'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-slate-500">로딩 중…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>

  const fmt = (n: number) => (n ?? 0).toLocaleString('ko-KR')
  const paidRows = rows.filter((r) => r.planType !== 'FREE' && r.status === 'active')

  return (
    <div className="space-y-6">
      {/* A. 헤더 */}
      <header>
        <h1 className="text-xl font-bold text-gray-900">구독 및 결제 관리</h1>
        <p className="mt-1 text-sm text-slate-600">
          구독 상태, 매출, 환불, 결제 실패, 플랜별 현황을 관리하는 화면입니다.
        </p>
      </header>

      {stats && (
        <>
          {/* B. 핵심 요약 카드 */}
          <AdminSection title="핵심 요약" description="유료 구독·전환·해지">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <AdminCard label="현재 유료 구독자 수" value={fmt(stats.activeSubscriptionsPaid ?? stats.paidSubscribersActive ?? 0)} />
              <AdminCard label="무료→유료 전환(이번 달)" value={fmt(stats.freeToPaidThisMonth ?? 0)} />
              <AdminCard label="활성 구독 수" value={fmt(stats.activeSubscriptionsPaid ?? 0)} />
              <AdminCard label="해지 예약 수" value="0" sub="(추후 연동)" />
              <AdminCard label="해지 완료(이번 달)" value={fmt(stats.canceledThisMonth ?? 0)} />
            </div>
          </AdminSection>

          {/* C. 결제/정산 요약 카드 */}
          <AdminSection title="결제·정산 요약" description="오늘·이번 달 결제·매출·환불·성공률">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3">
              <AdminCard label="오늘 결제 건수" value={fmt(stats.paymentsApprovedToday ?? 0)} />
              <AdminCard label="이번 달 결제 건수" value={fmt(stats.paymentsApprovedMonth ?? 0)} />
              <AdminCard label="오늘 매출" value={won(stats.revenueTodayKrw ?? 0)} />
              <AdminCard label="이번 달 매출" value={won(stats.revenueMonthKrw ?? 0)} />
              <AdminCard label="환불 건수(30일)" value={fmt(stats.refundsCanceledOrders30d ?? 0)} />
              <AdminCard label="환불 금액(30일)" value={won(stats.refundAmountCanceled30dKrw ?? 0)} />
              <AdminCard label="결제 실패(이번 달)" value={fmt(stats.paymentFailuresMonth ?? 0)} danger={(stats.paymentFailuresMonth ?? 0) > 0} />
              <AdminCard label="결제 성공률(이번 달)" value={`${stats.paymentSuccessRateMonth ?? 0}%`} />
            </div>
          </AdminSection>

          {/* D. 플랜 분석 */}
          <AdminSection title="플랜 분석" description="플랜별 가입자 수·매출 비중">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.planSubscriberCounts && stats.planSubscriberCounts.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">플랜별 활성 구독 수</h3>
                  <ul className="space-y-1 text-sm">
                    {stats.planSubscriberCounts.map((p) => (
                      <li key={p.planType} className="flex justify-between">
                        <span>{p.planType}</span>
                        <span className="tabular-nums font-medium">{p.activeCount}명</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {stats.planPaymentShare && stats.planPaymentShare.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">플랜별 매출 비중(이번 달)</h3>
                  <ul className="space-y-1 text-sm">
                    {stats.planPaymentShare.map((p) => (
                      <li key={p.planType} className="flex justify-between">
                        <span>{p.planType}</span>
                        <span className="tabular-nums">{p.count}건 · {won(p.revenueKrw)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AdminSection>

          {/* E. 최근 내역 */}
          <AdminSection title="최근 내역" description="최근 결제·실패·환불">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b text-xs font-semibold text-slate-700">최근 결제</div>
                <ul className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {(stats.recentPayments ?? []).slice(0, 5).map((p) => (
                    <li key={p.orderId} className="px-3 py-2 text-xs flex justify-between">
                      <span className="font-mono truncate">{p.orderId.slice(0, 14)}…</span>
                      <span className="tabular-nums">{won(p.amount)}</span>
                    </li>
                  ))}
                  {(!stats.recentPayments || stats.recentPayments.length === 0) && <li className="px-3 py-4 text-slate-400 text-xs">내역 없음</li>}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b text-xs font-semibold text-slate-700">최근 실패</div>
                <ul className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {(stats.recentPaymentFailures ?? []).slice(0, 5).map((p) => (
                    <li key={p.orderId} className="px-3 py-2 text-xs flex justify-between">
                      <span className="font-mono truncate">{p.orderId.slice(0, 14)}…</span>
                      <span className="text-red-600">{p.status}</span>
                    </li>
                  ))}
                  {(!stats.recentPaymentFailures || stats.recentPaymentFailures.length === 0) && <li className="px-3 py-4 text-slate-400 text-xs">내역 없음</li>}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b text-xs font-semibold text-slate-700">최근 환불/취소</div>
                <ul className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {(stats.recentCanceledOrders ?? []).slice(0, 5).map((p) => (
                    <li key={p.orderId} className="px-3 py-2 text-xs flex justify-between">
                      <span className="font-mono truncate">{p.orderId.slice(0, 14)}…</span>
                      <span className="tabular-nums">{won(p.amount)}</span>
                    </li>
                  ))}
                  {(!stats.recentCanceledOrders || stats.recentCanceledOrders.length === 0) && <li className="px-3 py-4 text-slate-400 text-xs">내역 없음</li>}
                </ul>
              </div>
            </div>
            <p className="mt-2">
              <Link href="/admin/payments" className="text-sm text-primary-600 hover:underline">결제 관리 전체 →</Link>
            </p>
          </AdminSection>
        </>
      )}

      {/* F. 유료 구독 상세 테이블 */}
      <AdminSection title="구독 상세(최근 500건)" description="사용자·플랜·시작·종료·상태">
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left font-medium">사용자 ID</th>
                <th className="px-3 py-2 text-left font-medium">현재 플랜</th>
                <th className="px-3 py-2 text-left font-medium">구독 시작</th>
                <th className="px-3 py-2 text-left font-medium">종료 예정</th>
                <th className="px-3 py-2 text-left font-medium">상태</th>
                <th className="px-3 py-2 text-left font-medium">해지일</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">구독 이력 없음</td>
                </tr>
              ) : (
                rows.slice(0, 100).map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-mono text-xs truncate max-w-[120px]" title={s.userId}>{s.userId.slice(0, 16)}…</td>
                    <td className="px-3 py-2 font-medium">{s.planType}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">{s.startedAt ? new Date(s.startedAt).toLocaleDateString('ko-KR') : '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">{s.expiresAt ? new Date(s.expiresAt).toLocaleDateString('ko-KR') : '—'}</td>
                    <td className="px-3 py-2">{s.status}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">{s.canceledAt ? new Date(s.canceledAt).toLocaleDateString('ko-KR') : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <p className="text-xs text-slate-400">
        토스 결제 승인 시 setActiveSubscription으로 갱신됩니다. trial 플래그·해지 예약은 추후 연동 예정입니다.
      </p>
    </div>
  )
}

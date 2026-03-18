'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const ADMIN_LINKS = [
  { href: '/admin/samples', label: '기준 양식 관리', desc: '참고 양식 등록·반영 방식' },
  { href: '/admin/engines', label: '생성 규칙 설정', desc: '탭별 규칙·샘플 강도·출력 형식' },
  { href: '/admin/generation-logs', label: '생성 로그', desc: '샘플·엔진 반영 추적' },
  { href: '/admin/references-collect', label: '외부 자료 수집', desc: '웹/URL 수집 → 검토 → 샘플 등록' },
  { href: '/admin/users', label: '사용자 관리', desc: '가입·플랜·한도' },
  { href: '/admin/subscriptions', label: '구독 현황', desc: '구독 이력·플랜별' },
  { href: '/admin/payments', label: '결제 관리', desc: '매출·실패·환불' },
  { href: '/admin/plans', label: '플랜 관리', desc: '요금제·한도' },
  { href: '/admin/usage', label: '사용 통계', desc: '생성·쿼터' },
  { href: '/admin/logs', label: '에러 로그', desc: '에러·이벤트' },
  { href: '/admin/system', label: '시스템 설정', desc: '환경' },
  { href: '/api/health', label: '헬스', desc: 'API', external: true },
]

type Stats = Record<string, unknown> & {
  hasDatabase?: boolean
  userCount?: number
  usersTotal?: number
  usersActive30d?: number
  usersPaidActive?: number
  usersFreeActive?: number
  signupsToday?: number
  signupsLast7d?: number
  signupsLast30d?: number;
  quoteCountTotal?: number
  quoteCountLast24h?: number
  quoteCountLast7d?: number
  monthlyGenerationCount?: number
  quotesSavedTotal?: number
  errorsLast24h?: number
  generationFailuresLast7d?: number
  usersOverQuotaApprox?: number
  paymentsApprovedToday?: number
  paymentsApprovedMonth?: number
  revenueTodayKrw?: number
  revenueMonthKrw?: number
  paymentsFailedToday?: number
  paymentsFailedMonth?: number
  paymentSuccessRateMonth?: number
  refundsCanceledOrders30d?: number
  subscriptionsActivePaid?: number
  revenueLast7Days?: { date: string; amountKrw: number }[]
  planPaymentShare?: { planType: string; count: number; revenueKrw: number }[]
  recentPayments?: { orderId: string; amount: number; approvedAt: string | null }[]
}

function Card({ label, value, sub, danger }: { label: string; value: string | number; sub?: string; danger?: boolean }) {
  return (
    <div className="p-3 rounded-lg border border-slate-200 bg-white">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${danger ? 'text-red-600' : ''}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [pwMessage, setPwMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((res) => {
        if (res?.ok && res?.data) setStats(res.data)
      })
      .catch(() => {})
  }, [])

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwMessage(null)
    setPwLoading(true)
    try {
      const res = await fetch('/api/auth/admin-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.ok) {
        setPwMessage({ type: 'ok', text: '비밀번호가 변경되었습니다.' })
        setCurrentPassword('')
        setNewPassword('')
      } else {
        setPwMessage({ type: 'err', text: data?.error || '변경에 실패했습니다.' })
      }
    } catch {
      setPwMessage({ type: 'err', text: '요청 중 오류가 발생했습니다.' })
    } finally {
      setPwLoading(false)
    }
  }

  const fmt = (n: number) => (n ?? 0).toLocaleString('ko-KR')
  const won = (n: number) => `₩${fmt(n ?? 0)}`

  return (
    <div className="min-h-full flex flex-col">
      <div className="max-w-6xl mx-auto w-full space-y-8 pb-12">
        {stats && (
          <>
            <section>
              <h2 className="text-sm font-medium text-gray-700 mb-3">사용자·가입</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <Card label="전체 사용자" value={fmt(Number(stats.usersTotal ?? stats.userCount ?? 0))} />
                <Card label="활성(30일 내 로그인)" value={fmt(Number(stats.usersActive30d ?? 0))} />
                <Card label="유료 플랜(활성 구독)" value={fmt(Number(stats.usersPaidActive ?? 0))} />
                <Card label="무료(FREE 활성)" value={fmt(Number(stats.usersFreeActive ?? 0))} />
                <Card label="신규 오늘" value={fmt(Number(stats.signupsToday ?? 0))} />
                <Card label="신규 7일" value={fmt(Number(stats.signupsLast7d ?? 0))} />
                <Card label="신규 30일" value={fmt(Number(stats.signupsLast30d ?? 0))} />
                <Card label="한도 초과 추정" value={fmt(Number(stats.usersOverQuotaApprox ?? 0))} sub="이번 달 생성 한도 도달" danger={Number(stats.usersOverQuotaApprox) > 0} />
              </div>
            </section>
            <section>
              <h2 className="text-sm font-medium text-gray-700 mb-3">생성·저장·오류</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <Card label="월간 생성 건수(쿼터 합)" value={fmt(Number(stats.monthlyGenerationCount ?? 0))} />
                <Card label="저장된 견적(글) 수" value={fmt(Number(stats.quotesSavedTotal ?? stats.quoteCountTotal ?? 0))} />
                <Card label="총 견적 행 수" value={fmt(Number(stats.quoteCountTotal ?? 0))} />
                <Card label="24h 생성" value={fmt(Number(stats.quoteCountLast24h ?? 0))} />
                <Card label="7일 생성" value={fmt(Number(stats.quoteCountLast7d ?? 0))} />
                <Card label="24h 관리자 에러 이벤트" value={fmt(Number(stats.errorsLast24h ?? 0))} danger={Number(stats.errorsLast24h) > 0} />
                <Card label="7일 생성 실패" value={fmt(Number(stats.generationFailuresLast7d ?? 0))} danger={Number(stats.generationFailuresLast7d) > 0} />
                <Card label="DB" value={stats.hasDatabase ? '연결' : '미설정'} />
              </div>
            </section>
            <section>
              <h2 className="text-sm font-medium text-gray-700 mb-3">결제·구독 요약</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <Card label="오늘 승인 건수" value={fmt(Number(stats.paymentsApprovedToday ?? 0))} />
                <Card label="이번 달 승인 건수" value={fmt(Number(stats.paymentsApprovedMonth ?? 0))} />
                <Card label="오늘 매출" value={won(Number(stats.revenueTodayKrw ?? 0))} />
                <Card label="이번 달 매출" value={won(Number(stats.revenueMonthKrw ?? 0))} />
                <Card label="오늘 결제 실패" value={fmt(Number(stats.paymentsFailedToday ?? 0))} danger />
                <Card label="이번 달 실패" value={fmt(Number(stats.paymentsFailedMonth ?? 0))} danger={Number(stats.paymentsFailedMonth) > 0} />
                <Card label="이번 달 성공률" value={`${stats.paymentSuccessRateMonth ?? 0}%`} />
                <Card label="30일 환불/취소 건" value={fmt(Number(stats.refundsCanceledOrders30d ?? 0))} />
                <Card label="활성 유료 구독 레코드" value={fmt(Number(stats.subscriptionsActivePaid ?? 0))} />
              </div>
              {stats.revenueLast7Days && stats.revenueLast7Days.length > 0 && (
                <div className="mt-3 p-3 rounded-lg border border-slate-200 bg-white text-xs">
                  <p className="font-medium text-gray-700 mb-2">최근 7일 매출 추이</p>
                  <div className="flex flex-wrap gap-3">
                    {stats.revenueLast7Days.map((d) => (
                      <span key={d.date} className="tabular-nums">
                        {d.date}: {won(d.amountKrw)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {stats.planPaymentShare && stats.planPaymentShare.length > 0 && (
                <div className="mt-3 p-3 rounded-lg border border-slate-200 bg-white text-xs">
                  <p className="font-medium text-gray-700 mb-2">플랜별 결제(이번 달)</p>
                  <ul className="space-y-1">
                    {stats.planPaymentShare.map((p) => (
                      <li key={p.planType}>
                        {p.planType}: {p.count}건 · {won(p.revenueKrw)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {stats.recentPayments && stats.recentPayments.length > 0 && (
                <div className="mt-3 p-3 rounded-lg border border-slate-200 bg-white text-xs">
                  <p className="font-medium text-gray-700 mb-2">최근 결제</p>
                  <ul className="font-mono text-[11px] space-y-0.5">
                    {stats.recentPayments.slice(0, 8).map((p) => (
                      <li key={p.orderId}>
                        {p.orderId.slice(0, 20)}… {won(p.amount)} {p.approvedAt?.slice(0, 19) ?? ''}
                      </li>
                    ))}
                  </ul>
                  <Link href="/admin/payments" className="text-primary-600 mt-2 inline-block">
                    결제 관리 전체 →
                  </Link>
                </div>
              )}
            </section>
          </>
        )}

        <section>
          <h2 className="text-sm font-medium text-gray-700 mb-3">운영 바로가기</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ADMIN_LINKS.map(({ href, label, desc, external }) => (
              <li key={href}>
                {external ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg border border-slate-200 bg-white hover:border-primary-300"
                  >
                    <span className="font-medium text-gray-900">{label}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </a>
                ) : (
                  <Link href={href} className="block p-3 rounded-lg border border-slate-200 bg-white hover:border-primary-300">
                    <span className="font-medium text-gray-900">{label}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-medium text-gray-700 mb-3">비밀번호 변경</h2>
          <form onSubmit={onChangePassword} className="space-y-3 max-w-sm">
            {pwMessage && (
              <p className={`text-sm px-3 py-2 rounded-md ${pwMessage.type === 'ok' ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {pwMessage.text}
              </p>
            )}
            <div>
              <label className="block text-sm text-gray-600 mb-1">현재 비밀번호</label>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <button type="button" onClick={() => setShowCurrentPassword((v) => !v)} className="text-xs mt-1 text-gray-500">
                {showCurrentPassword ? '숨김' : '보기'}
              </button>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">새 비밀번호</label>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <button type="button" onClick={() => setShowNewPassword((v) => !v)} className="text-xs mt-1 text-gray-500">
                {showNewPassword ? '숨김' : '보기'}
              </button>
            </div>
            <button type="submit" disabled={pwLoading} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
              {pwLoading ? '변경 중…' : '비밀번호 변경'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

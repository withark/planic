'use client'

import Link from 'next/link'

const CHECKLIST = [
  { step: 1, title: '테스트 결제 실행', done: '플랜 선택 → 토스 결제창 → 테스트 카드로 결제 완료' },
  { step: 2, title: 'billing_orders 반영', done: '결제 관리 페이지에서 해당 orderId가 approved로 표시되는지 확인' },
  { step: 3, title: 'subscriptions 반영', done: '구독 관리에서 해당 사용자 플랜·시작/종료일이 갱신되었는지 확인' },
  { step: 4, title: '사용자 관리 반영', done: '사용자 관리에서 해당 사용자 최근 결제일·유료 전환 여부 확인' },
  { step: 5, title: '대시보드 집계', done: '대시보드 오늘 승인·이번 달 매출·활성 유료 구독 수가 반영되는지 확인' },
  { step: 6, title: '결제 실패 시', done: '의도적으로 실패한 뒤 결제 관리에서 status=failed, 에러 로그(admin_events) 확인' },
  { step: 7, title: '환불/해지 시', done: '토스 웹훅 CANCELED 수신 시 billing_orders=canceled, 구독 canceled 반영 확인' },
]

export default function AdminPaymentTestPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">결제 테스트 체크리스트</h1>
        <Link href="/admin" className="text-sm text-primary-600">← 대시보드</Link>
      </div>
      <p className="text-sm text-gray-600">
        실제 토스 테스트 결제 1건을 진행한 뒤, 아래 항목이 관리자 화면에 반영되는지 순서대로 확인하세요.
      </p>
      <ul className="space-y-4">
        {CHECKLIST.map(({ step, title, done }) => (
          <li key={step} className="flex gap-3 p-3 rounded-lg border border-slate-200 bg-white">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-medium">
              {step}
            </span>
            <div>
              <p className="font-medium text-gray-900">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{done}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-sm">
        <p className="font-medium text-gray-800 mb-2">연동 흐름 요약</p>
        <ul className="text-gray-600 space-y-1 text-xs">
          <li>· 결제 성공: 클라이언트 → POST /api/billing/confirm → markBillingOrderApproved + setActiveSubscription</li>
          <li>· 웹훅(운영): PAYMENT_STATUS_CHANGED DONE → 동일 갱신 (멱등 처리)</li>
          <li>· 실패: confirm 실패 시 markBillingOrderFailed + admin_events warn</li>
          <li>· 환불/취소: 웹훅 CANCELED → markBillingOrderCanceled + cancelActiveSubscription</li>
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/payments" className="text-sm text-primary-600 hover:underline">결제 관리 →</Link>
        <Link href="/admin/subscriptions" className="text-sm text-primary-600 hover:underline">구독 현황 →</Link>
        <Link href="/admin/users" className="text-sm text-primary-600 hover:underline">사용자 관리 →</Link>
      </div>
    </div>
  )
}

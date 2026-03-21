import { redirect } from 'next/navigation'

/** 결제 플로우 하위 경로만 존재했고 루트가 비어 404가 났음 — 요금제 선택은 /plans */
export default function BillingIndexPage() {
  redirect('/plans')
}

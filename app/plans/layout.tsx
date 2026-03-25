import type { Metadata } from 'next'

const title = '요금제 · 플래닉 Planic'
const description = '플래닉 요금제와 월간·연간 결제 안내입니다.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description },
  twitter: { title, description },
}

export default function PlansLayout({ children }: { children: React.ReactNode }) {
  return children
}

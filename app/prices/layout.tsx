import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '단가표 · 플래닉 Planic',
}

export default function PricesLayout({ children }: { children: React.ReactNode }) {
  return children
}

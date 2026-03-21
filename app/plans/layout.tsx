import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '요금제 · 플래닉 Planic',
}

export default function PlansLayout({ children }: { children: React.ReactNode }) {
  return children
}

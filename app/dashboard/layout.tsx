import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '홈 · 플래닉 Planic',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}

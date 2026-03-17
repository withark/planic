'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'

type Props = {
  children: React.ReactNode
  session?: Session | null
}

/**
 * useSession()을 쓰는 컴포넌트(StartNowLink 등)가 Provider 없이 호출되면
 * MessagePort 등 내부 오류가 발생할 수 있어, 항상 NextAuthSessionProvider를 렌더.
 */
export function SessionProvider({ children, session }: Props) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  )
}

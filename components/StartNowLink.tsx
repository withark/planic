'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { buildStartHref } from '@/lib/auth-redirect'

const TARGET = '/generate'

type Props = {
  className?: string
  /** 메인 CTA일 때만 children 사용. nav일 때는 children 없이 라벨 자동 */
  children?: React.ReactNode
  variant?: 'cta' | 'nav'
  /** 서버에서 계산한 초기 href. 로딩 중·첫 클릭 시 즉시 이 주소로 이동해 로그인 화면이 바로 보이게 함 */
  initialHref?: string
}

export function StartNowLink({ className, children, variant = 'cta', initialHref }: Props) {
  const { data: session, status } = useSession()
  const isAuth = !!session?.user
  const clientHref = buildStartHref({ isAuthenticated: isAuth, targetPath: TARGET })
  const href = status === 'loading' && initialHref ? initialHref : clientHref
  const loadingNavLabel =
    initialHref?.startsWith('/auth') ? '로그인 / 시작하기' : '견적 만들기'
  const label =
    variant === 'nav'
      ? status === 'loading'
        ? loadingNavLabel
        : isAuth
          ? '견적 만들기'
          : '로그인 / 시작하기'
      : children
  const navClass =
    variant === 'nav'
      ? status === 'loading'
        ? initialHref?.startsWith('/auth')
          ? 'text-primary-600 hover:text-primary-700'
          : 'text-primary-700 hover:text-primary-800'
        : isAuth
          ? 'text-primary-700 hover:text-primary-800'
          : 'text-primary-600 hover:text-primary-700'
      : ''
  const finalClass = [className, navClass].filter(Boolean).join(' ')

  return (
    <Link href={href} className={finalClass} aria-busy={status === 'loading'}>
      {label}
    </Link>
  )
}

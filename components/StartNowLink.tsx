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
}

export function StartNowLink({ className, children, variant = 'cta' }: Props) {
  const { data: session, status } = useSession()
  const isAuth = !!session?.user
  const href = buildStartHref({ isAuthenticated: isAuth, targetPath: TARGET })
  const label = variant === 'nav' ? (isAuth ? '견적 만들기' : '로그인 / 시작하기') : children
  const navClass =
    variant === 'nav'
      ? isAuth
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

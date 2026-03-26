import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { findCredentialUserForAuth, normalizeCredentialLogin } from '@/lib/db/users-db'

export function isEmailPasswordAuthEnabled(): boolean {
  const flag = (process.env.ENABLE_EMAIL_PASSWORD_AUTH || '').trim() === '1'
  // 로컬 개발(임시 테스트)은 기본 활성화. 운영/프리뷰(대개 NODE_ENV=production)는 비활성.
  const devDefault = process.env.NODE_ENV === 'development'
  return flag || devDefault
}

export function emailPasswordCredentialsProvider(): NextAuthOptions['providers'][number] {
  return CredentialsProvider({
    id: 'email-password',
    name: 'EmailPassword',
    credentials: {
      username: { label: '아이디', type: 'text' },
      password: { label: '비밀번호', type: 'password' },
    },
    async authorize(credentials) {
      if (!isEmailPasswordAuthEnabled()) return null
      const rawLogin = (credentials?.username || '').toString()
      const email = normalizeCredentialLogin(rawLogin)
      const password = (credentials?.password || '').toString()
      if (!email || !password) return null
      const row = await findCredentialUserForAuth(email)
      if (!row?.passwordHash) return null
      const ok = await bcrypt.compare(password, row.passwordHash)
      if (!ok) return null
      return {
        id: row.id,
        email: row.email,
        name: row.name || '',
        image: row.image || '',
      }
    },
  })
}

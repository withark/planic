#!/usr/bin/env node
/**
 * Vercel Production + planic.cloud 배포 시 NEXTAUTH_SECRET 필수.
 * 누락 시 middleware getToken 이 영구 실패함.
 */
const vercelEnv = process.env.VERCEL_ENV || ''
const nextAuthUrl = (process.env.NEXTAUTH_URL || '').trim().replace(/\/+$/, '')
const secret = (process.env.NEXTAUTH_SECRET || '').trim()
const isPlanic = /^https:\/\/(www\.)?planic\.cloud$/i.test(nextAuthUrl)

if (vercelEnv === 'production' && isPlanic && !secret) {
  console.error(
    '[check-auth-env] Production 배포에서 NEXTAUTH_SECRET 이 비어 있습니다. Vercel Environment Variables 에 설정하세요.'
  )
  process.exit(1)
}
process.exit(0)

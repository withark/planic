#!/usr/bin/env node
/**
 * 관리자 비밀번호 해시 생성 스크립트.
 *
 * 사용:
 *   ADMIN_SECRET='(NEXTAUTH_SECRET 또는 ADMIN_SECRET)' node scripts/hash-admin-password.js 'MyStrongPassword!'
 *
 * 출력:
 *   base64 해시 문자열 (DB app_kv.key='admin_password_hash' value로 저장)
 */
const { scryptSync } = require('crypto')

const password = process.argv[2]
if (!password || typeof password !== 'string' || !password.trim()) {
  console.error("Usage: ADMIN_SECRET='...' node scripts/hash-admin-password.js 'password'")
  process.exit(1)
}

const secret = (process.env.NEXTAUTH_SECRET || process.env.ADMIN_SECRET || '').trim()
if (!secret) {
  console.error('Missing secret. Set NEXTAUTH_SECRET or ADMIN_SECRET in environment.')
  process.exit(1)
}
if (secret.length < 32) {
  console.error('Secret must be at least 32 characters.')
  process.exit(1)
}

const hash = scryptSync(password, secret, 64).toString('base64')
process.stdout.write(hash + '\n')


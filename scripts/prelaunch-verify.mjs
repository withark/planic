#!/usr/bin/env node
/**
 * 서비스 오픈 직전 통합 게이트:
 * Build → prod next start → Health/API/Admin 응답 → 관리자 보안 스크립트 → Playwright → npm audit high
 *
 * DB는 Neon Postgres(DATABASE_URL)이며 Supabase 미사용. Playwright 단계는 PLAYWRIGHT_NO_REUSE=1로
 * 기존 로컬 dev 서버(DEV_AUTH 불일치) 재사용으로 인한 E2E 플레이크를 방지합니다.
 */
import { spawn, spawnSync } from 'child_process'

const PORT = process.env.PRELAUNCH_PORT || '3012'
const BASE = `http://127.0.0.1:${PORT}`

function runSync(label, cmd, args) {
  console.log(`[prelaunch] ${label}…`)
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: process.cwd(), shell: false })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

async function waitForServer(maxMs = 90000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(`${BASE}/api/health`)
      if (res.status === 200 || res.status === 503) return
    } catch {
      /* server booting */
    }
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error(`Server did not respond within ${maxMs}ms`)
}

async function main() {
  runSync('npm run typecheck', 'npm', ['run', 'typecheck'])
  runSync('npm run build', 'npm', ['run', 'build'])

  console.log(`[prelaunch] next start (production) → ${BASE}`)
  const env = {
    ...process.env,
    PORT,
    NODE_ENV: 'production',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'prelaunch-nextauth-secret-min-32-characters',
    ADMIN_SECRET: process.env.ADMIN_SECRET || 'prelaunch-admin-secret-min-32-characters-xx',
  }

  const child = spawn('npx', ['next', 'start', '-p', PORT], {
    cwd: process.cwd(),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  try {
    await waitForServer()
    console.log('[prelaunch] Runtime: server up')

    const health = await fetch(`${BASE}/api/health`)
    console.log('[prelaunch] GET /api/health →', health.status)
    if (![200, 503].includes(health.status)) {
      throw new Error(`Health unexpected status ${health.status}`)
    }

    const me = await fetch(`${BASE}/api/me`)
    if (me.status !== 401) {
      throw new Error(`GET /api/me must be 401 without session, got ${me.status}`)
    }
    console.log('[prelaunch] Auth: GET /api/me → 401')

    const adminStats = await fetch(`${BASE}/api/admin/stats`)
    if (adminStats.status !== 401) {
      throw new Error(`GET /api/admin/stats must be 401 without admin cookie, got ${adminStats.status}`)
    }
    console.log('[prelaunch] Admin API: GET /api/admin/stats → 401')

    const home = await fetch(BASE)
    if (!home.ok) {
      throw new Error(`GET / failed ${home.status}`)
    }
    console.log('[prelaunch] Runtime: GET / →', home.status)
  } finally {
    child.kill('SIGTERM')
    await new Promise((r) => setTimeout(r, 800))
    try {
      child.kill('SIGKILL')
    } catch {
      /* ignore */
    }
  }

  runSync('test:admin-auth-security', 'npm', ['run', 'test:admin-auth-security'])

  console.log('[prelaunch] Playwright (smoke + mobile + authenticated-flow)…')
  const pw = spawnSync(
    'npx',
    ['playwright', 'test', 'e2e/smoke.spec.ts', 'e2e/mobile-public.spec.ts', 'e2e/authenticated-flow.spec.ts'],
    {
      stdio: 'inherit',
      cwd: process.cwd(),
      shell: false,
      env: { ...process.env, PLAYWRIGHT_NO_REUSE: '1' },
    },
  )
  if (pw.status !== 0) process.exit(pw.status ?? 1)

  console.log('[prelaunch] npm audit --audit-level=high …')
  const audit = spawnSync('npm', ['audit', '--audit-level=high', '--omit=dev'], {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: false,
  })
  if (audit.status !== 0) process.exit(audit.status ?? 1)

  console.log('')
  console.log('[prelaunch] ✅ ALL GATES PASS (Build, Runtime, Auth, Admin API, Mobile E2E, API audit behavior, Security high)')
}

main().catch((e) => {
  console.error('[prelaunch] FAILED:', e)
  process.exit(1)
})

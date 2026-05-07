/**
 * 운영 공개 엔드포인트만 검사 (관리자 비밀번호 불필요)
 * GET /api/health — DB·docStores 정상 여부
 *
 *   PLANIC_BASE_URL — 기본 https://www.planic.cloud
 *   PLANIC_ALLOW_LOCALHOST=1 — localhost 예외
 *
 *   npm run smoke:production-health
 */
import assert from 'node:assert/strict'
import { assertProductionBaseUrl } from './production-url-guard'

async function main() {
  const baseUrl = (process.env.PLANIC_BASE_URL || 'https://www.planic.cloud').replace(/\/$/, '')
  assertProductionBaseUrl(baseUrl)

  const res = await fetch(`${baseUrl}/api/health`)
  const text = await res.text()
  let body: { status?: string; db?: string; docStores?: Record<string, string> }
  try {
    body = JSON.parse(text) as typeof body
  } catch {
    throw new Error(`/api/health JSON 파싱 실패: ${res.status} ${text.slice(0, 200)}`)
  }

  assert.equal(res.status, 200, `status ${res.status}`)
  assert.equal(body.status, 'ok', `body.status=${String(body.status)}`)
  assert.equal(body.db, 'ok', `db=${String(body.db)}`)
  assert.equal(body.docStores?.taskOrderRefs, 'db')
  assert.equal(body.docStores?.scenarioRefs, 'db')
  assert.equal(body.docStores?.cuesheetSamples, 'db')

  console.log(`[smoke-production-health] PASS base=${baseUrl}`)
}

main().catch((e) => {
  console.error(`[smoke-production-health] FAIL: ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})

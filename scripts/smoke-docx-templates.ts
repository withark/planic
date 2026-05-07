/**
 * 템플릿 DOCX 생성기·플랜 가드 스모크 (네트워크·서버 불필요)
 */
import assert from 'node:assert/strict'
import { isFeatureAllowedForPlan } from '../lib/plan-access'
import { generateProposalBasic } from '../lib/docx/templates/proposalBasic'
import { generateProposalDetail } from '../lib/docx/templates/proposalDetail'
import { generateProposalWithQuote } from '../lib/docx/templates/proposalWithQuote'

async function main() {
  const minimal = {
    eventName: '스모크 테스트 행사',
    companyName: '테스트컴퍼니',
    managerName: '홍길동',
    contact: '010-0000-0000',
    email: 'smoke@test.local',
  }

  const a = await generateProposalBasic(minimal)
  const b = await generateProposalDetail(minimal)
  const c = await generateProposalWithQuote({
    ...minimal,
    totalAmount: '1,000,000',
    clientCompany: '발주처',
    clientName: '김담당',
  })

  assert.ok(Buffer.isBuffer(a) && a.length > 2000, 'proposalBasic buffer')
  assert.ok(Buffer.isBuffer(b) && b.length > 2000, 'proposalDetail buffer')
  assert.ok(Buffer.isBuffer(c) && c.length > 2000, 'proposalWithQuote buffer')

  assert.equal(isFeatureAllowedForPlan('FREE', 'pricingTable'), false)
  assert.equal(isFeatureAllowedForPlan('BASIC', 'pricingTable'), true)

  console.log('smoke-docx-templates passed')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

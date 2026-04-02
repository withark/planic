import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { chromium } from 'playwright'

const BASE_URL = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:3100'
const DEV_SECRET = process.env.VISUAL_DEV_SECRET || 'playwright-secret'
const OUT_DIR = join(process.cwd(), 'tmp-e2e', `visual-compare-${Date.now()}`)
const TARGET_PATH = join(OUT_DIR, 'planning-render.png')

const REFS = [
  '/Users/oners/.cursor/projects/Users-oners-Desktop-planic/assets/cca237f3-d66d-4701-8034-1f851cf83f11-beb8c7d3-b12a-46e7-9efc-fbe3e107ed00.png',
  '/Users/oners/.cursor/projects/Users-oners-Desktop-planic/assets/91c84b9a-4a2e-4132-963d-93e21fbcc6e1-36a2b45d-1e77-4c9b-ab01-dda7a7af4e21.png',
  '/Users/oners/.cursor/projects/Users-oners-Desktop-planic/assets/b0ff3a3f-d7f0-443c-b039-601f6a515aa7-393eec66-df8e-45b4-a3fc-c312de31c8c6.png',
  '/Users/oners/.cursor/projects/Users-oners-Desktop-planic/assets/1f9b2552-167a-4ffe-9a29-1d1221417188-da6c61f2-2cf6-46c9-8269-c3f2f82f7dce.png',
]

async function loginWithDevProvider(page, baseUrl) {
  const req = page.context().request
  const username = `visual_${Math.random().toString(36).slice(2, 10)}`
  const password = `Visual!${Math.random().toString(36).slice(2, 10)}`

  const reg = await req.post(`${baseUrl}/api/auth/register`, {
    data: { username, password, name: 'Visual Compare' },
    headers: { 'content-type': 'application/json' },
  })
  if (!reg.ok()) throw new Error(`register 실패: ${reg.status()}`)

  const csrfRes = await req.get(`${baseUrl}/api/auth/csrf`)
  const csrf = await csrfRes.json()
  if (!csrf?.csrfToken) throw new Error('csrfToken 누락')

  const login = await req.post(`${baseUrl}/api/auth/callback/email-password`, {
    form: {
      csrfToken: csrf.csrfToken,
      username,
      password,
      callbackUrl: `${baseUrl}/planning-generator`,
      json: 'true',
    },
  })
  if (!login.ok()) throw new Error(`email-password login 실패: ${login.status()}`)

  await page.goto(`${baseUrl}/planning-generator`, { waitUntil: 'domcontentloaded' })
}

async function capturePlanningScreenshot() {
  mkdirSync(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } })
  const page = await context.newPage()
  try {
    await loginWithDevProvider(page, BASE_URL)
    await page.goto(`${BASE_URL}/planning-generator`, { waitUntil: 'domcontentloaded' })
    await page.locator('input[placeholder*="기업 워크숍"]').first().fill('세대공감 팀빌딩 프로그램')
    await page.locator('textarea[placeholder*="참석자들이 핵심 메시지"]').first().fill('세대 간 협업 증진과 실행 가능한 액션플랜 도출')
    await page.locator('button:has-text("기획 문서 생성")').first().click()
    await page.waitForSelector('.planning-word-sheet', { timeout: 180_000 })
    const node = page.locator('.planning-word-sheet').first()
    await node.screenshot({ path: TARGET_PATH })
  } finally {
    await context.close()
    await browser.close()
  }
}

async function compareWithRef(refPath, targetPath) {
  const refMeta = await sharp(refPath).metadata()
  const targetMeta = await sharp(targetPath).metadata()
  const width = 900
  const refResized = await sharp(refPath).resize({ width, fit: 'inside' }).grayscale().raw().toBuffer({ resolveWithObject: true })
  const targetResized = await sharp(targetPath).resize({ width, fit: 'inside' }).grayscale().raw().toBuffer({ resolveWithObject: true })

  const w = Math.min(refResized.info.width, targetResized.info.width)
  const h = Math.min(refResized.info.height, targetResized.info.height)
  const refCrop = await sharp(refResized.data, { raw: refResized.info }).extract({ left: 0, top: 0, width: w, height: h }).raw().toBuffer()
  const targetCrop = await sharp(targetResized.data, { raw: targetResized.info }).extract({ left: 0, top: 0, width: w, height: h }).raw().toBuffer()

  let sumAbs = 0
  for (let i = 0; i < refCrop.length; i += 1) {
    sumAbs += Math.abs(refCrop[i] - targetCrop[i])
  }
  const mae = sumAbs / refCrop.length

  return {
    refPath,
    refSize: { width: refMeta.width, height: refMeta.height },
    targetSize: { width: targetMeta.width, height: targetMeta.height },
    comparedArea: { width: w, height: h },
    mae,
  }
}

async function main() {
  await capturePlanningScreenshot()
  const results = []
  for (const ref of REFS) {
    results.push(await compareWithRef(ref, TARGET_PATH))
  }
  const out = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    targetPath: TARGET_PATH,
    refs: results,
  }
  const resultPath = join(OUT_DIR, 'visual-compare-result.json')
  writeFileSync(resultPath, JSON.stringify(out, null, 2))
  console.log(`VISUAL_COMPARE_RESULT=${resultPath}`)
  console.log(`VISUAL_TARGET_SCREENSHOT=${TARGET_PATH}`)
}

main().catch((e) => {
  console.error(`VISUAL_COMPARE_FAILED=${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})

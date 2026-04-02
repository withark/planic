import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const nowTag = () => {
  const d = new Date()
  const z = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function signupAndLogin(page, baseUrl, callbackPath) {
  const req = page.context().request
  const username = `audit_${Math.random().toString(36).slice(2, 10)}`
  const password = `Audit!${Math.random().toString(36).slice(2, 10)}`

  const csrfRes = await req.get(`${baseUrl}/api/auth/csrf`)
  const csrf = await csrfRes.json().catch(() => null)
  if (!csrf?.csrfToken) throw new Error('csrfToken 누락')

  let loggedIn = false
  try {
    const reg = await req.post(`${baseUrl}/api/auth/register`, {
      data: { username, password, name: 'Runtime Audit' },
      headers: { 'content-type': 'application/json' },
    })
    if (reg.ok()) {
      const login = await req.post(`${baseUrl}/api/auth/callback/email-password`, {
        form: {
          csrfToken: csrf.csrfToken,
          username,
          password,
          callbackUrl: `${baseUrl}${callbackPath}`,
          json: 'true',
        },
      })
      loggedIn = login.ok()
    }
  } catch {
    loggedIn = false
  }

  if (!loggedIn) {
    const devSecret = process.env.AUDIT_DEV_AUTH_SECRET || 'playwright-secret'
    const devEmail = `${username}@dev.local`
    const devLogin = await req.post(`${baseUrl}/api/auth/callback/dev-login`, {
      form: {
        csrfToken: csrf.csrfToken,
        email: devEmail,
        secret: devSecret,
        callbackUrl: `${baseUrl}${callbackPath}`,
        json: 'true',
      },
    })
    if (!devLogin.ok()) {
      throw new Error(`로그인 실패 status=${devLogin.status()}`)
    }
  }

  await page.goto(`${baseUrl}${callbackPath}`, { waitUntil: 'domcontentloaded' })
  await wait(1000)
  return { username }
}

async function measureLayout(page, baseUrl, path, screenshotPath) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' })
  await wait(1500)
  const measured = await page.evaluate((pathname) => {
    const isVisible = (el) => {
      if (!(el instanceof HTMLElement)) return false
      const rect = el.getBoundingClientRect()
      if (rect.width < 40 || rect.height < 40) return false
      const style = getComputedStyle(el)
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
    }
    const toBox = (el) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
    }

    let inputPanel = null
    let resultPanel = null
    if (pathname === '/estimate-generator') {
      const grid = document.querySelector('div.grid.h-full.gap-6')
      if (grid) {
        const kids = Array.from(grid.children).filter(isVisible)
        inputPanel = kids[0] || null
        resultPanel = kids[1] || null
      }
    } else if (pathname === '/planning-generator' || pathname === '/program-proposal-generator') {
      const container = document.querySelector('div.flex-1.overflow-y-auto.p-6.space-y-6')
      if (container) {
        const kids = Array.from(container.children).filter(isVisible)
        inputPanel = kids[0] || null
        resultPanel = kids[1] || null
      }
    }

    if (!inputPanel || !resultPanel) {
      const wizard = Array.from(document.querySelectorAll('div')).find((el) => {
        if (!isVisible(el)) return false
        const text = el.textContent || ''
        return text.includes('바로 전달 가능한 문서 생성') && !!el.querySelector('#wizard-step-1')
      })
      if (wizard) {
        inputPanel = wizard
        let container = wizard.parentElement
        while (container) {
          const children = Array.from(container.children).filter(isVisible)
          if (children.length >= 2) {
            const idx = children.findIndex((el) => el === wizard || el.contains(wizard))
            if (idx >= 0) {
              resultPanel = children.find((_, i) => i !== idx) || null
              if (resultPanel) break
            }
          }
          container = container.parentElement
        }
      }
    }

    const inputBox = toBox(inputPanel)
    const resultBox = toBox(resultPanel)
    let judgement = 'unknown'
    if (inputBox && resultBox) {
      if (resultBox.x > inputBox.x + Math.min(160, Math.floor(inputBox.width * 0.2)) && Math.abs(resultBox.y - inputBox.y) <= 80) {
        judgement = 'right'
      } else if (resultBox.y > inputBox.y + Math.min(160, Math.floor(inputBox.height * 0.15))) {
        judgement = 'bottom'
      }
    }
    return { inputPanel: inputBox, resultPanel: resultBox, judgement }
  }, path)

  await page.screenshot({ path: screenshotPath, fullPage: true })
  return {
    path,
    url: `${baseUrl}${path}`,
    viewport: page.viewportSize(),
    inputPanel: measured.inputPanel,
    resultPanel: measured.resultPanel,
    judgement: measured.judgement,
    screenshotPath,
  }
}

async function runGenerateMeasures(page, baseUrl) {
  const data = await page.evaluate(async (base) => {
    const estimateBody = {
      eventName: '2026 Planic 운영 검증 행사',
      clientName: '플래닉',
      clientManager: '운영팀',
      clientTel: '02-0000-0000',
      quoteDate: '2026-04-02',
      eventDate: '2026-05-10',
      eventDuration: '3시간',
      eventStartHHmm: '13:00',
      eventEndHHmm: '16:00',
      headcount: '220명',
      venue: '코엑스 오디토리움',
      eventType: '컨퍼런스',
      budget: '중규모 (300~1,000만원)',
      requirements: '실행형 액션플랜 중심, 리스크 대응과 체크리스트를 누락 없이 포함',
      briefGoal: '행사 종료 후 재계약 전환율 개선',
      briefNotes: 'VIP 동선 분리, 전환 지연 최소화',
      documentTarget: 'estimate',
      generationMode: 'normal',
    }

    const callGenerate = async (target, mode, body) => {
      const started = performance.now()
      const res = await fetch(`${base}/api/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, streamProgress: mode === 'stream' }),
      })
      const ttfbMs = Math.round(performance.now() - started)
      let payload = null
      if (mode === 'stream') {
        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        let text = ''
        if (reader) {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            text += decoder.decode(value, { stream: true })
          }
        }
        const events = text
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            try {
              return JSON.parse(line)
            } catch {
              return null
            }
          })
          .filter(Boolean)
        payload = events.find((e) => e.type === 'complete') || events.find((e) => e.type === 'error') || null
      } else {
        payload = await res.json().catch(() => null)
      }
      const totalMs = Math.round(performance.now() - started)
      const docPayload = payload?.doc || payload?.data?.doc || null
      return {
        target,
        mode,
        status: res.status,
        ok: res.ok && !!docPayload,
        ttfbMs,
        totalMs,
        hasDoc: !!docPayload,
        errorCode: payload?.error?.code || payload?.code,
        errorMessage: payload?.error?.message || payload?.message,
        payload,
      }
    }

    const measures = []
    const snapshots = {}

    const estimateNon = await callGenerate('estimate', 'non_stream', estimateBody)
    measures.push(estimateNon)
    if (estimateNon.payload?.doc || estimateNon.payload?.data?.doc) snapshots.estimateDoc = estimateNon.payload?.doc || estimateNon.payload?.data?.doc

    const estimateStream = await callGenerate('estimate', 'stream', estimateBody)
    measures.push(estimateStream)

    const existingDoc = estimateNon.payload?.doc || estimateNon.payload?.data?.doc || estimateStream.payload?.doc || null
    if (!existingDoc) return { measures, snapshots }

    const planningBody = {
      ...estimateBody,
      documentTarget: 'planning',
      existingDoc,
      briefGoal: '실행형 운영 계획으로 내부 승인',
      briefNotes: '체크리스트/리스크/액션플랜 중심',
    }
    const planningNon = await callGenerate('planning', 'non_stream', planningBody)
    measures.push(planningNon)
    if (planningNon.payload?.doc || planningNon.payload?.data?.doc) snapshots.planningDoc = planningNon.payload?.doc || planningNon.payload?.data?.doc
    measures.push(await callGenerate('planning', 'stream', planningBody))

    const programBody = {
      ...estimateBody,
      documentTarget: 'program',
      existingDoc,
      briefGoal: '세션 구성과 시간축 실행안을 명확화',
      briefNotes: '전환 큐와 운영 담당 명시',
    }
    const programNon = await callGenerate('program', 'non_stream', programBody)
    measures.push(programNon)
    if (programNon.payload?.doc || programNon.payload?.data?.doc) snapshots.programDoc = programNon.payload?.doc || programNon.payload?.data?.doc
    measures.push(await callGenerate('program', 'stream', programBody))

    return { measures, snapshots }
  }, baseUrl)

  const measures = data.measures.map((m) => ({
    target: m.target,
    mode: m.mode,
    status: m.status,
    ok: m.ok,
    ttfbMs: m.ttfbMs,
    totalMs: m.totalMs,
    hasDoc: m.hasDoc,
    errorCode: m.errorCode,
    errorMessage: m.errorMessage,
  }))
  return { measures, snapshots: data.snapshots }
}

function evaluatePlanningQuality(planningDoc) {
  const p = planningDoc?.planning || {}
  const checklist = Array.isArray(p.checklist) ? p.checklist.filter((v) => String(v || '').trim()) : []
  const riskText = String(p.risksAndCautions || '')
  const opText = String(p.operationPlan || '')
  const hasRisk = riskText.length >= 120
  const hasActionPlan = /1\.|2\.|단계|액션|실행|우선순위/.test(opText)
  const hasOpsPoint = /담당|동선|큐|전환|리허설|장비/.test(`${opText}\n${riskText}`)
  const score = Number(hasRisk) + Number(hasActionPlan) + Number(hasOpsPoint) + Number(checklist.length >= 8)
  return {
    checklistCount: checklist.length,
    hasRisk,
    hasActionPlan,
    hasOpsPoint,
    verdict: score >= 4 ? 'PASS' : score >= 2 ? 'PARTIAL' : 'FAIL',
  }
}

async function main() {
  const baseUrl = (process.env.AUDIT_BASE_URL || 'https://www.planic.cloud').replace(/\/$/, '')
  const viewport = { width: 1440, height: 900 }
  const tag = nowTag()
  const outDir = join(process.cwd(), 'tmp-e2e', `audit-${tag}`)
  const screenshotDir = join(outDir, 'screenshots')
  mkdirSync(screenshotDir, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  try {
    const auth = await signupAndLogin(page, baseUrl, '/estimate-generator')
    const layoutTargets = ['/estimate-generator', '/planning-generator', '/program-proposal-generator']
    const layouts = []
    for (const path of layoutTargets) {
      const screenshotPath = join(screenshotDir, `${path.replaceAll('/', '_')}.png`)
      layouts.push(await measureLayout(page, baseUrl, path, screenshotPath))
    }

    const generation = await runGenerateMeasures(page, baseUrl)
    const planningQuality = evaluatePlanningQuality(generation.snapshots.planningDoc)

    let planningSamplePath = null
    if (generation.snapshots.planningDoc) {
      planningSamplePath = join(outDir, 'planning-sample.json')
      writeFileSync(planningSamplePath, JSON.stringify(generation.snapshots.planningDoc, null, 2))
    }

    const result = {
      generatedAt: new Date().toISOString(),
      baseUrl,
      viewport,
      auth,
      layouts,
      generationMeasures: generation.measures,
      cumulativeMsByMode: {
        nonStream: generation.measures.filter((m) => m.mode === 'non_stream').reduce((sum, m) => sum + m.totalMs, 0),
        stream: generation.measures.filter((m) => m.mode === 'stream').reduce((sum, m) => sum + m.totalMs, 0),
      },
      planningQuality,
      planningSamplePath,
    }

    const resultPath = join(outDir, 'audit-result.json')
    writeFileSync(resultPath, JSON.stringify(result, null, 2))
    console.log(`AUDIT_RESULT_JSON=${resultPath}`)
    console.log(`AUDIT_SCREENSHOT_DIR=${screenshotDir}`)
    if (planningSamplePath) console.log(`AUDIT_PLANNING_SAMPLE_JSON=${planningSamplePath}`)
  } finally {
    await context.close()
    await browser.close()
  }
}

main().catch((err) => {
  console.error(`AUDIT_FAILED=${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})

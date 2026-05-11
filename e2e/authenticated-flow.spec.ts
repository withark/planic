import { expect, test, type Page } from '@playwright/test'

async function signInWithDevAuth(page: Page, callbackPath: string) {
  await page.goto('/')
  const origin = new URL(page.url()).origin
  const callbackUrl = `${origin}${callbackPath.startsWith('/') ? callbackPath : `/${callbackPath}`}`
  const uniqueEmail = `playwright+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@local`

  /** 브라우저 내 fetch만 세션 쿠키가 tab과 공유됨 (APIRequestContext만으로는 JWT가 안 붙을 수 있음) */
  await page.evaluate(
    async ({ cb, email }: { cb: string; email: string }) => {
      const csrfRes = await fetch('/api/auth/csrf')
      const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }
      const res = await fetch('/api/auth/callback/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          csrfToken,
          email,
          secret: 'playwright-secret',
          callbackUrl: cb,
          json: 'true',
        }).toString(),
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(`dev-login failed ${res.status}: ${t.slice(0, 200)}`)
      }
    },
    { cb: callbackUrl, email: uniqueEmail },
  )
}

async function authenticateFromProtectedRoute(page: Page, protectedPath: string) {
  await page.goto(protectedPath)
  await expect(page).toHaveURL(/\/auth\?/)
  await signInWithDevAuth(page, protectedPath)
  await page.goto(protectedPath)
  await expect(page).toHaveURL(new RegExp(`${protectedPath.replace('/', '\\/')}($|\\?)`))
}

async function dismissEstimatePasteGateIfPresent(page: Page) {
  const skip = page.getByRole('button', { name: '건너뛰고 단계별 입력' })
  if (await skip.isVisible().catch(() => false)) {
    await skip.click()
  }
  await page.getByTestId('macro-paste-wizard-panel').waitFor({ state: 'visible', timeout: 15_000 })
}

test.describe('authenticated generation flow', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.removeItem('planic:skip-paste-gate:estimate')
      } catch {
        /* ignore */
      }
    })
  })

  test('protected estimate-generator loads after dev auth', async ({ page }) => {
    await authenticateFromProtectedRoute(page, '/estimate-generator')
    await dismissEstimatePasteGateIfPresent(page)
    await expect(page.getByRole('heading', { level: 1, name: '행사 제안서 생성' })).toBeVisible()
    await expect(page.getByText('행사 제안서 생성하기').first()).toBeVisible()
  })

  test('업체 원문 모드에서 필수 입력 후 생성 버튼 활성화', async ({ page }) => {
    await authenticateFromProtectedRoute(page, '/estimate-generator')
    await dismissEstimatePasteGateIfPresent(page)

    await page.getByRole('radio', { name: /업체 원문만/ }).click()
    await page.locator('#wizard-step-2 select').first().selectOption({ index: 1 })
    await page.getByLabel('업체에서 들은 내용').fill(
      'Playwright E2E 테스트용 더미 텍스트입니다. 인원 80명 잠실 워크숍 견적 요약 VIP 네트워킹 포함 충분한 길이입니다.',
    )

    await expect(page.getByRole('button', { name: '행사 제안서 생성하기' })).toBeEnabled({ timeout: 15_000 })
  })

  test('퀵 칩 클릭 시 하단 작성란에 문구가 붙는다', async ({ page }) => {
    await authenticateFromProtectedRoute(page, '/estimate-generator')
    await dismissEstimatePasteGateIfPresent(page)
    await page.getByRole('button', { name: 'VAT 포함으로' }).click()
    await expect(page.getByTestId('macro-paste-composer')).toHaveValue(/VAT 포함으로/)
  })

  test('미리보기 헤더 컨트롤: 미리보기로 표시·문서 없을 때 직접 편집 비활성', async ({ page }) => {
    await authenticateFromProtectedRoute(page, '/estimate-generator')
    await dismissEstimatePasteGateIfPresent(page)
    await expect(page.getByTestId('estimate-preview-scroll-top')).toBeVisible()
    await expect(page.getByTestId('estimate-focus-table')).toBeDisabled()
  })

  test('모바일 폭에서 입력·미리보기 탭 전환', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 820 })
    await authenticateFromProtectedRoute(page, '/estimate-generator')
    await dismissEstimatePasteGateIfPresent(page)
    await expect(page.getByRole('tab', { name: '미리보기' })).toBeVisible()
    await page.getByRole('tab', { name: '미리보기' }).click()
    await expect(page.locator('#estimate-panel-chat')).toHaveAttribute('hidden', '')
    await expect(page.locator('#estimate-tab-preview')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('#estimate-panel-preview')).not.toHaveAttribute('hidden')
    await page.getByRole('tab', { name: '입력·채팅' }).click()
    await expect(page.locator('#estimate-panel-chat')).not.toHaveAttribute('hidden')
    await expect(page.locator('#estimate-panel-preview')).toHaveAttribute('hidden', '')
    await expect(page.locator('#estimate-tab-chat')).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByTestId('macro-paste-wizard-panel')).toBeVisible()
  })
})

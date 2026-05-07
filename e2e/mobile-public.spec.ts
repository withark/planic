/**
 * 좁은 뷰포트에서 공개 페이지 레이아웃 회귀 방지 (모바일 PASS 게이트).
 */
import { test, expect } from '@playwright/test'

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
})

test.describe('mobile public shell', () => {
  test('home and plans usable', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.goto('/plans')
    await expect(page.getByRole('heading', { name: '플랜 핵심 비교' })).toBeVisible()
    await expect(page.getByRole('table', { name: '무료, 베이직, 프로 플랜 비교' })).toBeVisible()
  })

  test('history route redirects unauthenticated user to auth', async ({ page }) => {
    await page.goto('/history')
    await expect(page).toHaveURL(/\/auth/)
  })
})

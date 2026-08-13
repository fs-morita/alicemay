// @ts-check
import { expect, test } from '@playwright/test'

// data-reveal のフェードインを待ってから撮影・検証するための待機
async function settle(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'))
  })
  await page.waitForTimeout(400)
}

test('トップページが表示され、主要セクションが揃っている', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/AliceMay/)
  await expect(page.locator('h1')).toHaveText('AliceMay')

  for (const id of ['about', 'works', 'features', 'flow', 'instagram', 'faq']) {
    await expect(page.locator(`#${id}`)).toBeAttached()
  }
})

test('全ページのスクリーンショットを撮る', async ({ page }, testInfo) => {
  await page.goto('/')
  await settle(page)
  await page.screenshot({
    path: `screenshots/${testInfo.project.name}-full.png`,
    fullPage: true,
  })
})

test('ヒーローの動画が再生される', async ({ page }) => {
  await page.goto('/')

  const active = page.locator('.hero-media video.is-active')
  await expect(active).toHaveCount(1, { timeout: 10_000 })

  // src が差し込まれ、実際に再生位置が進んでいること
  await expect(active).toHaveAttribute('src', /hero-0\d\.mp4/)
  await page.waitForTimeout(1200)
  const currentTime = await active.evaluate((v) => /** @type {HTMLVideoElement} */ (v).currentTime)
  expect(currentTime).toBeGreaterThan(0)
})

test('モバイルでナビが開閉する', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop', 'デスクトップではドロワーを使わない')

  await page.goto('/')
  const toggle = page.locator('[data-nav-toggle]')
  const nav = page.locator('[data-nav]')

  await expect(nav).not.toHaveClass(/is-open/)
  await toggle.click()
  await expect(nav).toHaveClass(/is-open/)
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')

  await page.keyboard.press('Escape')
  await expect(nav).not.toHaveClass(/is-open/)
})

test('FAQ のアコーディオンが開く', async ({ page }) => {
  await page.goto('/')
  const first = page.locator('.faq-item').first()

  await expect(first).not.toHaveAttribute('open', '')
  await first.locator('summary').click()
  await expect(first).toHaveAttribute('open', '')
})

test('外部リンクがすべて生きている', async ({ page, request }) => {
  await page.goto('/')

  const hrefs = await page.locator('a[href^="http"]').evaluateAll((links) =>
    [...new Set(links.map((a) => /** @type {HTMLAnchorElement} */ (a).href))]
  )
  expect(hrefs.length).toBeGreaterThan(0)

  const broken = []
  for (const href of hrefs) {
    const res = await request.get(href, { failOnStatusCode: false, timeout: 20_000 })
    // Instagram はボット判定で 4xx を返すことがあるため除外する
    if (res.status() >= 400 && !href.includes('instagram.com')) {
      broken.push(`${res.status()} ${href}`)
    }
  }
  expect(broken, `リンク切れ:\n${broken.join('\n')}`).toEqual([])
})

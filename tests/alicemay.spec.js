// @ts-check
import { expect, test } from '@playwright/test'

// data-reveal のフェードインと遅延読み込み画像を片付けてから撮影・検証する
async function settle(page) {
  await page.evaluate(async () => {
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'))

    // 画面外の画像は lazy のままだと読み込まれず fullPage 撮影に写らない。
    // 属性を外したうえで一度スクロールして通過させる。
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => img.removeAttribute('loading'))

    const step = window.innerHeight
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 80))
    }
    window.scrollTo(0, 0)

    // ローカルサーバーが詰まると待ちっぱなしになるので上限を切る
    const allLoaded = () => [...document.images].every((img) => img.complete && img.naturalWidth > 0)
    const deadline = Date.now() + 15000
    while (!allLoaded() && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 200))
    }
  })

  // 読み込み済みでも描画が追いつかないことがあるので2フレーム待つ
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
  await page.waitForTimeout(600)
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

test('横スクロールが発生しない', async ({ page }) => {
  await page.goto('/')
  await settle(page)

  const { clientWidth, scrollWidth, offenders } = await page.evaluate(() => {
    const w = document.documentElement.clientWidth
    const offenders = []
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      if (r.right > w + 1 || r.left < -1) {
        offenders.push(`<${el.tagName.toLowerCase()} class="${el.className}"> right=${Math.round(r.right)}`)
      }
    }
    return { clientWidth: w, scrollWidth: document.documentElement.scrollWidth, offenders }
  })

  expect(scrollWidth, `はみ出している要素:\n${offenders.slice(0, 10).join('\n')}`)
    .toBeLessThanOrEqual(clientWidth + 1)
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

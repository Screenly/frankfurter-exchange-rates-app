import { test } from '@playwright/test'
import {
  createMockScreenlyForScreenshots,
  setupClockMock,
  setupScreenlyJsMock,
} from '@screenly/edge-apps/test/screenshots'
import fs from 'fs'
import path from 'path'

import { mockSettings, setupFrankfurterMock, WHEN } from './frankfurter-mock.js'
import { THEMES } from '../src/theme.js'

const OUTPUT_DIR = path.resolve(process.cwd(), 'theme-screenshots')

test.beforeAll(() => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
})

for (const theme of THEMES) {
  test(`@themes ${theme}`, async ({ browser }) => {
    const { screenlyJsContent } = createMockScreenlyForScreenshots(
      { coordinates: ['50.1109', '8.6821'] as unknown as [number, number] },
      mockSettings(theme),
    )

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()

    await setupClockMock(page, WHEN)
    await setupScreenlyJsMock(page, screenlyJsContent)
    await setupFrankfurterMock(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)

    await page.screenshot({ path: path.join(OUTPUT_DIR, `${theme}.png`) })
    await context.close()
  })
}

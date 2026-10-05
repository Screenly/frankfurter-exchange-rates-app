import { test, type Page } from '@playwright/test'
import {
  createMockScreenlyForScreenshots,
  setupClockMock,
  setupScreenlyJsMock,
} from '@screenly/edge-apps/test/screenshots'
import fs from 'fs'
import path from 'path'

import type { CurrencyMeta, RateRow } from '../src/frankfurter.js'
import { isoDaysBefore } from '../src/format.js'
import { THEMES } from '../src/theme.js'

const OUTPUT_DIR = path.resolve(process.cwd(), 'theme-screenshots')

/** A Monday morning, with the day's rates already published. */
const WHEN = new Date('2026-10-05T08:40:00Z')

const BASE = 'USD'
const DAYS = 30

/**
 * The six currencies the app ships with, each with a rate near where it was
 * in the autumn of 2026 and a daily drift that gives every line a shape: one
 * up, one down, one all but flat.
 */
const QUOTES: Array<CurrencyMeta & { rate: number; drift: number }> = [
  { code: 'EUR', name: 'Euro', rate: 0.86, drift: 0.0009 },
  { code: 'GBP', name: 'British Pound', rate: 0.75, drift: -0.0004 },
  { code: 'JPY', name: 'Japanese Yen', rate: 149.2, drift: 0.12 },
  { code: 'CHF', name: 'Swiss Franc', rate: 0.8, drift: -0.0011 },
  { code: 'CNY', name: 'Chinese Renminbi Yuan', rate: 7.12, drift: 0.00002 },
  { code: 'AUD', name: 'Australian Dollar', rate: 1.52, drift: 0.0021 },
]

/** The rows the API would return for the window the app asks for. */
function rateRows(): RateRow[] {
  const rows: RateRow[] = []
  for (let back = DAYS; back >= 0; back -= 1) {
    const date = isoDaysBefore(WHEN, back)
    for (const quote of QUOTES) {
      const wobble = Math.sin(back / 3) * quote.drift * 2
      rows.push({
        date,
        base: BASE,
        quote: quote.code,
        rate: quote.rate + quote.drift * (DAYS - back) + wobble,
      })
    }
  }
  return rows
}

/** Frankfurter, answered from here so the picture is the same every run. */
async function setupFrankfurterMock(page: Page): Promise<void> {
  await page.route('**/api.frankfurter.dev/v2/currencies**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        [{ iso_code: BASE, name: 'United States Dollar' }].concat(
          QUOTES.map(({ code, name }) => ({ iso_code: code, name })),
        ),
      ),
    }),
  )
  await page.route('**/api.frankfurter.dev/v2/rates**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(rateRows()),
    }),
  )
}

test.beforeAll(() => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
})

for (const theme of THEMES) {
  test(`@themes ${theme}`, async ({ browser }) => {
    const { screenlyJsContent } = createMockScreenlyForScreenshots(
      { coordinates: ['50.1109', '8.6821'] as unknown as [number, number] },
      {
        board_title: '',
        base_currency: BASE,
        quote_currencies: QUOTES.map((quote) => quote.code).join(','),
        amount: '1',
        trend_days: String(DAYS),
        appearance: theme,
      },
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

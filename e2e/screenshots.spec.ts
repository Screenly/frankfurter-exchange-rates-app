import { test } from '@playwright/test'
import {
  captureScreenshot,
  createMockScreenlyForScreenshots,
  RESOLUTIONS,
} from '@screenly/edge-apps/test/screenshots'

import { mockSettings, setupFrankfurterMock } from './frankfurter-mock.js'
import { THEMES, type Theme } from '../src/theme.js'

const THEME_RESOLUTIONS = [
  { width: 1920, height: 1080 },
  { width: 1080, height: 1920 },
] as const

// The same rates every run. Left to the live API these would turn on the day's
// figures, and a run that caught an outage would save the failure panel.
function screenlyJsFor(theme: Theme): string {
  return createMockScreenlyForScreenshots(
    {
      coordinates: ['50.1109', '8.6821'] as unknown as [number, number],
      location: 'Frankfurt am Main',
    },
    mockSettings(theme),
  ).screenlyJsContent
}

for (const { width, height } of RESOLUTIONS) {
  test(`screenshot ${width}x${height}`, async ({ browser }) => {
    await captureScreenshot(browser, {
      width,
      height,
      filenamePrefix: 'frankfurter-exchange-rates-app',
      screenlyJsContent: screenlyJsFor('dark'),
      setupMocks: setupFrankfurterMock,
    })
  })
}

for (const theme of THEMES) {
  for (const { width, height } of THEME_RESOLUTIONS) {
    test(`screenshot ${theme} ${width}x${height}`, async ({ browser }) => {
      await captureScreenshot(browser, {
        width,
        height,
        filenamePrefix: `frankfurter-exchange-rates-app-${theme}`,
        screenlyJsContent: screenlyJsFor(theme),
        setupMocks: setupFrankfurterMock,
      })
    })
  }
}

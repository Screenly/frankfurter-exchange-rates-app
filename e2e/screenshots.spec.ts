import { test } from '@playwright/test'
import {
  captureScreenshot,
  createMockScreenlyForScreenshots,
  RESOLUTIONS,
} from '@screenly/edge-apps/test/screenshots'

import { mockSettings, setupFrankfurterMock } from './frankfurter-mock.js'

// The same rates every run. Left to the live API these would turn on the day's
// figures, and a run that caught an outage would save the failure panel.
const { screenlyJsContent } = createMockScreenlyForScreenshots(
  undefined,
  mockSettings(),
)

for (const { width, height } of RESOLUTIONS) {
  test(`screenshot ${width}x${height}`, async ({ browser }) => {
    await captureScreenshot(browser, {
      width,
      height,
      filenamePrefix: 'frankfurter-exchange-rates-app',
      screenlyJsContent,
      setupMocks: setupFrankfurterMock,
    })
  })
}

/**
 * Writes the `mock-data.yml` the dev server reads in place of a real player.
 *
 * A bureau in Frankfurt quoting the dollar, with six currencies: enough to see
 * the grid pick three columns, and a mix of rates near one, in the hundreds,
 * and in between, which is what the decimal rule is there for.
 *
 * An existing file is left alone unless `--force` is passed.
 */

import fs from 'fs'
import path from 'path'

const MOCK_DATA_PATH = path.resolve(process.cwd(), 'mock-data.yml')

const BUREAU = `---
metadata:
  coordinates:
    - '50.1109'
    - '8.6821'
  location: Frankfurt am Main
  screen_name: Bureau board
  hostname: dev-hostname
  screenly_version: development-server
  tags:
    - Development
settings:
  board_title: ''
  base_currency: USD
  quote_currencies: EUR,GBP,JPY,CHF,CNY,AUD
  amount: '1'
  trend_days: '30'
  appearance: dark
`

if (fs.existsSync(MOCK_DATA_PATH) && !process.argv.includes('--force')) {
  console.log(
    'mock-data.yml already exists, leaving it alone (--force to replace)',
  )
} else {
  fs.writeFileSync(MOCK_DATA_PATH, BUREAU)
  console.log('Wrote mock-data.yml for a bureau in Frankfurt')
}

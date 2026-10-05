import './style.css'
import '@screenly/edge-apps/components'
import {
  getSetting,
  getSettingWithDefault,
  readEdgeAppCache,
  setupErrorHandling,
  setupTheme,
  signalReady,
  writeEdgeAppCache,
} from '@screenly/edge-apps'

import {
  formatAmount,
  formatShortDay,
  formatWindow,
  isoDaysBefore,
} from './format.js'
import {
  fetchCurrencies,
  fetchRates,
  type CurrencyMeta,
  type RateRow,
} from './frankfurter.js'
import {
  fitDynamicText,
  renderBoard,
  renderCredit,
  renderFailure,
  renderMasthead,
  type Display,
} from './panels.js'
import {
  baseFrom,
  boardFrom,
  parseAmount,
  quotesAgainst,
  type Board,
} from './quotes.js'
import { resolveTheme } from './theme.js'

/**
 * Central banks publish once a working day, so this is not about catching a
 * change the moment it lands. It is about a screen switched on at four in the
 * morning having the day's rates by the time anyone reads it.
 */
const REFRESH_MS = 30 * 60 * 1000

const CACHE = 'frankfurter-exchange-rates'
/**
 * Frankfurter asks for nothing in return: the code is MIT and it does not own
 * the rates. The line stays anyway. Several of the institutions behind the
 * numbers do ask to be credited where their data is reused, the European
 * Central Bank among them, and a board someone might act on should say where
 * its figures came from and what they are not.
 *
 * "Blended" rather than named: a rate here can be Frankfurter's own average
 * across several institutions, which is no single one of them's official
 * figure, and none of them is the rate anyone is offered over a counter.
 */
const CREDIT =
  'Reference rates from frankfurter.dev, blended from central bank publications · Not a dealing rate'

interface Settings {
  heading: string
  base: string
  quotes: string[]
  /** Anything typed into the two currency settings that is not a code. */
  unreadable: string[]
  /** Show what each currency costs in the base, rather than what it buys. */
  inverted: boolean
  amount: number
  days: number
  display: Display
}

interface Shown {
  settings: Settings
  board: Board
  offline: boolean
  /** The day the rates being shown were fetched, when they are not from now. */
  receivedOn: string | null
}

/** The one slot the rates are kept in, with the settings they were fetched for. */
interface CachedRates {
  key: string
  receivedOn: string
  rows: RateRow[]
}

const RATES = 'rates'

function readSettings(): Settings {
  const days = getSettingWithDefault<string>('trend_days', '30')
  const inverted =
    getSettingWithDefault<string>('rate_direction', 'buys') === 'costs'
  const chosen = baseFrom(getSettingWithDefault<string>('base_currency', ''))
  const base = chosen.codes[0]!
  const quotes = quotesAgainst(
    getSettingWithDefault<string>('quote_currencies', ''),
    base,
  )

  return {
    // Not the screen's own location. Where the screen is says nothing about
    // whose rates these are, and a board in Batumi quoting the euro is not a
    // board about Batumi.
    heading:
      getSettingWithDefault<string>('board_title', '').trim() ||
      'Exchange rates',
    base,
    inverted,
    quotes: quotes.codes,
    // A base that cannot be read falls back to the dollar, which is silent
    // unless the board says so: every rate would be right, and every one of
    // them against a currency nobody asked for.
    unreadable: [...chosen.unreadable, ...quotes.unreadable],
    amount: parseAmount(getSettingWithDefault<string>('amount', '1')),
    days: Number.parseInt(days, 10) || 30,
    // The board is numbers and currency names; the locale only decides how the
    // numbers and the date are written, and English is what the names are in.
    display: { locale: 'en-GB' },
  }
}

function applyTheme(): void {
  document.documentElement.dataset.theme = resolveTheme(
    getSettingWithDefault<string>('appearance', 'dark'),
    getSetting<string>('theme'),
  )
}

/** Currency names, which change about as often as a country does. */
let currencyMeta: Map<string, CurrencyMeta> | null = null

async function currencies(): Promise<Map<string, CurrencyMeta>> {
  if (currencyMeta) {
    return currencyMeta
  }

  const cached = readEdgeAppCache<CurrencyMeta[]>(CACHE, 'currencies')
  try {
    const fetched = await fetchCurrencies()
    if (fetched.length > 0) {
      writeEdgeAppCache(CACHE, 'currencies', fetched)
      currencyMeta = new Map(fetched.map((entry) => [entry.code, entry]))
      return currencyMeta
    }
  } catch (error) {
    // A name is decoration. Losing one is not worth a blank board, so fall
    // through to whatever was kept and then to the codes themselves.
    console.warn('Could not fetch currency names', error)
  }

  // Kept only if there is something to keep: an empty map remembered here
  // would stop the next refresh from trying again once the network is back.
  const fallback = new Map(
    (cached ?? []).map((entry) => [entry.code, entry] as const),
  )
  if (fallback.size > 0) {
    currencyMeta = fallback
  }
  return fallback
}

function draw({ settings, board, offline, receivedOn }: Shown): void {
  const base = currencyMeta?.get(settings.base)
  const notes = [
    board.missing.length ? `No rates for ${board.missing.join(', ')}` : '',
    settings.unreadable.length
      ? `Not a currency code: ${settings.unreadable.join(', ')}`
      : '',
  ].filter(Boolean)
  const asOf =
    offline && receivedOn
      ? `Offline · last received ${formatShortDay(receivedOn, settings.display.locale)}`
      : `${formatWindow(settings.days)} trend`

  renderMasthead(
    {
      heading: settings.heading,
      lede: ledeFor(settings),
      baseName: base?.name ?? '',
      date: board.date,
      note: asOf,
    },
    settings.display,
  )
  renderBoard(board, settings.display)
  renderCredit([CREDIT, ...notes].join(' · '))

  fitDynamicText()
  // Again on the next frame: the first render happens before <auto-scaler> has
  // sized its box, so there is nothing for the fitter to measure against yet.
  requestAnimationFrame(fitDynamicText)
}

/**
 * The line across the top, which has to say which way round the board reads.
 *
 * Priced in the base, each card is what a unit of that currency costs, so the
 * base is named on its own and the amount, where it is not one, says how many
 * units each figure is for. The other way round the cards are what the base
 * buys, so the base carries the amount itself.
 */
function ledeFor(settings: Settings): string {
  const amount = formatAmount(settings.amount, settings.display.locale)

  if (!settings.inverted) {
    return `${amount} ${settings.base}`
  }
  return settings.amount === 1
    ? settings.base
    : `${settings.base} per ${amount}`
}

/**
 * Whether a board that cannot be drawn says so, or stands aside.
 *
 * Read when it is needed rather than with the rest: an operator who sets this
 * while the screen is sitting on an error wants the next tick to honour it.
 */
function showsErrors(): boolean {
  return getSettingWithDefault<string>('on_error', 'show') !== 'skip'
}

function cacheKey(settings: Settings): string {
  return `${settings.base}:${settings.quotes.join(',')}:${settings.days}`
}

/** The board as the API has it now, or as it was when the screen last had it. */
async function load(settings: Settings): Promise<Shown> {
  const meta = await currencies()
  const key = cacheKey(settings)
  const build = (rows: RateRow[]) =>
    boardFrom(rows, settings.quotes, meta, {
      amount: settings.amount,
      invert: settings.inverted,
    })

  // One code the API does not know fails the whole request, so the list is
  // checked against the currencies it does know first and the rest are left
  // to be named as missing. With no list to check against, the API decides.
  const known = (code: string) => meta.size === 0 || meta.has(code)
  if (!known(settings.base)) {
    throw new Error(`Unknown base currency: ${settings.base}`)
  }
  const quotes = settings.quotes.filter(known)

  try {
    const rows =
      quotes.length > 0
        ? await fetchRates(
            settings.base,
            quotes,
            isoDaysBefore(new Date(), settings.days),
          )
        : []
    const board = build(rows)

    // Only an empty board from currencies the API does know is a failure. Ask
    // for nothing it knows and the board is empty on purpose, with the codes
    // named at its foot, which is an answer rather than a fault.
    if (board.quotes.length === 0 && quotes.length > 0) {
      throw new Error(
        `No rates for ${settings.base} against ${quotes.join(', ')}`,
      )
    }

    const receivedOn = new Date().toISOString().slice(0, 10)
    // One slot, overwritten, rather than a key per combination of settings:
    // a year of a dozen currencies is a quarter of a megabyte, and a few
    // changes of settings would fill the storage with boards nobody shows.
    writeEdgeAppCache(CACHE, RATES, {
      key,
      receivedOn,
      rows,
    } satisfies CachedRates)
    return { settings, board, offline: false, receivedOn: null }
  } catch (error) {
    // A screen that has had rates keeps showing them. Yesterday's rate with the
    // day it was published beside it beats an error on a lobby wall.
    const cached = readEdgeAppCache<CachedRates>(CACHE, RATES)
    const board = cached?.key === key ? build(cached.rows) : null

    if (board && board.quotes.length > 0) {
      console.warn('Showing the rates we have', error)
      return { settings, board, offline: true, receivedOn: cached!.receivedOn }
    }

    throw error
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  setupErrorHandling()
  setupTheme()
  applyTheme()

  let shown: Shown | null = null
  let announced = false

  /*
   * The player waits for this before it shows the app, and once is enough.
   *
   * It is deliberately not sent until there is something worth showing. On a
   * board set to stand aside it is never sent at all while the rates are out
   * of reach, which is what lets the screen move on rather than give its time
   * to an error nobody in the room can act on.
   */
  const announce = () => {
    if (!announced) {
      announced = true
      signalReady()
    }
  }

  const update = async () => {
    applyTheme()
    const settings = readSettings()

    shown =
      settings.quotes.length > 0
        ? await load(settings)
        : {
            settings,
            board: { quotes: [], date: null, missing: [] },
            offline: false,
            receivedOn: null,
          }

    draw(shown)
    announce()
  }

  const attempt = async () => {
    try {
      await update()
    } catch (error) {
      console.error('Could not show the rates', error)
      if (showsErrors()) {
        renderFailure(error)
        announce()
      }
    }
  }

  await attempt()

  /*
   * Registered whatever the first attempt did. A screen that woke during an
   * outage with nothing cached would otherwise hold its error until someone
   * noticed and rebooted it, long after the network came back.
   */
  setInterval(() => {
    attempt().catch((error) => console.error('Could not refresh rates', error))
  }, REFRESH_MS)

  let resizeTimer: number | undefined
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer)
    // Redrawn, not refetched: only the grid depends on the size of the screen.
    resizeTimer = window.setTimeout(() => shown && draw(shown), 150)
  })
})

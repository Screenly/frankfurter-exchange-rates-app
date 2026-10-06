/**
 * Turning a flat list of published rates into what each card on the board
 * shows: the current rate, how far it has moved over the window, and the line
 * that movement draws.
 */

import type { CurrencyMeta, RateRow } from './frankfurter.js'

export interface Quote {
  code: string
  name: string
  /** The most recent rate, already multiplied by the amount asked for. */
  rate: number
  /** The day that rate was published, as the API writes it: YYYY-MM-DD. */
  date: string
  /** Change over the window, in percent. Null where there is nothing to compare. */
  change: number | null
  /** The window's rates, oldest first, for the line under the rate. */
  history: number[]
}

export interface Board {
  quotes: Quote[]
  /** The newest day anything was published. The board's own date. */
  date: string | null
  /** Codes that were asked for and did not come back. */
  missing: string[]
}

export interface CurrencyList {
  codes: string[]
  /** Whatever was not a code, as it was typed, for the board to report. */
  unreadable: string[]
}

/**
 * Three letter codes, however they were typed into the settings box.
 *
 * What cannot be read is handed back rather than dropped. A setting of "jkh"
 * otherwise leaves a board saying only that no currencies are set up, which is
 * true and no help at all to whoever typed it.
 */
export function parseCurrencyList(text: string): CurrencyList {
  const codes = new Set<string>()
  const unreadable: string[] = []

  for (const token of text.split(/[\s,;]+/)) {
    const written = token.trim()
    if (!written) {
      continue
    }

    const code = written.toUpperCase()
    if (/^[A-Z]{3}$/.test(code)) {
      codes.add(code)
    } else if (!unreadable.includes(written)) {
      unreadable.push(written)
    }
  }

  return { codes: [...codes], unreadable }
}

/**
 * The currencies to show against a base, which never includes the base: a
 * currency against itself is 1.0000 and a card saying so is a wasted card.
 */
export function quotesAgainst(text: string, base: string): CurrencyList {
  const { codes, unreadable } = parseCurrencyList(text)

  return { codes: codes.filter((code) => code !== base), unreadable }
}

/**
 * The base currency, with whatever was typed handed back when it is not a
 * code at all.
 *
 * Case is not a mistake: someone typing "usd" meant the dollar and gets it,
 * without the board accusing them of anything.
 */
export function baseFrom(text: string, fallback = 'USD'): CurrencyList {
  const written = text.trim()
  const code = parseCurrencyCode(written)

  return {
    codes: [code ?? fallback],
    unreadable: written && !code ? [written] : [],
  }
}

/** One code, or null where the setting holds something that is not one. */
export function parseCurrencyCode(text: string): string | null {
  const code = text.trim().toUpperCase()
  return /^[A-Z]{3}$/.test(code) ? code : null
}

/**
 * The range an amount is allowed to take.
 *
 * Bounded rather than merely positive. Below a ten thousandth the idea stops
 * meaning anything, and the figures stop surviving being written: a board set
 * to 0.00000000001 showed a masthead of 0 and cards of 0.0000000000 while
 * every rate behind them was worked out for the amount that had been set.
 * Chasing that with decimals has no end, so the setting has a floor.
 */
const LEAST_AMOUNT = 0.0001
const MOST_AMOUNT = 1e9

/**
 * The amount each rate is for. Never zero or negative, never the start of
 * something else (parseFloat reads "12usd" as twelve, which is a board quoting
 * amounts nobody asked for), and never so small or so large that the board
 * cannot say what it is quoting. Anything else is the one unit it falls back
 * to.
 */
export function parseAmount(text: string): number {
  const amount = Number(text.trim())
  const usable =
    Number.isFinite(amount) && amount >= LEAST_AMOUNT && amount <= MOST_AMOUNT

  return usable ? amount : 1
}

/**
 * How many currencies a board holds. Past this the cards keep their smallest
 * readable type inside boxes that go on shrinking, and the overflow is hidden,
 * so the extra currencies cost the ones already there without being seen.
 */
export const MOST_CURRENCIES = 12

function percentChange(from: number, to: number): number | null {
  return from > 0 ? ((to - from) / from) * 100 : null
}

/**
 * Build the board from the rows the API returned.
 *
 * The order is the order the currencies were asked for, not the order they
 * came back in: someone listing USD first wants it first.
 */
export interface BoardOptions {
  /** How much of the currency each rate is for. */
  amount?: number
  /**
   * Turn each rate the other way up, which is the board a bureau hangs: not
   * what one yen buys, but what one dollar costs in yen. The API only
   * quotes a base against others, so the other direction is its reciprocal.
   */
  invert?: boolean
}

export function boardFrom(
  rows: RateRow[],
  wanted: string[],
  meta: Map<string, CurrencyMeta>,
  { amount = 1, invert = false }: BoardOptions = {},
): Board {
  // Inverting runs before everything else, so that the movement and the line
  // follow the rate as shown: a yen gaining means a dollar costing less.
  const asShown = (rate: number) => (invert ? 1 / rate : rate)
  const byQuote = new Map<string, RateRow[]>()
  for (const row of rows) {
    const existing = byQuote.get(row.quote)
    if (existing) {
      existing.push(row)
    } else {
      byQuote.set(row.quote, [row])
    }
  }

  const quotes: Quote[] = []
  const missing: string[] = []

  for (const code of wanted) {
    const series = byQuote.get(code)
    if (!series || series.length === 0) {
      missing.push(code)
      continue
    }

    series.sort((one, other) => one.date.localeCompare(other.date))
    // A rate of zero cannot be turned the other way up, and is not a rate.
    const usable = series.filter((row) => !invert || row.rate > 0)
    if (usable.length === 0) {
      missing.push(code)
      continue
    }

    const history = usable.map((row) => asShown(row.rate))
    const latest = usable[usable.length - 1]!
    const details = meta.get(code)

    quotes.push({
      code,
      name: details?.name ?? code,
      rate: history[history.length - 1]! * amount,
      date: latest.date,
      // Against the start of the window, which is what the line shows.
      change:
        history.length > 1
          ? percentChange(history[0]!, history[history.length - 1]!)
          : null,
      history,
    })
  }

  const dates = quotes.map((quote) => quote.date).sort()

  return { quotes, date: dates[dates.length - 1] ?? null, missing }
}

/** The day a quote is behind the rest of the board, if it is. */
export function isStale(quote: Quote, board: Board): boolean {
  return board.date !== null && quote.date !== board.date
}

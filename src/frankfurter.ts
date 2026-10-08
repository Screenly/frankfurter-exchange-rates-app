/**
 * The Frankfurter API: free, no key, no account.
 *
 * It blends published rates from the European Central Bank and a hundred or so
 * other central banks, so a currency the ECB does not cover is still here. The
 * responses carry `access-control-allow-origin: *`, which is why none of this
 * goes through the player's CORS proxy.
 *
 * https://frankfurter.dev
 */

const API = 'https://api.frankfurter.dev/v2'

/**
 * How long a request may hang before it counts as failed. A connection that
 * opens and never answers would otherwise hold the first render, and with it
 * the ready signal, for as long as the player stays on.
 */
const TIMEOUT_MS = 15_000

/** One published rate: what a unit of `base` was worth in `quote` that day. */
export interface RateRow {
  date: string
  base: string
  quote: string
  rate: number
}

export interface CurrencyMeta {
  code: string
  name: string
}

/**
 * `no-cache` asks the browser to check with the server every time rather than
 * trusting what it has.
 *
 * The rates carry `max-age=28823`, about eight hours, and the URL only moves
 * at midnight because the window it asks for is counted in whole days. A
 * player that fetched at nine in the morning would therefore go on serving
 * that body from its own cache until late afternoon, and sit through the
 * publication it was waiting for. Revalidating costs an ETag round trip and
 * answers 304 for all but the one request a day that matters.
 */
async function readJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    signal: signal ?? AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-cache',
  })
  if (!response.ok) {
    throw new Error(await failureMessage(response))
  }
  return response.json()
}

/**
 * The API says what was wrong ("invalid currency: ABC"), which is what an
 * operator reading the screen needs; the status code alone tells them nothing.
 */
async function failureMessage(response: Response): Promise<string> {
  const generic = `Exchange rates unavailable (${response.status} from frankfurter.dev)`
  try {
    const body = (await response.json()) as { message?: unknown } | null
    return typeof body?.message === 'string'
      ? `${generic}: ${body.message}`
      : generic
  } catch {
    return generic
  }
}

function isRow(value: unknown): value is RateRow {
  const row = value as Partial<RateRow> | null
  return (
    typeof row?.date === 'string' &&
    typeof row.base === 'string' &&
    typeof row.quote === 'string' &&
    typeof row.rate === 'number' &&
    Number.isFinite(row.rate)
  )
}

/**
 * Every published rate from `from` to today, for the currencies asked for.
 *
 * One request covers both the board and the lines under it: the last row for a
 * currency is its current rate, and the rest is its recent history. A currency
 * whose source has not published for a few days simply ends earlier than the
 * others, which is how the board knows to say so.
 */
export async function fetchRates(
  base: string,
  quotes: string[],
  from: string,
  signal?: AbortSignal,
): Promise<RateRow[]> {
  const url =
    `${API}/rates?base=${encodeURIComponent(base)}` +
    `&quotes=${encodeURIComponent(quotes.join(','))}` +
    `&from=${encodeURIComponent(from)}`

  const payload = await readJson(url, signal)
  if (!Array.isArray(payload)) {
    throw new Error('Exchange rates came back in a shape we do not understand')
  }

  return payload.filter(isRow)
}

/** The name of every currency the API carries. */
export async function fetchCurrencies(
  signal?: AbortSignal,
): Promise<CurrencyMeta[]> {
  const payload = await readJson(`${API}/currencies`, signal)
  if (!Array.isArray(payload)) {
    return []
  }

  return payload
    .map((entry) => entry as Record<string, unknown>)
    .filter((entry) => typeof entry.iso_code === 'string')
    .map((entry) => ({
      code: String(entry.iso_code),
      name:
        typeof entry.name === 'string' ? entry.name : String(entry.iso_code),
    }))
}

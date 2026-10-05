/**
 * Putting numbers and dates on the screen.
 *
 * Rates are read at a glance from across a room, so they carry only as many
 * decimals as the size of the number makes meaningful: four on a rate near one
 * and none on a rate in the thousands, where the last digits are noise.
 */

/**
 * However many decimals it takes to show a rate, never more than it is worth.
 *
 * Four decimals is the trade's habit and it holds down to about a hundredth,
 * below which it stops being precision and starts being a lie: a board based
 * on the dong buys 0.000039 dollars, and four decimals writes that as 0.0000.
 * Under one, the count grows with the leading zeroes so that four figures of
 * the rate always survive.
 */
const MOST_DECIMALS = 10

export function decimalsFor(rate: number): number {
  const size = Math.abs(rate)

  if (size >= 1000) return 0
  if (size >= 100) return 2
  if (size >= 10) return 3
  if (size >= 1 || size === 0) return 4

  const leadingZeroes = Math.floor(-Math.log10(size))
  return Math.min(4 + leadingZeroes, MOST_DECIMALS)
}

export function formatRate(rate: number, locale: string): string {
  const decimals = decimalsFor(rate)

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rate)
}

/**
 * The amount in the masthead: "1", "100", "2.5". No trailing zeroes.
 *
 * It takes the same decimals a rate of its size would, so that an amount small
 * enough to be written away is not: four decimals turned an amount of 0.00001
 * into a masthead reading "0 USD" while every card was still worked out for
 * the amount that was set.
 */
export function formatAmount(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: Math.max(4, decimalsFor(amount)),
  }).format(amount)
}

/** "+1.42%", "-0.31%", "0.00%". Always signed, so the eye can skip the arrow. */
export function formatChange(percent: number, locale: string): string {
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  }).format(percent)

  return `${formatted}%`
}

/** Which way a change points, or 'flat' when it rounds to nothing. */
export function direction(percent: number | null): 'up' | 'down' | 'flat' {
  if (percent === null || Math.abs(percent) < 0.005) {
    return 'flat'
  }
  return percent > 0 ? 'up' : 'down'
}

/**
 * The API writes days as YYYY-MM-DD with no zone. Read as UTC and written as
 * UTC: taking the screen's zone instead would move a rate published in
 * Frankfurt onto the day before in Los Angeles.
 */
function dayFrom(isoDate: string): Date | null {
  const date = new Date(`${isoDate}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDay(isoDate: string, locale: string): string {
  const date = dayFrom(isoDate)
  if (!date) return isoDate

  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

/** "2 Oct", for a currency whose source is a few days behind the rest. */
export function formatShortDay(isoDate: string, locale: string): string {
  const date = dayFrom(isoDate)
  if (!date) return isoDate

  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  }).format(date)
}

/**
 * "7 days", "30 days", "1 year": the same words the setting offers. Writing
 * "One month" on the board for a setting that says "30 days" leaves someone
 * checking whether they are looking at the same thing.
 */
export function formatWindow(days: number): string {
  return days >= 365 ? '1 year' : `${days} days`
}

/** The day `days` back from `today`, as the API wants it written. */
export function isoDaysBefore(today: Date, days: number): string {
  const then = new Date(today.getTime() - days * 86_400_000)
  return then.toISOString().slice(0, 10)
}

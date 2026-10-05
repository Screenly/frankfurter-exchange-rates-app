/**
 * Drawing the board. Every function takes what to show and overwrites what is
 * there, so a redraw is never a patch.
 */

import { escapeText } from './escape.js'
import { fitToWidth } from './fit-text.js'
import {
  direction,
  formatChange,
  formatDay,
  formatRate,
  formatShortDay,
} from './format.js'
import { columnsFor } from './layout.js'
import { isStale, type Board, type Quote } from './quotes.js'
import { SPARK_HEIGHT, SPARK_WIDTH, sparkline } from './sparkline.js'

export interface Display {
  locale: string
}

/**
 * What a card's type is worth per unit of its height. The sum of the type and
 * the spaces between it comes to a little under seven tenths of the width the
 * design is drawn against, so a card that tall holds it.
 */
const FITS_IN_HEIGHT = 1.4

/**
 * Floors for the lines that fit themselves to their box.
 *
 * None of them goes under the 24px at which WCAG stops treating text as large
 * and asks 4.5:1 of it rather than 3:1, which this palette's quieter tones do
 * not give. A line that will not fit at its floor is scrolled across its box
 * instead of being shrunk past it or cut off.
 */
const NAME_MIN_SIZE = 25
const BASE_MIN_SIZE = 40
const HEADING_MIN_SIZE = 25

export function element<T extends Element>(selector: string): T {
  const found = document.querySelector<T>(selector)
  if (!found) {
    throw new Error(`Missing element: ${selector}`)
  }
  return found
}

export interface Masthead {
  heading: string
  /** The base currency as the board reads it, already worded by the caller. */
  lede: string
  baseName: string
  date: string | null
  note: string
}

export function renderMasthead(masthead: Masthead, display: Display): void {
  const { heading, lede, baseName, date, note } = masthead

  element('[data-heading]').textContent = heading
  element('[data-base-amount]').textContent = lede
  element('[data-base-name]').textContent = baseName

  element('[data-asof-date]').textContent = date
    ? formatDay(date, display.locale)
    : ''
  element('[data-asof-note]').textContent = note
}

function changeMarkup(quote: Quote, display: Display): string {
  if (quote.change === null) {
    return ''
  }

  const way = direction(quote.change)
  const arrow = way === 'up' ? '▲' : way === 'down' ? '▼' : '•'

  return `
    <span class="rate-change">
      <span class="rate-arrow" aria-hidden="true">${arrow}</span>
      ${escapeText(formatChange(quote.change, display.locale))}
    </span>
  `
}

function sparkMarkup(quote: Quote): string {
  const spark = sparkline(quote.history)
  if (!spark) {
    return '<div class="rate-spark is-empty"></div>'
  }

  // A pegged rate gets the line and no wash. Filling half the box under a dead
  // straight line draws a solid block, which reads as something broken rather
  // than as a currency that has not moved.
  const wash = spark.flat ? '' : `<path class="spark-area" d="${spark.area}" />`

  // preserveAspectRatio is off so the line fills whatever width the card has;
  // the stroke is kept off the transform so it does not stretch with it.
  return `
    <svg
      class="rate-spark"
      viewBox="0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      ${wash}
      <path
        class="spark-line"
        d="${spark.line}"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  `
}

function rateCard(quote: Quote, board: Board, display: Display): string {
  // Only a currency whose source is behind the rest carries a date. On a board
  // where every rate is from today, printing today on each of them is noise.
  const stale = isStale(quote, board)
    ? `<span class="rate-stale">${escapeText(formatShortDay(quote.date, display.locale))}</span>`
    : ''

  return `
    <article class="rate" data-direction="${direction(quote.change)}">
      <div class="rate-head">
        <span class="rate-code">${escapeText(quote.code)}</span>
        ${changeMarkup(quote, display)}
      </div>
      <div class="rate-name" data-fit-name>
        ${escapeText(quote.name)}${stale}
      </div>
      <div class="rate-value">${escapeText(formatRate(quote.rate, display.locale))}</div>
      ${sparkMarkup(quote)}
    </article>
  `
}

export function renderBoard(board: Board, display: Display): void {
  const container = element<HTMLElement>('[data-board]')

  if (board.quotes.length === 0) {
    container.removeAttribute('style')
    container.innerHTML = `
      <div class="empty">
        <div class="empty-title">No currencies to show</div>
        <div class="empty-hint">
          Set the currencies in the app settings, as three letter codes:<br />
          USD, GBP, JPY
        </div>
      </div>
    `
    return
  }

  container.innerHTML = board.quotes
    .map((quote) => rateCard(quote, board, display))
    .join('')

  layOut(container, board.quotes.length)
}

/**
 * Pick the grid from the room the cards have, then hand the card width back to
 * the stylesheet: the type inside a card is a proportion of it, so four across
 * and two across are the same design at two sizes rather than two designs.
 */
function layOut(container: HTMLElement, count: number): void {
  const width = container.clientWidth
  const height = container.clientHeight
  if (!width || !height) {
    return
  }

  const columns = columnsFor(count, width, height)
  const rows = Math.ceil(count / columns)
  const gap = Number.parseFloat(
    window.getComputedStyle(container).columnGap || '0',
  )
  const cardWidth = (width - gap * (columns - 1)) / columns
  const cardHeight = (height - gap * (rows - 1)) / rows

  // Whichever dimension is the tighter of the two. Scaling the type off the
  // width alone makes a wide, short card taller than its own row, which the
  // grid then grows to fit and pushes the bottom row off the board.
  const basis = Math.min(cardWidth, cardHeight * FITS_IN_HEIGHT)

  container.style.setProperty('--columns', String(columns))
  container.style.setProperty('--card-width', `${basis.toFixed(1)}px`)
}

/** Everything in the masthead that describes the rates rather than the screen. */
function clearMasthead(): void {
  for (const selector of [
    '[data-base-amount]',
    '[data-base-name]',
    '[data-asof-date]',
    '[data-asof-note]',
  ]) {
    element<HTMLElement>(selector).textContent = ''
  }
}

export function renderCredit(text: string): void {
  element('[data-credit]').textContent = text
}

/** Shrink the lines that take whatever the data gives them. */
/**
 * Blank the screen: no board, no masthead, no message.
 *
 * For a board told to stand aside that has already shown rates once. It cannot
 * take back the ready signal, so the most it can do is stop presenting figures
 * fetched for settings that have since stopped working as though they were
 * today's.
 */
export function renderNothing(): void {
  clearMasthead()
  element<HTMLElement>('[data-board]').removeAttribute('style')
  element<HTMLElement>('[data-board]').innerHTML = ''
  renderCredit('')
}

export function fitDynamicText(): void {
  // The grid as well as the type. Both are measured from a box that
  // <auto-scaler> may not have sized yet on the first pass, and a layout that
  // bailed on a box of no width would otherwise keep the stylesheet's fallback
  // three columns until something else happened to redraw the board.
  const board = element<HTMLElement>('[data-board]')
  const cards = board.querySelectorAll('.rate').length
  if (cards > 0) {
    layOut(board, cards)
  }

  fitToWidth(element<HTMLElement>('[data-heading]'), HEADING_MIN_SIZE)
  fitToWidth(element<HTMLElement>('[data-base-amount]'), BASE_MIN_SIZE)
  fitToWidth(element<HTMLElement>('[data-base-name]'), NAME_MIN_SIZE)

  document
    .querySelectorAll<HTMLElement>('[data-fit-name]')
    .forEach((name) => fitToWidth(name, NAME_MIN_SIZE))
}

/**
 * What the screen says when it cannot draw the board and has nothing saved.
 *
 * The masthead goes with it. A failure that follows a good render would
 * otherwise keep the old base, the day those rates were published and the
 * trend window sitting above the message, which reads as though the figures
 * below are still being quoted and are merely late.
 */
export function renderFailure(error: unknown): void {
  const reason = error instanceof Error ? error.message : String(error)

  clearMasthead()

  element<HTMLElement>('[data-board]').innerHTML = `
    <div class="empty">
      <div class="empty-title">No rates to show</div>
      <div class="empty-hint">${escapeText(reason)}</div>
    </div>
  `
  renderCredit("Check the app settings and the screen's connection")
}

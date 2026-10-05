/**
 * Keep a single line of text inside its box: shrink it to fit, and where it
 * will not fit at a readable size, scroll it instead.
 *
 * The heading, the base amount and name, and the name on every card take
 * whatever the settings and the API give them. "Bosnia and Herzegovina
 * Convertible Mark" does not fit a card at any size worth reading, and a
 * wrapped line would make that card taller than its row.
 *
 * The size to start from is read back from the stylesheet rather than passed
 * in: the card type is a proportion of the card's width, so there is no one
 * number to carry here, and a redraw starts from whatever the stylesheet says.
 */

/** Reference pixels a second. Slow enough to read a name as it goes past. */
const SCROLL_SPEED = 55

/** However short the overrun, a glance should not miss the whole trip. */
const MIN_TRAVEL_SECONDS = 5

/**
 * The share of a cycle spent moving. The rest is the pause at each end, which
 * is what makes it legible rather than a ticker: the line comes to rest long
 * enough to be read from the start before it sets off again.
 */
const TRAVELLING = 0.76

/** Undo whatever the last pass did, so a redraw measures the text itself. */
function release(element: HTMLElement): void {
  element.style.removeProperty('font-size')
  element.style.removeProperty('--scroll-shift')
  element.style.removeProperty('--scroll-duration')
  element.classList.remove('is-scrolling')

  const scroller = element.firstElementChild
  if (scroller?.classList.contains('scroller')) {
    scroller.replaceWith(...Array.from(scroller.childNodes))
  }
}

/**
 * Carry the line back and forth across its box, the way a music player shows a
 * title too long for the screen.
 */
function startScrolling(element: HTMLElement, available: number): void {
  const scroller = document.createElement('span')
  scroller.className = 'scroller'
  scroller.append(...Array.from(element.childNodes))
  element.append(scroller)

  const distance = Math.ceil(scroller.scrollWidth - available)
  if (distance <= 0) {
    return
  }

  const travel = Math.max(MIN_TRAVEL_SECONDS, distance / SCROLL_SPEED)
  element.style.setProperty('--scroll-shift', `${-distance}px`)
  element.style.setProperty(
    '--scroll-duration',
    `${(travel / TRAVELLING).toFixed(1)}s`,
  )
  element.classList.add('is-scrolling')
}

export function fitToWidth(element: HTMLElement, minFontSize: number): void {
  release(element)

  const maxFontSize = Number.parseFloat(
    window.getComputedStyle(element).fontSize,
  )
  const available = element.clientWidth
  if (!maxFontSize || !available || element.scrollWidth <= available) {
    return
  }

  let size = Math.max(
    minFontSize,
    Math.floor((maxFontSize * available) / element.scrollWidth),
  )
  element.style.fontSize = `${size}px`

  while (size > minFontSize && element.scrollWidth > available) {
    size -= 1
    element.style.fontSize = `${size}px`
  }

  // Still over at the smallest size it is allowed to be, so it travels.
  if (element.scrollWidth > available) {
    startScrolling(element, available)
  }
}

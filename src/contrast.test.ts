/**
 * The palette, checked against the stylesheet rather than against a copy of
 * it, so that changing a colour either keeps the board readable or fails here.
 *
 * Every colour on the board is text or a line standing on either the page or a
 * card. WCAG asks 3:1 of text it counts as large, which is anything from 24px,
 * and 4.5:1 below that. The muted greys clear 3:1 and not 4.5:1, so the second
 * test is what earns the first one the right to use the lower bar: nothing on
 * the board is drawn smaller than 25px in the 1920 frame it is designed in.
 */

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const STYLESHEET = readFileSync(new URL('./style.css', import.meta.url), 'utf8')

const LARGE_TEXT_CONTRAST = 3
/** Where the large text rule begins. A point above it leaves room to round. */
const SMALLEST_SIZE = 25

interface Colour {
  r: number
  g: number
  b: number
  a: number
}

function parseColour(value: string): Colour | null {
  const hex = value.trim().match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const n = Number.parseInt(hex[1]!, 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 }
  }

  const rgba = value.trim().match(/^rgba?\(([^)]+)\)$/)
  if (!rgba) {
    return null
  }
  const parts = rgba[1]!.split(',').map((part) => Number(part.trim()))
  return {
    r: parts[0]!,
    g: parts[1]!,
    b: parts[2]!,
    a: parts.length > 3 ? parts[3]! : 1,
  }
}

/** A translucent colour resolved against what it is painted on. */
function over(top: Colour, bottom: Colour): Colour {
  const mix = (a: number, b: number) => a * top.a + b * (1 - top.a)
  return {
    r: mix(top.r, bottom.r),
    g: mix(top.g, bottom.g),
    b: mix(top.b, bottom.b),
    a: 1,
  }
}

function luminance({ r, g, b }: Colour): number {
  const channel = (value: number) => {
    const part = value / 255
    return part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrast(one: Colour, other: Colour): number {
  const [brighter, darker] = [luminance(one), luminance(other)].sort(
    (a, b) => b - a,
  )
  return (brighter! + 0.05) / (darker! + 0.05)
}

/** The custom properties a theme block declares. */
function tokensFor(theme: string): Record<string, Colour> {
  const block = STYLESHEET.match(
    new RegExp(`:root\\[data-theme='${theme}'\\] \\{([^}]+)\\}`),
  )
  expect(block, `no block for the ${theme} theme`).not.toBeNull()

  const tokens: Record<string, Colour> = {}
  for (const [, name, value] of block![1]!.matchAll(
    /--([a-z0-9-]+):\s*([^;]+);/g,
  )) {
    const colour = parseColour(value!)
    if (colour) {
      tokens[name!] = colour
    }
  }
  return tokens
}

describe.each(['dark', 'light'])('the %s palette', (theme) => {
  const tokens = tokensFor(theme)

  test('declares every colour the board draws with', () => {
    for (const name of [
      'bg',
      'card',
      'label',
      'label-2',
      'label-3',
      'up',
      'down',
      'flat',
    ]) {
      expect(tokens[name], `${theme} is missing --${name}`).toBeDefined()
    }
  })

  // The page and a card are the only two things anything is drawn on.
  const backdrops = [
    ['the page', tokens.bg!],
    ['a card', tokens.card!],
  ] as const

  describe.each(backdrops)('on %s', (_where, backdrop) => {
    test.each(['label', 'label-2', 'label-3'])('--%s is readable', (name) => {
      const ratio = contrast(over(tokens[name]!, backdrop), backdrop)
      expect(ratio).toBeGreaterThanOrEqual(LARGE_TEXT_CONTRAST)
    })
  })

  // Up, down and flat are only ever used inside a card, as the change and the
  // line under it. The line is a graphical object, which WCAG also puts at 3:1.
  test.each(['up', 'down', 'flat'])('--%s is readable on a card', (name) => {
    const ratio = contrast(over(tokens[name]!, tokens.card!), tokens.card!)
    expect(ratio).toBeGreaterThanOrEqual(LARGE_TEXT_CONTRAST)
  })
})

/**
 * The stylesheet is only half of it: `fitToWidth` overwrites a size at runtime,
 * down to a floor held in panels.ts. A line that will not fit at its floor is
 * scrolled across its box rather than shrunk past it, so these floors are what
 * keeps every tone in the range the 3:1 above is allowed at.
 */
describe('the floors the text fitter stops at', () => {
  const PANELS = readFileSync(new URL('./panels.ts', import.meta.url), 'utf8')

  const floors = [...PANELS.matchAll(/const ([A-Z_]+_MIN_SIZE) = (\d+)/g)].map(
    ([, name, px]) => ({ name: name!, px: Number(px) }),
  )

  test('there are floors to check', () => {
    expect(floors.length).toBeGreaterThanOrEqual(3)
  })

  test('none of them shrinks text out of the range the palette holds', () => {
    for (const floor of floors) {
      expect(
        floor.px,
        `${floor.name} would shrink text to ${floor.px}px`,
      ).toBeGreaterThanOrEqual(SMALLEST_SIZE)
    }
  })
})

describe('the type sizes the palette depends on', () => {
  /**
   * Fixed sizes, and the floor of every size that scales with the card. An
   * `em` size is relative to text already checked here, so it is left alone.
   */
  const sizes = [...STYLESHEET.matchAll(/font-size:\s*([^;]+);/g)]
    .map(([, value]) => value!.trim())
    .filter((value) => !value.endsWith('em'))
    .map((value) => {
      const floored = value.match(/^max\((\d+(?:\.\d+)?)px/)
      const fixed = value.match(/^(\d+(?:\.\d+)?)px$/)
      return { value, px: Number((floored ?? fixed)?.[1] ?? Number.NaN) }
    })

  test('every one of them was understood', () => {
    expect(sizes.length).toBeGreaterThan(8)
    for (const size of sizes) {
      expect(
        size.px,
        `could not read a size from "${size.value}"`,
      ).not.toBeNaN()
    }
  })

  test('none drops below the size large text begins at', () => {
    // Below this WCAG wants 4.5:1, which --label-2 and --label-3 do not give.
    for (const size of sizes) {
      expect(
        size.px,
        `"${size.value}" is under ${SMALLEST_SIZE}px`,
      ).toBeGreaterThanOrEqual(SMALLEST_SIZE)
    }
  })
})

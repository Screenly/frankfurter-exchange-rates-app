import { describe, expect, test } from 'bun:test'
import type { CurrencyMeta, RateRow } from './frankfurter.js'
import {
  baseFrom,
  boardFrom,
  isStale,
  parseAmount,
  parseCurrencyCode,
  parseCurrencyList,
  quotesAgainst,
} from './quotes.js'

const META = new Map<string, CurrencyMeta>([
  ['USD', { code: 'USD', name: 'United States Dollar' }],
  ['GBP', { code: 'GBP', name: 'British Pound' }],
])

const row = (quote: string, date: string, rate: number): RateRow => ({
  date,
  base: 'EUR',
  quote,
  rate,
})

describe('reading the currency settings', () => {
  test('a list however it was typed', () => {
    expect(parseCurrencyList('usd, gbp,JPY').codes).toEqual([
      'USD',
      'GBP',
      'JPY',
    ])
    expect(parseCurrencyList('USD GBP\nJPY;CHF').codes).toEqual([
      'USD',
      'GBP',
      'JPY',
      'CHF',
    ])
  })

  test('the order typed is the order shown', () => {
    expect(parseCurrencyList('JPY,USD,GBP').codes).toEqual([
      'JPY',
      'USD',
      'GBP',
    ])
  })

  test('the same currency twice is shown once', () => {
    expect(parseCurrencyList('USD,usd,USD').codes).toEqual(['USD'])
  })

  test('anything that is not a three letter code is set aside', () => {
    const read = parseCurrencyList('USD, dollars, $, US, USDT, ,GBP')

    expect(read.codes).toEqual(['USD', 'GBP'])
    expect(read.unreadable).toEqual(['dollars', '$', 'US', 'USDT'])
  })

  test('what could not be read is reported as it was typed', () => {
    // Dropped silently, this leaves a board with a currency missing and
    // nothing to say why. Three letter codes that are not currencies are a
    // different matter: those reach the API and come back named as missing.
    const read = parseCurrencyList('EUR, dollars')

    expect(read.codes).toEqual(['EUR'])
    expect(read.unreadable).toEqual(['dollars'])
  })

  test('the same mistake twice is reported once', () => {
    expect(parseCurrencyList('dollars, dollars').unreadable).toEqual([
      'dollars',
    ])
  })

  test('nothing typed is not a mistake', () => {
    expect(parseCurrencyList('')).toEqual({ codes: [], unreadable: [] })
    expect(parseCurrencyList('  ,  ,')).toEqual({ codes: [], unreadable: [] })
  })

  test('the base is never shown against itself', () => {
    // A card reading "USD 1.0000" is a card spent saying nothing.
    expect(quotesAgainst('EUR,USD,GBP', 'USD').codes).toEqual(['EUR', 'GBP'])
    expect(quotesAgainst('usd', 'USD').codes).toEqual([])
    expect(quotesAgainst('EUR,GBP', 'USD').codes).toEqual(['EUR', 'GBP'])
  })

  test('and what could not be read survives the base being removed', () => {
    expect(quotesAgainst('USD, dollars, EUR', 'USD')).toEqual({
      codes: ['EUR'],
      unreadable: ['dollars'],
    })
  })
})

describe('reading the base currency', () => {
  test('a base in any case is the base, and no complaint about it', () => {
    // Typing "usd" meant the dollar. Comparing what was typed against what it
    // was read as made that a mistake and said so on the board.
    expect(baseFrom('usd')).toEqual({ codes: ['USD'], unreadable: [] })
    expect(baseFrom(' Eur ')).toEqual({ codes: ['EUR'], unreadable: [] })
  })

  test('a base nobody could read falls back, and says it fell back', () => {
    expect(baseFrom('dollars')).toEqual({
      codes: ['USD'],
      unreadable: ['dollars'],
    })
  })

  test('no base at all is the default, silently', () => {
    expect(baseFrom('')).toEqual({ codes: ['USD'], unreadable: [] })
    expect(baseFrom('   ')).toEqual({ codes: ['USD'], unreadable: [] })
  })

  test('a single code, or nothing to fall back from', () => {
    expect(parseCurrencyCode(' eur ')).toBe('EUR')
    expect(parseCurrencyCode('Euro')).toBeNull()
    expect(parseCurrencyCode('')).toBeNull()
  })

  test('an amount is a positive number or it is one', () => {
    expect(parseAmount('100')).toBe(100)
    expect(parseAmount(' 2.5 ')).toBe(2.5)
    // Zero would make every rate zero, and a negative one would invert them.
    expect(parseAmount('0')).toBe(1)
    expect(parseAmount('-5')).toBe(1)
    expect(parseAmount('ten')).toBe(1)
    expect(parseAmount('')).toBe(1)
  })
})

describe('building the board', () => {
  const rows = [
    row('USD', '2026-10-01', 1.1),
    row('USD', '2026-10-02', 1.2),
    row('GBP', '2026-10-01', 0.9),
    row('GBP', '2026-10-02', 0.85),
  ]

  test('the newest rate of each currency, in the order asked for', () => {
    const board = boardFrom(rows, ['GBP', 'USD'], META)

    expect(board.quotes.map((quote) => quote.code)).toEqual(['GBP', 'USD'])
    expect(board.quotes[1]!.rate).toBeCloseTo(1.2, 10)
    expect(board.quotes[1]!.date).toBe('2026-10-02')
  })

  test('rows out of order still read newest last', () => {
    const shuffled = [rows[1]!, rows[0]!]
    const board = boardFrom(shuffled, ['USD'], META)

    expect(board.quotes[0]!.rate).toBeCloseTo(1.2, 10)
    expect(board.quotes[0]!.history).toEqual([1.1, 1.2])
  })

  test('the change is measured across the window the line draws', () => {
    const board = boardFrom(rows, ['USD', 'GBP'], META)

    // 1.1 to 1.2 is a shade over nine percent; 0.9 to 0.85 a shade under six.
    expect(board.quotes[0]!.change).toBeCloseTo(9.0909, 3)
    expect(board.quotes[1]!.change).toBeCloseTo(-5.5556, 3)
  })

  test('one published rate has nothing to compare against', () => {
    const board = boardFrom([row('USD', '2026-10-02', 1.2)], ['USD'], META)

    expect(board.quotes[0]!.change).toBeNull()
  })

  test('the amount multiplies the rate and not the change', () => {
    const board = boardFrom(rows, ['USD'], META, { amount: 100 })

    expect(board.quotes[0]!.rate).toBeCloseTo(120, 10)
    expect(board.quotes[0]!.change).toBeCloseTo(9.0909, 3)
  })

  test('names come from the metadata, and codes stand in for them', () => {
    // A board with no names is a board of codes, not a blank one.
    expect(boardFrom(rows, ['USD'], new Map()).quotes[0]!.name).toBe('USD')
    expect(boardFrom(rows, ['USD'], META).quotes[0]!.name).toBe(
      'United States Dollar',
    )
  })

  test('a currency that did not come back is named rather than dropped quietly', () => {
    const board = boardFrom(rows, ['USD', 'XXX'], META)

    expect(board.quotes.map((quote) => quote.code)).toEqual(['USD'])
    expect(board.missing).toEqual(['XXX'])
  })

  test('the board is dated by the newest rate on it', () => {
    expect(boardFrom(rows, ['USD', 'GBP'], META).date).toBe('2026-10-02')
    expect(boardFrom([], ['USD'], META).date).toBeNull()
  })

  test('a source that has not published today is marked, the rest are not', () => {
    // GBP stops a day earlier than USD, which is how a blended source behaves
    // when one central bank has not published yet.
    const board = boardFrom(
      [...rows.slice(0, 2), row('GBP', '2026-10-01', 0.9)],
      ['USD', 'GBP'],
      META,
    )

    expect(isStale(board.quotes[0]!, board)).toBe(false)
    expect(isStale(board.quotes[1]!, board)).toBe(true)
  })
})

describe('priced the other way round, as a bureau hangs it', () => {
  const rows = [row('USD', '2026-10-01', 1.1), row('USD', '2026-10-02', 1.2)]

  test('the rate is what one unit of the currency costs in the base', () => {
    const board = boardFrom(rows, ['USD'], META, { invert: true })

    // 1 base buys 1.2 USD, so a dollar costs 1 / 1.2 of the base.
    expect(board.quotes[0]!.rate).toBeCloseTo(1 / 1.2, 10)
  })

  test('the amount still applies, for a board quoting per hundred', () => {
    const board = boardFrom(rows, ['USD'], META, {
      invert: true,
      amount: 100,
    })

    expect(board.quotes[0]!.rate).toBeCloseTo(100 / 1.2, 10)
  })

  test('the movement turns over with the rate', () => {
    const upright = boardFrom(rows, ['USD'], META).quotes[0]!
    const inverted = boardFrom(rows, ['USD'], META, { invert: true }).quotes[0]!

    // The base buying more dollars is a dollar costing less of the base.
    expect(upright.change).toBeGreaterThan(0)
    expect(inverted.change).toBeLessThan(0)
    expect(inverted.change).toBeCloseTo(-8.3333, 3)
  })

  test('the line turns over with it, so both tell the same story', () => {
    const inverted = boardFrom(rows, ['USD'], META, { invert: true }).quotes[0]!

    expect(inverted.history).toEqual([1 / 1.1, 1 / 1.2])
    expect(inverted.history[1]!).toBeLessThan(inverted.history[0]!)
  })

  test('a rate of zero cannot be turned over, and is reported missing', () => {
    const board = boardFrom([row('USD', '2026-10-01', 0)], ['USD'], META, {
      invert: true,
    })

    expect(board.quotes).toHaveLength(0)
    expect(board.missing).toEqual(['USD'])
  })
})

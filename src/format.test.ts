import { describe, expect, test } from 'bun:test'
import {
  decimalsFor,
  direction,
  formatAmount,
  formatChange,
  formatDay,
  formatRate,
  formatShortDay,
  formatWindow,
  isoDaysBefore,
} from './format.js'

const EN = 'en-GB'

describe('writing a rate', () => {
  test('as many decimals as the size of the number earns', () => {
    expect(decimalsFor(1.1249)).toBe(4)
    expect(decimalsFor(0.8501)).toBe(4)
    expect(decimalsFor(11.298)).toBe(3)
    expect(decimalsFor(177.62)).toBe(2)
    expect(decimalsFor(20132)).toBe(0)
  })

  test('the rupiah does not carry four decimals and the dollar does', () => {
    expect(formatRate(1.1249, EN)).toBe('1.1249')
    expect(formatRate(177.62, EN)).toBe('177.62')
    expect(formatRate(20132.4, EN)).toBe('20,132')
  })

  test('trailing zeroes are kept, so the figures line up down a column', () => {
    expect(formatRate(1.1, EN)).toBe('1.1000')
    expect(formatRate(177.6, EN)).toBe('177.60')
  })

  test('an amount loses its trailing zeroes, being a round number itself', () => {
    expect(formatAmount(1, EN)).toBe('1')
    expect(formatAmount(100, EN)).toBe('100')
    expect(formatAmount(2.5, EN)).toBe('2.5')
  })
})

describe('writing a change', () => {
  test('always signed, so the sign is not the arrow', () => {
    expect(formatChange(1.42, EN)).toBe('+1.42%')
    expect(formatChange(-0.31, EN)).toBe('-0.31%')
  })

  test('a day where nothing moved is neither up nor down', () => {
    expect(direction(0)).toBe('flat')
    expect(direction(0.004)).toBe('flat')
    expect(direction(null)).toBe('flat')
    expect(direction(0.006)).toBe('up')
    expect(direction(-0.006)).toBe('down')
  })

  test('what is written and which way it points agree', () => {
    // Rounding to two decimals must not leave "+0.00%" beside a green arrow.
    for (const percent of [0.004, -0.004, 0.0049]) {
      expect(formatChange(percent, EN)).toBe('0.00%')
      expect(direction(percent)).toBe('flat')
    }
  })
})

describe('writing a day', () => {
  test('the day the rate was published, not the day it is here', () => {
    expect(formatDay('2026-10-05', EN)).toBe('Monday 5 October')
    expect(formatShortDay('2026-10-02', EN)).toBe('2 Oct')
  })

  test('the same day whatever the screen has its clock set to', () => {
    // A rate published in Frankfurt is not a day earlier in Los Angeles. Read
    // in the runner's own zone, this is the test that breaks.
    const original = process.env.TZ

    for (const zone of ['America/Los_Angeles', 'Pacific/Kiritimati', 'UTC']) {
      process.env.TZ = zone
      expect(formatDay('2026-10-05', EN)).toBe('Monday 5 October')
      expect(formatShortDay('2026-10-05', EN)).toBe('5 Oct')
    }

    process.env.TZ = original
  })

  test('something that is not a day is passed through rather than guessed at', () => {
    expect(formatDay('whenever', EN)).toBe('whenever')
    expect(formatShortDay('', EN)).toBe('')
  })
})

describe('the window under a rate', () => {
  test('named exactly as the setting offering it is named', () => {
    expect(formatWindow(7)).toBe('7 days')
    expect(formatWindow(30)).toBe('30 days')
    expect(formatWindow(90)).toBe('90 days')
    expect(formatWindow(365)).toBe('1 year')
  })

  test('counted back from today in the way the API writes days', () => {
    const today = new Date('2026-10-05T12:00:00Z')

    expect(isoDaysBefore(today, 30)).toBe('2026-09-05')
    expect(isoDaysBefore(today, 365)).toBe('2025-10-05')
  })

  test('counting back across a month and a year end', () => {
    expect(isoDaysBefore(new Date('2026-03-05T00:00:00Z'), 7)).toBe(
      '2026-02-26',
    )
    expect(isoDaysBefore(new Date('2026-01-03T00:00:00Z'), 7)).toBe(
      '2025-12-27',
    )
  })
})

import { describe, expect, test } from 'bun:test'
import { resolveTheme, THEMES } from './theme.js'

describe('choosing the tone', () => {
  test('either of the two, however it is cased', () => {
    for (const theme of THEMES) {
      expect(resolveTheme(theme)).toBe(theme)
    }
    expect(resolveTheme(' Light ')).toBe('light')
  })

  test('anything else stays on the tone a screen ships with', () => {
    for (const setting of ['', 'auto', 'sepia', 'classic-dark']) {
      expect(resolveTheme(setting)).toBe('dark')
    }
  })
})

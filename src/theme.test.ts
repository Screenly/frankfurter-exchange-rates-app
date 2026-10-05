import { describe, expect, test } from 'bun:test'
import { resolveTheme, THEMES } from './theme.js'

describe('choosing the tone', () => {
  test('either of the two, however it is cased', () => {
    for (const theme of THEMES) {
      expect(resolveTheme(theme, 'light')).toBe(theme)
    }
    expect(resolveTheme(' Light ', undefined)).toBe('light')
  })

  test('auto follows the account', () => {
    expect(resolveTheme('auto', 'light')).toBe('light')
    expect(resolveTheme('auto', 'dark')).toBe('dark')
    // An account with no theme of its own is a dark one.
    expect(resolveTheme('auto', undefined)).toBe('dark')
  })

  test('anything else stays on the tone a screen ships with', () => {
    for (const setting of ['', 'sepia', 'classic-dark']) {
      expect(resolveTheme(setting, 'light')).toBe('dark')
    }
  })
})

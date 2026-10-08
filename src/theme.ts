/**
 * One board, two tones. The light and dark palettes are the same design in
 * the two conditions a screen actually lives in: a dim lobby, and a hall with
 * daylight on the glass.
 */

export const THEMES = ['dark', 'light'] as const

export type Theme = (typeof THEMES)[number]

function isTheme(value: string): value is Theme {
  return (THEMES as readonly string[]).includes(value)
}

/**
 * Anything unrecognised stays dark, which is the default a screen ships with.
 */
export function resolveTheme(setting: string): Theme {
  const chosen = setting.trim().toLowerCase()

  return isTheme(chosen) ? chosen : 'dark'
}

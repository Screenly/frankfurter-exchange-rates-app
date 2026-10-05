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
 * The app's own setting, or `auto` to take the tone from the account theme.
 * Anything unrecognised stays dark, which is the default a screen ships with.
 */
export function resolveTheme(
  setting: string,
  accountTheme: string | undefined,
): Theme {
  const chosen = setting.trim().toLowerCase()

  if (isTheme(chosen)) {
    return chosen
  }
  if (chosen === 'auto') {
    return accountTheme === 'light' ? 'light' : 'dark'
  }

  return 'dark'
}

/**
 * The line under a rate.
 *
 * Drawn into a fixed box and stretched to whatever width the card gives it,
 * which is why the stroke is left to `vector-effect` rather than scaled: a
 * path squashed horizontally would otherwise carry a thick vertical stroke and
 * a thin horizontal one.
 */

export interface Spark {
  /** The path along the top of the series. */
  line: string
  /** The same path closed along the bottom, for the wash underneath it. */
  area: string
  /** Whether the rate held still, which is drawn as a line and nothing else. */
  flat: boolean
}

export const SPARK_WIDTH = 240
export const SPARK_HEIGHT = 72

/**
 * Room above and below so that a peak at the very top of the window keeps its
 * stroke inside the box rather than losing half of it to the edge.
 */
const PADDING = 4

/**
 * The least movement the full height of the box is ever allowed to mean, as a
 * fraction of the rate itself.
 *
 * Scaling to whatever the series happens to span makes a quiet currency look
 * like a volatile one: the Hong Kong dollar moved 0.08% against the US dollar
 * over a month, and drawn to fit the box that reads the same as the euro's
 * 3.4%. Half a percent is the floor, so a month inside the band draws as the
 * nearly straight line it was.
 */
const MIN_RELATIVE_SPAN = 0.005

/**
 * Below this much movement a rate is held rather than quiet: the dirham and
 * the riyal are pegged and publish the same figure every day for years.
 */
const FLAT_RELATIVE_SPAN = 0.0005

function round(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * A series of rates as a path. Fewer than two points draws nothing: one rate
 * is a dot, and a dot in a box reads as a speck of dirt on the screen.
 */
export function sparkline(
  values: number[],
  width = SPARK_WIDTH,
  height = SPARK_HEIGHT,
): Spark | null {
  if (values.length < 2) {
    return null
  }

  const lowest = Math.min(...values)
  const highest = Math.max(...values)
  const middle = (lowest + highest) / 2
  const level = Math.abs(middle) || 1
  const moved = (highest - lowest) / level
  // Floored, so that a series that barely moved is drawn as one. A series that
  // moved more than the floor is scaled to itself exactly as before.
  const span = Math.max(highest - lowest, level * MIN_RELATIVE_SPAN)
  const usable = height - PADDING * 2

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width
    // Measured from the middle of the series rather than its lowest point, so
    // that a flat one sits in the middle of the box instead of on its floor.
    const fraction = 0.5 + (value - middle) / span
    return [round(x), round(height - PADDING - fraction * usable)] as const
  })

  const line = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`)
    .join(' ')

  const first = points[0]!
  const last = points[points.length - 1]!
  const area = `${line} L${last[0]} ${height} L${first[0]} ${height} Z`

  return { line, area, flat: moved < FLAT_RELATIVE_SPAN }
}

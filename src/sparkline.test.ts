import { describe, expect, test } from 'bun:test'
import { sparkline, SPARK_HEIGHT, SPARK_WIDTH } from './sparkline.js'

/** Every coordinate pair in a path, in the order they are drawn. */
function points(path: string): Array<[number, number]> {
  return [...path.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((match) => [
    Number(match[1]),
    Number(match[2]),
  ])
}

describe('the line under a rate', () => {
  test('one point, or none, draws nothing', () => {
    expect(sparkline([])).toBeNull()
    expect(sparkline([1.12])).toBeNull()
  })

  test('runs the full width, left to right, in the order given', () => {
    const spark = sparkline([1, 2, 3])!
    const drawn = points(spark.line)

    expect(drawn).toHaveLength(3)
    expect(drawn[0]![0]).toBe(0)
    expect(drawn[2]![0]).toBe(SPARK_WIDTH)
    expect(spark.line.startsWith('M')).toBe(true)
  })

  test('the highest rate sits above the lowest', () => {
    const [low, , high] = points(sparkline([1, 2, 3])!.line)

    // Up the screen is down in y, so the high rate carries the smaller number.
    expect(high![1]).toBeLessThan(low![1])
  })

  test('stays inside its box, with room for the stroke at either edge', () => {
    for (const series of [
      [5, 1, 9, 3],
      [3.6725, 3.6725],
      [100, 100.001],
    ]) {
      for (const [, y] of points(sparkline(series)!.line)) {
        expect(y).toBeGreaterThan(0)
        expect(y).toBeLessThan(SPARK_HEIGHT)
      }
    }
  })
})

describe('a rate that hardly moved', () => {
  test('a week where nothing moved is a straight line through the middle', () => {
    const spark = sparkline([1.2, 1.2, 1.2])!
    const drawn = points(spark.line)
    const heights = new Set(drawn.map(([, y]) => y))

    expect(heights.size).toBe(1)
    expect([...heights][0]).toBeCloseTo(SPARK_HEIGHT / 2, 5)
    expect(spark.flat).toBe(true)
  })

  test('a pegged rate is reported as held, not merely quiet', () => {
    // The dirham is pegged at 3.6725 to the dollar and has published that same
    // figure every working day for years.
    const pegged = Array.from({ length: 31 }, () => 3.6725)

    expect(sparkline(pegged)!.flat).toBe(true)
    // A rate that moved a third of a percent is quiet, and still drawn.
    expect(sparkline([100, 100.33])!.flat).toBe(false)
  })

  test('a rate inside its band is not stretched to look volatile', () => {
    // The Hong Kong dollar moved 0.08% against the US dollar over a month.
    // Scaled to whatever it happened to span, that filled the box and read
    // like the euro's 3.4%.
    const band = [7.8459, 7.8524, 7.848, 7.851, 7.8465, 7.8524]
    const drawn = points(sparkline(band)!.line)
    const ys = drawn.map(([, y]) => y)
    const used = (Math.max(...ys) - Math.min(...ys)) / SPARK_HEIGHT

    expect(used).toBeLessThan(0.25)
  })

  test('a rate that really moved still uses the whole box', () => {
    // The euro against the dollar over the same month: 3.4%.
    const real = [0.85945, 0.87, 0.8623, 0.88901, 0.8712]
    const drawn = points(sparkline(real)!.line)
    const ys = drawn.map(([, y]) => y)
    const used = (Math.max(...ys) - Math.min(...ys)) / SPARK_HEIGHT

    expect(used).toBeGreaterThan(0.8)
    expect(sparkline(real)!.flat).toBe(false)
  })

  test('the wash underneath is the line closed along the bottom', () => {
    const spark = sparkline([1, 2])!
    const closed = points(spark.area)

    expect(spark.area.startsWith(spark.line)).toBe(true)
    expect(spark.area.endsWith('Z')).toBe(true)
    expect(closed[closed.length - 1]).toEqual([0, SPARK_HEIGHT])
    expect(closed[closed.length - 2]).toEqual([SPARK_WIDTH, SPARK_HEIGHT])
  })

  test('a long series is drawn at the size asked for', () => {
    const values = Array.from({ length: 365 }, (_, day) => Math.sin(day) + 2)
    const spark = sparkline(values, 100, 40)!
    const drawn = points(spark.line)

    expect(drawn).toHaveLength(365)
    expect(drawn[drawn.length - 1]![0]).toBe(100)
    for (const [, y] of drawn) {
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(40)
    }
  })
})

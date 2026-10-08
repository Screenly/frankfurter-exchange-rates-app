import { describe, expect, test } from 'bun:test'
import { columnsFor } from './layout.js'

/** The room the cards get on a 1920 by 1080 screen, once the rest has its. */
const LANDSCAPE = { width: 1792, height: 695 }
/** And on the same screen stood on end. */
const PORTRAIT = { width: 984, height: 1430 }

const landscape = (count: number) =>
  columnsFor(count, LANDSCAPE.width, LANDSCAPE.height)

describe('choosing the grid', () => {
  test('a handful of currencies across a wide screen', () => {
    expect(landscape(1)).toBe(1)
    expect(landscape(2)).toBe(2)
    expect(landscape(4)).toBe(2)
    expect(landscape(6)).toBe(3)
    expect(landscape(8)).toBe(4)
  })

  test('a full board is filled rather than left with gaps', () => {
    // Twelve across five is the better shape and the worse board: it leaves a
    // last row of two beside three empty cells.
    expect(landscape(12)).toBe(4)
    expect(landscape(10)).toBe(5)
    expect(landscape(9)).toBe(3)
  })

  test('no layout ever leaves a whole empty row', () => {
    for (let count = 1; count <= 12; count += 1) {
      const columns = landscape(count)
      const rows = Math.ceil(count / columns)

      expect(columns * (rows - 1)).toBeLessThan(count)
    }
  })

  test('a screen on its end stacks rather than squeezes', () => {
    expect(columnsFor(6, PORTRAIT.width, PORTRAIT.height)).toBe(2)
    expect(columnsFor(12, PORTRAIT.width, PORTRAIT.height)).toBe(2)
    expect(columnsFor(2, PORTRAIT.width, PORTRAIT.height)).toBe(1)
  })

  test('cards come out near the shape they are drawn for', () => {
    for (let count = 2; count <= 12; count += 1) {
      const columns = landscape(count)
      const rows = Math.ceil(count / columns)
      const aspect = LANDSCAPE.width / columns / (LANDSCAPE.height / rows)

      // Never a letterbox, and never so tall that the number floats in space.
      expect(aspect).toBeGreaterThan(0.8)
      expect(aspect).toBeLessThan(2.6)
    }
  })

  test('nothing to lay out, or no room to lay it out in', () => {
    expect(columnsFor(0, 1792, 695)).toBe(1)
    expect(columnsFor(6, 0, 695)).toBe(1)
    expect(columnsFor(6, 1792, 0)).toBe(1)
  })
})

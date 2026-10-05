/**
 * How many columns the cards go into.
 *
 * A board shows anything from one currency to a dozen, on a screen that may be
 * on its side, so the grid is chosen from the room there actually is rather
 * than fixed per count. The target is a card half again as wide as it is tall,
 * which is the shape a big number and a line underneath want.
 */

const TARGET_ASPECT = 1.6
const MAX_COLUMNS = 5

/**
 * What an empty cell in the last row costs, against how far a card's shape is
 * from the one wanted. Twelve currencies fit five across more neatly than four
 * if shape is all that counts, and leave a row of five, five and two: the gap
 * reads as something missing, which is worth a little distortion to avoid.
 */
const EMPTY_CELL_COST = 0.25

export function columnsFor(
  count: number,
  width: number,
  height: number,
  target = TARGET_ASPECT,
): number {
  if (count <= 1 || width <= 0 || height <= 0) {
    return 1
  }

  let best = 1
  let bestMiss = Number.POSITIVE_INFINITY

  for (let columns = 1; columns <= Math.min(count, MAX_COLUMNS); columns += 1) {
    const rows = Math.ceil(count / columns)
    const aspect = width / columns / (height / rows)
    // Compared as a ratio rather than a difference, so that a card twice as
    // wide as it should be counts the same as one half as wide.
    const miss =
      Math.abs(Math.log(aspect / target)) +
      (columns * rows - count) * EMPTY_CELL_COST

    if (miss < bestMiss - 1e-9) {
      bestMiss = miss
      best = columns
    }
  }

  return best
}

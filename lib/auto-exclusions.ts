import { touching, unitsFor } from './double-logic.ts';
import type { CellState, GridPuzzle } from './logic.ts';

// Automatic notes are derived, never saved over the player's own notes.
export function withAutomaticExclusions(
  puzzle: GridPuzzle,
  board: CellState[],
) {
  const size = puzzle.regions.length;
  const quota = puzzle.cowsPerUnit ?? 1;
  const cows = board.flatMap((value, index) => (value === 2 ? [index] : []));
  const excluded = new Set<number>();
  for (let index = 0; index < board.length; index++) {
    if (board[index] !== 2 && cows.some((cow) => touching(cow, index, size)))
      excluded.add(index);
  }
  for (const unit of unitsFor(puzzle)) {
    if (unit.filter((index) => board[index] === 2).length >= quota)
      unit.forEach((index) => {
        if (board[index] !== 2) excluded.add(index);
      });
  }
  return board.map(
    (value, index): CellState =>
      value === 0 && excluded.has(index) ? 1 : value,
  );
}

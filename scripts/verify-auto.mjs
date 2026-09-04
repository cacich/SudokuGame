import assert from 'node:assert/strict';
import { CAMPAIGN } from '../lib/campaign-data.ts';
import { HARD } from '../lib/hard-data.ts';
import { generatePuzzle } from '../lib/puzzles.ts';
import { solutionCells, nextDeduction, isSolved } from '../lib/logic.ts';
import { withAutomaticExclusions } from '../lib/auto-exclusions.ts';

const puzzles = [...CAMPAIGN, ...HARD, ...[1, 20, 1000].map(generatePuzzle)];
for (const puzzle of puzzles) {
  const n = puzzle.regions.length;
  const solution = solutionCells(puzzle);
  const board = Array(n * n).fill(0);
  const at = (i) => puzzle.regions[Math.floor(i / n)][i % n];
  for (const cow of solution) {
    const before = [...board];
    board[cow] = 2;
    const snapshot = JSON.stringify(board);
    const visible = withAutomaticExclusions(puzzle, board);
    assert.equal(
      JSON.stringify(board),
      snapshot,
      'must not mutate stored board',
    );
    const cows = board.flatMap((v, i) => (v === 2 ? [i] : []));
    // Independent per-cell oracle checks adjacency and all three quota counts.
    for (let i = 0; i < board.length; i++) {
      const row = Math.floor(i / n),
        col = i % n;
      const quota = puzzle.cowsPerUnit ?? 1;
      const blocked =
        cows.some(
          (c) =>
            Math.abs(Math.floor(c / n) - row) <= 1 &&
            Math.abs((c % n) - col) <= 1,
        ) ||
        cows.filter((c) => Math.floor(c / n) === row).length >= quota ||
        cows.filter((c) => c % n === col).length >= quota ||
        cows.filter((c) => at(c) === at(i)).length >= quota;
      assert.equal(visible[i], board[i] === 2 ? 2 : blocked ? 1 : 0);
    }
    for (const remaining of solution)
      assert.notEqual(
        visible[remaining],
        1,
        'never exclude a remaining solution cow',
      );
    const restored = [...board];
    restored[cow] = 0;
    assert.deepEqual(
      withAutomaticExclusions(puzzle, restored),
      withAutomaticExclusions(puzzle, before),
      'removal/undo recalculates overlapping exclusions',
    );
    assert.deepEqual(
      withAutomaticExclusions(puzzle, JSON.parse(snapshot)),
      visible,
      'reload regenerates notes',
    );
  }
  assert.ok(isSolved(puzzle, board));

  const manual = Array(n * n).fill(0);
  manual[solution[0]] = 2;
  const auto = withAutomaticExclusions(puzzle, manual).findIndex(
    (v, i) => v === 1 && manual[i] === 0,
  );
  manual[auto] = 1;
  assert.equal(withAutomaticExclusions(puzzle, manual)[auto], 1);
  manual[solution[0]] = 0;
  assert.deepEqual(
    withAutomaticExclusions(puzzle, manual),
    manual,
    'manual notes survive removal/reset of cows',
  );
  assert.ok(
    withAutomaticExclusions(puzzle, Array(n * n).fill(0)).every((v) => v === 0),
  );

  // UI hints consume derived notes but only their actual changes are persisted.
  if (puzzle.id) {
    const raw = Array(n * n).fill(0);
    for (let step = 0; step < n * n * 2 && !isSolved(puzzle, raw); step++) {
      const hint = nextDeduction(puzzle, withAutomaticExclusions(puzzle, raw));
      assert.ok(hint, 'automatic notes must not block logical hints');
      hint.cells.forEach((i) => {
        assert.equal(
          hint.value === 2,
          solution.includes(i),
          'hint stays sound',
        );
        raw[i] = hint.value;
      });
    }
    assert.ok(isSolved(puzzle, raw));
  }
}
console.log(
  `Automatic exclusions verified for ${puzzles.length} puzzles: quotas, overlaps, undo, manual notes, saves and hints.`,
);

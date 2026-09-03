import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CAMPAIGN } from '../lib/campaign-data.ts';
import { CHAPTERS } from '../lib/chapters.ts';
import {
  exactSolutions,
  logicalSolve,
  nextDeduction,
  conflictsFor,
  isSolved,
} from '../lib/logic.ts';
import { generatePuzzle } from '../lib/puzzles.ts';
import {
  canOpen,
  emptyProgress,
  emptySession,
  keyFor,
  mergeProgress,
  migrateLegacy,
  parseProgress,
  saveSession,
  unlockedLevel,
} from '../lib/progress.ts';

function shapeKey(p) {
  const n = p.regions.length,
    forms = [];
  for (let mirror = 0; mirror < 2; mirror++)
    for (let turn = 0; turn < 4; turn++) {
      const labels = new Map();
      forms.push(
        p.regions
          .flatMap((row, r) =>
            row.map((_, c) => {
              let x = r,
                y = mirror ? n - c - 1 : c;
              for (let t = 0; t < turn; t++) [x, y] = [y, n - x - 1];
              const id = p.regions[x][y];
              if (!labels.has(id)) labels.set(id, labels.size);
              return labels.get(id);
            }),
          )
          .join(''),
      );
    }
  return `${n}:${forms.sort()[0]}`;
}
function checkConnected(p) {
  const n = p.regions.length;
  for (let z = 0; z < n; z++) {
    const cells = p.regions.flatMap((row, r) =>
      row.flatMap((v, c) => (v === z ? [r * n + c] : [])),
    );
    assert(cells.length > 0);
    const seen = new Set([cells[0]]),
      queue = [cells[0]];
    while (queue.length) {
      const i = queue.pop(),
        r = Math.floor(i / n),
        c = i % n;
      for (const [dr, dc] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nr = r + dr,
          nc = c + dc,
          j = nr * n + nc;
        if (
          nr >= 0 &&
          nr < n &&
          nc >= 0 &&
          nc < n &&
          p.regions[nr][nc] === z &&
          !seen.has(j)
        ) {
          seen.add(j);
          queue.push(j);
        }
      }
    }
    assert.equal(seen.size, cells.length, `disconnected ${p.id} region ${z}`);
  }
}
assert.equal(CAMPAIGN.length, 200);
assert.equal(new Set(CAMPAIGN.map((p) => p.id)).size, 200);
assert.equal(
  new Set(CAMPAIGN.map(shapeKey)).size,
  200,
  'no rotated/reflected duplicates',
);
let progress = emptyProgress();
let previousChapterRating = 0;
for (let level = 0; level < 200; level++) {
  const puzzle = CAMPAIGN[level],
    n = puzzle.regions.length,
    selection = { mode: 'campaign', level };
  assert.equal(n, CHAPTERS[Math.floor(level / 20)].size);
  assert(
    puzzle.regions.every(
      (row) =>
        row.length === n &&
        row.every((z) => Number.isInteger(z) && z >= 0 && z < n),
    ),
  );
  checkConnected(puzzle);
  const solutions = exactSolutions(puzzle);
  assert.equal(solutions.length, 1, `uniqueness ${puzzle.id}`);
  assert.deepEqual(solutions[0], puzzle.solution);
  const proof = logicalSolve(puzzle);
  assert(proof.solved, `logical solve ${puzzle.id}`);
  assert.equal(proof.score, puzzle.difficulty.score);
  for (const step of proof.steps)
    for (const cell of step.cells) {
      const isCow = puzzle.solution[Math.floor(cell / n)] === cell % n;
      assert.equal(step.value === 2, isCow, `unsound deduction ${puzzle.id}`);
    }
  // No forward bypass, including chapter boundaries, and no dependency on hint usage.
  assert(canOpen(progress, selection));
  assert(!canOpen(progress, { mode: 'campaign', level: level + 1 }));
  const session = { board: proof.board, elapsed: 42, hints: level % 2 };
  progress = saveSession(progress, selection, session, puzzle);
  assert.equal(unlockedLevel(progress), Math.min(level + 1, 199));
  assert.equal(progress.flawless.includes(puzzle.id), level % 2 === 0);
  assert.equal(progress.records[puzzle.id].elapsed, 42);
  if (level % 20 === 19) {
    const chapter = CAMPAIGN.slice(level - 19, level + 1);
    const mean =
      chapter.reduce(
        (sum, p) => sum + p.regions.length * 1000 + p.difficulty.score,
        0,
      ) / 20;
    assert(mean >= previousChapterRating, 'chapter curve must not decrease');
    previousChapterRating = mean;
    console.log(
      `Chapter ${Math.floor(level / 20) + 1}: ${n}x${n}; tiers ${Math.min(...chapter.map((p) => p.difficulty.tier))}–${Math.max(...chapter.map((p) => p.difficulty.tier))}; score ${chapter[0].difficulty.score}–${chapter.at(-1).difficulty.score}`,
    );
  }
}
assert.equal(progress.completed.length, 200);
assert(!canOpen(progress, { mode: 'campaign', level: 200 }));
assert(!canOpen(progress, { mode: 'campaign', level: -1 }));
assert(!canOpen(progress, { mode: 'campaign', level: 1.1 }));
assert(!canOpen(progress, { mode: 'invalid', level: 0 }));
assert(canOpen(progress, { mode: 'endless', level: 999999 }));
assert(!canOpen(progress, { mode: 'endless', level: 1000000 }));
progress = saveSession(
  progress,
  { mode: 'campaign', level: 0 },
  emptySession(5),
  CAMPAIGN[0],
);
assert.equal(unlockedLevel(progress), 199, 'replaying cannot relock levels');
assert.equal(progress.completed.length, 200);
assert.deepEqual(
  parseProgress(JSON.parse(JSON.stringify(progress))),
  progress,
  'backup roundtrip',
);
assert.throws(() => parseProgress({ version: 99 }));
assert.equal(
  Object.keys(
    parseProgress({
      version: 2,
      records: { 'journey-v1-001': { board: [8] }, __proto__: {} },
      completed: ['bad'],
    }).records,
  ).length,
  0,
);
const legacyBoard = Array(49).fill(0);
legacyBoard[10] = 1;
legacyBoard[25] = 2;
const legacy = migrateLegacy({
  boards: { 7: legacyBoard, 8: [99] },
  completed: [0, 4, -1, 'bad'],
  level: 7,
});
assert.deepEqual(legacy.records['endless-8'].board, legacyBoard);
assert.deepEqual(legacy.last, { mode: 'endless', level: 7 });
assert.deepEqual(legacy.completed, ['endless-1', 'endless-5']);
assert.equal(
  unlockedLevel(legacy),
  0,
  'endless progress does not unlock campaign',
);
assert(!('endless-9' in legacy.records));
const merged = mergeProgress(progress, legacy);
assert.equal(merged.completed.length, 202);
assert.deepEqual(merged.records['endless-8'].board, legacyBoard);
assert.deepEqual(
  merged.records[keyFor({ mode: 'campaign', level: 0 })].board,
  Array(25).fill(0),
);
for (const level of [1, 2, 5, 20, 100, 1000, 999999]) {
  const p = generatePuzzle(level);
  assert.equal(exactSolutions(p).length, 1);
  assert.deepEqual(generatePuzzle(level), p);
}
const p = CAMPAIGN[0],
  bad = emptySession(5).board;
bad[0] = 2;
bad[1] = 2;
assert.equal(conflictsFor(p, bad).size, 2);
assert(!isSolved(p, bad));
assert(nextDeduction(p, emptySession(5).board));
const css = readFileSync(
  new URL('../app/globals.css', import.meta.url),
  'utf8',
).replace(/\s+/g, '');
assert(
  css.includes('grid-template-columns:repeat(var(--size,7),minmax(0,1fr))'),
);
assert(css.includes('grid-template-rows:repeat(var(--size,7),minmax(0,1fr))'));
for (let i = 1; i <= 10; i++)
  assert(
    readFileSync(
      new URL(
        `../public/chapters/ch${String(i).padStart(2, '0')}.webp`,
        import.meta.url,
      ),
    ).length > 1000,
  );
console.log(
  'PASS: 200 unique connected puzzles, sound no-guess proofs, chapter curve, sequential locks, replay, save migration/merge, endless compatibility, fixed grid tracks and all art assets.',
);

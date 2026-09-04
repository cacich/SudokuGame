import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HARD } from '../lib/hard-data.ts';
import { CAMPAIGN } from '../lib/campaign-data.ts';
import {
  conflictsFor,
  isSolved,
  logicalSolve,
  nextDeduction,
  solutionCells,
} from '../lib/logic.ts';
import { doubleSolutions, unitsFor } from '../lib/double-logic.ts';
import {
  canOpen,
  emptyProgress,
  emptySession,
  keyFor,
  parseProgress,
  saveSession,
  unlockedLevel,
  mergeProgress,
} from '../lib/progress.ts';

// Independent, deliberately simple enumerator: no candidate engine or production pruning.
function independentCount(p) {
  const n = p.regions.length,
    cols = Array(n).fill(0),
    zones = Array(n).fill(0);
  let count = 0;
  function visit(r, previous) {
    if (r === n) {
      if (cols.every((v) => v === 2) && zones.every((v) => v === 2)) count++;
      return;
    }
    for (let a = 0; a < n; a++)
      for (let b = a + 2; b < n; b++) {
        if (previous.some((c) => Math.abs(c - a) <= 1 || Math.abs(c - b) <= 1))
          continue;
        const za = p.regions[r][a],
          zb = p.regions[r][b];
        cols[a]++;
        cols[b]++;
        zones[za]++;
        zones[zb]++;
        if (cols[a] <= 2 && cols[b] <= 2 && zones[za] <= 2 && zones[zb] <= 2)
          visit(r + 1, [a, b]);
        cols[a]--;
        cols[b]--;
        zones[za]--;
        zones[zb]--;
        if (count >= 2) return;
      }
  }
  visit(0, []);
  return count;
}
function fingerprint(p) {
  const n = p.regions.length,
    shapes = [];
  for (let mirror = 0; mirror < 2; mirror++)
    for (let rotation = 0; rotation < 4; rotation++) {
      const labels = new Map();
      shapes.push(
        p.regions
          .flatMap((row, r) =>
            row.map((_, c) => {
              let y = r,
                x = mirror ? n - 1 - c : c;
              for (let t = 0; t < rotation; t++) [y, x] = [x, n - 1 - y];
              const z = p.regions[y][x];
              if (!labels.has(z)) labels.set(z, labels.size);
              return labels.get(z);
            }),
          )
          .join(','),
      );
    }
  return shapes.sort()[0];
}
assert.equal(HARD.length, 40);
assert.equal(new Set(HARD.map((p) => p.id)).size, 40);
assert.equal(new Set(HARD.map(fingerprint)).size, 40);
let progress = emptyProgress(),
  lastScore = 0;
for (const [level, p] of HARD.entries()) {
  assert.equal(p.cowsPerUnit, 2);
  assert.equal(p.regions.length, 10);
  assert(
    p.regions.every(
      (row) =>
        row.length === 10 &&
        row.every((z) => Number.isInteger(z) && z >= 0 && z < 10),
    ),
  );
  const correct = new Set(solutionCells(p));
  assert.equal(correct.size, 20);
  const fullBoard = Array.from({ length: 100 }, (_, i) =>
    correct.has(i) ? 2 : 0,
  );
  for (const unit of unitsFor(p))
    assert.equal(unit.filter((i) => correct.has(i)).length, 2);
  assert(isSolved(p, fullBoard));
  for (let z = 0; z < 10; z++) {
    const group = unitsFor(p)[20 + z],
      visited = new Set([group[0]]),
      queue = [group[0]];
    while (queue.length) {
      const i = queue.pop(),
        r = Math.floor(i / 10),
        c = i % 10;
      for (const [dy, dx] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const y = r + dy,
          x = c + dx,
          next = y * 10 + x;
        if (
          y >= 0 &&
          y < 10 &&
          x >= 0 &&
          x < 10 &&
          p.regions[y][x] === z &&
          !visited.has(next)
        ) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    assert.equal(visited.size, group.length);
  }
  assert.equal(independentCount(p), 1, `${p.id}: independent unique check`);
  const solutions = doubleSolutions(p);
  assert.equal(solutions.length, 1);
  assert.deepEqual(solutions[0], p.solution);
  const proof = logicalSolve(p);
  assert(proof.solved);
  assert.equal(proof.score, p.difficulty.score);
  assert(proof.score >= lastScore);
  lastScore = proof.score;
  for (const step of proof.steps)
    for (const i of step.cells)
      assert.equal(step.value === 2, correct.has(i), `${p.id}: sound proof`);
  // Resume from varied correct partial boards, not only the generator's deduction order.
  for (let trial = 0; trial < 10; trial++) {
    const partial = fullBoard.map((v, i) =>
      (i * 13 + trial * 7) % 11 < 4 ? (v === 2 ? 2 : 1) : 0,
    );
    const step = nextDeduction(p, partial);
    if (step)
      for (const i of step.cells)
        assert.equal(step.value === 2, correct.has(i));
  }
  const selection = { mode: 'hard', level };
  assert(canOpen(progress, selection));
  assert(!canOpen(progress, { mode: 'hard', level: level + 1 }));
  progress = saveSession(
    progress,
    selection,
    { board: fullBoard, hints: level % 2, elapsed: 99 },
    p,
  );
  assert.equal(unlockedLevel(progress, 'hard'), Math.min(level + 1, 39));
  assert.equal(progress.flawless.includes(p.id), level % 2 === 0);
  assert.equal(
    unlockedLevel(progress),
    0,
    'hard cannot unlock normal campaign',
  );
  console.log(`${p.id}: unique / logical / connected / unlock OK`);
}
assert(!canOpen(progress, { mode: 'hard', level: 40 }));
assert(!canOpen(progress, { mode: 'hard', level: -1 }));
assert(!canOpen(progress, { mode: 'hard', level: 1.2 }));
progress.last = { mode: 'hard', level: 39 };
assert.deepEqual(parseProgress(JSON.parse(JSON.stringify(progress))), progress);
const old = emptyProgress();
old.completed = [CAMPAIGN[0].id];
old.last = { mode: 'campaign', level: 1 };
assert.deepEqual(
  parseProgress(old),
  old,
  'existing v2 saves still read unchanged',
);
const merged = mergeProgress(progress, old);
assert(merged.completed.includes(CAMPAIGN[0].id));
assert.equal(merged.completed.length, 41);
progress = saveSession(
  progress,
  { mode: 'hard', level: 0 },
  emptySession(10),
  HARD[0],
);
assert.equal(unlockedLevel(progress, 'hard'), 39);
assert.equal(
  progress.records[keyFor({ mode: 'hard', level: 0 })].board.length,
  100,
);
const simple = {
  cowsPerUnit: 2,
  solution: [],
  regions: Array.from({ length: 10 }, (_, r) => Array(10).fill(r)),
};
let board = Array(100).fill(0);
board[0] = 2;
board[2] = 2;
assert.equal(
  conflictsFor(simple, board).size,
  0,
  'two separated cows allowed in one row/region',
);
board[4] = 2;
assert.equal(conflictsFor(simple, board).size, 3, 'third cow exceeds quota');
board = Array(100).fill(0);
board[0] = 2;
board[20] = 2;
assert.equal(
  conflictsFor(simple, board).size,
  0,
  'two separated cows in one column',
);
board[11] = 2;
assert.equal(
  conflictsFor(simple, board).size,
  3,
  'diagonal touching forbidden',
);
assert(!isSolved(HARD[0], Array(100).fill(0)));
assert.throws(
  () => doubleSolutions(HARD[0], 2, undefined, 1),
  /budget/,
  'incomplete search must never be called unique',
);
const home = readFileSync(
  new URL('../components/home-screen.tsx', import.meta.url),
  'utf8',
);
assert(home.includes('雙牛模式'));
assert(!home.includes('200 道'));
assert(!home.includes('<small>'));
assert(!home.includes('home-footnote'));
console.log(
  'PASS: 40 double-cow puzzles verified independently, logical hints, quotas, locks, saves, old-mode isolation, simple menu.',
);

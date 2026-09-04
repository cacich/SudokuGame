import assert from 'node:assert/strict';
import { MIXED } from '../lib/mixed-data.ts';
import { CAMPAIGN } from '../lib/campaign-data.ts';
import { HARD } from '../lib/hard-data.ts';
import { puzzleFor } from '../lib/game-puzzles.ts';
import { mixedSolutions } from '../lib/variants.ts';
import {
  conflictsFor,
  exactSolutions,
  isSolved,
  logicalSolve,
  nextDeduction,
  solutionCells,
} from '../lib/logic.ts';
import { doubleSolutions } from '../lib/double-logic.ts';
import { withAutomaticExclusions } from '../lib/auto-exclusions.ts';
import {
  emptyProgress,
  emptySession,
  keyFor,
  canOpen,
  unlockedLevel,
  saveSession,
  parseProgress,
  mergeProgress,
} from '../lib/progress.ts';

// Independent row enumeration for either one or two cows. No production solver,
// candidate engine, or stored answer is consulted when counting solutions.
function independentCount(p) {
  const n = p.regions.length,
    quota = p.cowsPerUnit ?? 1;
  const targets = p.regionQuotas ?? Array(n).fill(quota);
  const cols = Array(n).fill(0),
    zones = Array(targets.length).fill(0);
  let count = 0;
  function visit(r, previous) {
    if (r === n) {
      if (
        cols.every((v) => v === quota) &&
        zones.every((v, z) => v === targets[z])
      )
        count++;
      return;
    }
    for (let a = 0; a < n; a++)
      for (let b = quota === 2 ? a + 2 : n; b <= n; b++) {
        if (quota === 2 && b === n) continue;
        const positions = quota === 1 ? [a] : [a, b];
        if (
          positions.some(
            (c) =>
              p.blocked?.includes(r * n + c) ||
              previous.some((old) => Math.abs(old - c) <= 1),
          )
        )
          continue;
        positions.forEach((c) => {
          cols[c]++;
          zones[p.regions[r][c]]++;
        });
        if (
          cols.every((v) => v <= quota) &&
          zones.every((v, z) => v <= targets[z])
        )
          visit(r + 1, positions);
        positions.forEach((c) => {
          cols[c]--;
          zones[p.regions[r][c]]--;
        });
        if (count >= 2) return;
      }
  }
  visit(0, []);
  return count;
}
function canonical(p) {
  const n = p.regions.length,
    shapes = [];
  for (let mirror = 0; mirror < 2; mirror++)
    for (let turn = 0; turn < 4; turn++) {
      const labels = new Map();
      shapes.push(
        p.regions
          .flatMap((row, r) =>
            row.map((_, c) => {
              let y = r,
                x = mirror ? n - 1 - c : c;
              for (let k = 0; k < turn; k++) [y, x] = [x, n - 1 - y];
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
assert.equal(MIXED.length, 40);
assert.equal(new Set(MIXED.map(canonical)).size, 40);
let difficulty = 0;
for (const p of MIXED) {
  const n = p.regions.length;
  assert.ok(p.regionQuotas.includes(1) && p.regionQuotas.includes(2));
  assert.equal(
    p.regionQuotas.reduce((a, b) => a + b, 0),
    n,
  );
  for (let z = 0; z < p.regionQuotas.length; z++) {
    const cells = p.regions.flatMap((row, r) =>
      row.flatMap((v, c) => (v === z ? [r * n + c] : [])),
    );
    const seen = new Set([cells[0]]),
      queue = [cells[0]];
    for (const i of queue)
      for (const j of cells)
        if (
          !seen.has(j) &&
          Math.abs(Math.floor(i / n) - Math.floor(j / n)) +
            Math.abs((i % n) - (j % n)) ===
            1
        ) {
          seen.add(j);
          queue.push(j);
        }
    assert.equal(seen.size, cells.length, 'connected mixed region');
  }
  const exact = mixedSolutions(p);
  assert.equal(exact.length, 1);
  assert.deepEqual(exact[0], p.solution.flat());
  const score = n * 1000 + p.difficulty.score;
  assert.ok(score >= difficulty, 'mixed difficulty curve');
  difficulty = score;
}
let progress = emptyProgress(),
  checked = 0;
const banks = {
  campaign: CAMPAIGN,
  hard: HARD,
  mixed: MIXED,
  endless: Array(12).fill(null),
};
for (const [mode, bank] of Object.entries(banks))
  for (const obstacles of [false, true]) {
    for (let level = 0; level < bank.length; level++) {
      const selection = { mode, level, obstacles },
        p = puzzleFor(selection),
        n = p.regions.length;
      const before = JSON.stringify(p),
        solution = new Set(solutionCells(p));
      const full = Array.from({ length: n * n }, (_, i) =>
        solution.has(i) ? 2 : 0,
      );
      assert.ok(isSolved(p, full));
      assert.equal(conflictsFor(p, full).size, 0);
      if (mode === 'mixed' || obstacles)
        assert.equal(independentCount(p), 1, `${mode} ${level} unique`);
      if (obstacles) {
        const exact =
          mode === 'hard'
            ? doubleSolutions(p)
            : mode === 'mixed'
              ? mixedSolutions(p)
              : exactSolutions(p);
        assert.equal(
          exact.length,
          1,
          'production solver also respects obstacles',
        );
        assert.ok(p.blocked.length >= 2);
        assert.equal(new Set(p.blocked).size, p.blocked.length);
        assert.ok(p.blocked.every((i) => !solution.has(i)));
        assert.deepEqual(puzzleFor(selection), p, 'deterministic obstacles');
        const bad = [...full];
        bad[p.blocked[0]] = 2;
        assert.ok(conflictsFor(p, bad).has(p.blocked[0]));
        assert.equal(isSolved(p, bad), false);
        assert.equal(
          puzzleFor({ ...selection, obstacles: false }).blocked,
          undefined,
          'base bank untouched',
        );
      }
      if (mode !== 'endless') {
        const proof = logicalSolve(p);
        assert.ok(
          proof.solved,
          `${mode} ${level} obstacle=${obstacles}: logical solve`,
        );
        if (mode === 'mixed' && !obstacles)
          assert.equal(
            proof.score,
            p.difficulty?.score ?? MIXED[level].difficulty.score,
          );
        for (const step of proof.steps)
          for (const i of step.cells) {
            assert.ok(!p.blocked?.includes(i), 'hints never target obstacles');
            assert.equal(step.value === 2, solution.has(i), 'sound deduction');
          }
      }
      // Exercise toggle / quota / hints on scattered partial valid placements.
      const raw = Array(n * n).fill(0);
      for (const [k, cow] of [...solution].entries()) {
        if (k % 2 === 0) raw[cow] = 2;
      }
      const visible = withAutomaticExclusions(p, raw);
      assert.deepEqual(withAutomaticExclusions(p, raw, false), raw);
      for (const cow of solution) assert.notEqual(visible[cow], 1);
      const hint = nextDeduction(p, visible);
      if (hint)
        for (const i of hint.cells) {
          assert.ok(!p.blocked?.includes(i));
          assert.equal(hint.value === 2, solution.has(i));
        }
      assert.ok(canOpen(progress, selection));
      const original = JSON.stringify(
        progress.records[keyFor({ ...selection, obstacles: !obstacles })],
      );
      progress = saveSession(
        progress,
        selection,
        { board: full, elapsed: 12, hints: 0 },
        p,
      );
      assert.equal(
        JSON.stringify(
          progress.records[keyFor({ ...selection, obstacles: !obstacles })],
        ),
        original,
        'variants have separate saves',
      );
      assert.ok(progress.completed.includes(keyFor(selection)));
      if (mode !== 'endless')
        assert.equal(
          unlockedLevel(progress, mode, obstacles),
          Math.min(level + 1, bank.length - 1),
        );
      progress = saveSession(progress, selection, emptySession(n), p);
      assert.ok(
        progress.completed.includes(keyFor(selection)),
        'replay does not relock',
      );
      progress.last = selection;
      assert.equal(JSON.stringify(p), before, 'no puzzle mutations');
      checked++;
    }
  }
assert.deepEqual(parseProgress(JSON.parse(JSON.stringify(progress))), progress);
assert.deepEqual(
  mergeProgress(progress, emptyProgress()).records,
  progress.records,
);
for (const mode of ['campaign', 'hard', 'mixed']) {
  const clean = emptyProgress(),
    p = puzzleFor({ mode, level: 0 });
  const full = Array.from({ length: p.regions.length ** 2 }, (_, i) =>
    solutionCells(p).includes(i) ? 2 : 0,
  );
  const saved = saveSession(
    clean,
    { mode, level: 0 },
    { board: full, elapsed: 0, hints: 0 },
    p,
  );
  assert.equal(
    canOpen(saved, { mode, level: 1, obstacles: true }),
    false,
    'normal progress cannot unlock wild',
  );
}
assert.equal(canOpen(progress, { mode: 'mixed', level: 40 }), false);
assert.equal(
  canOpen(progress, { mode: 'mixed', level: 0, obstacles: 'yes' }),
  false,
);
console.log(
  `PASS: ${checked} puzzles / variants; mixed uniqueness, connected regions, quotas, obstacle legality, proofs, hints, independent locks and save roundtrip.`,
);

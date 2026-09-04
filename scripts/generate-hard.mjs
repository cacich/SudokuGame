// Offline builder; never regenerate a published content ID.
import { existsSync, writeFileSync } from 'node:fs';
import { doubleSolutions } from '../lib/double-logic.ts';
import { logicalSolve } from '../lib/logic.ts';
const destination = new URL('../lib/hard-data.ts', import.meta.url);
if (existsSync(destination) && !process.argv.includes('--replace-unreleased'))
  throw new Error('Hard v1 bank already exists; use a new content version.');
let seed = 0x6d479214;
function random() {
  seed += 0x6d2b79f5;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const n = 10;
const pairs = [];
for (let a = 0; a < n; a++) for (let b = a + 2; b < n; b++) pairs.push([a, b]);
function plant() {
  const solution = [],
    counts = Array(n).fill(0);
  let nodes = 0;
  function visit(row, prev) {
    if (++nodes > 20000) return false;
    if (row === n) return counts.every((c) => c === 2);
    for (const [a, b] of shuffle([...pairs])) {
      const mask = (1 << a) | (1 << b);
      if (
        mask & (prev | (prev << 1) | (prev >> 1)) ||
        counts[a] === 2 ||
        counts[b] === 2
      )
        continue;
      counts[a]++;
      counts[b]++;
      solution.push([a, b]);
      if (
        counts.every((c) => 2 - c <= Math.ceil((n - row - 1) / 2)) &&
        visit(row + 1, mask)
      )
        return true;
      solution.pop();
      counts[a]--;
      counts[b]--;
    }
    return false;
  }
  return visit(0, 0) ? solution : null;
}
function grow(solution) {
  const cows = new Set(
    solution.flatMap((cols, r) => cols.map((c) => r * n + c)),
  );
  const regions = Array.from({ length: n }, () => Array(n).fill(-1));
  const weights = Array.from({ length: n }, () => 0.03 + random() ** 2),
    frontier = [];
  const unpaired = new Set(cows);
  for (let z = 0; z < n; z++) {
    const root = shuffle([...unpaired])[0],
      queue = [root],
      parent = new Map([[root, -1]]);
    let end = -1;
    for (let k = 0; k < queue.length && end < 0; k++) {
      const i = queue[k],
        r = Math.floor(i / n),
        c = i % n;
      for (const [dr, dc] of shuffle([
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])) {
        const nr = r + dr,
          nc = c + dc,
          j = nr * n + nc;
        if (
          nr < 0 ||
          nr >= n ||
          nc < 0 ||
          nc >= n ||
          regions[nr][nc] >= 0 ||
          parent.has(j)
        )
          continue;
        parent.set(j, i);
        if (unpaired.has(j)) {
          end = j;
          break;
        }
        queue.push(j);
      }
    }
    if (end < 0) return null;
    unpaired.delete(root);
    unpaired.delete(end);
    for (let i = end; i >= 0; i = parent.get(i))
      regions[Math.floor(i / n)][i % n] = z;
  }
  function frontierAt(i, z) {
    const r = Math.floor(i / n),
      c = i % n;
    for (const [dr, dc] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nr = r + dr,
        nc = c + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && regions[nr][nc] < 0)
        frontier.push([nr * n + nc, z]);
    }
  }
  regions.forEach((row, r) =>
    row.forEach((z, c) => {
      if (z >= 0) frontierAt(r * n + c, z);
    }),
  );
  while (frontier.length) {
    const k = Math.floor(random() * frontier.length),
      [i, z] = frontier[k],
      r = Math.floor(i / n),
      c = i % n;
    if (regions[r][c] < 0 && random() > weights[z]) continue;
    frontier[k] = frontier.at(-1);
    frontier.pop();
    if (regions[r][c] >= 0) continue;
    regions[r][c] = z;
    frontierAt(i, z);
  }
  return regions.every((row) => row.every((v) => v >= 0))
    ? { regions, solution, cowsPerUnit: 2 }
    : null;
}
const pool = [],
  seen = new Set();
let connected = 0,
  unique = 0;
for (let attempt = 0; attempt < 50000 && pool.length < 80; attempt++) {
  const solution = plant();
  if (!solution) continue;
  const puzzle = grow(solution);
  if (!puzzle) continue;
  connected++;
  let answers;
  try {
    answers = doubleSolutions(puzzle, 2, undefined, 80000);
  } catch {
    continue;
  }
  if (answers.length !== 1) continue;
  unique++;
  const proof = logicalSolve(puzzle);
  if (!proof.solved) continue;
  const fingerprint = puzzle.regions.flat().join(',');
  if (seen.has(fingerprint)) continue;
  seen.add(fingerprint);
  pool.push({
    ...puzzle,
    difficulty: {
      tier: proof.tier,
      score: proof.score,
      steps: proof.steps.length,
    },
  });
  console.log(
    `Accepted ${pool.length}: attempt ${attempt}, connected ${connected}, unique ${unique}, score ${proof.score}`,
  );
}
if (pool.length < 40)
  throw new Error(
    `Only ${pool.length} accepted; connected ${connected}, unique ${unique}`,
  );
pool.sort((a, b) => a.difficulty.score - b.difficulty.score);
const hard = Array.from({ length: 40 }, (_, i) => ({
  id: `double-v1-${String(i + 1).padStart(3, '0')}`,
  ...pool[Math.floor((i * (pool.length - 1)) / 39)],
}));
writeFileSync(
  destination,
  `// Frozen, independently verified 10x10 two-cow puzzles.\nimport type { DoublePuzzle } from './double-logic.ts';\nexport const HARD: (DoublePuzzle & { id: string; difficulty: { tier: number; score: number; steps: number } })[] = ${JSON.stringify(hard)};\n`,
);
console.log(`Saved ${hard.length} hard puzzles.`);

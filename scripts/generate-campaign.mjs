// Offline content build. The resulting versioned bank is committed, never regenerated on play.
import { existsSync, writeFileSync } from 'node:fs';
import { exactSolutions, logicalSolve } from '../lib/logic.ts';

if (
  existsSync(new URL('../lib/campaign-data.ts', import.meta.url)) &&
  !process.argv.includes('--replace-unreleased')
) {
  throw new Error(
    'The v1 bank is frozen. Generate a NEW content version for released games; --replace-unreleased is only for pre-release development.',
  );
}

let state = 0x79c153a2;
function random() {
  state += 0x6d2b79f5;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
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
function candidate(n) {
  const solution = [];
  function place(row) {
    if (row === n) return true;
    for (const col of shuffle(Array.from({ length: n }, (_, i) => i))) {
      if (
        solution.includes(col) ||
        (row && Math.abs(solution[row - 1] - col) <= 1)
      )
        continue;
      solution.push(col);
      if (place(row + 1)) return true;
      solution.pop();
    }
    return false;
  }
  place(0);
  const regions = Array.from({ length: n }, () => Array(n).fill(-1));
  const frontier = [];
  const growth = Array.from({ length: n }, () => 0.03 + random() ** 2);
  function grow(r, c, z) {
    regions[r][c] = z;
    for (const [dr, dc] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nr = r + dr,
        nc = c + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n && regions[nr][nc] < 0)
        frontier.push([nr, nc, z]);
    }
  }
  solution.forEach((c, r) => {
    regions[r][c] = r;
  });
  solution.forEach((c, r) => grow(r, c, r));
  while (frontier.length) {
    const i = Math.floor(random() * frontier.length),
      [r, c, z] = frontier[i];
    if (regions[r][c] < 0 && random() > growth[z]) continue;
    frontier[i] = frontier.at(-1);
    frontier.pop();
    if (regions[r][c] < 0) grow(r, c, z);
  }
  return { regions, solution };
}
// Canonicalize rotations/reflections AND arbitrary region labels to avoid disguised repeats.
function fingerprint(p) {
  const n = p.regions.length,
    forms = [];
  for (let reflect = 0; reflect < 2; reflect++)
    for (let turn = 0; turn < 4; turn++) {
      const labels = new Map();
      forms.push(
        p.regions
          .flatMap((row, r) =>
            row.map((_, c) => {
              let x = r,
                y = reflect ? n - 1 - c : c;
              for (let t = 0; t < turn; t++) [x, y] = [y, n - 1 - x];
              const z = p.regions[x][y];
              if (!labels.has(z)) labels.set(z, labels.size);
              return labels.get(z);
            }),
          )
          .join(''),
      );
    }
  return forms.sort()[0];
}
const bank = [];
function mutate(puzzle) {
  const regions = puzzle.regions.map((row) => [...row]),
    n = regions.length;
  for (let attempt = 0; attempt < 30; attempt++) {
    const r = Math.floor(random() * n),
      c = Math.floor(random() * n);
    if (puzzle.solution[r] === c) continue;
    const [dr, dc] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ][Math.floor(random() * 4)];
    const nr = r + dr,
      nc = c + dc;
    if (
      nr < 0 ||
      nr >= n ||
      nc < 0 ||
      nc >= n ||
      regions[r][c] === regions[nr][nc]
    )
      continue;
    const old = regions[r][c];
    regions[r][c] = regions[nr][nc];
    const cells = regions.flatMap((row, rr) =>
      row.flatMap((z, cc) => (z === old ? [rr * n + cc] : [])),
    );
    const seen = new Set([cells[0]]),
      queue = [cells[0]];
    while (queue.length) {
      const cell = queue.pop(),
        rr = Math.floor(cell / n),
        cc = cell % n;
      for (const [dy, dx] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const y = rr + dy,
          x = cc + dx,
          id = y * n + x;
        if (
          y >= 0 &&
          y < n &&
          x >= 0 &&
          x < n &&
          regions[y][x] === old &&
          !seen.has(id)
        ) {
          seen.add(id);
          queue.push(id);
        }
      }
    }
    if (seen.size !== cells.length) regions[r][c] = old;
  }
  return { regions, solution: [...puzzle.solution] };
}
for (const [n, required] of [
  [5, 20],
  [6, 40],
  [7, 40],
  [8, 60],
  [9, 40],
]) {
  const pool = [],
    seen = new Set();
  const targetPool =
    n === 9 ? 2500 : required * (n >= 7 ? 140 : n === 6 ? 40 : 12);
  for (
    let attempt = 0;
    attempt < 1000000 && pool.length < targetPool;
    attempt++
  ) {
    const puzzle = candidate(n);
    if (exactSolutions(puzzle).length !== 1) continue;
    const proof = logicalSolve(puzzle);
    if (!proof.solved) continue;
    const key = fingerprint(puzzle);
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push({
      ...puzzle,
      difficulty: {
        tier: proof.tier,
        score: proof.score,
        steps: proof.steps.length,
      },
    });
  }
  if (pool.length < required)
    throw new Error(`Insufficient ${n}x${n} candidates: ${pool.length}`);
  // Search the neighborhood of rare advanced layouts, preserving connectivity and re-proving every edit.
  if (n === 9) {
    const advanced = pool.filter((p) => p.difficulty.tier === 3);
    for (
      let attempt = 0;
      attempt < 30000 && advanced.length < 160 && advanced.length;
      attempt++
    ) {
      const parent = advanced[Math.floor(random() * advanced.length)],
        puzzle = mutate(parent);
      const changed = puzzle.regions
        .flat()
        .filter(
          (z, i) => z !== parent.regions[Math.floor(i / n)][i % n],
        ).length;
      if (changed < 3 || exactSolutions(puzzle).length !== 1) continue;
      const proof = logicalSolve(puzzle),
        key = fingerprint(puzzle);
      if (!proof.solved || proof.tier !== 3 || seen.has(key)) continue;
      seen.add(key);
      const entry = {
        ...puzzle,
        difficulty: {
          tier: proof.tier,
          score: proof.score,
          steps: proof.steps.length,
        },
      };
      advanced.push(entry);
      pool.push(entry);
    }
  }
  pool.sort((a, b) => a.difficulty.score - b.difficulty.score);
  // Teach techniques progressively: singles -> common exclusions -> paired units.
  const bands =
    n === 5
      ? [[1, 20]]
      : n === 6
        ? [
            [1, 20],
            [2, 20],
          ]
        : n === 7
          ? [[2, 40]]
          : n === 8
            ? [
                [2, 40],
                [3, 20],
              ]
            : [[3, 40]];
  const selected = [];
  for (const [tier, count] of bands) {
    const choices = pool.filter((p) => p.difficulty.tier === tier);
    if (choices.length < count)
      throw new Error(
        `Need ${count} tier-${tier} puzzles at size ${n}, got ${choices.length}`,
      );
    for (let i = 0; i < count; i++)
      selected.push(
        choices[Math.floor((i * (choices.length - 1)) / (count - 1))],
      );
  }
  for (const p of selected) {
    const index = bank.length;
    bank.push({ id: `journey-v1-${String(index + 1).padStart(3, '0')}`, ...p });
  }
  console.log(
    `${n}x${n}: selected ${required} / ${pool.length}; score ${selected[0].difficulty.score}–${selected.at(-1).difficulty.score}`,
  );
}
writeFileSync(
  new URL('../lib/campaign-data.ts', import.meta.url),
  `// Generated by scripts/generate-campaign.mjs. Frozen content v1; do not silently regenerate released IDs.\nexport const CAMPAIGN = ${JSON.stringify(bank)};\n`,
);
console.log(`Saved ${bank.length} unique, connected, logic-solvable puzzles.`);

// Offline content selection; print specs only, never overwrite published banks.
import { CAMPAIGN } from '../lib/campaign-data.ts';
import { mixRegions, mixedSolutions } from '../lib/variants.ts';
import { logicalSolve } from '../lib/logic.ts';
const pool = [];
for (let source = 20; source < CAMPAIGN.length; source++) {
  const base = CAMPAIGN[source],
    n = base.regions.length;
  const pairs = [];
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) {
      if (
        base.regions.some((row, r) =>
          row.some(
            (z, c) =>
              z === a &&
              [
                [r - 1, c],
                [r + 1, c],
                [r, c - 1],
                [r, c + 1],
              ].some(([y, x]) => base.regions[y]?.[x] === b),
          ),
        )
      )
        pairs.push([a, b]);
    }
  const count = n <= 6 ? 1 : n === 7 ? 2 : 3;
  let found = null,
    tries = 0;
  function choose(start, chosen) {
    if (found || tries > 250) return;
    if (chosen.length === count) {
      tries++;
      const puzzle = mixRegions(base, chosen);
      if (mixedSolutions(puzzle).length !== 1) return;
      const proof = logicalSolve(puzzle);
      if (proof.solved)
        found = { source, pairs: chosen, size: n, score: proof.score };
      return;
    }
    for (let i = start; i < pairs.length; i++) {
      if (pairs[i].some((z) => chosen.flat().includes(z))) continue;
      choose(i + 1, [...chosen, pairs[i]]);
      if (found) return;
    }
  }
  choose(0, []);
  if (found) pool.push(found);
}
pool.sort((a, b) => a.size * 1000 + a.score - b.size * 1000 - b.score);
if (pool.length < 40) throw new Error(`Only ${pool.length} mixed puzzles`);
const selected = Array.from(
  { length: 40 },
  (_, i) => pool[Math.floor((i * (pool.length - 1)) / 39)],
);
console.log(JSON.stringify(selected));

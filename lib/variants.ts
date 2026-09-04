import type { GridPuzzle } from './logic.ts';

// Stable v1 transformation. Obstacles only remove non-solution cells, so the
// original unique solution remains valid and no additional solution can appear.
export function withObstacles<T extends GridPuzzle>(
  puzzle: T,
  seed: number,
): T {
  const n = puzzle.regions.length;
  const cows = new Set(
    puzzle.solution.flatMap((cols, r) =>
      (Array.isArray(cols) ? cols : [cols]).map((c) => r * n + c),
    ),
  );
  let state = ((seed + 1) * 2654435761) >>> 0;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  const candidates = Array.from({ length: n * n }, (_, i) => i).filter(
    (i) => !cows.has(i),
  );
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return {
    ...puzzle,
    blocked: candidates
      .slice(0, Math.max(2, Math.floor(n * n * 0.1)))
      .sort((a, b) => a - b),
  };
}

// Merge adjacent regions of a frozen single-cow puzzle into 1/2-cow pastures.
export function mixRegions(puzzle: GridPuzzle, pairs: number[][]): GridPuzzle {
  const roots = Array.from({ length: puzzle.regions.length }, (_, i) => i);
  for (const [a, b] of pairs) roots[b] = a;
  const labels = [...new Set(roots)];
  return {
    regions: puzzle.regions.map((row) =>
      row.map((z) => labels.indexOf(roots[z])),
    ),
    solution: puzzle.solution.map((row) =>
      Array.isArray(row) ? [...row] : [row],
    ),
    cowsPerUnit: 1,
    regionQuotas: labels.map(
      (label) => roots.filter((r) => r === label).length,
    ),
  };
}

// Bounded exact solver for mixed puzzles (one cow per row and column).
export function mixedSolutions(
  puzzle: GridPuzzle,
  limit = 2,
  budget = 2000000,
): number[][] {
  const n = puzzle.regions.length,
    results: number[][] = [];
  const counts = Array(puzzle.regionQuotas!.length).fill(0);
  const blocked = new Set(puzzle.blocked ?? []);
  let nodes = 0;
  function visit(cols: number[], mask: number) {
    if (++nodes > budget) throw new Error('Mixed solver budget exceeded');
    const row = cols.length;
    if (row === n) {
      if (counts.every((v, z) => v === puzzle.regionQuotas![z]))
        results.push([...cols]);
      return;
    }
    for (let c = 0; c < n; c++) {
      const z = puzzle.regions[row][c];
      if (
        mask & (1 << c) ||
        blocked.has(row * n + c) ||
        counts[z] >= puzzle.regionQuotas![z] ||
        (row > 0 && Math.abs(cols[row - 1] - c) <= 1)
      )
        continue;
      counts[z]++;
      cols.push(c);
      visit(cols, mask | (1 << c));
      cols.pop();
      counts[z]--;
      if (results.length >= limit) return;
    }
  }
  visit([], 0);
  return results;
}

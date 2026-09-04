export type CellState = 0 | 1 | 2;
import { nextDoubleDeduction, touching, unitsFor } from './double-logic.ts';
export type GridPuzzle = {
  regions: number[][];
  solution: number[] | number[][];
  cowsPerUnit?: 1 | 2;
};
export function solutionCells(puzzle: GridPuzzle) {
  return puzzle.solution.flatMap((columns, row) =>
    (Array.isArray(columns) ? columns : [columns]).map(
      (col) => row * puzzle.regions.length + col,
    ),
  );
}
export type Deduction = {
  cells: number[];
  value: CellState;
  reason: string;
  tier: number;
  focus: number[];
};

export function incompatible(puzzle: GridPuzzle, a: number, b: number) {
  const n = puzzle.regions.length;
  const ar = Math.floor(a / n),
    ac = a % n,
    br = Math.floor(b / n),
    bc = b % n;
  return (
    ar === br ||
    ac === bc ||
    puzzle.regions[ar][ac] === puzzle.regions[br][bc] ||
    (Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1)
  );
}

export function conflictsFor(puzzle: GridPuzzle, board: CellState[]) {
  const bulls = board.flatMap((v, i) => (v === 2 ? [i] : []));
  const bad = new Set<number>();
  if (puzzle.cowsPerUnit === 2) {
    for (let a = 0; a < bulls.length; a++)
      for (let b = a + 1; b < bulls.length; b++)
        if (touching(bulls[a], bulls[b], puzzle.regions.length)) {
          bad.add(bulls[a]);
          bad.add(bulls[b]);
        }
    for (const unit of unitsFor(puzzle)) {
      const placed = unit.filter((i) => board[i] === 2);
      if (placed.length > 2) placed.forEach((i) => bad.add(i));
    }
    return bad;
  }
  for (let a = 0; a < bulls.length; a++)
    for (let b = a + 1; b < bulls.length; b++) {
      if (incompatible(puzzle, bulls[a], bulls[b])) {
        bad.add(bulls[a]);
        bad.add(bulls[b]);
      }
    }
  return bad;
}

export function isSolved(puzzle: GridPuzzle, board: CellState[]) {
  return (
    board.length === puzzle.regions.length ** 2 &&
    board.filter((v) => v === 2).length ===
      puzzle.regions.length * (puzzle.cowsPerUnit ?? 1) &&
    conflictsFor(puzzle, board).size === 0
  );
}

export function nextDeduction(
  puzzle: GridPuzzle,
  board: CellState[],
): Deduction | null {
  if (puzzle.cowsPerUnit === 2) return nextDoubleDeduction(puzzle, board);
  const n = puzzle.regions.length;
  const ids = Array.from({ length: n * n }, (_, i) => i);
  const groups = [
    Array.from({ length: n }, (_, r) =>
      ids.filter((i) => Math.floor(i / n) === r),
    ),
    Array.from({ length: n }, (_, c) => ids.filter((i) => i % n === c)),
    Array.from({ length: n }, (_, z) =>
      ids.filter((i) => puzzle.regions[Math.floor(i / n)][i % n] === z),
    ),
  ];
  const labels = ['橫列', '直欄', '牧區'];
  const bulls = ids.filter((i) => board[i] === 2);
  for (const bull of bulls) {
    const cells = ids.filter(
      (i) => board[i] === 0 && incompatible(puzzle, bull, i),
    );
    if (cells.length)
      return {
        cells,
        value: 1,
        tier: 0,
        focus: [bull],
        reason: `第 ${Math.floor(bull / n) + 1} 列、第 ${(bull % n) + 1} 欄已有牛。同列、同欄、同牧區及相鄰格都能排除。`,
      };
  }
  const available = groups.map((family) =>
    family.map((group) =>
      group.some((i) => board[i] === 2)
        ? []
        : group.filter((i) => board[i] === 0),
    ),
  );
  for (let f = 0; f < 3; f++)
    for (let u = 0; u < n; u++) {
      const cells = available[f][u];
      if (cells.length === 1)
        return {
          cells,
          value: 2,
          tier: 1,
          focus: groups[f][u],
          reason: `第 ${u + 1} 個${labels[f]}只剩一個可放的位置，這格一定有牛。`,
        };
    }
  // Every unit needs one cow. A cell conflicting with ALL its candidates is impossible.
  for (let f = 0; f < 3; f++)
    for (let u = 0; u < n; u++) {
      const candidates = available[f][u];
      if (candidates.length < 2) continue;
      const cells = ids.filter(
        (i) =>
          board[i] === 0 &&
          !candidates.includes(i) &&
          candidates.every((c) => incompatible(puzzle, i, c)),
      );
      if (cells.length)
        return {
          cells,
          value: 1,
          tier: 2,
          focus: candidates,
          reason: `第 ${u + 1} 個${labels[f]}的牛必在框出的候選格之一。不論放在哪裡，亮起的排除格都會與牠衝突。`,
        };
    }
  // Hall subsets: k disjoint source units restricted to k target units occupy them all.
  for (const k of [2, 3])
    for (let source = 0; source < 3; source++)
      for (let target = 0; target < 3; target++) {
        if (source === target) continue;
        const units = available[source]
          .map((cells, index) => ({ cells, index }))
          .filter((u) => u.cells.length);
        const targetOf = (i: number) =>
          target === 0
            ? Math.floor(i / n)
            : target === 1
              ? i % n
              : puzzle.regions[Math.floor(i / n)][i % n];
        function choose(start: number, chosen: typeof units): Deduction | null {
          if (chosen.length === k) {
            const candidates = chosen.flatMap((u) => u.cells);
            const targets = new Set(candidates.map(targetOf));
            if (targets.size !== k) return null;
            const occupied = new Set(candidates);
            const cells = ids.filter(
              (i) =>
                board[i] === 0 && targets.has(targetOf(i)) && !occupied.has(i),
            );
            if (cells.length)
              return {
                cells,
                value: 1,
                tier: k + 1,
                focus: candidates,
                reason: `第 ${chosen.map((u) => u.index + 1).join('、')} 個${labels[source]}的 ${k} 隻牛，剛好要占用 ${k} 個${labels[target]}。這些${labels[target]}的其他候選格可以排除。`,
              };
            return null;
          }
          for (let i = start; i <= units.length - (k - chosen.length); i++) {
            const result = choose(i + 1, [...chosen, units[i]]);
            if (result) return result;
          }
          return null;
        }
        const step = choose(0, []);
        if (step) return step;
      }
  return null;
}

export function logicalSolve(puzzle: GridPuzzle) {
  const board = Array<CellState>(puzzle.regions.length ** 2).fill(0);
  const steps: Deduction[] = [];
  for (let i = 0; i < board.length * 2; i++) {
    if (isSolved(puzzle, board)) break;
    const step = nextDeduction(puzzle, board);
    if (!step) break;
    for (const cell of step.cells) board[cell] = step.value;
    steps.push(step);
  }
  const tier = Math.max(0, ...steps.map((s) => s.tier));
  const effort = steps.reduce((sum, s) => sum + [0, 1, 7, 18, 30][s.tier], 0);
  return {
    solved: isSolved(puzzle, board),
    board,
    steps,
    tier,
    score: tier * 100 + effort,
  };
}

// Independent row-by-row exact search, stopping at two solutions for uniqueness checks.
export function exactSolutions(
  puzzle: Pick<GridPuzzle, 'regions'>,
  limit = 2,
): number[][] {
  const n = puzzle.regions.length,
    result: number[][] = [];
  function visit(columns: number[], colMask: number, regionMask: number) {
    const row = columns.length;
    if (row === n) {
      result.push([...columns]);
      return;
    }
    for (let col = 0; col < n; col++) {
      const region = puzzle.regions[row][col];
      if (
        colMask & (1 << col) ||
        regionMask & (1 << region) ||
        (row > 0 && Math.abs(columns[row - 1] - col) <= 1)
      )
        continue;
      columns.push(col);
      visit(columns, colMask | (1 << col), regionMask | (1 << region));
      columns.pop();
      if (result.length >= limit) return;
    }
  }
  visit([], 0, 0);
  return result;
}

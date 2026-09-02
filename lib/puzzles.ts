export type Puzzle = {
  name: string;
  solution: number[];
  regions: number[][];
  seed: number;
};

export const PUZZLE_SIZE = 7;

const puzzleCache = new Map<number, Puzzle>();

function buildValidSolutions() {
  const solutions: number[][] = [];

  function visit(columns: number[], used: boolean[]) {
    if (columns.length === PUZZLE_SIZE) {
      solutions.push([...columns]);
      return;
    }

    for (let column = 0; column < PUZZLE_SIZE; column += 1) {
      const previous = columns.at(-1);
      if (used[column] || (previous !== undefined && Math.abs(previous - column) <= 1)) continue;
      used[column] = true;
      columns.push(column);
      visit(columns, used);
      columns.pop();
      used[column] = false;
    }
  }

  visit([], Array(PUZZLE_SIZE).fill(false));
  return solutions;
}

const VALID_SOLUTIONS = buildValidSolutions();

function randomFor(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function growRegions(solution: number[], random: () => number) {
  const regions = Array.from({ length: PUZZLE_SIZE }, () =>
    Array(PUZZLE_SIZE).fill(-1),
  );
  const frontier: Array<[number, number, number]> = [];

  solution.forEach((column, row) => {
    regions[row][column] = row;
    frontier.push([row, column, row]);
  });

  let emptyCells = PUZZLE_SIZE * PUZZLE_SIZE - PUZZLE_SIZE;
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (emptyCells > 0) {
    const options: Array<[number, number, number]> = [];
    frontier.forEach(([row, column, region]) => {
      directions.forEach(([dr, dc]) => {
        const nextRow = row + dr;
        const nextColumn = column + dc;
        if (
          nextRow >= 0 && nextRow < PUZZLE_SIZE &&
          nextColumn >= 0 && nextColumn < PUZZLE_SIZE &&
          regions[nextRow][nextColumn] === -1
        ) {
          options.push([nextRow, nextColumn, region]);
        }
      });
    });

    if (options.length === 0) return null;
    const [row, column, region] = options[Math.floor(random() * options.length)];
    regions[row][column] = region;
    frontier.push([row, column, region]);
    emptyCells -= 1;
  }

  return regions;
}

function matchingSolutions(regions: number[][]) {
  return VALID_SOLUTIONS.filter((solution) => {
    const occupiedRegions = new Set(
      solution.map((column, row) => regions[row][column]),
    );
    return occupiedRegions.size === PUZZLE_SIZE;
  });
}

export function generatePuzzle(level: number): Puzzle {
  const safeLevel = Math.max(1, Math.floor(level));
  const cached = puzzleCache.get(safeLevel);
  if (cached) return cached;

  for (let attempt = 0; attempt < 5000; attempt += 1) {
    const seed = Math.imul(safeLevel, 0x9e3779b1) + Math.imul(attempt + 1, 0x85ebca6b);
    const random = randomFor(seed);
    const plantedSolution = VALID_SOLUTIONS[Math.floor(random() * VALID_SOLUTIONS.length)];
    const regions = growRegions(plantedSolution, random);
    if (!regions) continue;
    const solutions = matchingSolutions(regions);
    if (solutions.length !== 1) continue;

    const puzzle = {
      name: `牧場 ${safeLevel}`,
      solution: solutions[0],
      regions,
      seed,
    };
    puzzleCache.set(safeLevel, puzzle);
    return puzzle;
  }

  throw new Error(`無法產生第 ${safeLevel} 關`);
}

export function countPuzzleSolutions(puzzle: Puzzle) {
  return matchingSolutions(puzzle.regions).length;
}

export function validSolutionCount() {
  return VALID_SOLUTIONS.length;
}

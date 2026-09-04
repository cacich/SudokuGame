import { CAMPAIGN } from './campaign-data.ts';
import { HARD } from './hard-data.ts';
import { MIXED } from './mixed-data.ts';
import { generatePuzzle } from './puzzles.ts';
import { withObstacles } from './variants.ts';
import type { Selection } from './progress.ts';
import type { GridPuzzle } from './logic.ts';

export function puzzleFor(selection: Selection): GridPuzzle {
  const { mode, level, obstacles } = selection;
  const base =
    mode === 'campaign'
      ? CAMPAIGN[level]
      : mode === 'hard'
        ? HARD[level]
        : mode === 'mixed'
          ? MIXED[level]
          : generatePuzzle(level + 1);
  if (!base) throw new Error('題號超出範圍');
  return obstacles
    ? withObstacles(
        base,
        level +
          { campaign: 0, hard: 10000, mixed: 20000, endless: 30000 }[mode],
      )
    : base;
}

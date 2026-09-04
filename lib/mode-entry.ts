import {
  canOpen,
  unlockedLevel,
  type Mode,
  type Progress,
  type Selection,
} from './progress.ts';

// Entrances choose the rules before play; never inherit the last game's variant.
export function modeEntry(
  progress: Progress,
  mode: Mode,
  obstacles = false,
): Selection {
  const last = progress.last;
  if (
    last &&
    last.mode === mode &&
    !!last.obstacles === obstacles &&
    canOpen(progress, last)
  )
    return { ...last, obstacles };
  return {
    mode,
    obstacles,
    level: mode === 'endless' ? 0 : unlockedLevel(progress, mode, obstacles),
  };
}

export const obstacleImage = (kind: 'pond' | 'rocks') =>
  `./obstacles/${kind}-v1.webp`;

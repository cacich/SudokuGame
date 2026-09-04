import { CAMPAIGN } from './campaign-data.ts';
import { HARD } from './hard-data.ts';
import { isSolved, type CellState, type GridPuzzle } from './logic.ts';

export type Mode = 'campaign' | 'endless' | 'hard';
export type Selection = { mode: Mode; level: number };
export type Session = { board: CellState[]; elapsed: number; hints: number };
export type Progress = {
  version: 2;
  records: Record<string, Session>;
  completed: string[];
  flawless: string[];
  last: Selection | null;
};
export const SAVE_KEY = 'wildgrid-progress-v2';
export const LEGACY_KEY = 'wildgrid-infinite-progress-v1';
export const MAX_ENDLESS = 1000000;
export const emptyProgress = (): Progress => ({
  version: 2,
  records: {},
  completed: [],
  flawless: [],
  last: null,
});
export const keyFor = ({ mode, level }: Selection) =>
  mode === 'campaign'
    ? (CAMPAIGN[level]?.id ?? 'invalid')
    : mode === 'hard'
      ? (HARD[level]?.id ?? 'invalid')
      : `endless-${level + 1}`;
export const emptySession = (size: number): Session => ({
  board: Array<CellState>(size * size).fill(0),
  elapsed: 0,
  hints: 0,
});
export function unlockedLevel(
  progress: Progress,
  mode: 'campaign' | 'hard' = 'campaign',
) {
  const bank = mode === 'hard' ? HARD : CAMPAIGN;
  let next = 0;
  while (next < bank.length && progress.completed.includes(bank[next].id))
    next++;
  return Math.min(next, bank.length - 1);
}
export function canOpen(progress: Progress, selection: Selection) {
  return (
    Number.isInteger(selection.level) &&
    selection.level >= 0 &&
    (selection.mode === 'endless'
      ? selection.level < MAX_ENDLESS
      : selection.mode === 'hard'
        ? selection.level < HARD.length &&
          selection.level <= unlockedLevel(progress, 'hard')
        : selection.mode === 'campaign' &&
          selection.level <= unlockedLevel(progress))
  );
}
export function saveSession(
  progress: Progress,
  selection: Selection,
  session: Session,
  puzzle: GridPuzzle,
): Progress {
  if (!canOpen(progress, selection)) return progress;
  const key = keyFor(selection),
    solved = isSolved(puzzle, session.board);
  return {
    ...progress,
    records: { ...progress.records, [key]: session },
    completed:
      solved && !progress.completed.includes(key)
        ? [...progress.completed, key]
        : progress.completed,
    flawless:
      solved && session.hints === 0 && !progress.flawless.includes(key)
        ? [...progress.flawless, key]
        : progress.flawless,
  };
}
const integer = (x: unknown, fallback = 0) =>
  Number.isSafeInteger(x) && Number(x) >= 0 ? Number(x) : fallback;
function keySize(key: string) {
  const hard = HARD.find((p) => p.id === key);
  if (hard) return hard.regions.length;
  const campaign = CAMPAIGN.find((p) => p.id === key);
  if (campaign) return campaign.regions.length;
  const match = /^endless-([1-9]\d*)$/.exec(key);
  return match && Number(match[1]) <= MAX_ENDLESS ? 7 : 0;
}
export function parseProgress(raw: unknown): Progress {
  if (!raw || typeof raw !== 'object' || (raw as Progress).version !== 2)
    throw new Error('不支援這個存檔格式');
  const source = raw as Progress,
    result = emptyProgress();
  if (source.records && typeof source.records === 'object')
    for (const [key, value] of Object.entries(source.records)) {
      const size = keySize(key);
      if (
        size &&
        value &&
        Array.isArray(value.board) &&
        value.board.length === size * size &&
        value.board.every((v) => v === 0 || v === 1 || v === 2)
      ) {
        result.records[key] = {
          board: [...value.board],
          elapsed: integer(value.elapsed),
          hints: integer(value.hints),
        };
      }
    }
  result.completed = Array.isArray(source.completed)
    ? [
        ...new Set(
          source.completed.filter((k) => typeof k === 'string' && keySize(k)),
        ),
      ]
    : [];
  result.flawless = Array.isArray(source.flawless)
    ? [...new Set(source.flawless.filter((k) => result.completed.includes(k)))]
    : [];
  if (source.last && canOpen(result, source.last)) result.last = source.last;
  return result;
}
export function migrateLegacy(raw: unknown): Progress {
  const result = emptyProgress();
  if (!raw || typeof raw !== 'object') return result;
  const old = raw as {
    boards?: Record<string, CellState[]>;
    completed?: number[];
    level?: number;
  };
  const records: Record<string, Session> = {};
  if (old.boards && typeof old.boards === 'object')
    for (const [level, board] of Object.entries(old.boards)) {
      if (/^\d+$/.test(level) && Number(level) < MAX_ENDLESS)
        records[`endless-${Number(level) + 1}`] = {
          board,
          elapsed: 0,
          hints: 0,
        };
    }
  return parseProgress({
    version: 2,
    records,
    completed: Array.isArray(old.completed)
      ? old.completed
          .filter((n) => Number.isInteger(n) && n >= 0 && n < MAX_ENDLESS)
          .map((n) => `endless-${n + 1}`)
      : [],
    flawless: [],
    last: { mode: 'endless', level: integer(old.level) },
  });
}
// Backups merge progress rather than deleting newer achievements on this device.
export function mergeProgress(current: Progress, incoming: Progress): Progress {
  return {
    version: 2,
    records: { ...incoming.records, ...current.records },
    completed: [...new Set([...current.completed, ...incoming.completed])],
    flawless: [...new Set([...current.flawless, ...incoming.flawless])],
    last: current.last ?? incoming.last,
  };
}

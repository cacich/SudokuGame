import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { modeEntry, obstacleImage } from '../lib/mode-entry.ts';
import {
  canOpen,
  emptyProgress,
  keyFor,
  parseProgress,
  saveSession,
} from '../lib/progress.ts';
import { puzzleFor } from '../lib/game-puzzles.ts';
import { solutionCells } from '../lib/logic.ts';

for (const mode of ['campaign', 'hard', 'mixed', 'endless']) {
  const progress = emptyProgress();
  progress.last = { mode, level: 0, obstacles: true };
  const original = modeEntry(progress, mode, false);
  const wild = modeEntry(progress, mode, true);
  assert.equal(
    original.obstacles,
    false,
    'normal entrances cannot inherit wilderness',
  );
  assert.equal(wild.obstacles, true);
  assert.notEqual(keyFor(original), keyFor(wild));
  assert.equal(puzzleFor(original).blocked, undefined);
  assert.ok(puzzleFor(wild).blocked.length > 0);
  const p = puzzleFor(wild),
    cows = new Set(solutionCells(p));
  const session = {
    board: Array.from({ length: p.regions.length ** 2 }, (_, i) =>
      cows.has(i) ? 2 : 0,
    ),
    elapsed: 21,
    hints: 1,
  };
  const saved = saveSession(progress, wild, session, p);
  const restored = parseProgress(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(
    restored.records[keyFor(wild)],
    session,
    'all legacy wild saves retained',
  );
  assert.equal(restored.records[keyFor(original)], undefined);
  assert.ok(canOpen(restored, modeEntry(restored, mode, true)));
  if (mode !== 'endless') {
    restored.last = { ...original, level: 0 };
    assert.equal(
      modeEntry(restored, mode, true).level,
      1,
      'new wild entrance honors old unlocks',
    );
    assert.equal(modeEntry(restored, mode, false).level, 0);
  }
}
const source = readFileSync(
  new URL('../app/page.tsx', import.meta.url),
  'utf8',
);
assert(!source.includes('wild-obstacles'), 'no in-game wilderness switch');
assert(
  source.includes('toggleAutoExclusions'),
  'keep automatic exclusion switch',
);
assert(
  !source.includes('<Waves') && !source.includes('<Mountain'),
  'replace crude obstacle symbols',
);
const home = readFileSync(
  new URL('../components/home-screen.tsx', import.meta.url),
  'utf8',
);
assert(home.includes('荒野模式') && home.includes('onWild'));
const css = readFileSync(
  new URL('../app/globals.css', import.meta.url),
  'utf8',
);
assert(
  !css.includes('repeating-linear-gradient'),
  'no hatched obstacle backgrounds',
);
for (const kind of ['pond', 'rocks']) {
  assert.equal(obstacleImage(kind), `./obstacles/${kind}-v1.webp`);
  const sprite = readFileSync(
    new URL(`../public/obstacles/${kind}-v1.webp`, import.meta.url),
  );
  assert.equal(sprite.toString('ascii', 0, 4), 'RIFF');
  assert.equal(sprite.toString('ascii', 8, 12), 'WEBP');
  assert.equal(sprite.toString('ascii', 12, 16), 'VP8X');
  assert.ok(sprite[20] & 0x10, `${kind} must retain a real alpha channel`);
  assert.ok(sprite.length < 100_000, `${kind} should stay mobile-friendly`);
}
console.log(
  'PASS: separate wild entrance, four legacy save paths, rule isolation, original progression and sprite bindings.',
);

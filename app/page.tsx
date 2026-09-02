'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Lightbulb,
  RotateCcw,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type CellState = 0 | 1 | 2;
type Puzzle = { name: string; solution: number[]; regions: number[][] };

const SIZE = 7;
const PUZZLES: Puzzle[] = [
  {
    name: '晨霧',
    solution: [1, 3, 5, 0, 2, 4, 6],
    regions: [
      [0,0,1,1,1,1,1],[0,0,1,1,1,1,1],[3,3,4,1,1,2,2],
      [3,3,4,1,1,1,1],[4,4,4,4,5,6,1],[4,4,4,5,5,6,6],[4,4,5,5,6,6,6],
    ],
  },
  {
    name: '遠丘',
    solution: [0, 6, 2, 5, 3, 1, 4],
    regions: [
      [0,0,0,0,0,2,2],[4,4,2,2,2,2,1],[4,4,2,2,2,2,3],
      [4,4,4,4,3,3,3],[4,4,4,4,3,3,3],[4,5,6,6,6,3,3],[5,5,6,6,6,3,3],
    ],
  },
  {
    name: '暖風',
    solution: [1, 4, 6, 2, 0, 5, 3],
    regions: [
      [0,0,1,1,1,1,1],[0,0,1,1,1,1,1],[0,0,3,1,1,1,2],
      [0,0,3,1,1,1,2],[4,4,3,1,1,1,2],[4,4,6,6,5,5,2],[4,6,6,6,5,5,5],
    ],
  },
  {
    name: '星野',
    solution: [3, 6, 1, 4, 2, 0, 5],
    regions: [
      [2,0,0,0,0,1,1],[2,0,1,1,1,1,1],[2,2,4,4,1,1,1],
      [5,4,4,4,3,1,1],[5,4,4,3,3,3,3],[5,4,4,4,3,3,3],[6,6,6,6,6,6,3],
    ],
  },
  {
    name: '晚霞',
    solution: [4, 6, 1, 3, 0, 2, 5],
    regions: [
      [2,2,2,2,0,0,0],[2,2,3,3,0,0,1],[2,2,2,3,0,0,1],
      [2,2,2,3,3,0,1],[4,2,2,2,3,6,1],[4,5,5,2,3,6,6],[5,5,5,2,3,6,6],
    ],
  },
];

const emptyBoard = () => Array<CellState>(SIZE * SIZE).fill(0);
const initialBoards = () => PUZZLES.map(emptyBoard);
const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export default function Home() {
  const [level, setLevel] = useState(0);
  const [boards, setBoards] = useState<CellState[][]>(initialBoards);
  const [history, setHistory] = useState<CellState[][]>([]);
  const [completed, setCompleted] = useState<number[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState('每列、每欄、每個牧區各放一頭牛');

  const puzzle = PUZZLES[level];
  const board = boards[level];
  const bulls = useMemo(
    () => board.flatMap((value, index) => (value === 2 ? [index] : [])),
    [board],
  );
  const conflicts = useMemo(() => {
    const bad = new Set<number>();
    bulls.forEach((a, i) => {
      const ar = Math.floor(a / SIZE), ac = a % SIZE;
      bulls.slice(i + 1).forEach((b) => {
        const br = Math.floor(b / SIZE), bc = b % SIZE;
        const sameRegion = puzzle.regions[ar][ac] === puzzle.regions[br][bc];
        const touching = Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1;
        if (ar === br || ac === bc || sameRegion || touching) {
          bad.add(a); bad.add(b);
        }
      });
    });
    return bad;
  }, [bulls, puzzle]);
  const solved = bulls.length === SIZE && conflicts.size === 0;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wildgrid-progress') ?? 'null');
      if (saved?.boards?.length === PUZZLES.length) setBoards(saved.boards);
      if (Array.isArray(saved?.completed)) setCompleted(saved.completed);
      if (Number.isInteger(saved?.level)) setLevel(Math.min(saved.level, PUZZLES.length - 1));
    } catch { /* Ignore damaged local progress. */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('wildgrid-progress', JSON.stringify({ boards, completed, level }));
  }, [boards, completed, hydrated, level]);

  useEffect(() => {
    if (!started || solved) return;
    const timer = window.setInterval(() => setElapsed((time) => time + 1), 1000);
    return () => window.clearInterval(timer);
  }, [started, solved]);

  useEffect(() => {
    if (!solved) return;
    setCompleted((done) => done.includes(level) ? done : [...done, level]);
    setMessage('太漂亮了！每頭牛都有自己的空間。');
    if ('vibrate' in navigator) navigator.vibrate?.([40, 30, 70]);
  }, [level, solved]);

  const replaceBoard = useCallback((next: CellState[]) => {
    setBoards((all) => all.map((item, index) => index === level ? next : item));
  }, [level]);

  const switchLevel = useCallback((nextLevel: number) => {
    const safeLevel = (nextLevel + PUZZLES.length) % PUZZLES.length;
    setLevel(safeLevel);
    setHistory([]);
    setElapsed(0);
    setStarted(false);
    setMessage('每列、每欄、每個牧區各放一頭牛');
  }, []);

  const cycleCell = (index: number) => {
    if (solved) return;
    setHistory((past) => [...past.slice(-39), board]);
    const next = [...board];
    next[index] = ((next[index] + 1) % 3) as CellState;
    replaceBoard(next);
    setStarted(true);
    setMessage('再找找看，線索都在棋盤裡');
  };

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    replaceBoard(previous);
    setHistory((past) => past.slice(0, -1));
    setMessage('已復原上一步');
  };

  const reset = () => {
    if (!board.some(Boolean)) return;
    setHistory((past) => [...past, board]);
    replaceBoard(emptyBoard());
    setStarted(false);
    setElapsed(0);
    setMessage('棋盤已清空，慢慢來');
  };

  const hint = () => {
    const row = puzzle.solution.findIndex((column, r) => board[r * SIZE + column] !== 2);
    if (row < 0) return;
    const index = row * SIZE + puzzle.solution[row];
    setHistory((past) => [...past, board]);
    const next = [...board];
    next[index] = 2;
    replaceBoard(next);
    setStarted(true);
    setMessage(`提示：第 ${row + 1} 列有一格可以確定`);
  };

  useEffect(() => {
    const modelContext = (document as Document & {
      modelContext?: { registerTool: (tool: unknown, options?: { signal: AbortSignal }) => void | Promise<void> };
    }).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(modelContext.registerTool({
      name: 'start_puzzle',
      title: '開始野牛格關卡',
      description: '切換至指定的野牛格關卡並清空該關卡，level 必須為 1 到 5。',
      inputSchema: {
        type: 'object', properties: { level: { type: 'integer', minimum: 1, maximum: 5 } },
        required: ['level'], additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const requested = (input as { level?: unknown })?.level;
        if (!Number.isInteger(requested) || Number(requested) < 1 || Number(requested) > 5) {
          throw new Error('level 必須是 1 到 5 的整數');
        }
        const nextLevel = Number(requested) - 1;
        setBoards((all) => all.map((item, index) => index === nextLevel ? emptyBoard() : item));
        switchLevel(nextLevel);
        return { level: Number(requested), status: 'ready' };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [switchLevel]);

  return (
    <main className="game-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">每日牧場 · {String(level + 1).padStart(2, '0')}</p>
          <h1>野牛格</h1>
        </div>
        <Dialog>
          <DialogTrigger render={<Button variant="ghost" size="icon-lg" aria-label="查看玩法" />}>
            <CircleHelp />
          </DialogTrigger>
          <DialogContent className="rules-dialog">
            <DialogHeader>
              <DialogTitle>三條簡單規則</DialogTitle>
              <DialogDescription>不需要猜，每一關都能靠邏輯解開。</DialogDescription>
            </DialogHeader>
            <ol className="rule-list">
              <li><span>1</span><p><b>橫排與直排</b>每一列、每一欄剛好一頭牛。</p></li>
              <li><span>2</span><p><b>彩色牧區</b>每個粗線圍起來的牧區剛好一頭牛。</p></li>
              <li><span>3</span><p><b>保持距離</b>牛不能碰到彼此，斜角也不行。</p></li>
            </ol>
            <p className="rule-note">小點是你的筆記，用來排除不可能的位置。</p>
          </DialogContent>
        </Dialog>
      </header>

      <section className="game-card" aria-label="野牛格益智遊戲">
        <div className="level-row">
          <div className="level-name-wrap">
            <Button variant="ghost" size="icon-sm" onClick={() => switchLevel(level - 1)} aria-label="上一關"><ChevronLeft /></Button>
            <span className="level-pill">{puzzle.name} · 7 × 7</span>
            <Button variant="ghost" size="icon-sm" onClick={() => switchLevel(level + 1)} aria-label="下一關"><ChevronRight /></Button>
          </div>
          <span className="progress-label"><Clock3 /> {formatTime(elapsed)}</span>
        </div>

        <div className="board-wrap">
          <div className="board" role="grid" aria-label="七乘七牧場棋盤">
            {board.map((state, index) => {
              const row = Math.floor(index / SIZE);
              const column = index % SIZE;
              const region = puzzle.regions[row][column];
              const border = {
                top: row === 0 || puzzle.regions[row - 1][column] !== region,
                right: column === SIZE - 1 || puzzle.regions[row][column + 1] !== region,
                bottom: row === SIZE - 1 || puzzle.regions[row + 1][column] !== region,
                left: column === 0 || puzzle.regions[row][column - 1] !== region,
              };
              const label = state === 2 ? '有牛' : state === 1 ? '已標記不能放' : '空白';
              return (
                <button
                  key={`${level}-${index}`}
                  role="gridcell"
                  className={`cell region-${region} ${conflicts.has(index) ? 'conflict' : ''}`}
                  style={{ borderTopWidth: border.top ? 3 : 1, borderRightWidth: border.right ? 3 : 1, borderBottomWidth: border.bottom ? 3 : 1, borderLeftWidth: border.left ? 3 : 1 }}
                  aria-label={`第 ${row + 1} 列，第 ${column + 1} 欄，${label}`}
                  aria-invalid={conflicts.has(index)}
                  onClick={() => cycleCell(index)}
                >
                  {state === 1 && <span className="note-dot" />}
                  {state === 2 && <span className="bull-mark">牛</span>}
                </button>
              );
            })}
          </div>
        </div>

        <output className={`game-message ${solved ? 'success' : conflicts.size ? 'warning' : ''}`}>
          {conflicts.size ? '有牛靠得太近，或住進了同一列／牧區' : message}
        </output>

        <div className="controls" aria-label="遊戲工具">
          <Button variant="outline" onClick={undo} disabled={!history.length}><Undo2 /> 復原</Button>
          <Button variant="outline" onClick={hint} disabled={solved}><Lightbulb /> 提示</Button>
          <Button variant="outline" onClick={reset} disabled={!board.some(Boolean)}><RotateCcw /> 重來</Button>
        </div>

        <nav className="level-dots" aria-label="選擇關卡">
          {PUZZLES.map((item, index) => (
            <button key={item.name} className={`${index === level ? 'active' : ''} ${completed.includes(index) ? 'done' : ''}`} onClick={() => switchLevel(index)} aria-label={`第 ${index + 1} 關：${item.name}`} aria-current={index === level ? 'page' : undefined}>
              {completed.includes(index) ? '✓' : index + 1}
            </button>
          ))}
        </nav>
        <p className="tap-help">點一下放記號 · 再點一下放牛 · 第三下清除</p>
      </section>
      <footer>原創規則實作與美術 · 進度只儲存在這台裝置</footer>
    </main>
  );
}

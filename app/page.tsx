'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Infinity as InfinityIcon,
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
import { generatePuzzle, PUZZLE_SIZE } from '@/lib/puzzles';

type CellState = 0 | 1 | 2;
type SavedBoards = Record<number, CellState[]>;

const SIZE = PUZZLE_SIZE;
const STORAGE_KEY = 'wildgrid-infinite-progress-v1';
const emptyBoard = () => Array<CellState>(SIZE * SIZE).fill(0);
const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export default function Home() {
  const [level, setLevel] = useState(0);
  const [boards, setBoards] = useState<SavedBoards>({});
  const [history, setHistory] = useState<CellState[][]>([]);
  const [completed, setCompleted] = useState<number[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState('每列、每欄、每個牧區各放一頭牛');

  const puzzle = useMemo(() => generatePuzzle(level + 1), [level]);
  const board = boards[level] ?? emptyBoard();
  const bulls = useMemo(
    () => board.flatMap((value, index) => (value === 2 ? [index] : [])),
    [board],
  );
  const conflicts = useMemo(() => {
    const bad = new Set<number>();
    bulls.forEach((a, index) => {
      const aRow = Math.floor(a / SIZE);
      const aColumn = a % SIZE;
      bulls.slice(index + 1).forEach((b) => {
        const bRow = Math.floor(b / SIZE);
        const bColumn = b % SIZE;
        const sameRegion = puzzle.regions[aRow][aColumn] === puzzle.regions[bRow][bColumn];
        const touching = Math.abs(aRow - bRow) <= 1 && Math.abs(aColumn - bColumn) <= 1;
        if (aRow === bRow || aColumn === bColumn || sameRegion || touching) {
          bad.add(a);
          bad.add(b);
        }
      });
    });
    return bad;
  }, [bulls, puzzle]);
  const solved = bulls.length === SIZE && conflicts.size === 0;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      if (saved?.boards && typeof saved.boards === 'object') setBoards(saved.boards);
      if (Array.isArray(saved?.completed)) setCompleted(saved.completed);
      if (Number.isInteger(saved?.level) && saved.level >= 0) setLevel(saved.level);
    } catch {
      // A damaged local save should never prevent a new game.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ boards, completed, level }));
  }, [boards, completed, hydrated, level]);

  useEffect(() => {
    if (!started || solved) return;
    const timer = window.setInterval(() => setElapsed((time) => time + 1), 1000);
    return () => window.clearInterval(timer);
  }, [started, solved]);

  useEffect(() => {
    if (!solved) return;
    setCompleted((done) => done.includes(level) ? done : [...done, level]);
    setMessage('太漂亮了！這座牧場完成了。');
    navigator.vibrate?.([40, 30, 70]);
  }, [level, solved]);

  const replaceBoard = useCallback((next: CellState[], targetLevel = level) => {
    setBoards((all) => ({ ...all, [targetLevel]: next }));
  }, [level]);

  const switchLevel = useCallback((nextLevel: number) => {
    setLevel(Math.max(0, Math.floor(nextLevel)));
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
    const row = puzzle.solution.findIndex(
      (column, rowIndex) => board[rowIndex * SIZE + column] !== 2,
    );
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
      modelContext?: {
        registerTool: (tool: unknown, options?: { signal: AbortSignal }) => void | Promise<void>;
      };
    }).modelContext;
    if (!modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(modelContext.registerTool({
      name: 'start_puzzle',
      title: '開始野牛格關卡',
      description: '產生並切換至指定編號的唯一解野牛格關卡，level 必須為正整數。',
      inputSchema: {
        type: 'object',
        properties: { level: { type: 'integer', minimum: 1, maximum: 1000000 } },
        required: ['level'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const requested = (input as { level?: unknown })?.level;
        if (!Number.isInteger(requested) || Number(requested) < 1 || Number(requested) > 1000000) {
          throw new Error('level 必須是 1 到 1,000,000 的整數');
        }
        const targetLevel = Number(requested) - 1;
        generatePuzzle(Number(requested));
        replaceBoard(emptyBoard(), targetLevel);
        switchLevel(targetLevel);
        return { level: Number(requested), status: 'ready', unique_solution: true };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [replaceBoard, switchLevel]);

  return (
    <main className="game-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">無限牧場 · #{String(level + 1).padStart(4, '0')}</p>
          <h1>野牛格</h1>
        </div>
        <Dialog>
          <DialogTrigger render={<Button variant="ghost" size="icon-lg" aria-label="查看玩法" />}>
            <CircleHelp />
          </DialogTrigger>
          <DialogContent className="rules-dialog">
            <DialogHeader>
              <DialogTitle>三條簡單規則</DialogTitle>
              <DialogDescription>每一關由程式產生，並經解題器確認只有一個答案。</DialogDescription>
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
            <Button variant="ghost" size="icon-sm" onClick={() => switchLevel(level - 1)} disabled={level === 0} aria-label="上一關"><ChevronLeft /></Button>
            <span className="level-pill">{puzzle.name} · 唯一解</span>
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
                  style={{
                    borderTopWidth: border.top ? 3 : 1,
                    borderRightWidth: border.right ? 3 : 1,
                    borderBottomWidth: border.bottom ? 3 : 1,
                    borderLeftWidth: border.left ? 3 : 1,
                  }}
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

        {solved && (
          <Button className="next-level-cta" onClick={() => switchLevel(level + 1)}>
            下一座牧場 <ChevronRight />
          </Button>
        )}

        <div className="infinite-status" aria-label="無限關卡進度">
          <span><InfinityIcon /> 持續生成唯一解關卡</span>
          <span>已完成 {completed.length} 關</span>
        </div>
        <p className="tap-help">點一下放記號 · 再點一下放牛 · 第三下清除</p>
      </section>
      <footer>程序生成與唯一解驗證 · 進度只儲存在這台裝置</footer>
    </main>
  );
}

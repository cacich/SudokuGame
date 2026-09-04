'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
} from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Home as HomeIcon,
  Infinity as InfinityIcon,
  Lightbulb,
  RotateCcw,
  Star,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { HomeScreen } from '@/components/home-screen';
import { ChapterCards, LevelPicker } from '@/components/chapter-browser';
import { CHAPTERS, chapterFor, chapterImage } from '@/lib/chapters';
import { CAMPAIGN } from '@/lib/campaign-data';
import { HARD } from '@/lib/hard-data';
import { generatePuzzle } from '@/lib/puzzles';
import {
  conflictsFor,
  isSolved,
  nextDeduction,
  solutionCells,
  type GridPuzzle,
  type CellState,
  type Deduction,
} from '@/lib/logic';
import {
  SAVE_KEY,
  LEGACY_KEY,
  MAX_ENDLESS,
  canOpen,
  emptyProgress,
  emptySession,
  keyFor,
  mergeProgress,
  migrateLegacy,
  parseProgress,
  saveSession,
  unlockedLevel,
  type Progress,
  type Selection,
} from '@/lib/progress';

const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const labelFor = (s: Selection) =>
  s.mode === 'campaign'
    ? `${chapterFor(s.level).name} · ${(s.level % 20) + 1} / 20`
    : `${s.mode === 'hard' ? '雙牛挑戰' : '無盡牧場'} · 第 ${s.level + 1} 題`;
const DEFAULT_MESSAGE = '每列、每欄、每個牧區各放一隻牛';

export default function Home() {
  const [view, setView] = useState<'home' | 'chapters' | 'play'>('home');
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [selection, setSelection] = useState<Selection>({
    mode: 'campaign',
    level: 0,
  });
  const [hydrated, setHydrated] = useState(false);
  const [storageMessage, setStorageMessage] = useState('');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [history, setHistory] = useState<CellState[][]>([]);
  const [hint, setHint] = useState<Deduction | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerChapter, setPickerChapter] = useState(0);
  const [endlessInput, setEndlessInput] = useState('1');
  const [pickerError, setPickerError] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [paint, setPaint] = useState<'cow' | 'note'>('cow');
  const fileRef = useRef<HTMLInputElement>(null);

  const puzzleResult = useMemo(() => {
    try {
      return {
        puzzle:
          selection.mode === 'campaign'
            ? CAMPAIGN[selection.level]
            : selection.mode === 'hard'
              ? HARD[selection.level]
              : generatePuzzle(selection.level + 1),
        error: '',
      };
    } catch {
      return {
        puzzle: null,
        error: '這道牧場暫時無法生成，請返回主介面再試一次，或選另一題。',
      };
    }
  }, [selection]);
  const puzzle: GridPuzzle = puzzleResult.puzzle ?? CAMPAIGN[0];
  const isHard = selection.mode === 'hard';
  const quota = puzzle.cowsPerUnit ?? 1;
  const correctCells = useMemo(() => new Set(solutionCells(puzzle)), [puzzle]);
  const defaultMessage = isHard
    ? '每列、每欄、每個牧區各放兩隻牛'
    : DEFAULT_MESSAGE;
  const size = puzzle.regions.length,
    key = keyFor(selection);
  const session = progress.records[key] ?? emptySession(size),
    board = session.board;
  const conflicts = useMemo(() => conflictsFor(puzzle, board), [puzzle, board]);
  const solved = isSolved(puzzle, board);
  const chapterIndex =
      selection.mode === 'campaign'
        ? Math.floor(selection.level / 20)
        : isHard
          ? 8
          : 0,
    chapter = CHAPTERS[chapterIndex];
  const campaignDone = progress.completed.filter((id) =>
    id.startsWith('journey-v1-'),
  ).length;
  const nextSelection = { ...selection, level: selection.level + 1 };
  const canNext = canOpen(progress, nextSelection);
  const theme = {
    '--chapter-color': chapter.color,
    '--chapter-tint': chapter.tint,
    '--chapter-paper': chapter.paper,
    '--primary': chapter.color,
  } as CSSProperties;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        try {
          setProgress(parseProgress(JSON.parse(saved)));
        } catch {
          localStorage.setItem(`${SAVE_KEY}-recovery`, saved);
          setStorageMessage(
            '原存檔無法讀取，已保留恢復副本，並嘗試讀取舊版紀錄。',
          );
          setProgress(
            migrateLegacy(
              JSON.parse(localStorage.getItem(LEGACY_KEY) ?? 'null'),
            ),
          );
        }
      } else
        setProgress(
          migrateLegacy(JSON.parse(localStorage.getItem(LEGACY_KEY) ?? 'null')),
        );
    } catch {
      setStorageMessage('目前無法使用本機存檔；離開前請匯出進度。');
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
    } catch {
      setStorageMessage(
        '自動儲存失敗；請先匯出進度備份，再檢查瀏覽器的儲存空間。',
      );
    }
  }, [progress, hydrated]);
  const openPuzzle = useCallback(
    (target: Selection) => {
      if (!hydrated || !canOpen(progress, target)) return false;
      setSelection(target);
      setProgress((p) => ({ ...p, last: target }));
      setHistory([]);
      setHint(null);
      setMessage(
        target.mode === 'hard'
          ? '每列、每欄、每個牧區各放兩隻牛'
          : DEFAULT_MESSAGE,
      );
      setZoomed(false);
      setPaint('cow');
      setRulesOpen(
        target.mode === 'hard' &&
          !Object.keys(progress.records).some((k) =>
            k.startsWith('double-v1-'),
          ),
      );
      setPickerOpen(false);
      setView('play');
      return true;
    },
    [progress, hydrated],
  );
  useEffect(() => {
    if (
      !hydrated ||
      view !== 'play' ||
      solved ||
      !board.some(Boolean) ||
      pickerOpen ||
      rulesOpen ||
      resetOpen ||
      puzzleResult.error
    )
      return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setProgress((p) => {
        const current = p.records[key];
        return current
          ? {
              ...p,
              records: {
                ...p.records,
                [key]: { ...current, elapsed: current.elapsed + 1 },
              },
            }
          : p;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [
    hydrated,
    view,
    solved,
    key,
    board,
    pickerOpen,
    rulesOpen,
    resetOpen,
    puzzleResult.error,
  ]);
  const replaceBoard = (next: CellState[]) => {
    setHistory((past) => [...past.slice(-79), [...board]]);
    setProgress((p) =>
      saveSession(
        p,
        selection,
        { ...(p.records[key] ?? emptySession(size)), board: next },
        puzzle,
      ),
    );
    setHint(null);
    if (isSolved(puzzle, next)) navigator.vibrate?.([40, 30, 70]);
  };
  const cycleCell = (index: number) => {
    if (solved || !hydrated) return;
    const next = [...board];
    next[index] = isHard
      ? next[index] === (paint === 'cow' ? 2 : 1)
        ? 0
        : paint === 'cow'
          ? 2
          : 1
      : (((next[index] + 1) % 3) as CellState);
    replaceBoard(next);
    setMessage(defaultMessage);
  };
  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setProgress((p) =>
      saveSession(
        p,
        selection,
        { ...(p.records[key] ?? emptySession(size)), board: previous },
        puzzle,
      ),
    );
    setHistory((past) => past.slice(0, -1));
    setHint(null);
    setMessage('已復原上一步');
  };
  const reset = () => {
    setProgress((p) => saveSession(p, selection, emptySession(size), puzzle));
    setHistory([]);
    setHint(null);
    setMessage('新的一次挑戰，慢慢來。');
    setResetOpen(false);
  };
  const requestHint = () => {
    if (solved || hint) return;
    const wrong = board.findIndex(
      (v, i) =>
        (v === 2 && !correctCells.has(i)) || (v === 1 && correctCells.has(i)),
    );
    let step: Deduction | null;
    if (wrong >= 0)
      step = {
        cells: [wrong],
        value: 0,
        tier: 0,
        focus: [],
        reason: '亮起的這格與唯一解不相容。先清除這個記號或牛，再繼續推理。',
      };
    else step = nextDeduction(puzzle, board);
    // Legacy endless puzzles are unique but not necessarily solvable by the supported techniques.
    if (!step && selection.mode === 'endless') {
      const cell = [...correctCells].find((i) => board[i] !== 2);
      if (cell !== undefined)
        step = {
          cells: [cell],
          value: 2,
          tier: 0,
          focus: [],
          reason:
            '目前找不到已支援的推理步驟。這是答案提示：亮起的這一格有牛。',
        };
    }
    if (!step) {
      setMessage('目前沒有可用提示，請檢查排除記號或復原上一步。');
      return;
    }
    setHint(step);
    setProgress((p) => ({
      ...p,
      records: {
        ...p.records,
        [key]: {
          ...(p.records[key] ?? emptySession(size)),
          hints: (p.records[key]?.hints ?? 0) + 1,
        },
      },
    }));
  };
  const applyHint = () => {
    if (!hint) return;
    const next = [...board];
    hint.cells.forEach((i) => {
      next[i] = hint.value;
    });
    replaceBoard(next);
    setMessage('已套用提示，接著找下一道線索。');
  };
  const exportSave = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(progress, null, 2)], {
        type: 'application/json',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `wildgrid-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importSave = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setStorageMessage('存檔太大，請選擇小於 10 MB 的野牛格存檔。');
      return;
    }
    try {
      const imported = parseProgress(JSON.parse(await file.text()));
      setProgress((p) => mergeProgress(p, imported));
      setStorageMessage('進度已合併；保留這台裝置的作答與所有已解鎖關卡。');
    } catch {
      setStorageMessage('這不是有效的野牛格存檔；原本的進度沒有變動。');
    }
  };
  useEffect(() => {
    const modelContext = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options?: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!modelContext?.registerTool || !hydrated) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      modelContext.registerTool(
        {
          name: 'start_puzzle',
          title: '開啟野牛格關卡',
          description:
            '開啟指定模式及題號（從 1 起算），保留作答。關卡模式不能跳過尚未解鎖的題目。',
          inputSchema: {
            type: 'object',
            properties: {
              mode: { type: 'string', enum: ['campaign', 'endless', 'hard'] },
              level: { type: 'integer', minimum: 1, maximum: MAX_ENDLESS },
            },
            required: ['level'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input: unknown) {
            const value = input as { level?: number; mode?: string },
              mode = value.mode ?? selection.mode;
            if (
              !Number.isInteger(value.level) ||
              (mode !== 'campaign' && mode !== 'endless' && mode !== 'hard')
            )
              throw new Error('請提供有效的模式與整數題號');
            if (!openPuzzle({ mode, level: Number(value.level) - 1 }))
              throw new Error('題號超出範圍或尚未解鎖');
            return { mode, level: value.level, status: 'ready' };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, [hydrated, openPuzzle, selection.mode]);

  return (
    <div className="journey-app" style={view === 'play' ? theme : undefined}>
      <div className="scene-backdrop" aria-hidden="true">
        <img src={chapterImage(view === 'play' ? chapterIndex : 0)} alt="" />
      </div>
      <main
        className={`game-shell ${view === 'chapters' ? 'chapters-shell' : ''}`}
      >
        {view === 'home' ? (
          <>
            <HomeScreen
              resumeLabel={progress.last ? labelFor(progress.last) : undefined}
              onResume={() => progress.last && openPuzzle(progress.last)}
              onCampaign={() => {
                if (hydrated) setView('chapters');
              }}
              onEndless={() =>
                openPuzzle({
                  mode: 'endless',
                  level:
                    progress.last?.mode === 'endless' ? progress.last.level : 0,
                })
              }
              onHard={() =>
                openPuzzle({
                  mode: 'hard',
                  level: unlockedLevel(progress, 'hard'),
                })
              }
            />
            <div className="save-tools">
              <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
                <DialogTrigger
                  render={<Button variant="ghost" disabled={!hydrated} />}
                >
                  <Settings2 />
                  進度管理
                </DialogTrigger>
                <DialogContent className="rules-dialog">
                  <DialogHeader>
                    <DialogTitle>進度管理</DialogTitle>
                    <DialogDescription>
                      換裝置前可匯出備份。匯入會合併完成紀錄，保留這台裝置的作答。
                    </DialogDescription>
                  </DialogHeader>
                  <Button
                    variant="outline"
                    onClick={exportSave}
                    disabled={!hydrated}
                  >
                    <Download />
                    匯出進度
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => fileRef.current?.click()}
                    disabled={!hydrated}
                  >
                    <Upload />
                    匯入進度
                  </Button>
                  {storageMessage && <p role="status">{storageMessage}</p>}
                </DialogContent>
              </Dialog>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={importSave}
              />
            </div>
          </>
        ) : view === 'chapters' ? (
          <>
            <header className="chapter-page-header">
              <Button
                variant="ghost"
                size="icon"
                aria-label="返回主介面"
                onClick={() => setView('home')}
              >
                <ArrowLeft />
              </Button>
              <div>
                <p className="eyebrow">牧場旅程</p>
                <h1>走過十座牧場</h1>
              </div>
              <span>{campaignDone} / 200</span>
            </header>
            <Button
              className="journey-continue"
              onClick={() =>
                openPuzzle({ mode: 'campaign', level: unlockedLevel(progress) })
              }
            >
              {campaignDone === 200
                ? '重訪最後的牧場'
                : `繼續旅程 · ${labelFor({ mode: 'campaign', level: unlockedLevel(progress) })}`}
              <ChevronRight />
            </Button>
            <ChapterCards
              progress={progress}
              onSelect={(c) => {
                setPickerChapter(c);
                setPickerOpen(true);
              }}
            />
          </>
        ) : (
          <>
            <header className="topbar">
              <div>
                <p className="eyebrow">
                  {selection.mode === 'campaign'
                    ? `牧場旅程 · 第 ${chapterIndex + 1} 大關`
                    : isHard
                      ? '困難模式 · 每區兩隻牛'
                      : '無盡模式'}
                </p>
                <h1>
                  {selection.mode === 'campaign'
                    ? chapter.name
                    : isHard
                      ? '雙牛挑戰'
                      : '無盡牧場'}
                </h1>
              </div>
              <div className="header-actions">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="返回主介面"
                  onClick={() => setView('home')}
                >
                  <HomeIcon />
                </Button>
                <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
                  <DialogTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="查看玩法"
                      />
                    }
                  >
                    <CircleHelp />
                  </DialogTrigger>
                  <DialogContent className="rules-dialog">
                    <DialogHeader>
                      <DialogTitle>三條簡單規則</DialogTitle>
                      <DialogDescription>
                        {isHard
                          ? '每列、每欄、每個牧區都要放兩隻牛，共 20 隻。每題都有唯一解。'
                          : '每一題都經過唯一解驗證。旅程題庫也經逐步邏輯驗證。'}
                      </DialogDescription>
                    </DialogHeader>
                    <ol className="rule-list">
                      <li>
                        <span>1</span>
                        <p>
                          <b>橫排與直排</b>每列、每欄剛好{isHard ? '兩' : '一'}
                          隻牛。
                        </p>
                      </li>
                      <li>
                        <span>2</span>
                        <p>
                          <b>彩色牧區</b>每個粗線圍起的牧區剛好
                          {isHard ? '兩' : '一'}隻牛。
                        </p>
                      </li>
                      <li>
                        <span>3</span>
                        <p>
                          <b>保持距離</b>牛不能碰到彼此，斜角也不行。
                        </p>
                      </li>
                    </ol>
                    <p className="rule-note">
                      {isHard
                        ? '先選「放牛」或「排除」，再點格子；再次點同一格可清除。棋盤可放大並捲動。'
                        : '點一下放排除記號，再點放牛，第三下清除。'}
                      提示會先說明理由；使用提示仍可解鎖下一題。
                    </p>
                  </DialogContent>
                </Dialog>
              </div>
            </header>
            {puzzleResult.error ? (
              <div className="game-card" role="alert">
                {puzzleResult.error}
                <Button onClick={() => setView('home')}>返回主介面</Button>
              </div>
            ) : (
              <section className="game-card" aria-label="野牛格益智遊戲">
                <div className="level-row">
                  <div className="level-name-wrap">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() =>
                        openPuzzle({ ...selection, level: selection.level - 1 })
                      }
                      disabled={selection.level === 0}
                      aria-label="上一題"
                    >
                      <ChevronLeft />
                    </Button>
                    <Button
                      variant="ghost"
                      className="level-pill"
                      onClick={() => {
                        setPickerChapter(chapterIndex);
                        setEndlessInput(String(selection.level + 1));
                        setPickerError('');
                        setPickerOpen(true);
                      }}
                      aria-label="直接選擇關卡"
                    >
                      {selection.mode === 'campaign'
                        ? `${chapterIndex + 1}－${String((selection.level % 20) + 1).padStart(2, '0')} / 20`
                        : `第 ${selection.level + 1} 題`}
                      <ChevronDown size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openPuzzle(nextSelection)}
                      disabled={!canNext}
                      aria-label={canNext ? '下一題' : '下一題尚未解鎖'}
                    >
                      <ChevronRight />
                    </Button>
                  </div>
                  <span className="progress-label">
                    <Clock3 />
                    {formatTime(session.elapsed)}
                  </span>
                </div>
                <div className="board-meta">
                  <span>
                    {size} × {size} · {isHard ? '每區 2 隻' : '唯一解'}
                  </span>
                  <span>
                    已放 {board.filter((v) => v === 2).length} / {size * quota}{' '}
                    隻牛
                  </span>
                </div>
                {isHard && (
                  <div className="board-toolbar">
                    <ToggleGroup
                      value={[paint]}
                      onValueChange={(v) => {
                        if (v[0] === 'cow' || v[0] === 'note') setPaint(v[0]);
                      }}
                      variant="outline"
                      aria-label="格子操作"
                    >
                      <ToggleGroupItem value="cow">放牛</ToggleGroupItem>
                      <ToggleGroupItem value="note">排除</ToggleGroupItem>
                    </ToggleGroup>
                    <Button
                      variant="ghost"
                      onClick={() => setZoomed((v) => !v)}
                      aria-pressed={zoomed}
                    >
                      {zoomed ? <ZoomOut /> : <ZoomIn />}
                      {zoomed ? '縮小' : '放大'}
                    </Button>
                  </div>
                )}
                <div
                  className={`board-wrap ${isHard ? 'double-board' : ''} ${zoomed ? 'zoomed' : ''}`}
                  tabIndex={zoomed ? 0 : undefined}
                  aria-label={zoomed ? '放大棋盤，可水平與垂直捲動' : undefined}
                >
                  <div
                    className="board"
                    role="group"
                    aria-label={`${size} 乘 ${size} 牧場棋盤`}
                    style={{ '--size': size } as CSSProperties}
                  >
                    {board.map((state, index) => {
                      const row = Math.floor(index / size),
                        col = index % size,
                        region = puzzle.regions[row][col];
                      return (
                        <button
                          key={`${key}-${index}`}
                          className={`cell region-${region} ${conflicts.has(index) ? 'conflict' : ''} ${hint?.focus.includes(index) ? 'hint-focus' : ''} ${hint?.cells.includes(index) ? 'hint-target' : ''}`}
                          style={{
                            borderTopWidth:
                              row === 0 ||
                              puzzle.regions[row - 1][col] !== region
                                ? 2
                                : 0.5,
                            borderRightWidth:
                              col === size - 1 ||
                              puzzle.regions[row][col + 1] !== region
                                ? 2
                                : 0.5,
                            borderBottomWidth:
                              row === size - 1 ||
                              puzzle.regions[row + 1][col] !== region
                                ? 2
                                : 0.5,
                            borderLeftWidth:
                              col === 0 ||
                              puzzle.regions[row][col - 1] !== region
                                ? 2
                                : 0.5,
                          }}
                          aria-label={`第 ${row + 1} 列，第 ${col + 1} 欄，牧區 ${region + 1}，${state === 2 ? '有牛' : state === 1 ? '已排除' : '空白'}`}
                          aria-invalid={conflicts.has(index)}
                          aria-disabled={solved}
                          onClick={() => cycleCell(index)}
                        >
                          {state === 1 && <span className="note-dot" />}
                          {state === 2 && <span className="bull-mark">牛</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <output
                  aria-live="polite"
                  className={`game-message ${solved ? 'success' : conflicts.size ? 'warning' : ''}`}
                >
                  {solved
                    ? selection.mode === 'campaign' && selection.level === 199
                      ? '十座牧場全數完成！謝謝你走完這段旅程。'
                      : isHard && selection.level === HARD.length - 1
                        ? '40 道雙牛挑戰全部完成！'
                        : selection.mode === 'campaign' &&
                            selection.level % 20 === 19
                          ? `${chapter.name}完成！下一座牧場已解鎖。`
                          : '完成了！每一隻牛都有自己的位置。'
                    : conflicts.size
                      ? isHard
                        ? '有牛彼此相鄰，或同列、同欄、同牧區超過兩隻。'
                        : '有牛位於同列、同欄、同牧區，或彼此相鄰。'
                      : message}
                </output>
                {hint && (
                  <div className="hint-panel" aria-live="polite">
                    <p>
                      <Lightbulb size={18} />
                      {hint.reason}
                    </p>
                    <div>
                      <Button variant="ghost" onClick={() => setHint(null)}>
                        自己試試
                      </Button>
                      <Button onClick={applyHint}>套用這一步</Button>
                    </div>
                  </div>
                )}
                <div className="controls">
                  <Button
                    variant="outline"
                    onClick={undo}
                    disabled={!history.length}
                  >
                    <Undo2 />
                    復原
                  </Button>
                  <Button
                    variant="outline"
                    onClick={requestHint}
                    disabled={solved || !!hint}
                  >
                    <Lightbulb />
                    提示
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setResetOpen(true)}
                    disabled={!board.some(Boolean)}
                  >
                    <RotateCcw />
                    {solved ? '重玩' : '重來'}
                  </Button>
                </div>
                {solved && (
                  <>
                    <div className="completion-badge">
                      {session.hints === 0 ? (
                        <>
                          <Star />
                          無提示完成
                        </>
                      ) : (
                        <>
                          <Check />
                          已完成 · 本次提示 {session.hints} 次
                        </>
                      )}
                    </div>
                    <Button
                      className="next-level-cta"
                      onClick={() =>
                        canNext
                          ? openPuzzle(nextSelection)
                          : setView(isHard ? 'home' : 'chapters')
                      }
                    >
                      {canNext
                        ? selection.mode === 'campaign' &&
                          selection.level % 20 === 19
                          ? '前往下一座牧場'
                          : '下一題'
                        : selection.mode === 'campaign'
                          ? '查看完整旅程'
                          : isHard
                            ? '返回主介面'
                            : '返回旅程'}
                      <ChevronRight />
                    </Button>
                  </>
                )}
                <div className="infinite-status">
                  {selection.mode === 'campaign' ? (
                    <>
                      <span>
                        本章{' '}
                        {
                          CAMPAIGN.slice(
                            chapterIndex * 20,
                            chapterIndex * 20 + 20,
                          ).filter((p) => progress.completed.includes(p.id))
                            .length
                        }{' '}
                        / 20 題
                      </span>
                      <span>旅程 {campaignDone} / 200 題</span>
                    </>
                  ) : isHard ? (
                    <>
                      <span>雙牛挑戰</span>
                      <span>
                        完成{' '}
                        {
                          progress.completed.filter((k) =>
                            k.startsWith('double-v1-'),
                          ).length
                        }{' '}
                        / {HARD.length} 題
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        <InfinityIcon />
                        持續生成唯一解
                      </span>
                      <span>
                        完成{' '}
                        {
                          progress.completed.filter((k) =>
                            k.startsWith('endless-'),
                          ).length
                        }{' '}
                        題
                      </span>
                    </>
                  )}
                </div>
                <p className="tap-help">
                  {isHard
                    ? `目前：${paint === 'cow' ? '放牛' : '排除'} · 同一格再點一下清除`
                    : '點一下排除 · 再點放牛 · 第三下清除'}
                </p>
              </section>
            )}
            {selection.mode === 'campaign' && (
              <p className="chapter-tip">{chapter.lesson}</p>
            )}
          </>
        )}
        {storageMessage && !saveOpen && (
          <p className="storage-message" role="status">
            {storageMessage}
          </p>
        )}
        <footer>
          {hydrated
            ? '進度儲存在此瀏覽器 · 換裝置前請匯出備份'
            : '正在讀取進度…'}
        </footer>
      </main>
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="picker-dialog">
          <DialogHeader>
            <DialogTitle>
              {view === 'play' && selection.mode === 'endless'
                ? '前往無盡牧場'
                : '選擇關卡'}
            </DialogTitle>
            <DialogDescription>
              {view === 'play' && selection.mode === 'endless'
                ? '輸入題號，自由探索。原本的作答會保留。'
                : view === 'play' && isHard
                  ? '40 道雙牛挑戰，完成一題解鎖下一題。'
                  : '每座牧場有 20 題，依序完成即可解鎖。'}
            </DialogDescription>
          </DialogHeader>
          {view === 'play' && selection.mode === 'endless' ? (
            <form
              className="endless-form"
              onSubmit={(e) => {
                e.preventDefault();
                const number = Number(endlessInput);
                if (
                  !Number.isInteger(number) ||
                  number < 1 ||
                  number > MAX_ENDLESS
                ) {
                  setPickerError('請輸入 1 到 1,000,000 的整數。');
                  return;
                }
                openPuzzle({ mode: 'endless', level: number - 1 });
              }}
            >
              <label htmlFor="endless-level">題號</label>
              <input
                id="endless-level"
                type="number"
                inputMode="numeric"
                min="1"
                max={MAX_ENDLESS}
                step="1"
                required
                value={endlessInput}
                onChange={(e) => setEndlessInput(e.target.value)}
              />
              {pickerError && <p role="alert">{pickerError}</p>}
              <Button type="submit">前往牧場</Button>
            </form>
          ) : view === 'play' && isHard ? (
            <div className="level-grid hard-level-grid">
              {HARD.map((p, level) => (
                <button
                  key={p.id}
                  className={`level-tile ${progress.completed.includes(p.id) ? 'done' : ''} ${selection.level === level ? 'current' : ''}`}
                  disabled={!canOpen(progress, { mode: 'hard', level })}
                  aria-current={selection.level === level ? 'step' : undefined}
                  aria-label={`雙牛第 ${level + 1} 題${progress.completed.includes(p.id) ? '，已完成' : !canOpen(progress, { mode: 'hard', level }) ? '，未解鎖' : ''}`}
                  onClick={() => openPuzzle({ mode: 'hard', level })}
                >
                  {level + 1}
                  {progress.flawless.includes(p.id) ? (
                    <Star />
                  ) : progress.completed.includes(p.id) ? (
                    <Check />
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <LevelPicker
              chapter={pickerChapter}
              onChapter={setPickerChapter}
              progress={progress}
              current={
                view === 'play' && selection.mode === 'campaign'
                  ? selection.level
                  : undefined
              }
              onPlay={(level) => openPuzzle({ mode: 'campaign', level })}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="rules-dialog">
          <DialogHeader>
            <DialogTitle>重新挑戰這一題？</DialogTitle>
            <DialogDescription>
              這題的作答、計時與本次提示次數會清空；已解鎖關卡與完成紀錄都會保留。
            </DialogDescription>
          </DialogHeader>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              取消
            </Button>
            <Button onClick={reset}>重新開始</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

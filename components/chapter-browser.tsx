'use client';
import { Check, ChevronRight, Lock, Star } from 'lucide-react';
import { CHAPTERS, chapterImage } from '@/lib/chapters';
import { CAMPAIGN } from '@/lib/campaign-data';
import { unlockedLevel, keyFor, type Progress } from '@/lib/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CSSProperties } from 'react';

export function ChapterCards({
  progress,
  onSelect,
  obstacles = false,
}: {
  progress: Progress;
  onSelect: (chapter: number) => void;
  obstacles?: boolean;
}) {
  const unlocked = unlockedLevel(progress, 'campaign', obstacles);
  return (
    <div className="chapter-cards">
      {CHAPTERS.map((chapter, c) => {
        const done = CAMPAIGN.slice(c * 20, c * 20 + 20).filter((_, i) =>
          progress.completed.includes(
            keyFor({ mode: 'campaign', level: c * 20 + i, obstacles }),
          ),
        ).length;
        return (
          <button
            key={chapter.name}
            className="chapter-card"
            onClick={() => onSelect(c)}
            style={
              {
                '--chapter-color': chapter.color,
                '--chapter-tint': chapter.tint,
              } as CSSProperties
            }
          >
            <img
              src={chapterImage(c)}
              alt=""
              loading="lazy"
              width="1000"
              height="667"
            />
            <div>
              <span className="chapter-number">
                第 {String(c + 1).padStart(2, '0')} 大關{' '}
                {c * 20 > unlocked && <Lock size={13} />}
              </span>
              <h2>{chapter.name}</h2>
              <p>
                {done === 20 ? (
                  <>
                    <Check size={14} /> 已完成
                  </>
                ) : (
                  `${done} / 20 題`
                )}
              </p>
            </div>
            <ChevronRight size={18} />
          </button>
        );
      })}
    </div>
  );
}
export function LevelPicker({
  chapter,
  onChapter,
  progress,
  current,
  onPlay,
  obstacles = false,
}: {
  chapter: number;
  onChapter: (chapter: number) => void;
  progress: Progress;
  current?: number;
  onPlay: (level: number) => void;
  obstacles?: boolean;
}) {
  const info = CHAPTERS[chapter],
    unlocked = unlockedLevel(progress, 'campaign', obstacles);
  return (
    <div
      className="level-picker"
      style={
        {
          '--chapter-color': info.color,
          '--chapter-tint': info.tint,
        } as CSSProperties
      }
    >
      <Select
        value={String(chapter)}
        onValueChange={(v) => {
          if (v !== null) onChapter(Number(v));
        }}
      >
        <SelectTrigger className="chapter-select" aria-label="選擇大關">
          <SelectValue>{`第 ${chapter + 1} 大關 · ${info.name}`}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {CHAPTERS.map((ch, i) => (
            <SelectItem key={ch.name} value={String(i)}>
              {i + 1}. {ch.name}
              {i * 20 > unlocked ? ' · 未解鎖' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="chapter-banner">
        <img src={chapterImage(chapter)} alt="" width="1000" height="667" />
        <div>
          <h3>{info.name}</h3>
          <p>{info.subtitle}</p>
        </div>
      </div>
      <p className="chapter-lesson">
        {info.size} × {info.size} · {info.lesson}
      </p>
      <div className="level-grid">
        {Array.from({ length: 20 }, (_, i) => {
          const level = chapter * 20 + i,
            id = keyFor({ mode: 'campaign', level, obstacles }),
            done = progress.completed.includes(id),
            locked = level > unlocked,
            perfect = progress.flawless.includes(id);
          return (
            <button
              key={id}
              disabled={locked}
              onClick={() => onPlay(level)}
              aria-label={`第 ${chapter + 1} 大關第 ${i + 1} 題，${locked ? '尚未解鎖' : done ? '已完成，可重玩' : '可挑戰'}${perfect ? '，無提示完成' : ''}`}
              aria-current={level === current ? 'step' : undefined}
              className={`level-tile ${done ? 'done' : ''} ${level === current ? 'current' : ''}`}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              {locked ? (
                <Lock />
              ) : perfect ? (
                <Star />
              ) : done ? (
                <Check />
              ) : (
                <span className="level-open-dot" />
              )}
            </button>
          );
        })}
      </div>
      <p className="picker-note">
        {chapter * 20 > unlocked
          ? '完成前一大關的 20 題，即可解鎖。'
          : '完成一題解鎖下一題，已完成的題目可重玩。'}
        <br />
        <Star size={13} /> 無提示完成
      </p>
    </div>
  );
}

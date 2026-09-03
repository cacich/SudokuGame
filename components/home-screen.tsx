'use client';

import { ArrowRight, BookOpen, Infinity, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  completed: number;
  resumeLabel?: string;
  onResume: () => void;
  onCampaign: () => void;
  onEndless: () => void;
};

export function HomeScreen({
  completed,
  resumeLabel,
  onResume,
  onCampaign,
  onEndless,
}: Props) {
  return (
    <section className="home-screen" aria-label="選擇遊戲模式">
      <div className="home-heading">
        <span className="home-emblem" aria-hidden="true">
          牛
        </span>
        <p className="eyebrow">一格一格，走進牧場</p>
        <h1>野牛格</h1>
      </div>
      {resumeLabel && (
        <Button className="resume-button" onClick={onResume}>
          <Play />
          <span>
            繼續遊戲<small>{resumeLabel}</small>
          </span>
          <ArrowRight />
        </Button>
      )}
      <button className="mode-card campaign-card" onClick={onCampaign}>
        <BookOpen />
        <div>
          <h2>牧場旅程</h2>
          <p>10 座牧場 · 200 道謎題</p>
          <span>
            {completed
              ? `已完成 ${completed} / 200 題`
              : '從晨光草原開始，逐關探索'}
          </span>
        </div>
        <ArrowRight />
      </button>
      <button className="mode-card" onClick={onEndless}>
        <Infinity />
        <div>
          <h2>無盡模式</h2>
          <p>沒有終點，照自己的步調</p>
          <span>7 × 7 · 自由選題</span>
        </div>
        <ArrowRight />
      </button>
      <p className="home-footnote">
        每列、每欄、每個牧區各一隻牛。
        <br />
        牛不能相鄰，斜角也不行。
      </p>
    </section>
  );
}

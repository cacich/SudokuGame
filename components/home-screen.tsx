'use client';

import { BookOpen, Infinity, Play, Mountain, Grid2X2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  resumeLabel?: string;
  onResume: () => void;
  onCampaign: () => void;
  onEndless: () => void;
  onHard: () => void;
  onMixed: () => void;
};

export function HomeScreen({
  resumeLabel,
  onResume,
  onCampaign,
  onEndless,
  onHard,
  onMixed,
}: Props) {
  return (
    <section className="home-screen" aria-label="選擇遊戲模式">
      <div className="home-heading">
        <span className="home-emblem" aria-hidden="true">
          牛
        </span>
        <h1>野牛格</h1>
      </div>
      {resumeLabel && (
        <Button
          className="home-mode resume-button"
          onClick={onResume}
          aria-label={`繼續遊戲：${resumeLabel}`}
        >
          <Play />
          <span>繼續遊戲</span>
        </Button>
      )}
      <Button variant="outline" className="home-mode" onClick={onCampaign}>
        <BookOpen />
        <span>關卡模式</span>
      </Button>
      <Button variant="outline" className="home-mode" onClick={onEndless}>
        <Infinity />
        <span>無盡模式</span>
      </Button>
      {onHard && (
        <Button variant="outline" className="home-mode" onClick={onHard}>
          <Mountain />
          <span>雙牛模式</span>
        </Button>
      )}
      <Button variant="outline" className="home-mode" onClick={onMixed}>
        <Grid2X2 />
        <span>混合牧場</span>
      </Button>
    </section>
  );
}

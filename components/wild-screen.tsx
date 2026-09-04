'use client';
import {
  ArrowLeft,
  BookOpen,
  Grid2X2,
  Infinity,
  Mountain,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { obstacleImage } from '@/lib/mode-entry';
import type { Mode } from '@/lib/progress';

export function WildScreen({
  onBack,
  onStart,
  onResume,
}: {
  onBack: () => void;
  onStart: (mode: Mode) => void;
  onResume?: () => void;
}) {
  return (
    <section className="wild-screen" aria-label="荒野模式">
      <Button variant="ghost" className="wild-back" onClick={onBack}>
        <ArrowLeft />
        返回主介面
      </Button>
      <div className="wild-heading">
        <div className="wild-art" aria-hidden="true">
          <img src={obstacleImage('pond')} width="120" height="120" alt="" />
          <img src={obstacleImage('rocks')} width="100" height="100" alt="" />
        </div>
        <h1>荒野牧場</h1>
        <p>池塘與岩石是題目的一部分，不能放牛。</p>
      </div>
      {onResume && (
        <Button className="home-mode resume-button" onClick={onResume}>
          <Play />
          繼續探索
        </Button>
      )}
      <Button
        variant="outline"
        className="home-mode"
        onClick={() => onStart('campaign')}
      >
        <BookOpen />
        牧場旅程
      </Button>
      <Button
        variant="outline"
        className="home-mode"
        onClick={() => onStart('hard')}
      >
        <Mountain />
        雙牛挑戰
      </Button>
      <Button
        variant="outline"
        className="home-mode"
        onClick={() => onStart('mixed')}
      >
        <Grid2X2 />
        混合牧場
      </Button>
      <Button
        variant="outline"
        className="home-mode"
        onClick={() => onStart('endless')}
      >
        <Infinity />
        無盡探索
      </Button>
    </section>
  );
}

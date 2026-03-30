import { useEffect, useRef } from 'react';

export default function WaveformVisualizer({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const barCount = 64;
    const barWidth = 3;
    const gap = (rect.width - barCount * barWidth) / (barCount - 1);
    const maxHeight = rect.height * 0.8;
    const copper = [184, 96, 42];
    const amber = [201, 148, 62];
    let animationId: number;
    let time = 0;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, rect.width, rect.height);

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap);
        const frequency1 = Math.sin(time * 0.02 + i * 0.15) * 0.5 + 0.5;
        const frequency2 = Math.sin(time * 0.035 + i * 0.08) * 0.3 + 0.3;
        const frequency3 = Math.sin(time * 0.015 + i * 0.22) * 0.2 + 0.2;
        const height = (frequency1 + frequency2 + frequency3) / 3 * maxHeight;

        const t = i / barCount;
        const r = Math.round(copper[0] + (amber[0] - copper[0]) * t);
        const g = Math.round(copper[1] + (amber[1] - copper[1]) * t);
        const b = Math.round(copper[2] + (amber[2] - copper[2]) * t);
        const alpha = 0.4 + frequency1 * 0.6;

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x, rect.height / 2 - height / 2, barWidth, height, 1.5);
        ctx.fill();
      }

      time++;
      animationId = requestAnimationFrame(draw);
    }

    draw();

    const handleResize = () => {
      const newRect = canvas.getBoundingClientRect();
      canvas.width = newRect.width * dpr;
      canvas.height = newRect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full ${className}`}
      style={{ height: '120px' }}
    />
  );
}

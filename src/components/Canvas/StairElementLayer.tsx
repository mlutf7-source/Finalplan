import React from 'react';
import type { StairElement, CanvasView } from '../../core/types';
import { worldToScreen, PX_PER_METER } from '../../core/geometry';
import { getElementCorners } from '../../core/stairElementGeometry';

interface Props {
  stairElements: StairElement[];
  view: CanvasView;
  width: number;
  height: number;
  scale?: number;
}

export const StairElementLayer: React.FC<Props> = React.memo(({ stairElements, view, width, height, scale = 1 }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, width, height);

    const toScreen = (p: { x: number; y: number }) =>
      worldToScreen(p.x, p.y, width, height, view.zoom, view.offsetX, view.offsetY);

    stairElements.forEach(el => {
      const corners = getElementCorners(el).map(toScreen);
      const centerScreen = toScreen(el.position);

      ctx.save();
      ctx.translate(centerScreen.x, centerScreen.y);
      ctx.rotate(-el.rotation);

      const w = el.width * PX_PER_METER * view.zoom;
      const l = el.length * PX_PER_METER * view.zoom;
      const halfW = w / 2;
      const halfL = l / 2;

      if (el.type === 'landing') {
        // ✅ رسم البسطة (مستطيل بسيط)
        ctx.fillStyle = 'rgba(255, 220, 150, 0.5)';
        ctx.fillRect(-halfL, -halfW, l, w);
        ctx.strokeStyle = '#c87f00';
        ctx.lineWidth = 2;
        ctx.strokeRect(-halfL, -halfW, l, w);
      } else {
        // ✅ رسم السحبة (مستطيل + خطوط الدرجات)
        ctx.fillStyle = 'rgba(200, 220, 255, 0.5)';
        ctx.fillRect(-halfL, -halfW, l, w);
        ctx.strokeStyle = '#06f';
        ctx.lineWidth = 2;
        ctx.strokeRect(-halfL, -halfW, l, w);

        // خطوط الدرجات
        const stepCount = el.stepCount ?? Math.max(2, Math.floor(el.length / (el.treadDepth ?? 0.27)));
        const stepPx = l / stepCount;
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        for (let i = 1; i < stepCount; i++) {
          const x = -halfL + stepPx * i;
          ctx.beginPath();
          ctx.moveTo(x, -halfW);
          ctx.lineTo(x, halfW);
          ctx.stroke();
        }

        // سهم الاتجاه
        ctx.strokeStyle = '#0a0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-halfL, 0);
        ctx.lineTo(halfL - 4, 0);
        ctx.lineTo(halfL - 10, -4);
        ctx.moveTo(halfL - 4, 0);
        ctx.lineTo(halfL - 10, 4);
        ctx.stroke();
      }

      ctx.restore();
    });
  }, [stairElements, view, width, height, scale]);

  return (
    <canvas
      ref={canvasRef}
      width={width * scale}
      height={height * scale}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', display: 'block' }}
    />
  );
});

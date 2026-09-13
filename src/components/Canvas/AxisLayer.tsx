import React from 'react';
import type { Axis, CanvasView } from '../../core/types';
import { worldToScreen } from '../../core/geometry';
interface Props { axes: Axis[]; view: CanvasView; width: number; height: number; selectedId: string | null; scale?: number; }
export const AxisLayer: React.FC<Props> = React.memo(({ axes, view, width, height, selectedId, scale = 1 }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    canvas.width = width * scale; canvas.height = height * scale;
    ctx.scale(scale, scale); ctx.clearRect(0, 0, width, height);
    axes.forEach(axis => {
      const selected = axis.id === selectedId;
      const color = selected ? '#0a0' : '#d00';
      let p1w: { x: number; y: number }; let p2w: { x: number; y: number };
      if (axis.type === 'vertical') {
        const x = axis.position + axis.offset;
        p1w = { x, y: axis.center - axis.length / 2 };
        p2w = { x, y: axis.center + axis.length / 2 };
      } else {
        const y = axis.position - axis.offset;
        p1w = { x: axis.center - axis.length / 2, y };
        p2w = { x: axis.center + axis.length / 2, y };
      }
      const p1 = worldToScreen(p1w.x, p1w.y, width, height, view.zoom, view.offsetX, view.offsetY);
      const p2 = worldToScreen(p2w.x, p2w.y, width, height, view.zoom, view.offsetX, view.offsetY);
      ctx.strokeStyle = color; ctx.lineWidth = selected ? 3 : 2; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      ctx.setLineDash([]);
      const drawBubble = (pos: { x: number; y: number }) => {
        const r = Math.max(12, 14 * view.zoom);
        ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = selected ? '#0a0' : '#000';
        ctx.font = `bold ${Math.max(11, r)}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(axis.label, pos.x, pos.y);
      };
      drawBubble(p1); drawBubble(p2);
    });
  }, [axes, view, width, height, selectedId, scale]);
  return <canvas ref={canvasRef} width={width * scale} height={height * scale} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', display: 'block' }} />;
});

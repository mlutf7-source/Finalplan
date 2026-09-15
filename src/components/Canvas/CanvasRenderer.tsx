import React from 'react';
import type { Wall, Point, CanvasView, PlanImage, Axis } from '../../core/types';
import { worldToScreen, distance, wallRectangle } from '../../core/geometry';

interface Props {
  walls: Wall[];
  view: CanvasView;
  width: number;
  height: number;
  selectedId: string | null;
  tempStart: Point | null;
  tempEnd: Point | null;
  scale?: number;
  planImage?: PlanImage | null;
  axes?: Axis[];
  selectedAxisId?: string | null;
}

const COLORS = {
  exterior: '#333',
  interior: '#333',
  selected: '#0a0',
  handle: '#06f',
  preview: '#06f',
  dimension: '#888',
  grid: '#e0e0e0',
  gridBorder: '#aaa',
  axis: '#d00',
  axisSelected: '#0a0',
};
const GRID_EXTENT = 20;
const GRID_SPACING = 0.5;

export const CanvasRenderer: React.FC<Props> = React.memo(({
  walls,
  view,
  width,
  height,
  selectedId,
  tempStart,
  tempEnd,
  scale = 1,
  planImage = null,
  axes = [],
  selectedAxisId = null,
}) => {
  const [showGrid, setShowGrid] = React.useState(true);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const handler = (e: Event) => { setShowGrid((e as CustomEvent<boolean>).detail !== false); };
    window.addEventListener('pdf-export-grid', handler);
    return () => window.removeEventListener('pdf-export-grid', handler);
  }, []);

  const toScreen = (p: Point): Point => worldToScreen(p.x, p.y, width, height, view.zoom, view.offsetX, view.offsetY);

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const topLeft = toScreen({ x: -GRID_EXTENT, y: -GRID_EXTENT });
    const bottomRight = toScreen({ x: GRID_EXTENT, y: GRID_EXTENT });
    ctx.strokeStyle = COLORS.gridBorder;
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5 * scale;
    for (let x = -GRID_EXTENT; x <= GRID_EXTENT; x += GRID_SPACING) {
      const sx = toScreen({ x, y: 0 }).x;
      ctx.beginPath();
      ctx.moveTo(sx, toScreen({ x, y: -GRID_EXTENT }).y);
      ctx.lineTo(sx, toScreen({ x, y: GRID_EXTENT }).y);
      ctx.stroke();
    }
    for (let y = -GRID_EXTENT; y <= GRID_EXTENT; y += GRID_SPACING) {
      const sy = toScreen({ x: 0, y }).y;
      ctx.beginPath();
      ctx.moveTo(toScreen({ x: -GRID_EXTENT, y }).x, sy);
      ctx.lineTo(toScreen({ x: GRID_EXTENT, y }).x, sy);
      ctx.stroke();
    }
  };

  // ✅ رسم المحاور — حجم ثابت على الشاشة (لا يتأثر بالزوم)
  const drawAxes = (ctx: CanvasRenderingContext2D) => {
    if (!axes || axes.length === 0) return;

    // حجم ثابت بالبكسل على الشاشة (مثل الأبعاد والأعمدة)
    const bubbleRadius = 11;
    const lineWidth = 1.5;
    const fontSize = 11;

    axes.forEach(axis => {
      const selected = axis.id === selectedAxisId;
      const color = selected ? COLORS.axisSelected : COLORS.axis;

      let p1w: Point;
      let p2w: Point;
      if (axis.type === 'vertical') {
        const x = axis.position + axis.offset;
        p1w = { x, y: axis.center - axis.length / 2 };
        p2w = { x, y: axis.center + axis.length / 2 };
      } else {
        const y = axis.position - axis.offset;
        p1w = { x: axis.center - axis.length / 2, y };
        p2w = { x: axis.center + axis.length / 2, y };
      }

      const p1 = toScreen(p1w);
      const p2 = toScreen(p2w);

      // خط متقطع — طول الشرطات ثابت أيضاً
      ctx.strokeStyle = color;
      ctx.lineWidth = selected ? lineWidth * 1.5 : lineWidth;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // فقاعات — حجم ثابت
      const drawBubble = (pos: Point) => {
        const r = selected ? bubbleRadius * 1.15 : bubbleRadius;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        ctx.fillStyle = selected ? COLORS.axisSelected : '#000';
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(axis.label, pos.x, pos.y);
      };
      drawBubble(p1);
      drawBubble(p2);
    });
  };

  const drawWall = (ctx: CanvasRenderingContext2D, wall: Wall, selected: boolean) => {
    const rect = wallRectangle(wall);
    const corners = rect.corners.map(toScreen);
    ctx.fillStyle = selected ? COLORS.selected : COLORS.exterior;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
    ctx.fill();
    if (selected) {
      const s = toScreen(wall.start);
      const e = toScreen(wall.end);
      ctx.fillStyle = COLORS.handle;
      [s, e].forEach(p => ctx.fillRect(p.x - 4, p.y - 4, 8, 8));
      const mid = toScreen({ x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 });
      ctx.fillStyle = COLORS.dimension;
      ctx.font = `${Math.max(11, 12 * view.zoom * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(distance(wall.start, wall.end).toFixed(2), mid.x + 15, mid.y - 15);
    }
  };

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
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);
    if (showGrid) drawGrid(ctx);

    // ✅ 1. رسم المحاور أولاً (خلف الجدران والصورة)
    drawAxes(ctx);

    // ✅ 2. رسم الصورة
    if (planImage && planImage.url) {
      const img = new Image();
      img.src = planImage.url;
      img.onload = () => {
        ctx.save();
        ctx.globalAlpha = planImage.opacity;
        const p1 = toScreen({ x: planImage.x, y: planImage.y });
        const p2 = toScreen({ x: planImage.x + planImage.width, y: planImage.y + planImage.height });
        ctx.drawImage(img, p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);

        if (planImage.isSelected) {
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = '#00aaff';
          ctx.lineWidth = 2 / scale;
          ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
          ctx.setLineDash([]);
        }
        ctx.restore();
      };
    }

    // ✅ 3. رسم الجدران
    walls.forEach(w => drawWall(ctx, w, w.id === selectedId));

    // ✅ 4. رسم معاينة الجدار
    if (tempStart && tempEnd) {
      const s = toScreen(tempStart);
      const e = toScreen(tempEnd);
      ctx.strokeStyle = COLORS.preview;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
      ctx.setLineDash([]);
      const mid = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
      ctx.fillStyle = COLORS.preview;
      ctx.font = `${Math.max(12, 14 * view.zoom * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(distance(tempStart, tempEnd).toFixed(2), mid.x + 15, mid.y - 15);
    }
  }, [walls, view, width, height, selectedId, tempStart, tempEnd, showGrid, scale, planImage, axes, selectedAxisId]);

  return <canvas ref={canvasRef} width={width * scale} height={height * scale} style={{ display: 'block' }} />;
});

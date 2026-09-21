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
  showGrid?: boolean;
  axisBubbleSize?: number;
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
const CORNER_TOLERANCE = 0.05;

// ✅ عتبة البحث عن الجدران القريبة (للأركان الذكية)
const NEAR_WALL_TOLERANCE = 0.6;

// ✅ تقاطع خطين لانهائيين
function lineIntersect(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-9) return null;
  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / d;
  return { x: p1.x + ua * (p2.x - p1.x), y: p1.y + ua * (p2.y - p1.y) };
}

// ✅ أقرب نقطة على قطعة مستقيمة
function closestPointOnSeg(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { ...a };
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

// ✅ حساب زوايا الجدار مع امتداد ذكي للأركان
// يستخدم عند وجود جدران قريبة (بعد الدفع للداخل في الرسم)
function computeExtendedCorners(wall: Wall, allWalls: Wall[]): Point[] {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    const rect = wallRectangle(wall);
    return rect.corners.map(c => ({ ...c }));
  }
  const ux = dx / len;
  const uy = dy / len;
  const normal: Point = { x: -uy, y: ux };
  const sign = wall.normalSign ?? 1;
  const offsetX = normal.x * wall.thickness * sign;
  const offsetY = normal.y * wall.thickness * sign;

  // ✅ البحث عن جدران قريبة من start/end
  let extendStart = 0;
  let extendEnd = 0;

  for (const other of allWalls) {
    if (other.id === wall.id) continue;

    // فحص start
    const d_s1 = distance(wall.start, other.start);
    const d_s2 = distance(wall.start, other.end);
    const cpS = closestPointOnSeg(wall.start, other.start, other.end);
    const d_s3 = distance(wall.start, cpS);
    const minS = Math.min(d_s1, d_s2, d_s3);

    // فحص end
    const d_e1 = distance(wall.end, other.start);
    const d_e2 = distance(wall.end, other.end);
    const cpE = closestPointOnSeg(wall.end, other.start, other.end);
    const d_e3 = distance(wall.end, cpE);
    const minE = Math.min(d_e1, d_e2, d_e3);

    if (minS < NEAR_WALL_TOLERANCE) {
      extendStart = Math.max(extendStart, other.thickness);
    }
    if (minE < NEAR_WALL_TOLERANCE) {
      extendEnd = Math.max(extendEnd, other.thickness);
    }
  }

  // ✅ مدّ نقاط النهاية
  const extStart: Point = {
    x: wall.start.x - ux * extendStart,
    y: wall.start.y - uy * extendStart,
  };
  const extEnd: Point = {
    x: wall.end.x + ux * extendEnd,
    y: wall.end.y + uy * extendEnd,
  };

  // ✅ الزوايا الأربع للمستطيل الممدود
  return [
    extStart,
    extEnd,
    { x: extEnd.x + offsetX, y: extEnd.y + offsetY },
    { x: extStart.x + offsetX, y: extStart.y + offsetY },
  ];
}

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
  showGrid = true,
  axisBubbleSize = 9,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

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

  const drawAxes = (ctx: CanvasRenderingContext2D) => {
    if (!axes || axes.length === 0) return;
    const bubbleRadius = axisBubbleSize;
    const lineWidth = 1;
    const fontSize = 9;
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

      ctx.strokeStyle = color;
      ctx.lineWidth = selected ? lineWidth * 1.5 : lineWidth;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.setLineDash([]);

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
    // ✅ حساب الأركان مع الامتداد الذكي (بدل Miter)
    const cornersWorld = computeExtendedCorners(wall, walls);
    const corners = cornersWorld.map(toScreen);

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

    drawAxes(ctx);

    if (planImage && planImage.url) {
      const img = new Image();
      img.src = planImage.url;
      img.onload = () => {
        ctx.save();
        ctx.globalAlpha = planImage.opacity;
        const rotation = planImage.rotation || 0;
        const centerX = planImage.x + planImage.width / 2;
        const centerY = planImage.y + planImage.height / 2;
        const centerScreen = toScreen({ x: centerX, y: centerY });
        const p1 = toScreen({ x: planImage.x, y: planImage.y });
        const p2 = toScreen({ x: planImage.x + planImage.width, y: planImage.y + planImage.height });
        const drawWidth = p2.x - p1.x;
        const drawHeight = p2.y - p1.y;
        ctx.translate(centerScreen.x, centerScreen.y);
        ctx.rotate(rotation);
        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        if (planImage.isSelected) {
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = '#00aaff';
          ctx.lineWidth = 2 / scale;
          ctx.strokeRect(-drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
          ctx.setLineDash([]);
        }
        ctx.restore();
      };
    }

    walls.forEach(w => drawWall(ctx, w, w.id === selectedId));

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
  }, [walls, view, width, height, selectedId, tempStart, tempEnd, showGrid, scale, planImage, axes, selectedAxisId, axisBubbleSize]);

  return <canvas ref={canvasRef} width={width * scale} height={height * scale} style={{ display: 'block' }} />;
});

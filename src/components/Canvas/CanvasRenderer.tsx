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

// ✅ تقاطع خطين لانهائيين
function lineIntersect(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-9) return null;
  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / d;
  return { x: p1.x + ua * (p2.x - p1.x), y: p1.y + ua * (p2.y - p1.y) };
}

// ✅ حساب ركن Miter عند نقطة نهاية الجدار
function computeMiter(wall: Wall, endpoint: Point, allWalls: Wall[]): { outer: Point; inner: Point } | null {
  let otherWall: Wall | null = null;
  for (const w of allWalls) {
    if (w.id === wall.id) continue;
    if (distance(w.start, endpoint) < CORNER_TOLERANCE || distance(w.end, endpoint) < CORNER_TOLERANCE) {
      otherWall = w;
      break;
    }
  }
  if (!otherWall) return null;

  const dxW = wall.end.x - wall.start.x;
  const dyW = wall.end.y - wall.start.y;
  const lenW = Math.hypot(dxW, dyW);
  if (lenW < 1e-9) return null;
  const uxW = dxW / lenW;
  const uyW = dyW / lenW;

  const dxV = otherWall.end.x - otherWall.start.x;
  const dyV = otherWall.end.y - otherWall.start.y;
  const lenV = Math.hypot(dxV, dyV);
  if (lenV < 1e-9) return null;
  const uxV = dxV / lenV;
  const uyV = dyV / lenV;

  const nxW = -uyW;
  const nyW = uxW;
  const nxV = -uyV;
  const nyV = uxV;

  const signW = wall.normalSign ?? 1;
  const signV = otherWall.normalSign ?? 1;
  const hW = (wall.thickness / 2) * signW;
  const hV = (otherWall.thickness / 2) * signV;

  const wOuter1 = { x: endpoint.x + nxW * hW, y: endpoint.y + nyW * hW };
  const wOuter2 = { x: wOuter1.x + uxW, y: wOuter1.y + uyW };
  const wInner1 = { x: endpoint.x - nxW * hW, y: endpoint.y - nyW * hW };
  const wInner2 = { x: wInner1.x + uxW, y: wInner1.y + uyW };

  const vOuter1 = { x: endpoint.x + nxV * hV, y: endpoint.y + nyV * hV };
  const vOuter2 = { x: vOuter1.x + uxV, y: vOuter1.y + uyV };
  const vInner1 = { x: endpoint.x - nxV * hV, y: endpoint.y - nyV * hV };
  const vInner2 = { x: vInner1.x + uxV, y: vInner1.y + uyV };

  const candidates = [
    lineIntersect(wOuter1, wOuter2, vOuter1, vOuter2),
    lineIntersect(wOuter1, wOuter2, vInner1, vInner2),
    lineIntersect(wInner1, wInner2, vOuter1, vOuter2),
    lineIntersect(wInner1, wInner2, vInner1, vInner2),
  ].filter((p): p is Point => p !== null);

  if (candidates.length < 2) return null;

  candidates.sort((a, b) => distance(a, endpoint) - distance(b, endpoint));
  return { outer: candidates[0], inner: candidates[candidates.length - 1] };
}

// ✅ حساب زوايا الجدار للرسم (مع Miter)
function getWallDrawCorners(wall: Wall, allWalls: Wall[]): Point[] {
  const rect = wallRectangle(wall);
  const [c0, c1, c2, c3] = rect.corners;

  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const len = Math.hypot(dx, dy);
  const ux = len > 0 ? dx / len : 0;
  const uy = len > 0 ? dy / len : 0;
  const hT = wall.thickness / 2;

  let startOuter = { ...c0 };
  let endOuter = { ...c1 };
  let endInner = { ...c2 };
  let startInner = { ...c3 };

  const sharedStart = allWalls.some(w =>
    w.id !== wall.id && (distance(w.start, wall.start) < CORNER_TOLERANCE || distance(w.end, wall.start) < CORNER_TOLERANCE)
  );
  const sharedEnd = allWalls.some(w =>
    w.id !== wall.id && (distance(w.start, wall.end) < CORNER_TOLERANCE || distance(w.end, wall.end) < CORNER_TOLERANCE)
  );

  if (sharedStart) {
    const m = computeMiter(wall, wall.start, allWalls);
    if (m) {
      startOuter = m.outer;
      startInner = m.inner;
    } else {
      startOuter = { x: startOuter.x - ux * hT, y: startOuter.y - uy * hT };
      startInner = { x: startInner.x - ux * hT, y: startInner.y - uy * hT };
    }
  }

  if (sharedEnd) {
    const m = computeMiter(wall, wall.end, allWalls);
    if (m) {
      endOuter = m.outer;
      endInner = m.inner;
    } else {
      endOuter = { x: endOuter.x + ux * hT, y: endOuter.y + uy * hT };
      endInner = { x: endInner.x + ux * hT, y: endInner.y + uy * hT };
    }
  }

  return [startOuter, endOuter, endInner, startInner];
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
    // ✅ استخدام Miter Joint في الأركان (بدلاً من التمديد الذي يسبب البروز)
    const drawCornersWorld = getWallDrawCorners(wall, walls);
    const corners = drawCornersWorld.map(toScreen);

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

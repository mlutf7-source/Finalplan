import { useState, useCallback, useRef } from 'react';
import type { Point, Wall, Axis } from '../core/types';
import type { Dimension } from '../core/dimensionTypes';
import { distance, closestPointOnSegment, getAngle, wallRectangle } from '../core/geometry';

const HANDLE = 0.2;
const SNAP = 0.3;
const SNAP_TO_AXIS = 0.3;

// ✅ إيجاد أقرب X لجدار (من زوايا الـ wallRectangle)
function findNearestWallX(pt: Point, walls: Wall[], tol: number): number | null {
  let best: number | null = null;
  let bestDist = tol;
  for (const wall of walls) {
    const rect = wallRectangle(wall);
    for (const c of rect.corners) {
      const d = Math.abs(c.x - pt.x);
      if (d < bestDist) { bestDist = d; best = c.x; }
    }
  }
  return best;
}

// ✅ إيجاد أقرب Y لجدار
function findNearestWallY(pt: Point, walls: Wall[], tol: number): number | null {
  let best: number | null = null;
  let bestDist = tol;
  for (const wall of walls) {
    const rect = wallRectangle(wall);
    for (const c of rect.corners) {
      const d = Math.abs(c.y - pt.y);
      if (d < bestDist) { bestDist = d; best = c.y; }
    }
  }
  return best;
}

// ✅ إيجاد أقرب X لمحور رأسي
function findNearestAxisX(pt: Point, axes: Axis[], tol: number): number | null {
  let best: number | null = null;
  let bestDist = tol;
  for (const axis of axes) {
    if (axis.type !== 'vertical') continue;
    const axisX = axis.position + axis.offset;
    const d = Math.abs(pt.x - axisX);
    if (d < bestDist) { bestDist = d; best = axisX; }
  }
  return best;
}

// ✅ إيجاد أقرب Y لمحور أفقي
function findNearestAxisY(pt: Point, axes: Axis[], tol: number): number | null {
  let best: number | null = null;
  let bestDist = tol;
  for (const axis of axes) {
    if (axis.type !== 'horizontal') continue;
    const axisY = axis.position - axis.offset;
    const d = Math.abs(pt.y - axisY);
    if (d < bestDist) { bestDist = d; best = axisY; }
  }
  return best;
}

export function useDimensionEdit(
  dimensions: Dimension[],
  walls: Wall[],
  axes: Axis[],
  onChange: (dims: Dimension[]) => void,
) {
  const [selectedDimId, setSelectedDimId] = useState<string | null>(null);
  const dragTypeRef = useRef<'move' | 'start' | 'end' | null>(null);
  const dragStartRef = useRef<Point | null>(null);

  const hitTest = useCallback((pt: Point, dim: Dimension): 'move' | 'start' | 'end' | null => {
    const angle = getAngle(dim.start, dim.end);
    const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
    const startHandle = { x: dim.start.x + normal.x * dim.offset, y: dim.start.y + normal.y * dim.offset };
    const endHandle = { x: dim.end.x + normal.x * dim.offset, y: dim.end.y + normal.y * dim.offset };
    const dStart = distance(pt, startHandle);
    const dEnd = distance(pt, endHandle);
    if (dStart <= HANDLE) return 'start';
    if (dEnd <= HANDLE) return 'end';
    const cp = closestPointOnSegment(pt, startHandle, endHandle);
    return distance(pt, cp) <= HANDLE ? 'move' : null;
  }, []);

  const select = useCallback((id: string, type: 'move' | 'start' | 'end', pt: Point) => {
    setSelectedDimId(id);
    dragTypeRef.current = type;
    dragStartRef.current = pt;
  }, []);

  const deselect = useCallback(() => {
    setSelectedDimId(null);
    dragTypeRef.current = null;
    dragStartRef.current = null;
  }, []);

  const moveEdit = useCallback((pt: Point) => {
    if (!selectedDimId || !dragTypeRef.current || !dragStartRef.current) return;
    const dx = pt.x - dragStartRef.current.x;
    const dy = pt.y - dragStartRef.current.y;
    dragStartRef.current = pt;

    onChange(dimensions.map(dim => {
      if (dim.id !== selectedDimId) return dim;

      // === تحريك كامل (إزاحة) ===
      if (dragTypeRef.current === 'move') {
        const angle = getAngle(dim.start, dim.end);
        const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
        const delta = dx * normal.x + dy * normal.y;
        return { ...dim, offset: dim.offset + delta };
      }

      // === تمديد البداية أو النهاية ===
      const baseAngle = getAngle(dim.start, dim.end);
      const isHorizontal =
        Math.abs(baseAngle) < 0.001 || Math.abs(baseAngle - Math.PI) < 0.001;

      // اطرح الإزاحة للحصول على النقطة الأصلية
      const normal = { x: -Math.sin(baseAngle), y: Math.cos(baseAngle) };
      const originalPt: Point = {
        x: pt.x - normal.x * dim.offset,
        y: pt.y - normal.y * dim.offset,
      };

      if (dragTypeRef.current === 'start') {
        const fixedCoord = isHorizontal ? dim.end.y : dim.end.x;

        if (isHorizontal) {
          // ✅ للبعد الأفقي: ثبّت Y، وابحث عن أقرب X لجدار
          const probe: Point = { x: originalPt.x, y: fixedCoord };
          const wallX = findNearestWallX(probe, walls, SNAP);
          if (wallX !== null) return { ...dim, start: { x: wallX, y: fixedCoord } };
          const axisX = findNearestAxisX(probe, axes, SNAP_TO_AXIS);
          if (axisX !== null) return { ...dim, start: { x: axisX, y: fixedCoord } };
          return { ...dim, start: { x: originalPt.x, y: fixedCoord } };
        } else {
          // ✅ للبعد الرأسي: ثبّت X، وابحث عن أقرب Y لجدار
          const probe: Point = { x: fixedCoord, y: originalPt.y };
          const wallY = findNearestWallY(probe, walls, SNAP);
          if (wallY !== null) return { ...dim, start: { x: fixedCoord, y: wallY } };
          const axisY = findNearestAxisY(probe, axes, SNAP_TO_AXIS);
          if (axisY !== null) return { ...dim, start: { x: fixedCoord, y: axisY } };
          return { ...dim, start: { x: fixedCoord, y: originalPt.y } };
        }
      }

      if (dragTypeRef.current === 'end') {
        const fixedCoord = isHorizontal ? dim.start.y : dim.start.x;

        if (isHorizontal) {
          const probe: Point = { x: originalPt.x, y: fixedCoord };
          const wallX = findNearestWallX(probe, walls, SNAP);
          if (wallX !== null) return { ...dim, end: { x: wallX, y: fixedCoord } };
          const axisX = findNearestAxisX(probe, axes, SNAP_TO_AXIS);
          if (axisX !== null) return { ...dim, end: { x: axisX, y: fixedCoord } };
          return { ...dim, end: { x: originalPt.x, y: fixedCoord } };
        } else {
          const probe: Point = { x: fixedCoord, y: originalPt.y };
          const wallY = findNearestWallY(probe, walls, SNAP);
          if (wallY !== null) return { ...dim, end: { x: fixedCoord, y: wallY } };
          const axisY = findNearestAxisY(probe, axes, SNAP_TO_AXIS);
          if (axisY !== null) return { ...dim, end: { x: fixedCoord, y: axisY } };
          return { ...dim, end: { x: fixedCoord, y: originalPt.y } };
        }
      }

      return dim;
    }));
  }, [dimensions, selectedDimId, onChange, walls, axes]);

  const deleteSelected = useCallback(() => {
    if (!selectedDimId) return;
    onChange(dimensions.filter(d => d.id !== selectedDimId));
    deselect();
  }, [dimensions, selectedDimId, onChange, deselect]);

  return { selectedDimId, hitTest, select, deselect, moveEdit, deleteSelected };
}

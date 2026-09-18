import { useState, useCallback, useRef } from 'react';
import type { Point, Wall, Axis } from '../core/types';
import type { Dimension } from '../core/dimensionTypes';
import { distance, closestPointOnSegment, getAngle, wallRectangle } from '../core/geometry';

const HANDLE = 0.2;
const SNAP = 0.2;
const SNAP_TO_AXIS = 0.3;

// ✅ snap على محور (بدون تغيير الإحداثي الثابت للحفاظ على الاستقامة)
function snapPointToAxisOnLine(
  pt: Point,
  axes: Axis[],
  isHorizontal: boolean,
  fixedCoord: number,
  tolerance: number,
): Point {
  for (const axis of axes) {
    if (isHorizontal) {
      // الأبعاد الأفقية تلتقط المحاور الرأسية فقط (تغيير X فقط)
      if (axis.type !== 'vertical') continue;
      const axisX = axis.position + axis.offset;
      if (Math.abs(pt.x - axisX) < tolerance) {
        return { x: axisX, y: fixedCoord };
      }
    } else {
      // الأبعاد الرأسية تلتقط المحاور الأفقية فقط (تغيير Y فقط)
      if (axis.type !== 'horizontal') continue;
      const axisY = axis.position - axis.offset;
      if (Math.abs(pt.y - axisY) < tolerance) {
        return { x: fixedCoord, y: axisY };
      }
    }
  }
  return { ...pt };
}

// ✅ إيجاد أقرب نقطة snap على خط البعد فقط (زاوية أو وجه)
function findClosestSnapOnLine(
  pt: Point,
  walls: Wall[],
  isHorizontal: boolean,
  fixedCoord: number,
  tolerance: number,
): Point | null {
  let best: Point | null = null;
  let bestDist = tolerance;

  for (const wall of walls) {
    const rect = wallRectangle(wall);

    // ✅ فحص الزوايا (يجب أن تكون الزاوية على نفس خط البعد)
    for (const corner of rect.corners) {
      const coord = isHorizontal ? corner.y : corner.x;
      if (Math.abs(coord - fixedCoord) > 0.02) continue;
      const d = isHorizontal
        ? Math.abs(corner.x - pt.x)
        : Math.abs(corner.y - pt.y);
      if (d < bestDist) {
        bestDist = d;
        best = { x: corner.x, y: corner.y };
      }
    }

    // ✅ فحص الأوجه (النقطة الأقرب على الخط فقط)
    for (const face of rect.faces) {
      if (isHorizontal) {
        if (Math.abs(face.start.y - fixedCoord) > 0.02) continue;
        if (Math.abs(face.end.y - fixedCoord) > 0.02) continue;
        const minX = Math.min(face.start.x, face.end.x);
        const maxX = Math.max(face.start.x, face.end.x);
        const snappedX = Math.max(minX, Math.min(maxX, pt.x));
        const d = Math.abs(snappedX - pt.x);
        if (d < bestDist) {
          bestDist = d;
          best = { x: snappedX, y: fixedCoord };
        }
      } else {
        if (Math.abs(face.start.x - fixedCoord) > 0.02) continue;
        if (Math.abs(face.end.x - fixedCoord) > 0.02) continue;
        const minY = Math.min(face.start.y, face.end.y);
        const maxY = Math.max(face.start.y, face.end.y);
        const snappedY = Math.max(minY, Math.min(maxY, pt.y));
        const d = Math.abs(snappedY - pt.y);
        if (d < bestDist) {
          bestDist = d;
          best = { x: fixedCoord, y: snappedY };
        }
      }
    }
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

      // 1. اطرح الإزاحة من المؤشر للحصول على النقطة الأصلية على خط البعد
      const normal = { x: -Math.sin(baseAngle), y: Math.cos(baseAngle) };
      const originalPt: Point = {
        x: pt.x - normal.x * dim.offset,
        y: pt.y - normal.y * dim.offset,
      };

      if (dragTypeRef.current === 'start') {
        const fixedEnd = dim.end;
        const fixedCoord = isHorizontal ? fixedEnd.y : fixedEnd.x;

        // 2. احسب النقطة المستقيمة (على خط البعد)
        const stablePoint: Point = isHorizontal
          ? { x: originalPt.x, y: fixedCoord }
          : { x: fixedCoord, y: originalPt.y };

        // 3. ابحث عن أقرب snap على خط البعد نفسه فقط
        const snapOnLine = findClosestSnapOnLine(
          stablePoint, walls, isHorizontal, fixedCoord, SNAP
        );
        if (snapOnLine) return { ...dim, start: snapOnLine };

        // 4. حاول snap على المحاور المتعامدة (فقط)
        const axisSnapped = snapPointToAxisOnLine(
          stablePoint, axes, isHorizontal, fixedCoord, SNAP_TO_AXIS
        );
        return { ...dim, start: axisSnapped };
      }

      if (dragTypeRef.current === 'end') {
        const fixedStart = dim.start;
        const fixedCoord = isHorizontal ? fixedStart.y : fixedStart.x;

        const stablePoint: Point = isHorizontal
          ? { x: originalPt.x, y: fixedCoord }
          : { x: fixedCoord, y: originalPt.y };

        const snapOnLine = findClosestSnapOnLine(
          stablePoint, walls, isHorizontal, fixedCoord, SNAP
        );
        if (snapOnLine) return { ...dim, end: snapOnLine };

        const axisSnapped = snapPointToAxisOnLine(
          stablePoint, axes, isHorizontal, fixedCoord, SNAP_TO_AXIS
        );
        return { ...dim, end: axisSnapped };
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

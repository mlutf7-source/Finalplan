import { useState, useCallback, useRef } from 'react';
import type { Point, Wall, DrawingType, WallType, Axis } from '../core/types';
import { distance, snapAngle, getAngle } from '../core/geometry';
import { findSnapToFace } from '../core/snapToFace';
import { v4 as uuidv4 } from 'uuid';

const SNAP = 0.3;
const SNAP_TO_AXIS = 0.3;

interface DrawState {
  active: boolean;
  type: DrawingType;
  originalStart: Point | null;
  start: Point | null;
  end: Point | null;
}

export function useDrawing(walls: Wall[], axes: Axis[], onAdd: (w: Wall) => void) {
  const [d, setD] = useState<DrawState>({ active: false, type: null, originalStart: null, start: null, end: null });
  const ref = useRef(d);
  ref.current = d;
  const [lastWallId, setLastWallId] = useState<string | null>(null);

  // ✅ دالة المحاذاة على المحاور
  const snapToAxis = useCallback((originalStart: Point, end: Point): { start: Point; end: Point } => {
    const dx = Math.abs(end.x - originalStart.x);
    const dy = Math.abs(end.y - originalStart.y);
    if (dx > dy) {
      // جدار أفقي → نلتقط المحور الأفقي القريب
      const nearAxis = axes.find(a => a.type === 'horizontal' && Math.abs(originalStart.y - (a.position - a.offset)) < SNAP_TO_AXIS);
      if (nearAxis) {
        const newY = nearAxis.position - nearAxis.offset;
        return { start: { ...originalStart, y: newY }, end: { ...end, y: newY } };
      }
    } else {
      // جدار رأسي → نلتقط المحور الرأسي القريب
      const nearAxis = axes.find(a => a.type === 'vertical' && Math.abs(originalStart.x - (a.position + a.offset)) < SNAP_TO_AXIS);
      if (nearAxis) {
        const newX = nearAxis.position + nearAxis.offset;
        return { start: { ...originalStart, x: newX }, end: { ...end, x: newX } };
      }
    }
    return { start: originalStart, end };
  }, [axes]);

  const begin = useCallback((pt: Point, type: DrawingType) => {
    if (!type) return;
    const snap = findSnapToFace(pt, walls, undefined, SNAP);
    const start = snap?.point ?? pt;
    setD({ active: true, type, originalStart: start, start, end: pt });
  }, [walls]);

  const move = useCallback((pt: Point) => {
    setD(prev => {
      if (!prev.active || !prev.originalStart) return prev;
      const originalStart = prev.originalStart;
      const angle = getAngle(originalStart, pt);
      const snapped = snapAngle(angle);
      let end: Point;
      if (snapped !== angle) {
        end = Math.abs(snapped) < 0.001 || Math.abs(snapped - Math.PI) < 0.001
          ? { x: pt.x, y: originalStart.y }
          : { x: originalStart.x, y: pt.y };
      } else {
        end = pt;
      }
      const snap = findSnapToFace(end, walls, undefined, SNAP);
      end = snap?.point ?? end;

      const { start: sStart, end: sEnd } = snapToAxis(originalStart, end);
      return { ...prev, start: sStart, end: sEnd };
    });
  }, [walls, snapToAxis]);

  const finishWithLength = useCallback((length: number) => {
    const cur = ref.current;
    if (!cur.active || !cur.start || !cur.end || !cur.type) return;
    const angle = getAngle(cur.start, cur.end);
    const snapped = snapAngle(angle);
    let end: Point;
    if (snapped !== angle) {
      end = { x: cur.start.x + Math.cos(snapped) * length, y: cur.start.y + Math.sin(snapped) * length };
    } else {
      end = { x: cur.start.x + Math.cos(angle) * length, y: cur.start.y + Math.sin(angle) * length };
    }
    const newWall: Wall = {
      id: uuidv4(),
      start: { ...cur.start },
      end,
      thickness: cur.type === 'exterior' ? 0.3 : 0.2,
      type: cur.type as WallType,
      normalSign: 1,
      lockDirection: false,
      lockLength: false,
      lockMove: true,
    };
    onAdd(newWall);
    setLastWallId(newWall.id);
    reset();
  }, [onAdd]);

  const finish = useCallback(() => {
    const cur = ref.current;
    if (!cur.active || !cur.start || !cur.end || !cur.type) { reset(); return; }
    if (distance(cur.start, cur.end) < 0.1) { reset(); return; }
    const newWall: Wall = {
      id: uuidv4(),
      start: { ...cur.start },
      end: { ...cur.end },
      thickness: cur.type === 'exterior' ? 0.3 : 0.2,
      type: cur.type as WallType,
      normalSign: 1,
      lockDirection: false,
      lockLength: false,
      lockMove: true,
    };
    onAdd(newWall);
    setLastWallId(newWall.id);
    reset();
  }, [onAdd]);

  const reset = useCallback(() => setD({ active: false, type: null, originalStart: null, start: null, end: null }), []);

  return {
    isDrawing: d.active,
    drawingType: d.type,
    tempStart: d.start,
    tempEnd: d.end,
    lastWallId,
    begin,
    move,
    finish,
    finishWithLength,
    cancel: reset,
  };
}

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Point, Wall, DrawingType, WallType, Axis } from '../core/types';
import { distance, snapAngle, getAngle } from '../core/geometry';
import { findSnapToFace } from '../core/snapToFace';
import { v4 as uuidv4 } from 'uuid';

const SNAP = 0.1;
const SNAP_TO_AXIS = 0.5;

interface DrawState {
  active: boolean;
  type: DrawingType;
  originalStart: Point | null;
  start: Point | null;
  end: Point | null;
}

// ✅ حساب normalSign تلقائياً: جسم الجدار الجديد يمتد نحو جسم الجدار السابق
function computeNormalSign(newStart: Point, newEnd: Point, prevWall: Wall | null): 1 | -1 {
  if (!prevWall) return 1;

  // منتصف جسم الجدار السابق
  const pdx = prevWall.end.x - prevWall.start.x;
  const pdy = prevWall.end.y - prevWall.start.y;
  const plen = Math.hypot(pdx, pdy) || 1;
  const pux = pdx / plen;
  const puy = pdy / plen;
  const pnx = -puy;
  const pny = pux;
  const psign = prevWall.normalSign ?? 1;
  const prevBodyMid: Point = {
    x: (prevWall.start.x + prevWall.end.x) / 2 + pnx * (prevWall.thickness / 2) * psign,
    y: (prevWall.start.y + prevWall.end.y) / 2 + pny * (prevWall.thickness / 2) * psign,
  };

  // عمودي الجدار الجديد
  const ndx = newEnd.x - newStart.x;
  const ndy = newEnd.y - newStart.y;
  const nlen = Math.hypot(ndx, ndy) || 1;
  const nux = ndx / nlen;
  const nuy = ndy / nlen;
  const nnx = -nuy;
  const nny = nux;

  // الاتجاه من نقطة البداية الجديدة نحو جسم السابق
  const inx = prevBodyMid.x - newStart.x;
  const iny = prevBodyMid.y - newStart.y;

  const dot = nnx * inx + nny * iny;
  return dot > 0 ? 1 : -1;
}

export function useDrawing(walls: Wall[], axes: Axis[], onAdd: (w: Wall) => void) {
  const [d, setD] = useState<DrawState>({
    active: false, type: null, originalStart: null, start: null, end: null,
  });
  const ref = useRef(d);
  ref.current = d;
  const [lastWallId, setLastWallId] = useState<string | null>(null);

  const reset = useCallback(() => {
    const newState: DrawState = { active: false, type: null, originalStart: null, start: null, end: null };
    ref.current = newState;
    setD(newState);
  }, []);

  // مزامنة حالة الرسم مع walls عند التراجع / الحذف
  const prevWallsLenRef = useRef(walls.length);
  useEffect(() => {
    const cur = ref.current;
    const prevLen = prevWallsLenRef.current;
    prevWallsLenRef.current = walls.length;

    if (cur.active && walls.length < prevLen) {
      if (walls.length === 0) {
        const newState: DrawState = { active: false, type: null, originalStart: null, start: null, end: null };
        ref.current = newState;
        setD(newState);
      } else {
        const lastWall = walls[walls.length - 1];
        const newState: DrawState = {
          active: true,
          type: cur.type,
          originalStart: { ...lastWall.end },
          start: { ...lastWall.end },
          end: { ...lastWall.end },
        };
        ref.current = newState;
        setD(newState);
      }
    }
  }, [walls]);

  const snapToAxis = useCallback((anchor: Point, end: Point): { start: Point; end: Point } => {
    if (axes.length === 0) return { start: anchor, end };
    const dx = Math.abs(end.x - anchor.x);
    const dy = Math.abs(end.y - anchor.y);
    if (dx > dy) {
      const nearAxis = axes.find(a => a.type === 'horizontal' && Math.abs(anchor.y - (a.position - a.offset)) < SNAP_TO_AXIS);
      if (nearAxis) {
        const axisY = nearAxis.position - nearAxis.offset;
        return { start: { ...anchor, y: axisY }, end: { ...end, y: axisY } };
      }
    } else {
      const nearAxis = axes.find(a => a.type === 'vertical' && Math.abs(anchor.x - (a.position + a.offset)) < SNAP_TO_AXIS);
      if (nearAxis) {
        const axisX = nearAxis.position + nearAxis.offset;
        return { start: { ...anchor, x: axisX }, end: { ...end, x: axisX } };
      }
    }
    return { start: anchor, end };
  }, [axes]);

  const begin = useCallback((pt: Point, type: DrawingType) => {
    if (!type) return;
    const cur = ref.current;

    if (cur.active && cur.start && cur.type) {
      const newState = { ...cur, end: pt };
      ref.current = newState;
      setD(newState);
      return;
    }

    const snap = findSnapToFace(pt, walls, undefined, SNAP);
    const start = snap?.point ?? pt;
    const newState: DrawState = { active: true, type, originalStart: start, start, end: pt };
    ref.current = newState;
    setD(newState);
  }, [walls]);

  const move = useCallback((pt: Point) => {
    const cur = ref.current;
    if (!cur.active || !cur.originalStart || !cur.type) return;

    const anchor = cur.originalStart;
    const angle = getAngle(anchor, pt);
    const snappedAngle = snapAngle(angle);
    const isHorizontal = Math.abs(snappedAngle) < 0.001 || Math.abs(snappedAngle - Math.PI) < 0.001;
    const isAngleSnapped = snappedAngle !== angle;

    let end: Point;
    if (isAngleSnapped) {
      end = isHorizontal ? { x: pt.x, y: anchor.y } : { x: anchor.x, y: pt.y };
    } else {
      end = pt;
    }

    const faceSnap = findSnapToFace(end, walls, undefined, SNAP);
    if (faceSnap) {
      if (isAngleSnapped) {
        if (isHorizontal) end = { x: faceSnap.point.x, y: anchor.y };
        else end = { x: anchor.x, y: faceSnap.point.y };
      } else {
        end = faceSnap.point;
      }
    } else {
      const result = snapToAxis(anchor, end);
      end = result.end;
    }

    // ✅ start = anchor (لا دفع — التداخل الطبيعي يغطي الأركان)
    const newState = { ...cur, start: anchor, end };
    ref.current = newState;
    setD(newState);
  }, [walls, snapToAxis]);

  const finishWithLength = useCallback((length: number) => {
    const cur = ref.current;
    if (!cur.active || !cur.start || !cur.end || !cur.type) return;

    const anchor = cur.originalStart ?? cur.start;
    const angle = getAngle(anchor, cur.end);
    const snapped = snapAngle(angle);

    const end: Point = {
      x: anchor.x + Math.cos(snapped) * length,
      y: anchor.y + Math.sin(snapped) * length,
    };

    const prevWall = walls.length > 0 ? walls[walls.length - 1] : null;
    const normalSign = computeNormalSign(anchor, end, prevWall);

    const newWall: Wall = {
      id: uuidv4(),
      start: { ...anchor },
      end,
      thickness: cur.type === 'exterior' ? 0.3 : 0.2,
      type: cur.type as WallType,
      normalSign,
      lockDirection: false,
      lockLength: false,
      lockMove: true,
    };

    onAdd(newWall);
    setLastWallId(newWall.id);

    const newState: DrawState = {
      active: true, type: cur.type,
      originalStart: { ...end }, start: { ...end }, end: { ...end },
    };
    ref.current = newState;
    setD(newState);
  }, [onAdd, walls]);

  const finish = useCallback(() => {
    const cur = ref.current;
    if (!cur.active || !cur.start || !cur.end || !cur.type) { reset(); return; }
    if (distance(cur.start, cur.end) < 0.1) {
      const newState = { ...cur, end: { ...cur.start } };
      ref.current = newState;
      setD(newState);
      return;
    }

    const anchor = cur.originalStart ?? cur.start;
    const prevWall = walls.length > 0 ? walls[walls.length - 1] : null;
    const normalSign = computeNormalSign(anchor, cur.end, prevWall);

    const newWall: Wall = {
      id: uuidv4(),
      start: { ...anchor },
      end: { ...cur.end },
      thickness: cur.type === 'exterior' ? 0.3 : 0.2,
      type: cur.type as WallType,
      normalSign,
      lockDirection: false,
      lockLength: false,
      lockMove: true,
    };

    onAdd(newWall);
    setLastWallId(newWall.id);

    const newState: DrawState = {
      active: true, type: cur.type,
      originalStart: { ...cur.end }, start: { ...cur.end }, end: { ...cur.end },
    };
    ref.current = newState;
    setD(newState);
  }, [onAdd, reset, walls]);

  const updateLastWallEnd = useCallback((newEnd: Point) => {
    const cur = ref.current;
    if (!cur.active || !cur.type) return;
    const newState: DrawState = {
      active: true, type: cur.type,
      originalStart: { ...newEnd }, start: { ...newEnd }, end: { ...newEnd },
    };
    ref.current = newState;
    setD(newState);
  }, []);

  return {
    isDrawing: d.active, drawingType: d.type,
    tempStart: d.start, tempEnd: d.end,
    lastWallId, begin, move, finish, finishWithLength,
    cancel: reset, updateLastWallEnd,
  };
          }

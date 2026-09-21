import { useState, useCallback, useRef } from 'react';
import type { Point, Wall, DrawingType, WallType, Axis } from '../core/types';
import { distance, snapAngle, getAngle } from '../core/geometry';
import { findSnapToFace } from '../core/snapToFace';
import { v4 as uuidv4 } from 'uuid';

// ✅ مسافة قريبة جداً لالتقاط الوجه (10 سم بدل 30)
const SNAP = 0.1;
const SNAP_TO_AXIS = 0.5;
// ✅ المسافة المسموحة للانحراف العمودي (5 سم) - للحفاظ على استقامة الجدار
const STRAIGHT_TOLERANCE = 0.05;

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

  const reset = useCallback(() => {
    const newState: DrawState = { active: false, type: null, originalStart: null, start: null, end: null };
    ref.current = newState;
    setD(newState);
  }, []);

  const snapToAxis = useCallback((originalStart: Point, end: Point, type: DrawingType): { start: Point; end: Point } => {
    if (axes.length === 0) return { start: originalStart, end };
    const dx = Math.abs(end.x - originalStart.x);
    const dy = Math.abs(end.y - originalStart.y);
    if (dx > dy) {
      const nearAxis = axes.find(a => a.type === 'horizontal' && Math.abs(originalStart.y - (a.position - a.offset)) < SNAP_TO_AXIS);
      if (nearAxis) {
        const axisY = nearAxis.position - nearAxis.offset;
        return { start: { ...originalStart, y: axisY }, end: { ...end, y: axisY } };
      }
    } else {
      const nearAxis = axes.find(a => a.type === 'vertical' && Math.abs(originalStart.x - (a.position + a.offset)) < SNAP_TO_AXIS);
      if (nearAxis) {
        const axisX = nearAxis.position + nearAxis.offset;
        return { start: { ...originalStart, x: axisX }, end: { ...end, x: axisX } };
      }
    }
    return { start: originalStart, end };
  }, [axes]);

  // ✅ الرسم المستمر: نقطة البداية ثابتة بعد أول جدار
  const begin = useCallback((pt: Point, type: DrawingType) => {
    if (!type) return;
    const cur = ref.current;

    // إذا كنا في وضع الرسم المستمر (بعد جدار مُنشأ) → لا نعيد التعيين، فقط نُحدّث النهاية
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

    const originalStart = cur.originalStart;
    const angle = getAngle(originalStart, pt);
    const snappedAngle = snapAngle(angle);
    const isHorizontal = Math.abs(snappedAngle) < 0.001 || Math.abs(snappedAngle - Math.PI) < 0.001;
    const isAngleSnapped = snappedAngle !== angle;

    // 1. تثبيت الزاوية (أفقي أو رأسي)
    let end: Point;
    if (isAngleSnapped) {
      end = isHorizontal
        ? { x: pt.x, y: originalStart.y }
        : { x: originalStart.x, y: pt.y };
    } else {
      end = pt;
    }

    // 2. محاولة التقاط الوجه (بشرط الحفاظ على الاستقامة)
    const faceSnap = findSnapToFace(end, walls, undefined, SNAP);
    let usedFaceSnap = false;
    if (faceSnap) {
      if (isAngleSnapped) {
        // إذا تم تثبيت الزاوية، نتحقق من التوافق مع الخط
        if (isHorizontal) {
          if (Math.abs(faceSnap.point.y - originalStart.y) < STRAIGHT_TOLERANCE) {
            end = faceSnap.point;
            usedFaceSnap = true;
          }
        } else {
          if (Math.abs(faceSnap.point.x - originalStart.x) < STRAIGHT_TOLERANCE) {
            end = faceSnap.point;
            usedFaceSnap = true;
          }
        }
      } else {
        end = faceSnap.point;
        usedFaceSnap = true;
      }
    }

    // 3. محاولة التقاط المحور (فقط إذا لم يُستخدم snap الوجه)
    if (!usedFaceSnap) {
      const result = snapToAxis(originalStart, end, cur.type);
      const newState = { ...cur, start: result.start, end: result.end };
      ref.current = newState;
      setD(newState);
      return;
    }
    const newState = { ...cur, end };
    ref.current = newState;
    setD(newState);
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
    const newWall: Wall = { id: uuidv4(), start: { ...cur.start }, end, thickness: cur.type === 'exterior' ? 0.3 : 0.2, type: cur.type as WallType, normalSign: 1, lockDirection: false, lockLength: false, lockMove: true };
    onAdd(newWall);
    setLastWallId(newWall.id);

    // ✅ رسم مستمر: الجدار التالي يبدأ من نهاية الجدار الحالي
    const newState: DrawState = {
      active: true,
      type: cur.type,
      originalStart: { ...end },
      start: { ...end },
      end: { ...end },
    };
    ref.current = newState;
    setD(newState);
  }, [onAdd]);

  const finish = useCallback(() => {
    const cur = ref.current;
    if (!cur.active || !cur.start || !cur.end || !cur.type) { reset(); return; }
    if (distance(cur.start, cur.end) < 0.1) {
      // جدار قصير جداً — نُعيد النهاية لتكون نفس البداية
      const newState = { ...cur, end: { ...cur.start } };
      ref.current = newState;
      setD(newState);
      return;
    }
    const newWall: Wall = { id: uuidv4(), start: { ...cur.start }, end: { ...cur.end }, thickness: cur.type === 'exterior' ? 0.3 : 0.2, type: cur.type as WallType, normalSign: 1, lockDirection: false, lockLength: false, lockMove: true };
    onAdd(newWall);
    setLastWallId(newWall.id);

    // ✅ رسم مستمر: الجدار التالي يبدأ من نهاية الجدار الحالي
    const newState: DrawState = {
      active: true,
      type: cur.type,
      originalStart: { ...cur.end },
      start: { ...cur.end },
      end: { ...cur.end },
    };
    ref.current = newState;
    setD(newState);
  }, [onAdd, reset]);
  // ✅ تحديث نقطة بداية الجدار التالي بعد تغيير طول الجدار الأخير
const updateLastWallEnd = useCallback((newEnd: Point) => {
  const cur = ref.current;
  if (!cur.active || !cur.type) return;
  const newState: DrawState = {
    active: true,
    type: cur.type,
    originalStart: { ...newEnd },
    start: { ...newEnd },
    end: { ...newEnd },
  };
  ref.current = newState;
  setD(newState);
}, []);

  return { isDrawing: d.active, drawingType: d.type, tempStart: d.start, tempEnd: d.end, lastWallId, begin, move, finish, finishWithLength, cancel: reset, updateLastWallEnd };
}

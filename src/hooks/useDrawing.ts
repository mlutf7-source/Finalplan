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

  const reset = useCallback(() => setD({ active: false, type: null, originalStart: null, start: null, end: null }), []);

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

  const begin = useCallback((pt: Point, type: DrawingType) => {
    if (!type) return;
    const snap = findSnapToFace(pt, walls, undefined, SNAP);
    const start = snap?.point ?? pt;
    setD({ active: true, type, originalStart: start, start, end: pt });
  }, [walls]);

  const move = useCallback((pt: Point) => {
    setD(prev => {
      if (!prev.active || !prev.originalStart || !prev.type) return prev;
      const originalStart = prev.originalStart;
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
          // ✅ إذا تم تثبيت الزاوية، نتحقق من التوافق مع الخط
          if (isHorizontal) {
            // جدار أفقي: يجب أن يكون y الملتقط = y البداية (بفارق صغير)
            if (Math.abs(faceSnap.point.y - originalStart.y) < STRAIGHT_TOLERANCE) {
              end = faceSnap.point;
              usedFaceSnap = true;
            }
          } else {
            // جدار رأسي: يجب أن يكون x الملتقط = x البداية
            if (Math.abs(faceSnap.point.x - originalStart.x) < STRAIGHT_TOLERANCE) {
              end = faceSnap.point;
              usedFaceSnap = true;
            }
          }
        } else {
          // إذا لم يتم تثبيت الزاوية، نستخدم snap الوجه مباشرة
          end = faceSnap.point;
          usedFaceSnap = true;
        }
      }

      // 3. محاولة التقاط المحور (فقط إذا لم يُستخدم snap الوجه)
      if (!usedFaceSnap) {
        const result = snapToAxis(originalStart, end, prev.type);
        return { ...prev, start: result.start, end: result.end };
      }
      return { ...prev, end };
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
    const newWall: Wall = { id: uuidv4(), start: { ...cur.start }, end, thickness: cur.type === 'exterior' ? 0.3 : 0.2, type: cur.type as WallType, normalSign: 1, lockDirection: false, lockLength: false, lockMove: true };
    onAdd(newWall);
    setLastWallId(newWall.id);
    reset();
  }, [onAdd, reset]);

  const finish = useCallback(() => {
    const cur = ref.current;
    if (!cur.active || !cur.start || !cur.end || !cur.type) { reset(); return; }
    if (distance(cur.start, cur.end) < 0.1) { reset(); return; }
    const newWall: Wall = { id: uuidv4(), start: { ...cur.start }, end: { ...cur.end }, thickness: cur.type === 'exterior' ? 0.3 : 0.2, type: cur.type as WallType, normalSign: 1, lockDirection: false, lockLength: false, lockMove: true };
    onAdd(newWall);
    setLastWallId(newWall.id);
    reset();
  }, [onAdd, reset]);

  return { isDrawing: d.active, drawingType: d.type, tempStart: d.start, tempEnd: d.end, lastWallId, begin, move, finish, finishWithLength, cancel: reset };
        }

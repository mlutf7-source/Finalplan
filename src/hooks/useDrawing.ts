import { useState, useCallback, useRef, useEffect } from 'react';
import type { Point, Wall, DrawingType, WallType, Axis } from '../core/types';
import { distance, snapAngle, getAngle } from '../core/geometry';
import { findSnapToFace } from '../core/snapToFace';
import { v4 as uuidv4 } from 'uuid';

// ✅ مسافة قريبة جداً لالتقاط الوجه (10 سم بدل 30)
const SNAP = 0.1;
const SNAP_TO_AXIS = 0.5;

interface DrawState {
  active: boolean;
  type: DrawingType;
  originalStart: Point | null;
  start: Point | null;
  end: Point | null;
}

export function useDrawing(walls: Wall[], axes: Axis[], onAdd: (w: Wall) => void) {
  const [d, setD] = useState<DrawState>({
    active: false,
    type: null,
    originalStart: null,
    start: null,
    end: null,
  });

  const ref = useRef(d);
  ref.current = d;

  const [lastWallId, setLastWallId] = useState<string | null>(null);

  const reset = useCallback(() => {
    const newState: DrawState = {
      active: false,
      type: null,
      originalStart: null,
      start: null,
      end: null,
    };

    ref.current = newState;
    setD(newState);
  }, []);

  // ✅ مزامنة حالة الرسم مع walls عند التراجع / الحذف
  const prevWallsLenRef = useRef(walls.length);

  useEffect(() => {
    const cur = ref.current;
    const prevLen = prevWallsLenRef.current;

    prevWallsLenRef.current = walls.length;

    // إذا كان الرسم نشطاً وتم حذف جدار
    if (cur.active && walls.length < prevLen) {
      if (walls.length === 0) {
        const newState: DrawState = {
          active: false,
          type: null,
          originalStart: null,
          start: null,
          end: null,
        };

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

  const snapToAxis = useCallback(
    (
      originalStart: Point,
      end: Point,
      type: DrawingType
    ): { start: Point; end: Point } => {
      if (axes.length === 0) {
        return { start: originalStart, end };
      }

      const dx = Math.abs(end.x - originalStart.x);
      const dy = Math.abs(end.y - originalStart.y);

      if (dx > dy) {
        const nearAxis = axes.find(
          a =>
            a.type === 'horizontal' &&
            Math.abs(
              originalStart.y - (a.position - a.offset)
            ) < SNAP_TO_AXIS
        );

        if (nearAxis) {
          const axisY = nearAxis.position - nearAxis.offset;

          return {
            start: {
              ...originalStart,
              y: axisY,
            },
            end: {
              ...end,
              y: axisY,
            },
          };
        }
      } else {
        const nearAxis = axes.find(
          a =>
            a.type === 'vertical' &&
            Math.abs(
              originalStart.x - (a.position + a.offset)
            ) < SNAP_TO_AXIS
        );

        if (nearAxis) {
          const axisX = nearAxis.position + nearAxis.offset;

          return {
            start: {
              ...originalStart,
              x: axisX,
            },
            end: {
              ...end,
              x: axisX,
            },
          };
        }
      }

      return {
        start: originalStart,
        end,
      };
    },
    [axes]
  );

  // ✅ حساب بداية الجدار التالي داخل الجدار السابق
  // يتم الدخول بمقدار سماكة الجدار السابق كاملة
  const getNextWallStart = useCallback(
    (
      end: Point,
      start: Point,
      thickness: number
    ): Point => {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.hypot(dx, dy);

      if (len < 1e-9) {
        return { ...end };
      }

      // متجه محور الجدار السابق
      const ux = dx / len;
      const uy = dy / len;

      // الرجوع داخل الجدار السابق بمقدار سماكته كاملة
      return {
        x: end.x - ux * thickness,
        y: end.y - uy * thickness,
      };
    },
    []
  );

  // ✅ الرسم المستمر
  const begin = useCallback(
    (pt: Point, type: DrawingType) => {
      if (!type) return;

      const cur = ref.current;

      if (cur.active && cur.start && cur.type) {
        const newState = {
          ...cur,
          end: pt,
        };

        ref.current = newState;
        setD(newState);
        return;
      }

      const snap = findSnapToFace(
        pt,
        walls,
        undefined,
        SNAP
      );

      const start = snap?.point ?? pt;

      const newState: DrawState = {
        active: true,
        type,
        originalStart: start,
        start,
        end: pt,
      };

      ref.current = newState;
      setD(newState);
    },
    [walls]
  );

  const move = useCallback(
    (pt: Point) => {
      const cur = ref.current;

      if (
        !cur.active ||
        !cur.originalStart ||
        !cur.type
      ) {
        return;
      }

      const originalStart = cur.originalStart;

      const angle = getAngle(
        originalStart,
        pt
      );

      const snappedAngle = snapAngle(angle);

      const isHorizontal =
        Math.abs(snappedAngle) < 0.001 ||
        Math.abs(snappedAngle - Math.PI) < 0.001;

      const isAngleSnapped =
        snappedAngle !== angle;

      let end: Point;

      if (isAngleSnapped) {
        end = isHorizontal
          ? {
              x: pt.x,
              y: originalStart.y,
            }
          : {
              x: originalStart.x,
              y: pt.y,
            };
      } else {
        end = pt;
      }

      const faceSnap = findSnapToFace(
        end,
        walls,
        undefined,
        SNAP
      );

      let usedFaceSnap = false;

      if (faceSnap) {
        if (isAngleSnapped) {
          if (isHorizontal) {
            end = {
              x: faceSnap.point.x,
              y: originalStart.y,
            };

            usedFaceSnap = true;
          } else {
            end = {
              x: originalStart.x,
              y: faceSnap.point.y,
            };

            usedFaceSnap = true;
          }
        } else {
          end = faceSnap.point;
          usedFaceSnap = true;
        }
      }

      if (!usedFaceSnap) {
        const result = snapToAxis(
          originalStart,
          end,
          cur.type
        );

        const newState = {
          ...cur,
          start: result.start,
          end: result.end,
        };

        ref.current = newState;
        setD(newState);
        return;
      }

      const newState = {
        ...cur,
        end,
      };

      ref.current = newState;
      setD(newState);
    },
    [walls, snapToAxis]
  );

  const finishWithLength = useCallback(
    (length: number) => {
      const cur = ref.current;

      if (
        !cur.active ||
        !cur.start ||
        !cur.end ||
        !cur.type
      ) {
        return;
      }

      const angle = getAngle(
        cur.start,
        cur.end
      );

      const snapped = snapAngle(angle);

      let end: Point;

      if (snapped !== angle) {
        end = {
          x:
            cur.start.x +
            Math.cos(snapped) * length,
          y:
            cur.start.y +
            Math.sin(snapped) * length,
        };
      } else {
        end = {
          x:
            cur.start.x +
            Math.cos(angle) * length,
          y:
            cur.start.y +
            Math.sin(angle) * length,
        };
      }

      const thickness =
        cur.type === 'exterior'
          ? 0.3
          : 0.2;

      const newWall: Wall = {
        id: uuidv4(),
        start: { ...cur.start },
        end,
        thickness,
        type: cur.type as WallType,
        normalSign: 1,
        lockDirection: false,
        lockLength: false,
        lockMove: true,
      };

      onAdd(newWall);
      setLastWallId(newWall.id);

      // ✅ بداية الجدار التالي تدخل داخل الجدار السابق
      // بمقدار سماكة الجدار السابق كاملة
      const nextStart = getNextWallStart(
        end,
        cur.start,
        thickness
      );

      const newState: DrawState = {
        active: true,
        type: cur.type,
        originalStart: nextStart,
        start: nextStart,
        end: nextStart,
      };

      ref.current = newState;
      setD(newState);
    },
    [onAdd, getNextWallStart]
  );

  const finish = useCallback(() => {
    const cur = ref.current;

    if (
      !cur.active ||
      !cur.start ||
      !cur.end ||
      !cur.type
    ) {
      reset();
      return;
    }

    if (
      distance(
        cur.start,
        cur.end
      ) < 0.1
    ) {
      const newState = {
        ...cur,
        end: { ...cur.start },
      };

      ref.current = newState;
      setD(newState);
      return;
    }

    const thickness =
      cur.type === 'exterior'
        ? 0.3
        : 0.2;

    const newWall: Wall = {
      id: uuidv4(),
      start: { ...cur.start },
      end: { ...cur.end },
      thickness,
      type: cur.type as WallType,
      normalSign: 1,
      lockDirection: false,
      lockLength: false,
      lockMove: true,
    };

    onAdd(newWall);
    setLastWallId(newWall.id);

    // ✅ بداية الجدار التالي تدخل داخل الجدار السابق
    // بمقدار سماكة الجدار السابق كاملة
    const nextStart = getNextWallStart(
      cur.end,
      cur.start,
      thickness
    );

    const newState: DrawState = {
      active: true,
      type: cur.type,
      originalStart: nextStart,
      start: nextStart,
      end: nextStart,
    };

    ref.current = newState;
    setD(newState);
  }, [onAdd, reset, getNextWallStart]);

  // ✅ تحديث نقطة بداية الجدار التالي بعد تغيير طول الجدار الأخير
  const updateLastWallEnd = useCallback(
    (newEnd: Point) => {
      const cur = ref.current;

      if (!cur.active || !cur.type) {
        return;
      }

      const thickness =
        cur.type === 'exterior'
          ? 0.3
          : 0.2;

      // نستخدم نهاية الجدار الجديد كنقطة مرجعية
      // مع الدخول داخل سماكة الجدار السابق
      const previousStart =
        cur.start ?? newEnd;

      const nextStart = getNextWallStart(
        newEnd,
        previousStart,
        thickness
      );

      const newState: DrawState = {
        active: true,
        type: cur.type,
        originalStart: nextStart,
        start: nextStart,
        end: nextStart,
      };

      ref.current = newState;
      setD(newState);
    },
    [getNextWallStart]
  );

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
    updateLastWallEnd,
  };
}

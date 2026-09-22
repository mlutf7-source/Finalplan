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

export function useDrawing(
  walls: Wall[],
  axes: Axis[],
  onAdd: (w: Wall) => void
) {
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

  // مزامنة حالة الرسم مع walls عند التراجع / الحذف
  const prevWallsLenRef = useRef(walls.length);

  useEffect(() => {
    const cur = ref.current;
    const prevLen = prevWallsLenRef.current;

    prevWallsLenRef.current = walls.length;

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
        return {
          start: originalStart,
          end,
        };
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

  // ============================================================
  // بداية الجدار التالي:
  // لا نزيحها الآن.
  // الإزاحة تتم بعد معرفة اتجاه الجدار الجديد.
  // ============================================================

  const getStartInsidePreviousWall = useCallback(
    (
      anchor: Point,
      target: Point,
      thickness: number
    ): Point => {
      const dx = target.x - anchor.x;
      const dy = target.y - anchor.y;
      const len = Math.hypot(dx, dy);

      if (len < 1e-9) {
        return { ...anchor };
      }

      const ux = dx / len;
      const uy = dy / len;

      return {
        x: anchor.x + ux * thickness,
        y: anchor.y + uy * thickness,
      };
    },
    []
  );

  // ============================================================
  // بداية الرسم
  // ============================================================

  const begin = useCallback(
    (pt: Point, type: DrawingType) => {
      if (!type) return;

      const cur = ref.current;

      // إذا كان الرسم المستمر فعالاً،
      // فإن originalStart يمثل نقطة نهاية الجدار السابق.
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

  // ============================================================
  // حركة الرسم
  // ============================================================

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

      // originalStart = نقطة نهاية الجدار السابق
      const anchor = cur.originalStart;

      const angle = getAngle(anchor, pt);
      const snappedAngle = snapAngle(angle);

      const isHorizontal =
        Math.abs(snappedAngle) < 0.001 ||
        Math.abs(snappedAngle - Math.PI) < 0.001;

      const isAngleSnapped =
        snappedAngle !== angle;

      // --------------------------------------------------------
      // تحديد نهاية الجدار حسب اتجاه الرسم
      // --------------------------------------------------------

      let rawEnd: Point;

      if (isAngleSnapped) {
        rawEnd = isHorizontal
          ? {
              x: pt.x,
              y: anchor.y,
            }
          : {
              x: anchor.x,
              y: pt.y,
            };
      } else {
        rawEnd = pt;
      }

      // --------------------------------------------------------
      // التقاط وجه جدار موجود
      // --------------------------------------------------------

      const faceSnap = findSnapToFace(
        rawEnd,
        walls,
        undefined,
        SNAP
      );

      let end = rawEnd;

      if (faceSnap) {
        if (isAngleSnapped) {
          if (isHorizontal) {
            end = {
              x: faceSnap.point.x,
              y: anchor.y,
            };
          } else {
            end = {
              x: anchor.x,
              y: faceSnap.point.y,
            };
          }
        } else {
          end = faceSnap.point;
        }
      }

      // --------------------------------------------------------
      // تصحيح المحور
      // --------------------------------------------------------

      const axisResult = snapToAxis(
        anchor,
        end,
        cur.type
      );

      end = axisResult.end;

      // --------------------------------------------------------
      // سماكة الجدار السابق
      // --------------------------------------------------------

      const previousWall =
        walls.length > 0
          ? walls[walls.length - 1]
          : null;

      const thickness =
        previousWall?.thickness ??
        (cur.type === 'exterior' ? 0.3 : 0.2);

      // --------------------------------------------------------
      // إدخال بداية الجدار الجديد داخل الجدار السابق
      // --------------------------------------------------------

      const start = getStartInsidePreviousWall(
        anchor,
        end,
        thickness
      );

      const newState: DrawState = {
        ...cur,
        start,
        end,
      };

      ref.current = newState;
      setD(newState);
    },
    [
      walls,
      snapToAxis,
      getStartInsidePreviousWall,
    ]
  );

  // ============================================================
  // إنهاء الجدار بطول محدد
  // ============================================================

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
        cur.originalStart ?? cur.start,
        cur.end
      );

      const snapped = snapAngle(angle);

      const thickness =
        walls.length > 0
          ? walls[walls.length - 1].thickness
          : cur.type === 'exterior'
            ? 0.3
            : 0.2;

      // نقطة نهاية الجدار تعتمد على نقطة بداية الجدار الفعلية
      const start = cur.start;

      const end: Point = {
        x:
          start.x +
          Math.cos(snapped) * length,
        y:
          start.y +
          Math.sin(snapped) * length,
      };

      const newWall: Wall = {
        id: uuidv4(),
        start: { ...start },
        end: { ...end },
        thickness,
        type: cur.type as WallType,
        normalSign: 1,
        lockDirection: false,
        lockLength: false,
        lockMove: true,
      };

      onAdd(newWall);
      setLastWallId(newWall.id);

      // الجدار القادم يبدأ من نهاية هذا الجدار
      // ثم يتم إدخاله داخل هذا الجدار عند تحديد اتجاهه.
      const newState: DrawState = {
        active: true,
        type: cur.type,
        originalStart: { ...end },
        start: { ...end },
        end: { ...end },
      };

      ref.current = newState;
      setD(newState);
    },
    [onAdd, walls]
  );

  // ============================================================
  // إنهاء الجدار
  // ============================================================

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
      walls.length > 0
        ? walls[walls.length - 1].thickness
        : cur.type === 'exterior'
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

    // ==========================================================
    // مهم:
    // لا نحرك نقطة بداية الجدار التالي هنا.
    // نحتفظ بنهاية الجدار الحالي كـ anchor.
    // وعند تحريك المؤشر للجدار التالي يتم إدخاله
    // داخل سماكة الجدار السابق في اتجاه الجدار الجديد.
    // ==========================================================

    const newState: DrawState = {
      active: true,
      type: cur.type,
      originalStart: { ...cur.end },
      start: { ...cur.end },
      end: { ...cur.end },
    };

    ref.current = newState;
    setD(newState);
  }, [onAdd, reset, walls]);

  // ============================================================
  // تحديث نقطة بداية الجدار التالي بعد تغيير طول الجدار الأخير
  // ============================================================

  const updateLastWallEnd = useCallback(
    (newEnd: Point) => {
      const cur = ref.current;

      if (!cur.active || !cur.type) {
        return;
      }

      const newState: DrawState = {
        active: true,
        type: cur.type,
        originalStart: { ...newEnd },
        start: { ...newEnd },
        end: { ...newEnd },
      };

      ref.current = newState;
      setD(newState);
    },
    []
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

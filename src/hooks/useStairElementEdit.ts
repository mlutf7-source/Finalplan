import { useState, useCallback, useRef } from 'react';
import type { Point, StairElement } from '../core/types';
import { distance } from '../core/geometry';
import { getElementCorners, isPointInElement, snapElementToOthers } from '../core/stairElementGeometry';

export type StairElementDragMode = 'move' | 'rotate' | null;

const HANDLE_TOL = 0.4;
const SNAP_TOL = 0.15;

export function useStairElementEdit() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragModeRef = useRef<StairElementDragMode>(null);
  const dragStartRef = useRef<Point | null>(null);
  const originalRef = useRef<StairElement | null>(null);

  const hitTest = useCallback((pt: Point, el: StairElement): StairElementDragMode => {
    // فحص مقبض التدوير
    const corners = getElementCorners(el);
    const topMid = {
      x: (corners[0].x + corners[1].x) / 2,
      y: (corners[0].y + corners[1].y) / 2,
    };
    const dirX = topMid.x - el.position.x;
    const dirY = topMid.y - el.position.y;
    const dirLen = Math.hypot(dirX, dirY) || 1;
    const rotateHandle = {
      x: topMid.x + (dirX / dirLen) * 0.6,
      y: topMid.y + (dirY / dirLen) * 0.6,
    };
    if (distance(pt, rotateHandle) <= HANDLE_TOL) return 'rotate';

    if (isPointInElement(pt, el)) return 'move';
    return null;
  }, []);

  const select = useCallback((el: StairElement, pt: Point, mode: StairElementDragMode) => {
    setSelectedId(el.id);
    dragModeRef.current = mode;
    dragStartRef.current = pt;
    originalRef.current = { ...el };
  }, []);

  const deselect = useCallback(() => {
    setSelectedId(null);
    dragModeRef.current = null;
    dragStartRef.current = null;
    originalRef.current = null;
  }, []);

  const moveDrag = useCallback(
    (pt: Point, allElements: StairElement[], onUpdate: (id: string, patch: Partial<StairElement>) => void) => {
      const original = originalRef.current;
      const startPt = dragStartRef.current;
      const mode = dragModeRef.current;
      if (!original || !startPt || !mode) return;

      if (mode === 'rotate') {
        const angle = Math.atan2(pt.y - original.position.y, pt.x - original.position.x);
        // snap للزوايا المضاعفة (0, 90, 180, 270)
        const snapped = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2);
        onUpdate(original.id, { rotation: snapped });
        return;
      }

      // move
      const dx = pt.x - startPt.x;
      const dy = pt.y - startPt.y;
      let moved: StairElement = {
        ...original,
        position: { x: original.position.x + dx, y: original.position.y + dy },
      };

      // ✅ Snap إلى العناصر الأخرى
      moved = snapElementToOthers(moved, allElements, SNAP_TOL);
      onUpdate(moved.id, { position: moved.position });
    },
    []
  );

  const endDrag = useCallback(() => {
    dragModeRef.current = null;
    dragStartRef.current = null;
    originalRef.current = null;
  }, []);

  return { selectedId, setSelectedId, hitTest, select, deselect, moveDrag, endDrag };
}

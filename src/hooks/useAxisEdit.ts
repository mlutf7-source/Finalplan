import { useState, useCallback, useRef } from 'react';
import type { Point, Axis } from '../core/types';
import { distance } from '../core/geometry';

export type AxisDragMode = 'move' | 'extendStart' | 'extendEnd' | null;

export function useAxisEdit(axes: Axis[], updateAxis: (id: string, patch: Partial<Axis>) => void) {
  const [selectedAxisId, setSelectedAxisId] = useState<string | null>(null);
  const dragModeRef = useRef<AxisDragMode>(null);
  const dragStartRef = useRef<Point | null>(null);
  const dragStartAxisRef = useRef<Axis | null>(null);

  const getAxisEndpoints = useCallback((axis: Axis): { start: Point; end: Point } => {
    if (axis.type === 'vertical') {
      const x = axis.position + axis.offset;
      return { start: { x, y: axis.center - axis.length / 2 }, end: { x, y: axis.center + axis.length / 2 } };
    } else {
      const y = axis.position - axis.offset;
      return { start: { x: axis.center - axis.length / 2, y }, end: { x: axis.center + axis.length / 2, y } };
    }
  }, []);

  const hitTest = useCallback((pt: Point, axis: Axis): boolean => {
    const { start, end } = getAxisEndpoints(axis);
    const tol = 0.4;
    const extension = 0.3;
    if (axis.type === 'vertical') {
      const minY = Math.min(start.y, end.y); const maxY = Math.max(start.y, end.y);
      if (pt.y < minY - extension || pt.y > maxY + extension) return false;
      return Math.abs(pt.x - start.x) <= tol;
    } else {
      const minX = Math.min(start.x, end.x); const maxX = Math.max(start.x, end.x);
      if (pt.x < minX - extension || pt.x > maxX + extension) return false;
      return Math.abs(pt.y - start.y) <= tol;
    }
  }, [getAxisEndpoints]);

  const detectMode = useCallback((pt: Point, axis: Axis): AxisDragMode => {
    const { start, end } = getAxisEndpoints(axis);
    const handle = 0.5;
    if (distance(pt, start) <= handle) return 'extendStart';
    if (distance(pt, end) <= handle) return 'extendEnd';
    return 'move';
  }, [getAxisEndpoints]);

  const select = useCallback((id: string, pt: Point, mode: AxisDragMode = 'move') => {
    setSelectedAxisId(id);
    dragStartRef.current = pt;
    dragModeRef.current = mode;
    dragStartAxisRef.current = axes.find(a => a.id === id) || null;
  }, [axes]);

  const deselect = useCallback(() => {
    setSelectedAxisId(null);
    dragModeRef.current = null;
    dragStartRef.current = null;
    dragStartAxisRef.current = null;
  }, []);

  const moveDrag = useCallback((pt: Point) => {
    if (!selectedAxisId || !dragModeRef.current || !dragStartRef.current || !dragStartAxisRef.current) return;
    const axis = dragStartAxisRef.current;
    const dx = pt.x - dragStartRef.current.x;
    const dy = pt.y - dragStartRef.current.y;

    if (dragModeRef.current === 'move') {
      if (axis.type === 'vertical') updateAxis(selectedAxisId, { center: axis.center + dy });
      else updateAxis(selectedAxisId, { center: axis.center + dx });
    } else if (dragModeRef.current === 'extendStart' || dragModeRef.current === 'extendEnd') {
      const { start, end } = getAxisEndpoints(axis);
      let newStart = { ...start }; let newEnd = { ...end };
      if (axis.type === 'vertical') {
        if (dragModeRef.current === 'extendStart') newStart = { x: start.x, y: pt.y };
        else newEnd = { x: end.x, y: pt.y };
        const newCenter = (newStart.y + newEnd.y) / 2;
        const newLength = Math.abs(newEnd.y - newStart.y);
        if (newLength > 0.5) updateAxis(selectedAxisId, { center: newCenter, length: newLength });
      } else {
        if (dragModeRef.current === 'extendStart') newStart = { x: pt.x, y: start.y };
        else newEnd = { x: pt.x, y: end.y };
        const newCenter = (newStart.x + newEnd.x) / 2;
        const newLength = Math.abs(newEnd.x - newStart.x);
        if (newLength > 0.5) updateAxis(selectedAxisId, { center: newCenter, length: newLength });
      }
    }
    dragStartRef.current = pt;
  }, [selectedAxisId, getAxisEndpoints, updateAxis]);

  const endDrag = useCallback(() => {
    dragModeRef.current = null;
    dragStartRef.current = null;
    dragStartAxisRef.current = null;
  }, []);

  return { selectedAxisId, hitTest, detectMode, select, deselect, moveDrag, endDrag, getAxisEndpoints };
}

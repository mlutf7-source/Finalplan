import { useState, useCallback, useRef } from 'react';
import type { Point, Wall, Axis } from '../core/types';
import type { Dimension } from '../core/dimensionTypes';
import { distance, closestPointOnSegment, getAngle } from '../core/geometry';
import { findSnapToFace } from '../core/snapToFace';

const HANDLE = 0.2;
const SNAP = 0.2;
const SNAP_TO_AXIS = 0.3;

function snapPointToAxis(pt: Point, axes: Axis[], tolerance: number): Point {
  for (const axis of axes) {
    if (axis.type === 'vertical') {
      const axisX = axis.position + axis.offset;
      if (Math.abs(pt.x - axisX) < tolerance) {
        return { x: axisX, y: pt.y };
      }
    } else {
      const axisY = axis.position - axis.offset;
      if (Math.abs(pt.y - axisY) < tolerance) {
        return { x: pt.x, y: axisY };
      }
    }
  }
  return pt;
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

      if (dragTypeRef.current === 'move') {
        const angle = getAngle(dim.start, dim.end);
        const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
        const delta = dx * normal.x + dy * normal.y;
        return { ...dim, offset: dim.offset + delta };
      }

      const angle = getAngle(dim.start, dim.end);
      const normal = { x: -Math.sin(angle), y: Math.cos(angle) };

      const snapOnHandle = findSnapToFace(pt, walls, undefined, SNAP);

      let originalPt: Point;
      if (snapOnHandle) {
        originalPt = { x: snapOnHandle.point.x - normal.x * dim.offset, y: snapOnHandle.point.y - normal.y * dim.offset };
      } else {
        originalPt = { x: pt.x - normal.x * dim.offset, y: pt.y - normal.y * dim.offset };
      }

      originalPt = snapPointToAxis(originalPt, axes, SNAP_TO_AXIS);

      let stablePoint = originalPt;

      if (dragTypeRef.current === 'start') {
        const fixedEnd = dim.end;
        const baseAngle = getAngle(dim.start, dim.end);
        if (Math.abs(baseAngle) < 0.001 || Math.abs(baseAngle - Math.PI) < 0.001) {
          stablePoint = { x: originalPt.x, y: fixedEnd.y };
        } else {
          stablePoint = { x: fixedEnd.x, y: originalPt.y };
        }
        const snapFinalFace = findSnapToFace(stablePoint, walls, undefined, SNAP);
        let finalPt = snapFinalFace ? snapFinalFace.point : stablePoint;
        if (!snapFinalFace) finalPt = snapPointToAxis(finalPt, axes, SNAP_TO_AXIS);
        return { ...dim, start: finalPt };
      }

      if (dragTypeRef.current === 'end') {
        const fixedStart = dim.start;
        const baseAngle = getAngle(dim.start, dim.end);
        if (Math.abs(baseAngle) < 0.001 || Math.abs(baseAngle - Math.PI) < 0.001) {
          stablePoint = { x: originalPt.x, y: fixedStart.y };
        } else {
          stablePoint = { x: fixedStart.x, y: originalPt.y };
        }
        const snapFinalFace = findSnapToFace(stablePoint, walls, undefined, SNAP);
        let finalPt = snapFinalFace ? snapFinalFace.point : stablePoint;
        if (!snapFinalFace) finalPt = snapPointToAxis(finalPt, axes, SNAP_TO_AXIS);
        return { ...dim, end: finalPt };
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

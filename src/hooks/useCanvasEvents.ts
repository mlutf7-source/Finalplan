import { useRef, useCallback } from 'react';
import type { Wall, AppMode, DrawingType, TextElement, Stair, NorthArrow, Point, PlanImage } from '../core/types';
import type { Dimension } from '../core/dimensionTypes';
import type { RoomRegion, RegionType } from '../core/regionTypes';
import type { LayersState } from '../components/Toolbar/LayersPanel';
import { screenToWorld, PX_PER_METER } from '../core/geometry';
import { useCanvasSetup } from './useCanvasSetup';

type SetupReturn = ReturnType<typeof useCanvasSetup>;

interface EventsProps {
  walls: Wall[];
  mode: AppMode;
  drawingType: DrawingType;
  onModeChange: (m: AppMode) => void;
  dimensions: Dimension[];
  layers: LayersState;
  texts: TextElement[];
  regions: RoomRegion[];
  stairs: Stair[];
  northArrows: NorthArrow[];
  frozen: boolean;
  onAddStairAtPoint: (pt: Point) => void;
  onUpdateStair: (id: string, patch: Partial<Stair>) => void;
  onPlaceColumn: (pt: Point) => void;
  onPlaceWindow: (pt: Point) => void;
  onPlaceDoor: (pt: Point) => void;
  onPlaceRegion: (pt: Point, type: RegionType) => void;
  onAddText: (position: Point, text: string) => void;
  setup: SetupReturn;
  
  // ✅ إضافة خصائص الصورة
  planImage?: PlanImage | null;
  onPlanImageChange?: (img: PlanImage) => void;
}

function isPointInPolygon(pt: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > pt.y) !== (yj > pt.y)) && (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function isPointNearStair(pt: Point, stair: Stair): boolean {
  return isPointInPolygon(pt, stair.polygon);
}

export function useCanvasEvents({
  walls, mode, drawingType, onModeChange, dimensions, layers, texts, regions, stairs, northArrows, frozen,
  onAddStairAtPoint, onUpdateStair, onPlaceColumn, onPlaceWindow, onPlaceDoor, onPlaceRegion, onAddText, setup,
  planImage, onPlanImageChange,
}: EventsProps) {
  const {
    containerRef, view, setZoom, pan, setView, drawing, edit, dimensionMode, dimensionEdit, elementEdit,
    textEdit, stairEdit, northArrowEdit, clipFrameEdit, setSelectedRegionId, setSelectedStairId,
  } = setup;

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; zoom: number; cx: number; cy: number } | null>(null);
  const downPointRef = useRef<{ world: { x: number; y: number }; type: string } | null>(null);
  const stairDragCandidateRef = useRef<{ pt: Point; stair: Stair } | null>(null);

  const getPoint = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const clientX = e.clientX - rect.left, clientY = e.clientY - rect.top;
    return { clientX, clientY, world: screenToWorld(clientX, clientY, rect.width, rect.height, view.zoom, view.offsetX, view.offsetY) };
  }, [view, containerRef]);

  const zoomAtPoint = useCallback((cx: number, cy: number, factor: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scale = PX_PER_METER * view.zoom;
    const wx = (cx - rect.width / 2) / scale - view.offsetX;
    const wy = (cy - rect.height / 2) / scale - view.offsetY;
    const nz = Math.min(3, Math.max(0.05, view.zoom * factor));
    const ns = PX_PER_METER * nz;
    setView({ zoom: nz, offsetX: (cx - rect.width / 2) / ns - wx, offsetY: (cy - rect.height / 2) / ns - wy });
  }, [view, setView, containerRef]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    pointersRef.current.set(e.pointerId, { x: cx, y: cy });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    if (pointersRef.current.size === 2 && mode !== 'drawing' && mode !== 'dimension') {
      const pts = Array.from(pointersRef.current.values());
      pinchRef.current = { dist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y), zoom: view.zoom, cx: (pts[0].x + pts[1].x) / 2, cy: (pts[0].y + pts[1].y) / 2 };
      downPointRef.current = null;
      return;
    }

    const pt = getPoint(e);
    if (!pt) return;

    // ✅ 1. التحقق من النقر على الصورة لسحبها (إذا لم تكن مقفلة)
    if (planImage && !planImage.locked && onPlanImageChange) {
      const imgLeft = planImage.x;
      const imgTop = planImage.y;
      const imgRight = planImage.x + planImage.width;
      const imgBottom = planImage.y + planImage.height;
      if (pt.world.x >= imgLeft && pt.world.x <= imgRight && pt.world.y >= imgTop && pt.world.y <= imgBottom) {
        downPointRef.current = { world: pt.world, type: 'planImageDrag' };
        return;
      }
    }

    if (setup.clipFrame && clipFrameEdit.hitTest(pt.world, setup.clipFrame)) {
      const dragMode = clipFrameEdit.detectMode(pt.world, setup.clipFrame);
      clipFrameEdit.select(setup.clipFrame.id, pt.world, dragMode);
      downPointRef.current = { world: pt.world, type: 'clipFrameEdit' };
      return;
    }
    // بقية الأكواد (الرسم، النوافذ، الأبواب، إلخ) كما هي تماماً...
    if (mode === 'stair') { onAddStairAtPoint(pt.world); downPointRef.current = null; return; }
    if (mode === 'text') { const text = window.prompt('أدخل النص:'); if (text && text.trim()) onAddText(pt.world, text.trim()); downPointRef.current = null; return; }
    if (mode === 'kitchen' || mode === 'bathroom') { onPlaceRegion(pt.world, mode === 'kitchen' ? 'kitchen' : 'bathroom'); downPointRef.current = null; return; }
    if (mode === 'column') { if (layers.columns) onPlaceColumn(pt.world); downPointRef.current = null; return; }
    if (mode === 'window') { if (layers.windows) onPlaceWindow(pt.world); downPointRef.current = null; return; }
    if (mode === 'door') { if (layers.doors) onPlaceDoor(pt.world); downPointRef.current = null; return; }
    if (mode === 'drawing') { if (layers.walls) drawing.begin(pt.world, drawingType); downPointRef.current = null; return; }
    if (mode === 'dimension') { if (layers.dimensions) { dimensionMode.begin(pt.world); downPointRef.current = { world: pt.world, type: 'dimension' }; } return; }

    // بقية كود تحديد العناصر (سهم الشمال، النص، المناطق، السلالم، العناصر، الأبعاد، الجدران)...
    // ... (كما هو في الملف الأصلي)
  }, [mode, drawingType, walls, dimensions, layers, texts, regions, stairs, northArrows, getPoint, drawing, edit, dimensionMode, dimensionEdit, elementEdit, textEdit, northArrowEdit, clipFrameEdit, onModeChange, view, onAddStairAtPoint, onUpdateStair, onPlaceColumn, onPlaceWindow, onPlaceDoor, onPlaceRegion, onAddText, containerRef, setSelectedRegionId, setSelectedStairId, setup, planImage, onPlanImageChange]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    if (pointersRef.current.has(e.pointerId)) pointersRef.current.set(e.pointerId, { x: cx, y: cy });
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const nd = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      zoomAtPoint(pinchRef.current.cx, pinchRef.current.cy, (nd / pinchRef.current.dist) * (pinchRef.current.zoom / view.zoom));
      return;
    }

    const pt = getPoint(e);
    if (!pt) return;

    // ✅ 2. تحريك الصورة أثناء السحب
    if (downPointRef.current?.type === 'planImageDrag' && onPlanImageChange && planImage) {
      const dx = pt.world.x - downPointRef.current.world.x;
      const dy = pt.world.y - downPointRef.current.world.y;
      onPlanImageChange({ ...planImage, x: planImage.x + dx, y: planImage.y + dy });
      downPointRef.current.world = pt.world; // تحديث النقطة المرجعية
      return;
    }

    if (downPointRef.current?.type === 'clipFrameEdit') { clipFrameEdit.moveDrag(pt.world); return; }
    // بقية أكواد التحريك (سلم، سهم شمال، عناصر، أبعاد، نصوص، جدران)...
    // ... (كما هو في الملف الأصلي)
  }, [mode, drawing, dimensionMode, dimensionEdit, elementEdit, textEdit, stairEdit, northArrowEdit, clipFrameEdit, edit, pan, view, getPoint, zoomAtPoint, containerRef, stairs, setup.selectedStairId, onUpdateStair, planImage, onPlanImageChange]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    downPointRef.current = null;
    stairDragCandidateRef.current = null;
    if (drawing.isDrawing) drawing.finish();
    if (dimensionMode.isActive) dimensionMode.finish();
    if (edit.isEditing) edit.endEdit();
    elementEdit.endDrag();
    textEdit.endDrag();
    stairEdit.end();
    northArrowEdit.endDrag();
    clipFrameEdit.endDrag();
  }, [drawing, dimensionMode, edit, elementEdit, textEdit, stairEdit, northArrowEdit, clipFrameEdit]);

  return { onPointerDown, onPointerMove, onPointerUp, zoomAtPoint };
}

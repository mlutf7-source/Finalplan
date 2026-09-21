import React, { useState, useEffect } from 'react';
import { CanvasLayers } from './CanvasLayers';
import { CanvasSidebars } from './CanvasSidebars';
import { CanvasZoomControls } from './CanvasZoomControls';
import { WallProperties } from '../Properties/WallProperties';
import { ElementProperties } from '../Properties/ElementProperties';
import { StairProperties } from '../Properties/StairProperties';
import { AxisProperties } from '../Properties/AxisProperties';
import { useCanvasSetup } from '../../hooks/useCanvasSetup';
import { useCanvasEvents } from '../../hooks/useCanvasEvents';
import { rebuildStairPolygon } from '../../core/stairGeometry';
import type { Wall, AppMode, DrawingType, Column, Window, Door, TextElement, Stair, Point, NorthArrow, ClipFrame, PlanImage, Axis } from '../../core/types';
import type { Dimension } from '../../core/dimensionTypes';
import type { RoomRegion, RegionType } from '../../core/regionTypes';
import type { LayersState } from '../Toolbar/LayersPanel';

interface Props {
  walls: Wall[];
  onWallsChange: (walls: Wall[]) => void;
  mode: AppMode;
  drawingType: DrawingType;
  onModeChange: (m: AppMode) => void;
  onCancelTool: () => void;
  dimensions: Dimension[];
  onAddDimension: (d: Dimension) => void;
  onDimensionsChange: (dims: Dimension[]) => void;
  dimensionFontSize: number;
  layers: LayersState;
  columns: Column[];
  windows: Window[];
  doors: Door[];
  texts: TextElement[];
  regions: RoomRegion[];
  stairs: Stair[];
  northArrows: NorthArrow[];
  updateNorthArrow: (id: string, patch: Partial<NorthArrow>) => void;
  frozen: boolean;
  onAddStairAtPoint: (pt: Point) => void;
  onUpdateStair: (id: string, patch: Partial<Stair>) => void;
  onDeleteStair: (id: string) => void;
  onPlaceColumn: (pt: Point) => void;
  onPlaceWindow: (pt: Point) => void;
  onPlaceDoor: (pt: Point) => void;
  onPlaceRegion: (pt: Point, type: RegionType) => void;
  onDeleteRegion: (id: string) => void;
  updateColumn: (id: string, patch: Partial<Column>) => void;
  updateWindow: (id: string, patch: Partial<Window>) => void;
  updateDoor: (id: string, patch: Partial<Door>) => void;
  onDeleteColumn: (id: string) => void;
  onDeleteWindow: (id: string) => void;
  onDeleteDoor: (id: string) => void;
  onAddText: (position: Point, text: string) => void;
  onUpdateText: (id: string, patch: Partial<TextElement>) => void;
  onDeleteText: (id: string) => void;
  onCopyText: (text: TextElement) => void;
  clipFrame: ClipFrame | null;
  setClipFrame: (frame: ClipFrame | null) => void;
  planImage: PlanImage | null;
  setPlanImage: (img: PlanImage | null) => void;
  axes: Axis[];
  selectedAxisId: string | null;
  onUpdateAxis: (id: string, patch: Partial<Axis>) => void;
  onDeleteAxis: (id: string) => void;
  showGrid: boolean;
  axisBubbleSize: number;
  onCopyAxis: (id: string) => void;
}

export const CanvasContainer: React.FC<Props> = (props) => {
  const setup = useCanvasSetup(props);
  // ✅ رفع الدقة الداخلية مؤقتاً عند تصدير PDF
const [renderScale, setRenderScale] = useState(1);

useEffect(() => {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<boolean>).detail;
    // عند بدء التصدير (detail=false) → scale = 3، عند الانتهاء → 1
    setRenderScale(detail === false ? 3 : 1);
  };
  window.addEventListener('pdf-export-grid', handler);
  return () => window.removeEventListener('pdf-export-grid', handler);
}, []);

  // ✅ دالة تحديد الصورة عند النقر عليها
  const onImageSelect = React.useCallback((_id: string | null) => {
    if (props.planImage && !props.planImage.isSelected) {
      props.setPlanImage({ ...props.planImage, isSelected: true });
    }
  }, [props]);

  const events = useCanvasEvents({
    ...props,
    setup,
    planImage: props.planImage,
    onPlanImageChange: props.setPlanImage,
    onImageSelect,
  });

  const { containerRef, size, view, drawing, edit, elementEdit, textEdit, selectedRegionId, setSelectedRegionId, selectedStairId, setSelectedStairId, showRightSidebar, showLeftSidebar, selectedType, deselectAll, reset } = setup;
  const toolActive = ['drawing', 'column', 'window', 'door', 'kitchen', 'bathroom', 'text', 'stair', 'dimension'].includes(props.mode);

  return (
    <div>
      {toolActive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px' }}>
          <button onClick={() => { drawing.cancel(); props.onModeChange('view'); props.onCancelTool(); }} style={{ padding: '8px 14px', borderRadius: 8, border: '2px solid #f44', background: '#f44', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>✖ إلغاء الأداة</button>
          {drawing.lastWallId && props.mode === 'drawing' && (
            <input type="text" inputMode="decimal" dir="ltr" placeholder="القياس الديناميكي" style={{ width: '130px', padding: '8px', borderRadius: 8, border: '2px solid #06f', fontSize: 14, textAlign: 'center', direction: 'ltr' }} onKeyDown={(e) => { if (e.key === 'Enter') { const val = parseFloat(e.currentTarget.value); if (!isNaN(val)) { const wall = props.walls.find(w => w.id === drawing.lastWallId); if (wall) { const len = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y); if (len > 0) { const dirX = (wall.end.x - wall.start.x) / len; const dirY = (wall.end.y - wall.start.y) / len; 
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                const newEnd = { x: wall.start.x + dirX * val, y: wall.start.y + dirY * val };
props.onWallsChange(props.walls.map(w => w.id === wall.id ? { ...w, end: newEnd } : w));
drawing.updateLastWallEnd(newEnd); } } } } }} />
          )}
        </div>
      )}
      {!props.frozen && edit.selectedWallId && (<WallProperties wall={edit.selectedWall} onChangeLength={edit.changeLength} onChangeThickness={edit.changeThickness} />)}
      {elementEdit.selected && (<ElementProperties selected={elementEdit.selected} columns={props.columns} windows={props.windows} doors={props.doors} walls={props.walls} updateColumn={props.updateColumn} updateWindow={props.updateWindow} updateDoor={props.updateDoor} />)}
      {selectedStairId && (
        <StairProperties stair={props.stairs.find(s => s.id === selectedStairId) ?? null} onChangeWidth={(w) => { const s = props.stairs.find(s => s.id === selectedStairId); if (s) props.onUpdateStair(selectedStairId, rebuildStairPolygon({ ...s, width: w })); }} onChangeTotalLength={(l) => { const s = props.stairs.find(s => s.id === selectedStairId); if (s) props.onUpdateStair(selectedStairId, rebuildStairPolygon({ ...s, totalLength: l })); }} onChangeLandingLength={(l) => props.onUpdateStair(selectedStairId, { landingLength: l })} onChangeTreadDepth={(d) => props.onUpdateStair(selectedStairId, { treadDepth: d })} onChangeRiserHeight={(h) => props.onUpdateStair(selectedStairId, { riserHeight: h })} onRotate={() => { const s = props.stairs.find(s => s.id === selectedStairId); if (s) { props.onUpdateStair(selectedStairId, rebuildStairPolygon({ ...s, rotation: (s.rotation || 0) + Math.PI / 2 })); } }} />
      )}
      {setup.axisEdit.selectedAxisId && (
        <AxisProperties
          axis={props.axes.find(a => a.id === setup.axisEdit.selectedAxisId) ?? null}
          onChangeLength={(len) => props.onUpdateAxis(setup.axisEdit.selectedAxisId!, { length: len })}
          onChangeOffset={(off) => props.onUpdateAxis(setup.axisEdit.selectedAxisId!, { offset: off })}
        />
      )}
      <div style={{ position: 'relative' }}>

        {/* ✅ أزرار التحكم بالصورة المستوردة (تظهر عند التحديد) */}
        {props.planImage?.isSelected && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              display: 'flex',
              gap: 6,
              zIndex: 200,
            }}
            onPointerDown={e => e.stopPropagation()}
            onPointerUp={e => e.stopPropagation()}
          >
            <button
              onClick={() => {
                const currentRotation = props.planImage!.rotation || 0;
                const newRotation = (currentRotation + Math.PI / 2) % (Math.PI * 2);
                props.setPlanImage({ ...props.planImage!, rotation: newRotation });
              }}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #f80', background: '#fff', color: '#f80', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
            >🔄 تدوير 90°</button>
            <button
              onClick={() => {
                if (confirm('حذف الصورة المستوردة؟')) {
                  props.setPlanImage(null);
                }
              }}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e44', background: '#e44', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
            >🗑️ حذف الصورة</button>
            <button
              onClick={() => {
                props.setPlanImage({ ...props.planImage!, isSelected: false });
              }}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #555', background: '#555', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
            >✖</button>
          </div>
        )}

        <CanvasSidebars
          showRightSidebar={showRightSidebar}
          showLeftSidebar={showLeftSidebar}
          lockOptions={{ direction: edit.lockOptions.direction, length: edit.lockOptions.length, move: edit.lockOptions.move }}
          onToggleLockDirection={edit.toggleLockDirection}
          onToggleLockLength={edit.toggleLockLength}
          onToggleLockMove={edit.toggleLockMove}
          onDeleteWall={edit.deleteSelected}
          onCopyWall={edit.copySelected}
          onDeleteColumn={() => props.onDeleteColumn(elementEdit.selected?.id ?? '')}
          onDeleteWindow={() => props.onDeleteWindow(elementEdit.selected?.id ?? '')}
          onDeleteDoor={() => props.onDeleteDoor(elementEdit.selected?.id ?? '')}
          onDeleteDimension={setup.dimensionEdit.deleteSelected}
          onCopyText={() => { const t = props.texts.find(x => x.id === textEdit.selectedTextId); if (t) props.onCopyText(t); }}
          onDeleteText={() => { if (textEdit.selectedTextId) props.onDeleteText(textEdit.selectedTextId); textEdit.deselect(); }}
          onDeleteRegion={() => { if (selectedRegionId) props.onDeleteRegion(selectedRegionId); setSelectedRegionId(null); }}
          onDeleteStair={() => { if (selectedStairId) props.onDeleteStair(selectedStairId); setSelectedStairId(null); }}
          onDeleteAxis={() => { if (setup.axisEdit.selectedAxisId) props.onDeleteAxis(setup.axisEdit.selectedAxisId); setup.axisEdit.deselect(); }}
          onDeselectAll={deselectAll}
          selectedType={selectedType === 'northArrow' || selectedType === 'clipFrame' ? null : selectedType}
          onCopyAxis={() => { if (setup.axisEdit.selectedAxisId) props.onCopyAxis(setup.axisEdit.selectedAxisId); }}
        />
        <div ref={containerRef} data-floor-plan-stage="true" data-zoom={view.zoom} data-offset-x={view.offsetX} data-offset-y={view.offsetY} style={{ width: '100%', height: 450, touchAction: 'none', overflow: 'hidden', position: 'relative', cursor: toolActive ? 'crosshair' : props.mode === 'edit' ? 'move' : 'grab' }} onPointerDown={events.onPointerDown} onPointerMove={events.onPointerMove} onPointerUp={events.onPointerUp} onPointerCancel={events.onPointerUp}>
          <CanvasLayers
            walls={props.walls}
            view={view}
            width={size.w}
            height={size.h}
            selectedWallId={edit.selectedWallId}
            tempStart={drawing.tempStart}
            tempEnd={drawing.tempEnd}
            columns={props.columns}
            windows={props.windows}
            doors={props.doors}
            texts={props.texts}
            regions={props.regions}
            stairs={props.stairs}
            northArrows={props.northArrows}
            selectedNorthArrowId={setup.northArrowEdit.selectedNorthArrowId}
            selectedClipFrameId={setup.clipFrameEdit.selectedClipFrameId}
            selectedStairId={selectedStairId}
            selectedElement={elementEdit.selected}
            selectedTextId={textEdit.selectedTextId}
            dimensions={props.dimensions}
            dimensionFontSize={props.dimensionFontSize}
            selectedDimId={setup.dimensionEdit.selectedDimId}
            clipFrames={props.clipFrame ? [props.clipFrame] : []}
            planImage={props.planImage}
            axes={props.axes}
            selectedAxisId={setup.axisEdit.selectedAxisId}
            showGrid={props.showGrid}
            scale={renderScale}  
            axisBubbleSize={props.axisBubbleSize}
          />
          {!toolActive && (<CanvasZoomControls onZoomIn={() => events.zoomAtPoint(size.w / 2, size.h / 2, 1.2)} onZoomOut={() => events.zoomAtPoint(size.w / 2, size.h / 2, 1 / 1.2)} onReset={reset} />)}
        </div>
      </div>
    </div>
  );
};

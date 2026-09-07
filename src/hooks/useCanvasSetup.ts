import { useRef, useState, useEffect, useCallback } from 'react';
import type { Wall, AppMode, DrawingType, Column, Window, Door, TextElement, Stair, NorthArrow, Point, ClipFrame } from '../core/types';
import type { Dimension } from '../core/dimensionTypes';
import type { RoomRegion, RegionType } from '../core/regionTypes';
import type { LayersState } from '../components/Toolbar/LayersPanel';
import { useCanvasState } from './useCanvasState';
import { useDrawing } from './useDrawing';
import { useWallEditor } from './useWallEditor';
import { useDimensionMode } from './useDimensionMode';
import { useDimensionEdit } from './useDimensionEdit';
import { useElementEdit } from './useElementEdit';
import { useTextEdit } from './useTextEdit';
import { useStairEdit } from './useStairEdit';
import { useNorthArrowEdit } from './useNorthArrowEdit';
import { useClipFrameEdit } from './useClipFrameEdit';

interface Props {
  walls: Wall[];
    onWallsChange: (walls: Wall[]) => void;
      mode: AppMode;
        drawingType: DrawingType;
          onModeChange: (m: AppMode) => void;
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
                                                                              }

                                                                              export function useCanvasSetup({
                                                                                walls, onWallsChange, mode, drawingType, onModeChange,
                                                                                  dimensions, onAddDimension, onDimensionsChange, dimensionFontSize,
                                                                                    layers, frozen,
                                                                                      columns, windows, doors, texts, regions, stairs, northArrows,
                                                                                        updateNorthArrow,
                                                                                          onAddStairAtPoint, onUpdateStair, onDeleteStair,
                                                                                            onPlaceColumn, onPlaceWindow, onPlaceDoor, onPlaceRegion, onDeleteRegion,
                                                                                              updateColumn, updateWindow, updateDoor,
                                                                                                onDeleteColumn, onDeleteWindow, onDeleteDoor,
                                                                                                  onAddText, onUpdateText, onDeleteText, onCopyText,
                                                                                                    clipFrame, setClipFrame,
                                                                                                    }: Props) {
                                                                                                      const containerRef = useRef<HTMLDivElement>(null);
                                                                                                        const [size, setSize] = useState({ w: 800, h: 450 });
                                                                                                          const { view, setZoom, pan, setView, reset } = useCanvasState();
                                                                                                            const drawing = useDrawing(walls, (w) => onWallsChange([...walls, w]));
                                                                                                              const edit = useWallEditor(walls, onWallsChange as any);
                                                                                                                const dimensionMode = useDimensionMode(walls, onAddDimension);
                                                                                                                  const dimensionEdit = useDimensionEdit(dimensions, walls, onDimensionsChange);
                                                                                                                    const elementEdit = useElementEdit(columns, windows, doors, walls, updateColumn, updateWindow, updateDoor);
                                                                                                                      const textEdit = useTextEdit(texts, onUpdateText, onDeleteText, onAddText);
                                                                                                                        const stairEdit = useStairEdit();
                                                                                                                          const northArrowEdit = useNorthArrowEdit(northArrows, updateNorthArrow);
                                                                                                                            
                                                                                                                              // ✅ إضافة hook الكليشة
                                                                                                                                const clipFrameEdit = useClipFrameEdit(
                                                                                                                                    clipFrame ? [clipFrame] : [],
                                                                                                                                        (id, patch) => {
                                                                                                                                              if (clipFrame && clipFrame.id === id) {
                                                                                                                                                      setClipFrame({ ...clipFrame, ...patch });
                                                                                                                                                            }
                                                                                                                                                                }
                                                                                                                                                                  );

                                                                                                                                                                    const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
                                                                                                                                                                      const [selectedStairId, setSelectedStairId] = useState<string | null>(null);

                                                                                                                                                                        useEffect(() => {
                                                                                                                                                                            const update = () => { if (containerRef.current) setSize({ w: containerRef.current.clientWidth, h: 450 }); };
                                                                                                                                                                                update();
                                                                                                                                                                                    window.addEventListener('resize', update);
                                                                                                                                                                                        return () => window.removeEventListener('resize', update);
                                                                                                                                                                                          }, []);

                                                                                                                                                                                            const deselectAll = useCallback(() => {
                                                                                                                                                                                                edit.deselect();
                                                                                                                                                                                                    dimensionEdit.deselect();
                                                                                                                                                                                                        elementEdit.deselect();
                                                                                                                                                                                                            textEdit.deselect();
                                                                                                                                                                                                                northArrowEdit.deselect();
                                                                                                                                                                                                                    clipFrameEdit.deselect(); // ✅ إضافة
                                                                                                                                                                                                                        setSelectedRegionId(null);
                                                                                                                                                                                                                            setSelectedStairId(null);
                                                                                                                                                                                                                                stairEdit.end();
                                                                                                                                                                                                                                  }, [edit, dimensionEdit, elementEdit, textEdit, northArrowEdit, clipFrameEdit, stairEdit]);

                                                                                                                                                                                                                                    const selectedType: 'wall' | 'column' | 'window' | 'door' | 'dimension' | 'text' | 'region' | 'stair' | 'northArrow' | 'clipFrame' | null =
                                                                                                                                                                                                                                        edit.selectedWallId ? 'wall' :
                                                                                                                                                                                                                                            elementEdit.selected ? elementEdit.selected.type :
                                                                                                                                                                                                                                                dimensionEdit.selectedDimId ? 'dimension' :
                                                                                                                                                                                                                                                    textEdit.selectedTextId ? 'text' :
                                                                                                                                                                                                                                                        selectedRegionId ? 'region' :
                                                                                                                                                                                                                                                            selectedStairId ? 'stair' :
                                                                                                                                                                                                                                                                northArrowEdit.selectedNorthArrowId ? 'northArrow' :
                                                                                                                                                                                                                                                                    clipFrameEdit.selectedClipFrameId ? 'clipFrame' : // ✅ إضافة
                                                                                                                                                                                                                                                                        null;

                                                                                                                                                                                                                                                                          const showRightSidebar = selectedType === 'wall';
                                                                                                                                                                                                                                                                            const showLeftSidebar = selectedType !== null;

                                                                                                                                                                                                                                                                              return {
                                                                                                                                                                                                                                                                                  containerRef,
                                                                                                                                                                                                                                                                                      size,
                                                                                                                                                                                                                                                                                          view,
                                                                                                                                                                                                                                                                                              setZoom,
                                                                                                                                                                                                                                                                                                  pan,
                                                                                                                                                                                                                                                                                                      setView,
                                                                                                                                                                                                                                                                                                          reset,
                                                                                                                                                                                                                                                                                                              drawing,
                                                                                                                                                                                                                                                                                                                  edit,
                                                                                                                                                                                                                                                                                                                      dimensionMode,
                                                                                                                                                                                                                                                                                                                          dimensionEdit,
                                                                                                                                                                                                                                                                                                                              elementEdit,
                                                                                                                                                                                                                                                                                                                                  textEdit,
                                                                                                                                                                                                                                                                                                                                      stairEdit,
                                                                                                                                                                                                                                                                                                                                          northArrowEdit,
                                                                                                                                                                                                                                                                                                                                              clipFrameEdit, // ✅ إضافة
                                                                                                             clipFrame, // ✅ إضافة هذا السطر لإرجاع clipFrame
                                                                                                                                                                                                                                                                                                                                                  selectedRegionId,
                                                                                                                                                                                                                                                                                                                                                      setSelectedRegionId,
                                                                                                                                                                                                                                                                                                                                                          selectedStairId,
                                                                                                                                                                                                                                                                                                                                                              setSelectedStairId,
                                                                                                                                                                                                                                                                                                                                                                  deselectAll,
                                                                                                                                                                                                                                                                                                                                                                      selectedType,
                                                                                                                                                                                                                                                                                                                                                                          showRightSidebar,
                                                                                                                                                                                                                                                                                                                                                                              showLeftSidebar,
                                                                                                                                                                                                                                                                                                                                                                                };
                                                                                                                                                                                                                                                                                                                                                                                }
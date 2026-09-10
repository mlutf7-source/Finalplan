import { useState, useCallback, useRef, useEffect } from 'react';
import type { Wall, AppMode, DrawingType, Point, Column, Window, Door, TextElement, Stair, NorthArrow, ClipFrame, PlanImage } from '../core/types';
import type { Dimension } from '../core/dimensionTypes';
import type { RoomRegion, RegionType } from '../core/regionTypes';
import type { LayersState } from '../components/Toolbar/LayersPanel';
import { useElementManager } from './useElementManager';
import { useRegionManager } from './useRegionManager';
import { useTextManager } from './useTextManager';
import { useStairManager } from './useStairManager';
import { useCalculations } from './useCalculations';
import { distance, closestPointOnSegment, segmentIntersection, wallRectangle } from '../core/geometry';
import { DEFAULT_COLUMN, DEFAULT_WINDOW, DEFAULT_DOOR } from '../core/types';
import { v4 as uuidv4 } from 'uuid';
import { useProjectManager } from './useProjectManager';
interface Snapshot { walls: Wall[]; columns: Column[]; windows: Window[]; doors: Door[]; dimensions: Dimension[]; regions: RoomRegion[]; texts: TextElement[]; stairs: Stair[]; northArrows: NorthArrow[]; }
function generateDimensionsForWalls(walls: Wall[]): Dimension[] { const dims: Dimension[] = []; walls.forEach((wall) => { const rect = wallRectangle(wall); const face = rect.faces[0]; const breakPoints: Point[] = []; walls.forEach((other) => { if (other.id === wall.id) return; const otherRect = wallRectangle(other); otherRect.faces.forEach((otherFace) => { const intersection = segmentIntersection(face.start, face.end, otherFace.start, otherFace.end); if (intersection) { breakPoints.push(intersection); } }); const cpStart = closestPointOnSegment(other.start, face.start, face.end); if (distance(cpStart, other.start) < 0.05) breakPoints.push({ ...other.start }); const cpEnd = closestPointOnSegment(other.end, face.start, face.end); if (distance(cpEnd, other.end) < 0.05) breakPoints.push({ ...other.end }); }); const unique: Point[] = []; breakPoints.forEach((p) => { if (!unique.some((u) => distance(u, p) < 0.01)) unique.push(p); }); const dir = { x: face.end.x - face.start.x, y: face.end.y - face.start.y }; unique.sort((a, b) => { const denominator = dir.x * dir.x + dir.y * dir.y || 1; const ta = ((a.x - face.start.x) * dir.x + (a.y - face.start.y) * dir.y) / denominator; const tb = ((b.x - face.start.x) * dir.x + (b.y - face.start.y) * dir.y) / denominator; return ta - tb; }); const points = [face.start, ...unique, face.end]; for (let i = 0; i < points.length - 1; i++) { const segmentLength = distance(points[i], points[i + 1]); if (segmentLength > 0.4) { const offsetValue = -(wall.thickness * 3); dims.push({ id: uuidv4(), start: { ...points[i] }, end: { ...points[i + 1] }, offset: offsetValue }); } } }); return dims; }
function findNearestWall(walls: Wall[], pt: Point): { wall: Wall; point: Point; distance: number } | null { let nearest: { wall: Wall; point: Point; distance: number } | null = null; for (const wall of walls) { const point = closestPointOnSegment(pt, wall.start, wall.end); const d = distance(pt, point); if (!nearest || d < nearest.distance) nearest = { wall, point, distance: d }; } return nearest; }
export function useAppState() {
const [walls, setWalls] = useState<Wall[]>([]);
const [mode, setMode] = useState<AppMode>('view');
const [drawingType, setDrawingType] = useState<DrawingType>(null);
const [dimensions, setDimensions] = useState<Dimension[]>([]);
const [dimensionFontSize, setDimensionFontSize] = useState(40);
const [layers, setLayers] = useState<LayersState>({ walls: true, dimensions: true, columns: true, windows: true, doors: true, texts: true, regions: true, stairs: true, northArrow: true });
const [showQuantities, setShowQuantities] = useState(false);
const [activeTab, setActiveTab] = useState<'preliminary' | 'structure' | 'finishes' | 'prices' | 'summary'>('finishes');
const elements = useElementManager(); const regionsManager = useRegionManager(walls); const textManager = useTextManager(); const stairManager = useStairManager(walls); const results = useCalculations(walls, elements.columns, elements.windows, elements.doors, 3);
const projectManager = useProjectManager(); useEffect(() => { projectManager.init(); }, []);
const [clipFrame, setClipFrame] = useState<ClipFrame | null>(null); const INITIAL_VIEW = { zoom: 0.75, offsetX: 0, offsetY: 0 }; const [view, setView] = useState(INITIAL_VIEW);
const [isDirty, setIsDirty] = useState(false); const [currentProjectName, setCurrentProjectName] = useState<string>(''); const savedSnapshotRef = useRef<string>('');
const [history, setHistory] = useState<Snapshot[]>([]); const [future, setFuture] = useState<Snapshot[]>([]);
const currentSnapshotRef = useRef<Snapshot>({ walls, columns: elements.columns, windows: elements.windows, doors: elements.doors, dimensions, regions: regionsManager.regions, texts: textManager.texts, stairs: stairManager.stairs, northArrows: elements.northArrows });
const isRestoringRef = useRef(false);
const isEmptyState = useCallback((snap: Snapshot) => { return snap.walls.length === 0 && snap.columns.length === 0 && snap.windows.length === 0 && snap.doors.length === 0 && snap.texts.length === 0 && snap.regions.length === 0 && snap.stairs.length === 0 && snap.northArrows.length === 0 && snap.dimensions.length === 0; }, []);
useEffect(() => { if (isRestoringRef.current) return; const snap: Snapshot = { walls, columns: elements.columns, windows: elements.windows, doors: elements.doors, dimensions, regions: regionsManager.regions, texts: textManager.texts, stairs: stairManager.stairs, northArrows: elements.northArrows }; const prev = currentSnapshotRef.current; if (JSON.stringify(snap) !== JSON.stringify(prev)) { setHistory(h => [...h, prev]); setFuture([]); currentSnapshotRef.current = snap; } const currentSnap = JSON.stringify(snap); if (isEmptyState(snap) || currentSnap === savedSnapshotRef.current) { setIsDirty(false); } else { setIsDirty(true); } }, [walls, dimensions, elements.columns, elements.windows, elements.doors, regionsManager.regions, textManager.texts, stairManager.stairs, elements.northArrows, isEmptyState]);
const applySnapshot = useCallback((snap: Snapshot) => { isRestoringRef.current = true; setWalls(snap.walls); setDimensions(snap.dimensions); elements.setAllElements(snap.columns, snap.windows, snap.doors, snap.northArrows); regionsManager.setRegions(snap.regions); textManager.setAllTexts(snap.texts); stairManager.setAllStairs(snap.stairs); currentSnapshotRef.current = snap; requestAnimationFrame(() => { isRestoringRef.current = false; }); }, [elements, regionsManager, textManager, stairManager]);
const handleUndo = useCallback(() => { setHistory(prevHistory => { if (prevHistory.length === 0) return prevHistory; const previous = prevHistory[prevHistory.length - 1]; const current = currentSnapshotRef.current; setFuture(prevFuture => [current, ...prevFuture]); applySnapshot(previous); return prevHistory.slice(0, -1); }); }, [applySnapshot]);
const handleRedo = useCallback(() => { setFuture(prevFuture => { if (prevFuture.length === 0) return prevFuture; const next = prevFuture[0]; const current = currentSnapshotRef.current; setHistory(prevHistory => [...prevHistory, current]); applySnapshot(next); return prevFuture.slice(1); }); }, [applySnapshot]);
const commit = useCallback(() => { setHistory(h => [...h, currentSnapshotRef.current]); setFuture([]); }, []);
const handleWallsChange = useCallback((newWalls: Wall[]) => { commit(); setWalls(newWalls); }, [commit]);
const handleDimensionsChange = useCallback((newDims: Dimension[]) => { commit(); setDimensions(newDims); }, [commit]);
const handleAddDimension = useCallback((dim: Dimension) => { commit(); setDimensions(prev => [...prev, dim]); }, [commit]);
const handleAddAllDimensions = useCallback(() => { const dims = generateDimensionsForWalls(walls); commit(); setDimensions(prev => [...prev, ...dims]); }, [walls, commit]);
const handlePlaceColumn = useCallback((pt: Point) => { commit(); elements.addColumn({ position: pt, width: DEFAULT_COLUMN.width, length: DEFAULT_COLUMN.length }); }, [elements, commit]);
const handlePlaceWindow = useCallback((pt: Point) => { const nearest = findNearestWall(walls, pt); if (!nearest) return; const bestWall = nearest.wall; const len = distance(bestWall.start, bestWall.end); if (len <= 0) return; const pos = distance(bestWall.start, nearest.point); const center = { x: bestWall.start.x + ((pos + DEFAULT_WINDOW.width / 2) / len) * (bestWall.end.x - bestWall.start.x), y: bestWall.start.y + ((pos + DEFAULT_WINDOW.width / 2) / len) * (bestWall.end.y - bestWall.start.y) }; commit(); elements.addWindow({ wallId: bestWall.id, position: pos, width: DEFAULT_WINDOW.width, height: DEFAULT_WINDOW.height, center }); }, [walls, elements, commit]);
const handlePlaceDoor = useCallback((pt: Point) => { const nearest = findNearestWall(walls, pt); if (!nearest) return; const bestWall = nearest.wall; const len = distance(bestWall.start, bestWall.end); if (len <= 0) return; const pos = distance(bestWall.start, nearest.point); const center = { x: bestWall.start.x + ((pos + DEFAULT_DOOR.width / 2) / len) * (bestWall.end.x - bestWall.start.x), y: bestWall.start.y + ((pos + DEFAULT_DOOR.width / 2) / len) * (bestWall.end.y - bestWall.start.y) }; commit(); elements.addDoor({ wallId: bestWall.id, position: pos, width: DEFAULT_DOOR.width, height: DEFAULT_DOOR.height, center }); }, [walls, elements, commit]);
const handlePlaceRegion = useCallback((pt: Point, type: RegionType) => { commit(); regionsManager.addRegion(pt, type); setMode('view'); }, [regionsManager, commit]);
const handleDeleteRegion = useCallback((id: string) => { commit(); regionsManager.removeRegion(id); }, [regionsManager, commit]);
const handleAddText = useCallback((position: Point, text: string) => { commit(); textManager.addText(position, text); setMode('view'); }, [textManager, commit]);
const handleUpdateText = useCallback((id: string, patch: Partial<TextElement>) => { commit(); textManager.updateText(id, patch); }, [textManager, commit]);
const handleDeleteText = useCallback((id: string) => { commit(); textManager.removeText(id); }, [textManager, commit]);
const handleCopyText = useCallback((text: TextElement) => {
  commit();
  textManager.addText(
    { x: text.position.x + 1, y: text.position.y + 1 },
    text.text,
    {
      fontSize: text.fontSize,
      color: text.color,
      rotation: text.rotation,
      fontFamily: text.fontFamily,
    }
  );
}, [textManager, commit]);
const handleUpdateColumn = useCallback((id: string, patch: Partial<Column>) => { commit(); elements.updateColumn(id, patch); }, [elements, commit]);
const handleUpdateWindow = useCallback((id: string, patch: Partial<Window>) => { commit(); elements.updateWindow(id, patch); }, [elements, commit]);
const handleUpdateDoor = useCallback((id: string, patch: Partial<Door>) => { commit(); elements.updateDoor(id, patch); }, [elements, commit]);
const handleDeleteColumn = useCallback((id: string) => { commit(); elements.removeColumn(id); }, [elements, commit]);
const handleDeleteWindow = useCallback((id: string) => { commit(); elements.removeWindow(id); }, [elements, commit]);
const handleDeleteDoor = useCallback((id: string) => { commit(); elements.removeDoor(id); }, [elements, commit]);
const handleAddStairAtPoint = useCallback((pt: Point) => { commit(); stairManager.addStairAtPoint(pt); setMode('view'); }, [stairManager, commit]);
const handleUpdateStair = useCallback((id: string, patch: Partial<Stair>) => { commit(); stairManager.updateStair(id, patch); }, [stairManager, commit]);
const handleDeleteStair = useCallback((id: string) => { commit(); stairManager.removeStair(id); }, [stairManager, commit]);
const handleAddNorthArrow = useCallback(() => { commit(); elements.addNorthArrow({ x: 0, y: 0 }); }, [elements, commit]);
const handleUpdateNorthArrow = useCallback((id: string, patch: Partial<NorthArrow>) => { commit(); elements.updateNorthArrow(id, patch); }, [elements, commit]);
const handleSetClipFrame = useCallback((frame: ClipFrame | null) => { setClipFrame(frame); }, []);
const handleCancelTool = useCallback(() => { setMode('view'); setDrawingType(null); }, []);
const toolsActive = mode === 'drawing' || mode === 'dimension' || mode === 'column' || mode === 'window' || mode === 'door' || mode === 'kitchen' || mode === 'bathroom' || mode === 'text' || mode === 'stair';
const toggleLayer = useCallback((layer: keyof LayersState) => { setLayers(prev => ({ ...prev, [layer]: !prev[layer] })); }, []);
const allUnlocked = Object.values(layers).every(v => v);
const toggleAllLayers = useCallback(() => { setLayers(prev => { const newValue = !Object.values(prev).every(v => v); return { walls: newValue, dimensions: newValue, columns: newValue, windows: newValue, doors: newValue, texts: newValue, regions: newValue, stairs: newValue, northArrow: newValue }; }); }, []);
const setAllLayersLocked = useCallback((locked: boolean) => { setLayers({ walls: !locked, dimensions: !locked, columns: !locked, windows: !locked, doors: !locked, texts: !locked, regions: !locked, stairs: !locked, northArrow: !locked }); }, []);
const handleSaveProject = useCallback((name: string) => { const data = { walls, columns: elements.columns, windows: elements.windows, doors: elements.doors, texts: textManager.texts, regions: regionsManager.regions, stairs: stairManager.stairs, northArrows: elements.northArrows, dimensions }; const projectId = projectManager.saveProject(name, data as any); if (projectId) setCurrentProjectName(name); savedSnapshotRef.current = JSON.stringify(data); setIsDirty(false); }, [walls, elements, textManager, regionsManager, stairManager, dimensions, projectManager]);
const handleLoadProject = useCallback((id: string) => { const data = projectManager.loadProject(id); if (data) { setWalls(data.walls || []); setDimensions(data.dimensions || []); elements.setAllElements(data.columns || [], data.windows || [], data.doors || [], data.northArrows || []); regionsManager.setRegions(data.regions || []); textManager.setAllTexts(data.texts || []); stairManager.setAllStairs(data.stairs || []); savedSnapshotRef.current = JSON.stringify(data); setIsDirty(false); const project = projectManager.projects.find(p => p.id === id); if (project) setCurrentProjectName(project.name); } }, [elements, regionsManager, textManager, stairManager, projectManager]);
const handleDeleteProject = useCallback((id: string) => { projectManager.deleteProject(id); setCurrentProjectName(''); }, [projectManager]);
const handleNewProject = useCallback(() => { setWalls([]); setDimensions([]); elements.setAllElements([], [], [], []); regionsManager.setRegions([]); textManager.setAllTexts([]); stairManager.setAllStairs([]); projectManager.createNewProject(); savedSnapshotRef.current = ''; setCurrentProjectName(''); setIsDirty(false); }, [elements, regionsManager, textManager, stairManager, projectManager]);

// ✅ حالة الصورة
const [planImage, setPlanImage] = useState<PlanImage | null>(null);

return { walls, setWalls, mode, setMode, drawingType, setDrawingType, dimensions, setDimensions, dimensionFontSize, setDimensionFontSize, layers, toggleLayer, toggleAllLayers, allUnlocked, setAllLayersLocked, showQuantities, setShowQuantities, activeTab, setActiveTab, elements, regionsManager, textManager, stairManager, results, history, future, handleUndo, handleRedo, handleWallsChange, handleDimensionsChange, handleAddDimension, handleAddAllDimensions, handlePlaceColumn, handlePlaceWindow, handlePlaceDoor, handlePlaceRegion, handleDeleteRegion, handleAddText, handleUpdateText, handleDeleteText, handleCopyText, handleUpdateColumn, handleUpdateWindow, handleUpdateDoor, handleDeleteColumn, handleDeleteWindow, handleDeleteDoor, handleAddStairAtPoint, handleUpdateStair, handleDeleteStair, handleAddNorthArrow, handleUpdateNorthArrow, handleCancelTool, toolsActive, projectManager, handleSaveProject, handleLoadProject, handleDeleteProject, handleNewProject, isDirty, currentProjectName, clipFrame, setClipFrame: handleSetClipFrame, view, setView, planImage, setPlanImage };
                                                                                                                                                                                                                 }

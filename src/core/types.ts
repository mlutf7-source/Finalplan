export interface Point { x: number; y: number; }
export type WallType = 'exterior' | 'interior';
export interface Wall { id: string; start: Point; end: Point; thickness: number; type: WallType; normalSign: 1 | -1; lockDirection: boolean; lockLength: boolean; lockMove: boolean; }
export interface WallRectangle { start: Point; end: Point; thickness: number; corners: Point[]; faces: { start: Point; end: Point }[]; }
export interface Column { id: string; position: Point; width: number; length: number; rotation: number; center?: Point; }
export interface Window { id: string; wallId: string; position: number; width: number; height: number; thickness: number; center?: Point; }
export interface Door { id: string; wallId: string; position: number; width: number; height: number; thickness: number; center?: Point; hinge: 'start' | 'end'; swing: 1 | -1; side: 1 | -1; rotation?: number; }
export interface TextElement { id: string; position: Point; text: string; fontSize: number; color: string; rotation: number; fontFamily?: string; }
export interface Stair { id: string; polygon: Point[]; center: Point; width: number; totalLength: number; landingLength: number; treadDepth: number; riserHeight: number; rotation: number; }
export interface NorthArrow { id: string; position: Point; rotation: number; size: number; }
export interface ClipFrame { id: string; x: number; y: number; width: number; height: number; rotation: number; }
export type AppMode = 'view' | 'drawing' | 'edit' | 'dimension' | 'column' | 'window' | 'door' | 'kitchen' | 'bathroom' | 'text' | 'stair';
export type DrawingType = 'exterior' | 'interior' | null;
export type EditType = 'none' | 'move' | 'extendStart' | 'extendEnd';
export interface LockOptions { direction: boolean; length: boolean; move: boolean; }
export interface SnapResult { point: Point; type: 'corner' | 'face'; wallId: string; distance: number; }
export interface CanvasView { zoom: number; offsetX: number; offsetY: number; }
export interface CalculationResults { buildingArea: number; exteriorWallsLength: number; interiorWallsLength: number; exteriorWallsArea: number; interiorWallsArea: number; columnsArea: number; windowsArea: number; doorsArea: number; netExteriorWallsArea: number; netInteriorWallsArea: number; }
export const SNAP_THRESHOLD = 0.10;
export const DEFAULT_COLUMN = { width: 0.2, length: 0.6, rotation: 0 };
export const DEFAULT_WINDOW = { width: 1.2, height: 1.5, thickness: 0.3 };
export const DEFAULT_DOOR = { width: 1.0, height: 2.0, thickness: 0.2, hinge: 'start' as const, swing: 1 as 1 | -1, side: 1 as 1 | -1, rotation: 0 };
export const DEFAULT_TEXT = { fontSize: 0.5, color: '#000000', rotation: 0 };
export const DEFAULT_STAIR = { width: 2.0, totalLength: 3.5, landingLength: 1.0, treadDepth: 0.27, riserHeight: 0.17, rotation: 0 };
export const DEFAULT_NORTH_ARROW = { size: 30, rotation: 0 };
export const DEFAULT_CLIP_FRAME = { width: 6, height: 6 * 1.414, rotation: 0 };

// ✅ إضافة نوع الصورة المستوردة
export interface PlanImage {
  url: string;
  x: number; // الإزاحة
  y: number;
  width: number; // العرض بالوحدات
  height: number; // الارتفاع بالوحدات
  opacity: number; // الشفافية (0.0 - 1.0)
  locked?: boolean; // قفل تحريك الصورة
}

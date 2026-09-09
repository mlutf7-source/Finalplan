import { useState, useEffect, useRef } from 'react';
import { useAppState } from './hooks/useAppState';
import { CanvasContainer } from './components/Canvas/CanvasContainer';
import { TopToolbar } from './components/Toolbar/TopToolbar';
import { QuantitiesPanel } from './components/Calculator/QuantitiesPanel';
import { exportToPDF } from './core/pdfExport';
import { App as CapApp } from '@capacitor/app';
import './App.css';
const handleError = (msg: string) => alert(msg);
export default function App() {
const state = useAppState();
const [isSidebarOpen, setIsSidebarOpen] = useState(false);
const canvasRef = useRef<HTMLDivElement>(null);
const fitViewToWalls = () => {
const extWalls = state.walls.filter(w => w.type === 'exterior');
if (!extWalls.length) { state.setView({ zoom: 0.55, offsetX: 0, offsetY: 0 }); return; }
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
extWalls.forEach(w => { minX = Math.min(minX, w.start.x, w.end.x); maxX = Math.max(maxX, w.start.x, w.end.x); minY = Math.min(minY, w.start.y, w.end.y); maxY = Math.max(maxY, w.start.y, w.end.y); });
const width = maxX - minX, height = maxY - minY;
if (width <= 0 || height <= 0) return;
const container = canvasRef.current;
if (!container) return;
const zoom = Math.min(container.clientWidth / (width * 100), container.clientHeight / (height * 100)) * 0.55;
state.setView({ zoom: Math.max(0.35, Math.min(zoom, 1)), offsetX: -(minX + maxX) / 2, offsetY: -(minY + maxY) / 2 });
};
useEffect(() => {
const handleBackButton = async () => {
if (isSidebarOpen) { setIsSidebarOpen(false); return; }
if (state.isDirty) { const shouldExit = confirm('لديك تغييرات غير محفوظة. هل تريد الخروج من التطبيق؟'); if (shouldExit) await CapApp.exitApp(); } else { await CapApp.exitApp(); }
};
CapApp.addListener('backButton', handleBackButton);
return () => { CapApp.removeAllListeners(); };
}, [isSidebarOpen, state.isDirty]);
const askName = (title: string, initial: string) => window.prompt(title, initial);
const save = () => { const name = askName('أدخل اسم المشروع:', state.currentProjectName || 'مسودة غير محفوظة'); if (name?.trim()) { state.handleSaveProject(name.trim()); alert('تم الحفظ!'); setIsSidebarOpen(false); } };
const load = (id: string) => { if (state.isDirty && !confirm('حفظ قبل التحميل؟')) return; if (state.isDirty) { const name = askName('أدخل اسم المشروع لحفظ التعديلات:', state.currentProjectName); if (name?.trim()) state.handleSaveProject(name.trim()); } state.handleLoadProject(id); state.setAllLayersLocked(true); setIsSidebarOpen(false); setTimeout(() => fitViewToWalls(), 150); };
const del = (id: string) => { if (confirm('حذف المشروع؟')) { state.handleDeleteProject(id); setIsSidebarOpen(false); } };
const newProject = () => { if (state.isDirty && !confirm('حفظ التعديلات قبل مشروع جديد؟')) return; if (state.isDirty) { const name = askName('أدخل اسم المشروع لحفظ التعديلات:', state.currentProjectName); if (name?.trim()) state.handleSaveProject(name.trim()); } state.handleNewProject(); setIsSidebarOpen(false); setTimeout(() => fitViewToWalls(), 150); };
const toggleClip = () => { state.setClipFrame(state.clipFrame ? null : { id: 'clip-main', x: state.walls[0] ? (state.walls[0].start.x + state.walls[0].end.x) / 2 : 5, y: state.walls[0] ? (state.walls[0].start.y + state.walls[0].end.y) / 2 : 5, width: 6, height: 6 * 1.414, rotation: 0 }); setIsSidebarOpen(false); };
const pdf = async () => { if (!state.clipFrame) return handleError('يرجى تفعيل الكليشة أولاً'); const stage = document.querySelector('[data-floor-plan-stage="true"]') as HTMLElement; if (!stage) return handleError('تعذر العثور على منطقة الرسم'); await exportToPDF(stage, state.clipFrame, state.view); setIsSidebarOpen(false); };

// ✅ دالة استيراد الصورة
const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
const file = e.target.files?.[0];
if (!file) return;
const reader = new FileReader();
reader.onloadend = () => {
state.setPlanImage({
url: reader.result as string,
x: 0,
y: 0,
width: 10,
height: 10,
opacity: 0.5,
});
};
reader.readAsDataURL(file);
};

const canvas = (
<CanvasContainer walls={state.walls} onWallsChange={state.handleWallsChange} mode={state.mode} drawingType={state.drawingType} onModeChange={state.setMode} onCancelTool={() => state.setMode('view')} dimensions={state.dimensions} onAddDimension={state.handleAddDimension} onDimensionsChange={state.handleDimensionsChange} dimensionFontSize={state.dimensionFontSize} layers={state.layers} columns={state.elements.columns} windows={state.elements.windows} doors={state.elements.doors} texts={state.textManager.texts} regions={state.regionsManager.regions} stairs={state.stairManager.stairs} northArrows={state.elements.northArrows} updateNorthArrow={state.handleUpdateNorthArrow} frozen={false} onAddStairAtPoint={state.handleAddStairAtPoint} onUpdateStair={state.handleUpdateStair} onDeleteStair={state.handleDeleteStair} onPlaceColumn={state.handlePlaceColumn} onPlaceWindow={state.handlePlaceWindow} onPlaceDoor={state.handlePlaceDoor} onPlaceRegion={state.handlePlaceRegion} onDeleteRegion={state.handleDeleteRegion} updateColumn={state.handleUpdateColumn} updateWindow={state.handleUpdateWindow} updateDoor={state.handleUpdateDoor} onDeleteColumn={state.handleDeleteColumn} onDeleteWindow={state.handleDeleteWindow} onDeleteDoor={state.handleDeleteDoor} onAddText={state.handleAddText} onUpdateText={state.handleUpdateText} onDeleteText={state.handleDeleteText} onCopyText={state.handleCopyText} clipFrame={state.clipFrame} setClipFrame={state.setClipFrame} planImage={state.planImage} />
);
const quantities = { showQuantities: state.showQuantities, onToggle: () => state.setShowQuantities(prev => !prev), activeTab: state.activeTab, onTabChange: state.setActiveTab, walls: state.walls, columns: state.elements.columns, windows: state.elements.windows, doors: state.elements.doors, regions: state.regionsManager.regions, results: state.results, canShowQuantities: !!state.projectManager.currentProjectId };
const topbar = (
<TopToolbar mode={state.mode} drawingType={state.drawingType} onStartDrawing={t => { state.setDrawingType(t); state.setMode('drawing'); }} onUndo={state.handleUndo} onRedo={state.handleRedo} historyLength={state.history.length} futureLength={state.future.length} onAddAllDimensions={state.handleAddAllDimensions} onModeChange={state.setMode} layers={state.layers} onToggleLayer={state.toggleLayer} onToggleAllLayers={state.toggleAllLayers} allUnlocked={state.allUnlocked} dimensionFontSize={state.dimensionFontSize} onDimensionFontSizeChange={state.setDimensionFontSize} onAddNorthArrow={state.handleAddNorthArrow} />
);
const sidebar = isSidebarOpen && (
<>
<div onClick={() => setIsSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000 }} />
<div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: 0, right: 0, width: '33vw', maxWidth: 400, height: '100%', background: '#fff', boxShadow: '-2px 0 10px rgba(0,0,0,0.1)', zIndex: 1001, display: 'flex', flexDirection: 'column', padding: 20, gap: 15 }}>
<h3 style={{ margin: 0, color: '#003366' }}>إدارة المشاريع</h3>
<button onClick={newProject} style={btnStyles.btn}>➕ مشروع جديد</button>
<button onClick={save} style={btnStyles.btnPrimary}>💾 حفظ المشروع</button>
<select onChange={e => e.target.value && load(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc' }}><option value="">📂 اختر مشروعاً</option>{state.projectManager.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
{state.projectManager.currentProjectId && <button onClick={() => del(state.projectManager.currentProjectId!)} style={btnStyles.btnDanger}>🗑️ حذف المشروع المحدد</button>}
<div style={{ borderTop: '1px solid #eee', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
<button onClick={toggleClip} style={{ padding: 10, borderRadius: 6, border: '1px solid #f00', background: state.clipFrame ? '#f00' : '#fff', color: state.clipFrame ? '#fff' : '#f00' }}>{state.clipFrame ? '🗑️ إزالة الكليشة' : '📐 إضافة الكليشة (A3)'}</button>
<button onClick={pdf} style={btnStyles.btn}>📄 PDF المسقط</button>
<label style={{ ...btnStyles.btn, textAlign: 'center', cursor: 'pointer' }}>🖼️ استيراد مخطط
<input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
</label>
</div>
<button onClick={() => setIsSidebarOpen(false)} style={{ marginTop: 'auto', ...btnStyles.btn }}>✖ إغلاق</button>
</div>
</>
);
return (
<div className="app" style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
<header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
<h1>🏗 المسقط المعماري التفاعلي</h1>
<button onClick={() => setIsSidebarOpen(true)} style={{ background: '#00509e', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 18 }}>☰</button>
</header>
{sidebar}
<div style={{ flexShrink: 0 }}>{topbar}</div>
<div ref={canvasRef} style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
<div style={{ flexShrink: 0 }}>{canvas}</div>
<QuantitiesPanel {...quantities} display="all" />
</div>
</div>
);
}
const btnStyles = {
btn: { padding: '10px', borderRadius: 6, border: '1px solid #ccc', background: '#f0f0f0', cursor: 'pointer', fontSize: 14 },
btnPrimary: { padding: '10px', borderRadius: 6, border: '1px solid #00509e', background: '#00509e', color: '#fff', cursor: 'pointer', fontSize: 14 },
btnDanger: { padding: '10px', borderRadius: 6, border: '1px solid #dc3545', background: '#dc3545', color: '#fff', cursor: 'pointer', fontSize: 14 },
};
```أعتذر بشدة عن الخطأ في الرد السابق، حيث قمت بدمج ميزات الـ PDF السابقة مع التعديل الجديد مما جعل الأمر معقداً. سأرسل لك الملفات **المعدلة بدقة** دون المساس بأي ميزة سابقة، مع دمج ميزة "استيراد صورة المخطط" التي طلبتها بشكل نظيف.

**ملاحظة هامة جداً قبل النسخ:**
بما أنك تعمل على تطبيق أندرويد، فإن إضافة الصورة تتطلب تمريرها عبر `CanvasContainer` ثم إلى طبقة الرسم `CanvasLayers`. الملفات التي أرسلتها لي لا تحتوي على هذه الطبقة في هذا الرد، لكنني قمت بتعديل الملفات التي أرسلتها أنت فقط، وأضفت الكود اللازم لاستقبال الصورة ورسمها.

### 1) الملف: `src/core/types.ts`
أضفت `PlanImage` في النهاية.

```typescript
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

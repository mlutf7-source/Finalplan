// App.tsx
import { useState, useEffect, useRef } from 'react';
import { useAppState } from './hooks/useAppState';
import { CanvasContainer } from './components/Canvas/CanvasContainer';
import { TopToolbar } from './components/Toolbar/TopToolbar';
import { QuantitiesPanel } from './components/Calculator/QuantitiesPanel';
import { exportToPDF } from './core/pdfExport';
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
const handler = (e: BeforeUnloadEvent) => { if (state.isDirty) { e.preventDefault(); e.returnValue = ''; } };
window.addEventListener('beforeunload', handler);
return () => { window.removeEventListener('beforeunload', handler); };
}, [state.isDirty]);
const askName = (title: string, initial: string) => window.prompt(title, initial);
const save = () => { const name = askName('أدخل اسم المشروع:', state.currentProjectName || 'مسودة غير محفوظة'); if (name?.trim()) { state.handleSaveProject(name.trim()); alert('تم الحفظ!'); setIsSidebarOpen(false); } };
const load = (id: string) => { if (state.isDirty && !confirm('حفظ قبل التحميل؟')) return; if (state.isDirty) { const name = askName('أدخل اسم المشروع لحفظ التعديلات:', state.currentProjectName); if (name?.trim()) state.handleSaveProject(name.trim()); } state.handleLoadProject(id); state.setAllLayersLocked(true); setIsSidebarOpen(false); setTimeout(() => fitViewToWalls(), 150); };
const del = (id: string) => { if (confirm('حذف المشروع؟')) { state.handleDeleteProject(id); setIsSidebarOpen(false); } };
const newProject = () => { if (state.isDirty && !confirm('حفظ التعديلات قبل مشروع جديد؟')) return; if (state.isDirty) { const name = askName('أدخل اسم المشروع لحفظ التعديلات:', state.currentProjectName); if (name?.trim()) state.handleSaveProject(name.trim()); } state.handleNewProject(); setIsSidebarOpen(false); setTimeout(() => fitViewToWalls(), 150); };
const toggleClip = () => { state.setClipFrame(state.clipFrame ? null : { id: 'clip-main', x: state.walls[0] ? (state.walls[0].start.x + state.walls[0].end.x) / 2 : 5, y: state.walls[0] ? (state.walls[0].start.y + state.walls[0].end.y) / 2 : 5, width: 6, height: 6 * 1.414, rotation: 0 }); setIsSidebarOpen(false); };
const pdf = async () => { if (!state.clipFrame) return handleError('يرجى تفعيل الكليشة أولاً'); const stage = document.querySelector('[data-floor-plan-stage="true"]') as HTMLElement; if (!stage) return handleError('تعذر العثور على منطقة الرسم'); await exportToPDF(stage, state.clipFrame, state.view); setIsSidebarOpen(false); };
const canvas = (
<CanvasContainer walls={state.walls} onWallsChange={state.handleWallsChange} mode={state.mode} drawingType={state.drawingType} onModeChange={state.setMode} onCancelTool={() => state.setMode('view')} dimensions={state.dimensions} onAddDimension={state.handleAddDimension} onDimensionsChange={state.handleDimensionsChange} dimensionFontSize={state.dimensionFontSize} layers={state.layers} columns={state.elements.columns} windows={state.elements.windows} doors={state.elements.doors} texts={state.textManager.texts} regions={state.regionsManager.regions} stairs={state.stairManager.stairs} northArrows={state.elements.northArrows} updateNorthArrow={state.handleUpdateNorthArrow} frozen={false} onAddStairAtPoint={state.handleAddStairAtPoint} onUpdateStair={state.handleUpdateStair} onDeleteStair={state.handleDeleteStair} onPlaceColumn={state.handlePlaceColumn} onPlaceWindow={state.handlePlaceWindow} onPlaceDoor={state.handlePlaceDoor} onPlaceRegion={state.handlePlaceRegion} onDeleteRegion={state.handleDeleteRegion} updateColumn={state.handleUpdateColumn} updateWindow={state.handleUpdateWindow} updateDoor={state.handleUpdateDoor} onDeleteColumn={state.handleDeleteColumn} onDeleteWindow={state.handleDeleteWindow} onDeleteDoor={state.handleDeleteDoor} onAddText={state.handleAddText} onUpdateText={state.handleUpdateText} onDeleteText={state.handleDeleteText} onCopyText={state.handleCopyText} clipFrame={state.clipFrame} setClipFrame={state.setClipFrame} />
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

import React, { useState } from 'react';
import { DrawToolbar } from './DrawToolbar';
import { LayersPanel } from './LayersPanel';
import type { LayersState } from './LayersPanel';
import type { AppMode, DrawingType, Axis } from '../../core/types';
import { AxisDialog } from '../Axis/AxisDialog';

interface Props {
  mode: AppMode;
  drawingType: DrawingType;
  onStartDrawing: (type: DrawingType) => void;
  onUndo: () => void;
  onRedo: () => void;
  historyLength: number;
  futureLength: number;
  onAddAllDimensions: () => void;
  onModeChange: (mode: AppMode) => void;
  layers: LayersState;
  onToggleLayer: (layer: keyof LayersState) => void;
  onToggleAllLayers: () => void;
  allUnlocked: boolean;
  dimensionFontSize: number;
  onDimensionFontSizeChange: (size: number) => void;
  onAddNorthArrow: () => void;
  onAddAxes: (axes: Axis[]) => void;
  onAddAxesFromWalls: () => void;
  onDeleteAllAxes: () => void;
  axes: Axis[];
  showGrid: boolean;
  onToggleGrid: () => void;
}

const btnBase: React.CSSProperties = {
  padding: '6px 4px',
  borderRadius: 6,
  border: '1px solid #ccc',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 11,
  whiteSpace: 'nowrap',
  textAlign: 'center',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  minWidth: 0,
};

export const TopToolbar: React.FC<Props> = ({
  mode, drawingType, onStartDrawing, onUndo, onRedo,
  historyLength, futureLength, onAddAllDimensions, onModeChange,
  layers, onToggleLayer, onToggleAllLayers, allUnlocked,
  dimensionFontSize, onDimensionFontSizeChange, onAddNorthArrow,
  onAddAxes, onAddAxesFromWalls, onDeleteAllAxes, axes,
  showGrid, onToggleGrid,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showAxisDialog, setShowAxisDialog] = useState(false);
  const toggleMenu = (menu: string) => setOpenMenu(prev => (prev === menu ? null : menu));
  const btnStyle = (active: boolean, extra?: React.CSSProperties): React.CSSProperties => ({
    ...btnBase,
    background: active ? '#06f' : '#fff',
    color: active ? '#fff' : '#000',
    ...extra,
  });

  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    zIndex: 99999,
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: 8,
    padding: 6,
    minWidth: 170,
    boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
  };

  const itemStyle: React.CSSProperties = {
    padding: '6px 8px',
    cursor: 'pointer',
    fontSize: 15,
    borderRadius: 4,
  };

  const safeParse = (val: string, fallback: number) => {
    if (val === '' || val === '.' || val === ',') return fallback;
    const num = parseFloat(val.replace(',', '.'));
    return isNaN(num) ? fallback : num;
  };

  return (
    <div
      style={{
        border: '1px solid rgba(192,192,192,0.6)',
        boxShadow: '0 2px 10px rgba(192,192,192,0.25)',
        borderRadius: 12,
        padding: 6,
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        width: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 500,
      }}
    >
      {/* الصف الأول */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'nowrap', width: '100%' }}>
        <div style={{ flex: '0 0 auto' }}>
          <DrawToolbar mode={mode} drawingType={drawingType} onStartDrawing={onStartDrawing} />
        </div>
        <div style={{ flex: '1 1 auto' }} />
        <button
          onClick={onUndo}
          disabled={historyLength === 0}
          style={{
            ...btnStyle(false, {
              opacity: historyLength === 0 ? 0.4 : 1,
              fontSize: 16,
              padding: '8px 12px',
              background: historyLength === 0 ? '#f0f0f0' : '#e6f0ff',
              border: '1px solid #b0c4de',
            }),
            flex: '0 0 auto',
            borderRadius: 8,
          }}
        >↩️</button>
        <button
          onClick={onRedo}
          disabled={futureLength === 0}
          style={{
            ...btnStyle(false, {
              opacity: futureLength === 0 ? 0.4 : 1,
              fontSize: 16,
              padding: '8px 12px',
              background: futureLength === 0 ? '#f0f0f0' : '#e6f0ff',
              border: '1px solid #b0c4de',
            }),
            flex: '0 0 auto',
            borderRadius: 8,
          }}
        >↪️</button>
      </div>

      {/* الصف الثاني */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', width: '100%' }}>
        <div style={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
          <button onClick={() => toggleMenu('elements')} style={{ ...btnStyle(false, { background: '#f0f8ff', border: '1px solid #c5d9ed' }), width: '100%' }}>➕ عناصر</button>
          {openMenu === 'elements' && (
            <div style={{ ...menuStyle, right: 0 }}>
              <div onClick={() => { onModeChange('column'); setOpenMenu(null); }} style={itemStyle}>📌 عمود</div>
              <div onClick={() => { onModeChange('window'); setOpenMenu(null); }} style={itemStyle}>🪟 نافذة</div>
              <div onClick={() => { onModeChange('door'); setOpenMenu(null); }} style={itemStyle}>🚪 باب</div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
          <button onClick={() => toggleMenu('details')} style={{ ...btnStyle(false, { background: '#f0f8ff', border: '1px solid #c5d9ed' }), width: '100%' }}>📋 تفاصيل</button>
          {openMenu === 'details' && (
            <div style={{ ...menuStyle, right: 0 }}>
              <div onClick={() => { onAddAllDimensions(); setOpenMenu(null); }} style={itemStyle}>📏 إضافة الأبعاد</div>
              <div onClick={() => { onModeChange('dimension'); setOpenMenu(null); }} style={itemStyle}>📐 بعد يدوي</div>
              <div onClick={() => { onModeChange('text'); setOpenMenu(null); }} style={itemStyle}>📝 نص</div>
              <div style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>حجم الخط:</span>
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  key={`font-size`}
                  defaultValue={String(dimensionFontSize)}
                  onFocus={e => e.target.select()}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  onBlur={e => {
                    const num = safeParse(e.target.value, 40);
                    onDimensionFontSizeChange(num);
                    e.target.value = String(num);
                  }}
                  style={{ width: 50, padding: '3px', borderRadius: 4, border: '1px solid #ccc', textAlign: 'left' }}
                />
              </div>
              <div onClick={() => { onAddNorthArrow(); setOpenMenu(null); }} style={itemStyle}>🧭 سهم الشمال</div>
              {/* ✅ زر إخفاء/إظهار الشبكة */}
              <div onClick={() => { onToggleGrid(); setOpenMenu(null); }} style={itemStyle}>
                {showGrid ? '🔲 إخفاء الشبكة' : '🔳 إظهار الشبكة'}
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
          <button onClick={() => toggleMenu('regions')} style={{ ...btnStyle(false, { background: '#fff8e1', border: '1px solid #f0dca0' }), width: '100%' }}>🎨 مناطق</button>
          {openMenu === 'regions' && (
            <div style={{ ...menuStyle, right: 0 }}>
              <div onClick={() => { onModeChange('kitchen'); setOpenMenu(null); }} style={itemStyle}>🍳 مطبخ</div>
              <div onClick={() => { onModeChange('bathroom'); setOpenMenu(null); }} style={itemStyle}>🛁 حمام</div>
              <div onClick={() => { onModeChange('stair'); setOpenMenu(null); }} style={itemStyle}>🪜 سلم</div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
          <button onClick={() => toggleMenu('axes')} style={{ ...btnStyle(false, { background: '#f0fff0', border: '1px solid #b8e0b8' }), width: '100%' }}>📐 المحاور</button>
          {openMenu === 'axes' && (
            <div style={{ ...menuStyle, right: 0 }}>
              <div onClick={() => { setShowAxisDialog(true); setOpenMenu(null); }} style={itemStyle}>📐 المحاور يدوي</div>
              <div onClick={() => { onAddAxesFromWalls(); setOpenMenu(null); }} style={itemStyle}>🔄 المحاور تلقائي</div>
              <div onClick={() => { onDeleteAllAxes(); setOpenMenu(null); }} style={itemStyle}>🗑️ حذف المحاور</div>
            </div>
          )}
        </div>

        <div style={{ flex: '1 1 0', minWidth: 0, position: 'relative' }}>
          <LayersPanel layers={layers} onToggleLayer={onToggleLayer} onToggleAll={onToggleAllLayers} allUnlocked={allUnlocked} />
        </div>
      </div>

      {showAxisDialog && (
        <AxisDialog
          onClose={() => setShowAxisDialog(false)}
          onCreateAxes={(a) => { onAddAxes(a); }}
          existingAxes={axes}
        />
      )}
    </div>
  );
};

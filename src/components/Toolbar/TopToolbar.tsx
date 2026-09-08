import React, { useState } from 'react';
import { DrawToolbar } from './DrawToolbar';
import { LayersPanel } from './LayersPanel';
import type { LayersState } from './LayersPanel';
import type { AppMode, DrawingType } from '../../core/types';

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
}

const btnBase: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid #ccc',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 12,
  whiteSpace: 'nowrap',
  textAlign: 'center',
};

export const TopToolbar: React.FC<Props> = ({
  mode, drawingType, onStartDrawing, onUndo, onRedo,
  historyLength, futureLength, onAddAllDimensions, onModeChange,
  layers, onToggleLayer, onToggleAllLayers, allUnlocked,
  dimensionFontSize, onDimensionFontSizeChange, onAddNorthArrow,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const toggleMenu = (menu: string) => setOpenMenu(prev => (prev === menu ? null : menu));
  const btnStyle = (active: boolean, extra?: React.CSSProperties): React.CSSProperties => ({
    ...btnBase,
    background: active ? '#06f' : '#fff',
    color: active ? '#fff' : '#000',
    ...extra,
  });

  const menuStyle: React.CSSProperties = {
    position: 'absolute', top: '100%', zIndex: 9999, background: '#fff', border: '1px solid #ccc',
    borderRadius: 8, padding: 6, minWidth: 150, boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
  };
  const itemStyle: React.CSSProperties = { padding: '4px', cursor: 'pointer', fontSize: 16 };

  return (
    <div style={{ border: '1px solid rgba(192,192,192,0.6)', boxShadow: '0 0 8px rgba(192,192,192,0.3)', borderRadius: 12, padding: 6, background: 'rgba(255,255,255,0.7)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'nowrap' }}>
        <div style={{ flexShrink: 0 }}>
          <DrawToolbar mode={mode} drawingType={drawingType} onStartDrawing={onStartDrawing} />
        </div>
        <button onClick={onUndo} disabled={historyLength === 0} style={{ ...btnStyle(false, { opacity: historyLength === 0 ? 0.5 : 1 }), flex: 1 }}>↩️ تراجع</button>
        <button onClick={onRedo} disabled={futureLength === 0} style={{ ...btnStyle(false, { opacity: futureLength === 0 ? 0.5 : 1 }), flex: 1 }}>↪️ تقدم</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* عناصر */}
        <div style={{ position: 'relative', flex: 1 }}>
          <button onClick={() => toggleMenu('elements')} style={{ ...btnStyle(false, { background: '#f0f8ff' }), width: '100%' }}>➕ عناصر ▾</button>
          {openMenu === 'elements' && (
            <div style={{ ...menuStyle, right: 0 }}>
              <div onClick={() => { onModeChange('column'); setOpenMenu(null); }} style={itemStyle}>📌 عمود</div>
              <div onClick={() => { onModeChange('window'); setOpenMenu(null); }} style={itemStyle}>🪟 نافذة</div>
              <div onClick={() => { onModeChange('door'); setOpenMenu(null); }} style={itemStyle}>🚪 باب</div>
            </div>
          )}
        </div>

        {/* تفاصيل */}
        <div style={{ position: 'relative', flex: 1 }}>
          <button onClick={() => toggleMenu('details')} style={{ ...btnStyle(false, { background: '#f0f8ff' }), width: '100%' }}>📋 تفاصيل ▾</button>
          {openMenu === 'details' && (
            <div style={{ ...menuStyle, left: 0 }}>
              <div onClick={() => { onAddAllDimensions(); setOpenMenu(null); }} style={itemStyle}>📏 إضافة الأبعاد</div>
              <div onClick={() => { onModeChange('dimension'); setOpenMenu(null); }} style={itemStyle}>📐 بعد يدوي</div>
              <div onClick={() => { onModeChange('text'); setOpenMenu(null); }} style={itemStyle}>📝 نص</div>
              <div style={{ padding: '4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 16 }}>حجم الخط:</span>
                <input
                  type="text" inputMode="decimal" dir="ltr" pattern="[0-9]*[.,]?[0-9]*" value={dimensionFontSize}
                  onFocus={e => e.target.select()}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  onChange={e => {
                    const val = e.target.value;
                    if (/^[0-9]*[.,]?[0-9]*$/.test(val)) {
                      onDimensionFontSizeChange(Number(val.replace(',', '.')));
                    }
                  }}
                  style={{ width: 40, padding: '2px', borderRadius: 4, border: '1px solid #ccc', textAlign: 'left' }}
                />
              </div>
              <div onClick={() => { onAddNorthArrow(); setOpenMenu(null); }} style={itemStyle}>🧭 سهم الشمال</div>
            </div>
          )}
        </div>

        {/* مناطق */}
        <div style={{ position: 'relative', flex: 1 }}>
          <button onClick={() => toggleMenu('regions')} style={{ ...btnStyle(false, { background: '#fff8e1' }), width: '100%' }}>🎨 مناطق ▾</button>
          {openMenu === 'regions' && (
            <div style={{ ...menuStyle, left: 0 }}>
              <div onClick={() => { onModeChange('kitchen'); setOpenMenu(null); }} style={itemStyle}>🍳 مطبخ</div>
              <div onClick={() => { onModeChange('bathroom'); setOpenMenu(null); }} style={itemStyle}>🛁 حمام</div>
              <div onClick={() => { onModeChange('stair'); setOpenMenu(null); }} style={itemStyle}>🪜 سلم</div>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <LayersPanel layers={layers} onToggleLayer={onToggleLayer} onToggleAll={onToggleAllLayers} allUnlocked={allUnlocked} />
        </div>
      </div>
    </div>
  );
};

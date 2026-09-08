import React from 'react';
import type { Column, Window, Door, Wall } from '../../core/types';

interface Props {
  selected: { id: string; type: 'column' | 'window' | 'door' } | null;
  columns: Column[];
  windows: Window[];
  doors: Door[];
  walls: Wall[];
  updateColumn: (id: string, patch: Partial<Column>) => void;
  updateWindow: (id: string, patch: Partial<Window>) => void;
  updateDoor: (id: string, patch: Partial<Door>) => void;
}

const inputStyle: React.CSSProperties = {
  width: '70px',
  padding: '6px 8px',
  borderRadius: 6,
  border: '1px solid #ccc',
  fontSize: 14,
  textAlign: 'center',
  direction: 'ltr',
};

const labelStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 13,
  color: '#003366',
};

const buttonStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 6,
  border: 'none',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 13,
};

export const ElementProperties: React.FC<Props> = ({ selected, columns, windows, doors, walls, updateColumn, updateWindow, updateDoor }) => {
  if (!selected) return null;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
  };
  
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>, update: (n: number) => void) => {
    const val = e.target.value;
    if (/^[0-9]*[.,]?[0-9]*$/.test(val)) {
      update(Number(val.replace(',', '.')));
    }
  };

  if (selected.type === 'column') {
    const col = columns.find(c => c.id === selected.id);
    if (!col) return null;
    return (
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px 12px', background: '#f8f8f8', borderRadius: 8, margin: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, color: '#003366' }}>📌</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={labelStyle}>العرض (م):</span>
          <input type="text" inputMode="decimal" dir="ltr" pattern="[0-9]*[.,]?[0-9]*" value={col.width} style={inputStyle} onFocus={handleFocus} onKeyDown={handleKeyDown} onChange={e => handleNumericChange(e, (n) => updateColumn(col.id, { width: n }))} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={labelStyle}>الطول (م):</span>
          <input type="text" inputMode="decimal" dir="ltr" pattern="[0-9]*[.,]?[0-9]*" value={col.length} style={inputStyle} onFocus={handleFocus} onKeyDown={handleKeyDown} onChange={e => handleNumericChange(e, (n) => updateColumn(col.id, { length: n }))} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={labelStyle}>الدوران (°):</span>
          <input type="text" inputMode="decimal" dir="ltr" pattern="[0-9]*[.,]?[0-9]*" value={((col.rotation || 0) * 180) / Math.PI} style={inputStyle} onFocus={handleFocus} onKeyDown={handleKeyDown} onChange={e => handleNumericChange(e, (n) => updateColumn(col.id, { rotation: (n * Math.PI) / 180 }))} />
        </div>
      </div>
    );
  }

  if (selected.type === 'window') {
    const win = windows.find(w => w.id === selected.id);
    if (!win) return null;
    return (
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px 12px', background: '#f8f8f8', borderRadius: 8, margin: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, color: '#003366' }}>🪟</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={labelStyle}>العرض (م):</span>
          <input type="text" inputMode="decimal" dir="ltr" pattern="[0-9]*[.,]?[0-9]*" value={win.width} style={inputStyle} onFocus={handleFocus} onKeyDown={handleKeyDown} onChange={e => handleNumericChange(e, (n) => updateWindow(win.id, { width: n }))} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={labelStyle}>الارتفاع (م):</span>
          <input type="text" inputMode="decimal" dir="ltr" pattern="[0-9]*[.,]?[0-9]*" value={win.height} style={inputStyle} onFocus={handleFocus} onKeyDown={handleKeyDown} onChange={e => handleNumericChange(e, (n) => updateWindow(win.id, { height: n }))} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={labelStyle}>السماكة (م):</span>
          <input type="text" inputMode="decimal" dir="ltr" pattern="[0-9]*[.,]?[0-9]*" value={win.thickness} style={inputStyle} onFocus={handleFocus} onKeyDown={handleKeyDown} onChange={e => handleNumericChange(e, (n) => updateWindow(win.id, { thickness: n }))} />
        </div>
      </div>
    );
  }

  if (selected.type === 'door') {
    const door = doors.find(d => d.id === selected.id);
    if (!door) return null;
    return (
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px 12px', background: '#f8f8f8', borderRadius: 8, margin: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, color: '#003366' }}>🚪</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={labelStyle}>العرض (م):</span>
          <input type="text" inputMode="decimal" dir="ltr" pattern="[0-9]*[.,]?[0-9]*" value={door.width} style={inputStyle} onFocus={handleFocus} onKeyDown={handleKeyDown} onChange={e => handleNumericChange(e, (n) => updateDoor(door.id, { width: n }))} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={labelStyle}>الارتفاع (م):</span>
          <input type="text" inputMode="decimal" dir="ltr" pattern="[0-9]*[.,]?[0-9]*" value={door.height} style={inputStyle} onFocus={handleFocus} onKeyDown={handleKeyDown} onChange={e => handleNumericChange(e, (n) => updateDoor(door.id, { height: n }))} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={labelStyle}>السماكة (م):</span>
          <input type="text" inputMode="decimal" dir="ltr" pattern="[0-9]*[.,]?[0-9]*" value={door.thickness} style={inputStyle} onFocus={handleFocus} onKeyDown={handleKeyDown} onChange={e => handleNumericChange(e, (n) => updateDoor(door.id, { thickness: n }))} />
        </div>
        <button onClick={() => updateDoor(door.id, { swing: door.swing === 1 ? -1 : 1 })} style={{ ...buttonStyle, background: '#06f' }}>
          🔄 انعكاس
        </button>
      </div>
    );
  }

  return null;
};

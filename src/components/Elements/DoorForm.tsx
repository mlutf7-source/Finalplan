import React, { useState } from 'react';
import type { Wall } from '../../core/types';

interface Props {
  walls: Wall[];
    onAdd: (data: { wallId: string; position: number; width: number; height: number }) => void;
}

const inputStyle: React.CSSProperties = {
  width: '65px', padding: '6px', borderRadius: 4, border: '1px solid #ccc', fontSize: 13, textAlign: 'left', direction: 'ltr'
};

export const DoorForm: React.FC<Props> = ({ walls, onAdd }) => {
  const [wallId, setWallId] = useState(walls[0]?.id ?? '');
  const [pos, setPos] = useState(0);
  const [w, setW] = useState(1);
  const [h, setH] = useState(2.2);

  const handleInput = (setter: (n: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^[0-9]*[.,]?[0-9]*$/.test(val)) {
      setter(Number(val.replace(',', '.')));
    }
  };

  return (
    <div style={{ padding: 10, background: '#fafafa', borderRadius: 8, margin: 4 }}>
      <strong>🚪 باب جديد</strong>
      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={wallId} onChange={e => setWallId(e.target.value)} style={{ padding: 6, borderRadius: 4 }}>
          {walls.map(w => <option key={w.id} value={w.id}>جدار {w.type === 'exterior' ? 'خارجي' : 'داخلي'}</option>)}
        </select>
        <span>موقع:</span><input type="text" inputMode="decimal" dir="ltr" pattern="[0-9]*[.,]?[0-9]*" value={String(pos)} onChange={handleInput(setPos)} style={inputStyle} />
        <span>عرض:</span><input type="text" inputMode="decimal" dir="ltr" pattern="[0-9]*[.,]?[0-9]*" value={String(w)} onChange={handleInput(setW)} style={inputStyle} />
        <span>ارتفاع:</span><input type="text" inputMode="decimal" dir="ltr" pattern="[0-9]*[.,]?[0-9]*" value={String(h)} onChange={handleInput(setH)} style={inputStyle} />
        <button
          onClick={() => onAdd({ wallId, position: pos, width: w, height: h })}
          style={{ padding: '6px 12px', background: '#06f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          إضافة
        </button>
      </div>
    </div>
  );
};

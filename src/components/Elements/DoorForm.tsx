import React, { useState } from 'react';
import type { Wall, Door } from '../../core/types';

interface Props {
  walls: Wall[];
  onAdd: (data: Omit<Door, 'id'>) => void;
}

const inputStyle: React.CSSProperties = {
  width: '65px',
  padding: '6px',
  borderRadius: 4,
  border: '1px solid #ccc',
  fontSize: 13,
  direction: 'ltr',
  textAlign: 'left',
};

export const DoorForm: React.FC<Props> = ({ walls, onAdd }) => {
  const [wallId, setWallId] = useState(walls[0]?.id ?? '');
  const [pos, setPos] = useState(0);
  const [w, setW] = useState(1);
  const [h, setH] = useState(2.2);

  const parseNumber = (value: string): number => {
    const normalized = value
      .replace(/٠/g, '0')
      .replace(/١/g, '1')
      .replace(/٢/g, '2')
      .replace(/٣/g, '3')
      .replace(/٤/g, '4')
      .replace(/٥/g, '5')
      .replace(/٦/g, '6')
      .replace(/٧/g, '7')
      .replace(/٨/g, '8')
      .replace(/٩/g, '9')
      .replace(/٫/g, '.');

    const number = Number(normalized);
    return Number.isFinite(number) ? number : 0;
  };

  return (
    <div
      style={{
        padding: 10,
        background: '#fafafa',
        borderRadius: 8,
        margin: 4,
      }}
    >
      <strong>🚪 باب جديد</strong>

      <div
        style={{
          display: 'flex',
          gap: 6,
          marginTop: 6,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <select
          value={wallId}
          onChange={(e) => setWallId(e.target.value)}
          style={{
            padding: 6,
            borderRadius: 4,
          }}
        >
          {walls.map((wall) => (
            <option key={wall.id} value={wall.id}>
              جدار {wall.type === 'exterior' ? 'خارجي' : 'داخلي'}
            </option>
          ))}
        </select>

        <span>موقع:</span>
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          lang="en"
          value={pos}
          onChange={(e) => setPos(parseNumber(e.target.value))}
          style={inputStyle}
        />

        <span>عرض:</span>
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          lang="en"
          value={w}
          onChange={(e) => setW(parseNumber(e.target.value))}
          style={inputStyle}
        />

        <span>ارتفاع:</span>
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          lang="en"
          value={h}
          onChange={(e) => setH(parseNumber(e.target.value))}
          style={inputStyle}
        />

        <button
          onClick={() =>
            onAdd({
              wallId,
              position: pos,
              width: w,
              height: h,
              thickness: 0.05,
              hinge: 'start',
              swing: 1,
              side: 1,
            })
          }
          style={{
            padding: '6px 12px',
            background: '#06f',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          إضافة
        </button>
      </div>
    </div>
  );
};

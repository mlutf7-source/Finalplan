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

  // نخزن القيمة كنص حتى يستطيع المستخدم كتابة الكسور مثل 5.5 بحرية
  const [pos, setPos] = useState('0');
  const [w, setW] = useState('1');
  const [h, setH] = useState('2.2');

  // تحويل الأرقام العربية إلى إنجليزية مع السماح بالنقطة والكسور
  const normalizeNumber = (value: string): string => {
    return value
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
      .replace(/۰/g, '0')
      .replace(/۱/g, '1')
      .replace(/۲/g, '2')
      .replace(/۳/g, '3')
      .replace(/۴/g, '4')
      .replace(/۵/g, '5')
      .replace(/۶/g, '6')
      .replace(/۷/g, '7')
      .replace(/۸/g, '8')
      .replace(/۹/g, '9')
      .replace(/٫/g, '.')
      .replace(/,/g, '.');
  };

  const handleAdd = () => {
    const position = Number(pos);
    const width = Number(w);
    const height = Number(h);

    if (
      !Number.isFinite(position) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height)
    ) {
      return;
    }

    onAdd({
      wallId,
      position,
      width,
      height,
      thickness: 0.05,
      hinge: 'start',
      swing: 1,
      side: 1,
    });
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
          type="text"
          inputMode="decimal"
          lang="en"
          dir="ltr"
          value={pos}
          onChange={(e) => setPos(normalizeNumber(e.target.value))}
          style={inputStyle}
        />

        <span>عرض:</span>
        <input
          type="text"
          inputMode="decimal"
          lang="en"
          dir="ltr"
          value={w}
          onChange={(e) => setW(normalizeNumber(e.target.value))}
          style={inputStyle}
        />

        <span>ارتفاع:</span>
        <input
          type="text"
          inputMode="decimal"
          lang="en"
          dir="ltr"
          value={h}
          onChange={(e) => setH(normalizeNumber(e.target.value))}
          style={inputStyle}
        />

        <button
          onClick={handleAdd}
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

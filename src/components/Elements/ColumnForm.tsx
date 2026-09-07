import React, { useState } from 'react';
import type { Point } from '../../core/types';

interface Props {
  onAdd: (data: { position: Point; width: number; length: number }) => void;
  }

  const inputStyle: React.CSSProperties = {
    width: '70px', padding: '6px', borderRadius: 4, border: '1px solid #ccc', fontSize: 13,
    };

    export const ColumnForm: React.FC<Props> = ({ onAdd }) => {
      const [x, setX] = useState(0);
        const [y, setY] = useState(0);
          const [w, setW] = useState(0.4);
            const [l, setL] = useState(0.4);

              return (
                  <div style={{ padding: 10, background: '#fafafa', borderRadius: 8, margin: 4 }}>
                        <strong>🏛 عمود جديد</strong>
                              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                      <span>X:</span><input type="number" value={x} onChange={e => setX(+e.target.value)} style={inputStyle} />
                                              <span>Y:</span><input type="number" value={y} onChange={e => setY(+e.target.value)} style={inputStyle} />
                                                      <span>عرض:</span><input type="number" value={w} onChange={e => setW(+e.target.value)} style={inputStyle} />
                                                              <span>طول:</span><input type="number" value={l} onChange={e => setL(+e.target.value)} style={inputStyle} />
                                                                      <button
                                                                                onClick={() => onAdd({ position: { x, y }, width: w, length: l })}
                                                                                          style={{ padding: '6px 12px', background: '#06f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                                                                                                  >
                                                                                                            إضافة
                                                                                                                    </button>
                                                                                                                          </div>
                                                                                                                              </div>
                                                                                                                                );
                                                                                                                                };
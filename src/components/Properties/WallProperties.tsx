import React, { useState, useEffect } from 'react';
import type { Wall } from '../../core/types';
import { distance } from '../../core/geometry';

interface Props {
  wall: Wall | null;
    onChangeLength: (len: number) => void;
      onChangeThickness: (t: number) => void;
      }

      const inputStyle: React.CSSProperties = {
        width: '100%',
          padding: '6px 8px',
            borderRadius: 6,
              border: '1px solid #ccc',
                fontSize: 14,
                  textAlign: 'center',
                  };

                  const labelStyle: React.CSSProperties = {
                    fontWeight: 700,
                      fontSize: 13,
                        color: '#003366',
                        };

                        export const WallProperties: React.FC<Props> = ({ wall, onChangeLength, onChangeThickness }) => {
                          const [lengthStr, setLengthStr] = useState('');
                            const [thicknessStr, setThicknessStr] = useState('');

                              useEffect(() => {
                                  if (wall) {
                                        setLengthStr(distance(wall.start, wall.end).toFixed(2));
                                              setThicknessStr(String(wall.thickness));
                                                  }
                                                    }, [wall]);

                                                      if (!wall) return null;

                                                        const commitLength = () => {
                                                            const v = parseFloat(lengthStr);
                                                                if (v > 0) onChangeLength(v);
                                                                    else setLengthStr(distance(wall.start, wall.end).toFixed(2));
                                                                      };

                                                                        const commitThickness = () => {
                                                                            const v = parseFloat(thicknessStr);
                                                                                if (v > 0 && v <= 1) onChangeThickness(v);
                                                                                    else setThicknessStr(String(wall.thickness));
                                                                                      };

                                                                                        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, commit: () => void) => {
                                                                                            if (e.key === 'Enter') {
                                                                                                  commit();
                                                                                                        (e.target as HTMLInputElement).blur();
                                                                                                            }
                                                                                                              };

                                                                                                                return (
                                                                                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px 12px', background: '#f8f8f8', borderRadius: 8, margin: 8 }}>
                                                                                                                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                                                                                                                                  <span style={labelStyle}>الطول (م):</span>
                                                                                                                                          <input
                                                                                                                                                    type="number"
                                                                                                                                                              step="0.01"
                                                                                                                                                                        min="0.1"
                                                                                                                                                                                  value={lengthStr}
                                                                                                                                                                                            style={inputStyle}
                                                                                                                                                                                                      onFocus={(e) => e.target.select()}
                                                                                                                                                                                                                onChange={e => setLengthStr(e.target.value)}
                                                                                                                                                                                                                          onBlur={commitLength}
                                                                                                                                                                                                                                    onKeyDown={e => handleKeyDown(e, commitLength)}
                                                                                                                                                                                                                                            />
                                                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                                                                                                                                                                                                                                                                <span style={labelStyle}>السماكة (م):</span>
                                                                                                                                                                                                                                                                        <input
                                                                                                                                                                                                                                                                                  type="number"
                                                                                                                                                                                                                                                                                            step="0.01"
                                                                                                                                                                                                                                                                                                      min="0.05"
                                                                                                                                                                                                                                                                                                                max="1"
                                                                                                                                                                                                                                                                                                                          value={thicknessStr}
                                                                                                                                                                                                                                                                                                                                    style={inputStyle}
                                                                                                                                                                                                                                                                                                                                              onFocus={(e) => e.target.select()}
                                                                                                                                                                                                                                                                                                                                                        onChange={e => setThicknessStr(e.target.value)}
                                                                                                                                                                                                                                                                                                                                                                  onBlur={commitThickness}
                                                                                                                                                                                                                                                                                                                                                                            onKeyDown={e => handleKeyDown(e, commitThickness)}
                                                                                                                                                                                                                                                                                                                                                                                    />
                                                                                                                                                                                                                                                                                                                                                                                          </div>
                                                                                                                                                                                                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                                                                                                                                                                                                );
                                                                                                                                                                                                                                                                                                                                                                                                };
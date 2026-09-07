import React from 'react';

interface Props {
  height: number;
    onChange: (h: number) => void;
    }

    export const HeightInput: React.FC<Props> = ({ height, onChange }) => (
      <div style={{ padding: 12, background: '#f0f4ff', borderRadius: 8, margin: 8 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>🏢 ارتفاع المبنى (متر)</label>
              <input
                    type="number"
                          step="0.1"
                                min="1"
                                      max="100"
                                            value={height}
                                                  onFocus={(e) => e.target.select()}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                                              onChange={e => onChange(parseFloat(e.target.value) || 3)}
                                                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 15 }}
                                                                        />
                                                                          </div>
                                                                          );
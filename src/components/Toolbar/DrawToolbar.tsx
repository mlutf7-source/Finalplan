import React from 'react';
import type { AppMode, DrawingType } from '../../core/types';

interface Props {
  mode: AppMode;
    drawingType: DrawingType;
      onStartDrawing: (type: DrawingType) => void;
      }

      const btnStyle: React.CSSProperties = {
        padding: '10px 16px',
          margin: '4px',
            border: '2px solid #ccc',
              borderRadius: '8px',
                background: '#fff',
                  fontSize: '14px',
                    cursor: 'pointer',
                      fontWeight: 'bold',
                      };

                      const activeStyle: React.CSSProperties = {
                        ...btnStyle,
                          borderColor: '#06f',
                            background: '#e6f0ff',
                            };

                            export const DrawToolbar: React.FC<Props> = ({ mode, drawingType, onStartDrawing }) => {
                              return (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                        <button
                                                style={drawingType === 'exterior' && mode === 'drawing' ? activeStyle : btnStyle}
                                                        onClick={() => onStartDrawing('exterior')}
                                                              >
                                                                      🧱 رسم خارجي
                                                                            </button>
                                                                                  <button
                                                                                          style={drawingType === 'interior' && mode === 'drawing' ? activeStyle : btnStyle}
                                                                                                  onClick={() => onStartDrawing('interior')}
                                                                                                        >
                                                                                                                🏠 رسم داخلي
                                                                                                                      </button>
                                                                                                                          </div>
                                                                                                                            );
                                                                                                                            };
import React from 'react';

interface Props {
  onZoomIn: () => void;
    onZoomOut: () => void;
      onReset: () => void;
      }

      export const CanvasZoomControls: React.FC<Props> = React.memo(({ onZoomIn, onZoomOut, onReset }) => {
        return (
            <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 6, zIndex: 10 }}>
                  <button onClick={onZoomIn} style={{ padding: '8px 14px', fontSize: 18, borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>+</button>
                        <button onClick={onZoomOut} style={{ padding: '8px 14px', fontSize: 18, borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>−</button>
                              <button onClick={onReset} style={{ padding: '8px 14px', fontSize: 18, borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>⟲</button>
                                  </div>
                                    );
                                    });
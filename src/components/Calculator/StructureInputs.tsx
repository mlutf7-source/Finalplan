import React from 'react';

interface Props {
  designFloors: number;
    buildFloors: number;
      onDesignFloorsChange: (value: number) => void;
        onBuildFloorsChange: (value: number) => void;
          onCalculate: () => void;
          }

          const cardStyle: React.CSSProperties = {
            background: '#fff',
              border: '1px solid #ddd',
                borderRadius: 12,
                  overflow: 'hidden',
                    marginBottom: 12,
                    };

                    const headStyle: React.CSSProperties = {
                      background: '#f8fafc',
                        padding: '10px 12px',
                          fontWeight: 700,
                            color: '#003366',
                              fontSize: 14,
                                borderBottom: '1px solid #ddd',
                                };

                                const bodyStyle: React.CSSProperties = {
                                  padding: 10,
                                  };

                                  const inputStyle: React.CSSProperties = {
                                    width: '100%',
                                      padding: '8px',
                                        borderRadius: 8,
                                          border: '1px solid #ccc',
                                            fontSize: 14,
                                              textAlign: 'center',
                                              };

                                              const labelStyle: React.CSSProperties = {
                                                fontSize: 13,
                                                  fontWeight: 700,
                                                    color: '#003366',
                                                      marginBottom: 4,
                                                        display: 'block',
                                                        };

                                                        const btnStyle: React.CSSProperties = {
                                                          padding: '10px 16px',
                                                            background: '#00509e',
                                                              color: '#fff',
                                                                border: 'none',
                                                                  borderRadius: 10,
                                                                    fontWeight: 700,
                                                                      cursor: 'pointer',
                                                                        fontSize: 14,
                                                                        };

                                                                        const fieldStyle: React.CSSProperties = {
                                                                          flex: 1,
                                                                            minWidth: 120,
                                                                            };

                                                                            export const StructureInputs: React.FC<Props> = ({
                                                                              designFloors,
                                                                                buildFloors,
                                                                                  onDesignFloorsChange,
                                                                                    onBuildFloorsChange,
                                                                                      onCalculate,
                                                                                      }) => {
                                                                                        return (
                                                                                            <div style={cardStyle}>
                                                                                                  <div style={headStyle}>مدخلات الهيكل</div>
                                                                                                        <div style={bodyStyle}>
                                                                                                                {/* ✅ حقلين في صف واحد */}
                                                                                                                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                                                                                                                                  <div style={fieldStyle}>
                                                                                                                                              <label style={labelStyle}>🏗️ عدد أدوار تصميم الأساسات</label>
                                                                                                                                                          <input
                                                                                                                                                                        type="number"
                                                                                                                                                                                      step="1"
                                                                                                                                                                                                    min="1"
                                                                                                                                                                                                                  max="20"
                                                                                                                                                                                                                                value={designFloors}
                                                                                                                                                                                                                                              onChange={e => onDesignFloorsChange(Number(e.target.value))}
                                                                                                                                                                                                                                                            style={inputStyle}
                                                                                                                                                                                                                                                                          onFocus={(e) => e.target.select()}
                                                                                                                                                                                                                                                                                      />
                                                                                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                                                                                          <div style={fieldStyle}>
                                                                                                                                                                                                                                                                                                                      <label style={labelStyle}>🏢 عدد الأدوار المراد بناؤها</label>
                                                                                                                                                                                                                                                                                                                                  <input
                                                                                                                                                                                                                                                                                                                                                type="number"
                                                                                                                                                                                                                                                                                                                                                              step="1"
                                                                                                                                                                                                                                                                                                                                                                            min="1"
                                                                                                                                                                                                                                                                                                                                                                                          max="20"
                                                                                                                                                                                                                                                                                                                                                                                                        value={buildFloors}
                                                                                                                                                                                                                                                                                                                                                                                                                      onChange={e => onBuildFloorsChange(Number(e.target.value))}
                                                                                                                                                                                                                                                                                                                                                                                                                                    style={inputStyle}
                                                                                                                                                                                                                                                                                                                                                                                                                                                  onFocus={(e) => e.target.select()}
                                                                                                                                                                                                                                                                                                                                                                                                                                                              />
                                                                                                                                                                                                                                                                                                                                                                                                                                                                        </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        <button onClick={onCalculate} style={btnStyle}>احسب كميات الهيكل</button>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  </div>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    );
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    };
import React from 'react';

interface Props {
  excavationDepth: number;
  backfillDepth: number;
  plinthHeight: number;
  onExcavationDepthChange: (value: number) => void;
  onBackfillDepthChange: (value: number) => void;
  onPlinthHeightChange: (value: number) => void;
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
  direction: 'ltr',
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

export const PreliminaryInputs: React.FC<Props> = ({
  excavationDepth,
  backfillDepth,
  plinthHeight,
  onExcavationDepthChange,
  onBackfillDepthChange,
  onPlinthHeightChange,
  onCalculate,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (n: number) => void) => {
    const val = e.target.value;
    if (/^[0-9]*[.,]?[0-9]*$/.test(val)) {
      setter(Number(val.replace(',', '.')));
    }
  };

  return (
    <div style={cardStyle}>
      <div style={headStyle}>مدخلات التمهيدية</div>
      <div style={bodyStyle}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>⛏️ عمق الحفر (متر)</label>
            <input
              type="text"
              inputMode="decimal"
              dir="ltr"
              pattern="[0-9]*[.,]?[0-9]*"
              value={excavationDepth}
              onChange={e => handleChange(e, onExcavationDepthChange)}
              style={inputStyle}
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>🪨 عمق الدفان (متر)</label>
            <input
              type="text"
              inputMode="decimal"
              dir="ltr"
              pattern="[0-9]*[.,]?[0-9]*"
              value={backfillDepth}
              onChange={e => handleChange(e, onBackfillDepthChange)}
              style={inputStyle}
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>🧱 ارتفاع الكرسي (متر)</label>
            <input
              type="text"
              inputMode="decimal"
              dir="ltr"
              pattern="[0-9]*[.,]?[0-9]*"
              value={plinthHeight}
              onChange={e => handleChange(e, onPlinthHeightChange)}
              style={inputStyle}
              onFocus={(e) => e.target.select()}
            />
          </div>
        </div>
        <button onClick={onCalculate} style={btnStyle}>احسب الكميات التمهيدية</button>
      </div>
    </div>
  );
};

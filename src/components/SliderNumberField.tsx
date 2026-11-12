import React from 'react';

interface SliderNumberFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: 'INR' | '%';
  onChange: (next: number) => void;
}

export const SliderNumberField: React.FC<SliderNumberFieldProps> = ({
  id,
  label,
  value,
  min,
  max,
  step,
  unit = 'INR',
  onChange,
}) => {
  const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = Number(e.target.value);
    if (Number.isFinite(parsed)) {
      onChange(Math.max(0, parsed));
    }
  };

  return (
    <div className="field-row">
      <div className="field-header">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        <div className="number-input-wrap">
          {unit === 'INR' && <span className="unit-prefix">₹</span>}
          <input
            id={id}
            type="number"
            min={0}
            step={step}
            value={value}
            onChange={handleNumber}
            className="number-input"
            aria-label={label}
          />
          {unit === '%' && <span className="unit-suffix">%</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range-slider"
        aria-label={`${label} slider`}
      />
    </div>
  );
};

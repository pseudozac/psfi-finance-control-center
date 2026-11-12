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

  const clampedVal = Math.min(max, Math.max(min, value));
  const fillPct = max > min ? Math.max(0, Math.min(100, ((clampedVal - min) / (max - min)) * 100)) : 0;

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
            className="number-input font-mono"
            aria-label={label}
          />
          {unit === '%' && <span className="unit-suffix">%</span>}
        </div>
      </div>
      <div className="slider-track-wrap">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={clampedVal}
          onChange={(e) => onChange(Number(e.target.value))}
          className="range-slider"
          style={{ '--fill-pct': `${fillPct}%` } as React.CSSProperties}
          aria-label={`${label} slider`}
        />
      </div>
    </div>
  );
};

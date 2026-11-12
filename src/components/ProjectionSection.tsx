import React, { useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { FinancePlan, MonthlyProjectionPoint } from '../types/finance';
import { formatINR } from '../lib/finance';
import { SliderNumberField } from './SliderNumberField';

interface ProjectionSectionProps {
  plan: FinancePlan;
  baseline: FinancePlan | null;
  projections: MonthlyProjectionPoint[];
  horizonMonths: number;
  onHorizonChange: (months: number) => void;
  onChange: (next: FinancePlan) => void;
}

export const ProjectionSection: React.FC<ProjectionSectionProps> = ({
  plan,
  baseline,
  projections,
  horizonMonths,
  onHorizonChange,
  onChange,
}) => {
  const [showInflationAdjusted, setShowInflationAdjusted] = useState(true);

  const updateSavings = (key: keyof FinancePlan['savings'], val: number) => {
    onChange({
      ...plan,
      savings: { ...plan.savings, [key]: val },
    });
  };

  const finalPoint = projections[projections.length - 1];
  const horizonOptions = [
    { label: '1 Year', months: 12 },
    { label: '2 Years', months: 24 },
    { label: '3 Years', months: 36 },
    { label: '5 Years', months: 60 },
  ];

  return (
    <section className="card projection-card">
      <div className="section-head mb-3">
        <div>
          <div className="flex-align gap-2 mb-1">
            <div className="icon-badge icon-badge-sky">
              <TrendingUp size={18} />
            </div>
            <h2 className="title-sm m-0">Wealth &amp; Step-Up SIP Compounding</h2>
          </div>
          {finalPoint && (
            <p className="muted text-xs">
              Projected Corpus at Month {finalPoint.month}:{' '}
              <strong className="text-emerald font-mono font-bold">{formatINR(finalPoint.nominalCorpus)}</strong>{' '}
              nominal
              {showInflationAdjusted && (
                <>
                  {' '}· Real purchasing power:{' '}
                  <strong className="text-sky font-mono font-bold">{formatINR(finalPoint.realCorpus)}</strong>
                </>
              )}
              {baseline && finalPoint.baselineCorpus !== undefined && (
                <>
                  {' '}· Baseline comparison:{' '}
                  <strong className="text-amber font-mono font-bold">{formatINR(finalPoint.baselineCorpus)}</strong>
                </>
              )}
            </p>
          )}
        </div>

        <div className="controls-inline flex-align gap-3">
          <label className="checkbox-toggle" title="Discount future corpus by assumed annual inflation">
            <input
              type="checkbox"
              checked={showInflationAdjusted}
              onChange={(e) => setShowInflationAdjusted(e.target.checked)}
            />
            <span className="toggle-slider" />
            <span className="toggle-label text-xs">Inflation-Adjusted</span>
          </label>

          <div className="segmented segmented-sm" role="group" aria-label="Projection horizon">
            {horizonOptions.map((opt) => (
              <button
                key={opt.months}
                type="button"
                className={horizonMonths === opt.months ? 'seg-active' : ''}
                onClick={() => onHorizonChange(opt.months)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="two-col-grid">
        {/* Sliders */}
        <div className="projection-inputs">
          <div className="sub-group mt-0">
            <h3 className="section-subtitle text-sky">
              <span>●</span> Compounding Engines
            </h3>
            <SliderNumberField id="sav-ef" label="Emergency Cash Reserve" value={plan.savings.emergencyFundBalance} min={0} max={2_000_000} step={10_000} onChange={(v) => updateSavings('emergencyFundBalance', v)} />
            <SliderNumberField id="sav-cash" label="Monthly Liquid Bank Savings" value={plan.savings.monthlySavings} min={0} max={150_000} step={1_000} onChange={(v) => updateSavings('monthlySavings', v)} />
            <SliderNumberField id="sav-sip" label="Monthly Mutual Fund SIP" value={plan.savings.monthlySip} min={0} max={250_000} step={1_000} onChange={(v) => updateSavings('monthlySip', v)} />
            <SliderNumberField id="sav-stepup" label="Annual SIP Step-Up" value={plan.savings.stepUpSipPercent} min={0} max={30} step={1} unit="%" onChange={(v) => updateSavings('stepUpSipPercent', v)} />
            <SliderNumberField id="sav-ret" label="Expected Portfolio CAGR" value={plan.savings.expectedReturnPercent} min={0} max={24} step={0.5} unit="%" onChange={(v) => updateSavings('expectedReturnPercent', v)} />
            <SliderNumberField id="sav-inf" label="Assumed Inflation Rate" value={plan.savings.inflationPercent} min={0} max={12} step={0.5} unit="%" onChange={(v) => updateSavings('inflationPercent', v)} />
          </div>
        </div>

        {/* Glowing Modern Recharts Area Chart */}
        <div className="chart-box projection-chart-box">
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={projections} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="nominalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
              <YAxis
                tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                tick={{ fontSize: 11, fill: 'var(--muted)' }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="custom-tooltip font-mono">
                        <div className="tooltip-title text-sm">{label} Forecast</div>
                        {payload.map((entry, idx) => (
                          <div key={idx} className="tooltip-row flex-align gap-2">
                            <span className="legend-dot" style={{ backgroundColor: entry.color }} />
                            <span className="tooltip-name muted">{entry.name}:</span>
                            <span className="tooltip-val font-bold">{formatINR(Number(entry.value))}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
                formatter={(value) => <span className="legend-label">{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="nominalCorpus"
                name="Nominal Corpus"
                stroke="#10B981"
                strokeWidth={2.5}
                fill="url(#nominalGrad)"
              />
              {showInflationAdjusted && (
                <Area
                  type="monotone"
                  dataKey="realCorpus"
                  name="Real (Inflation-Adj.)"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  fill="url(#realGrad)"
                />
              )}
              {baseline && (
                <Area
                  type="monotone"
                  dataKey="baselineCorpus"
                  name="Pinned Baseline"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="none"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};

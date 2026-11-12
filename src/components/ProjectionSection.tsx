import React, { useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

  const totalContributed = finalPoint?.totalContributed ?? 1;
  const wealthMultiplier = finalPoint ? (finalPoint.nominalCorpus / Math.max(1, totalContributed)).toFixed(2) : '1.0';

  return (
    <section className="hipuku-card projection-card" aria-label="Wealth Projection">
      <div className="section-head mb-3">
        <div>
          <div className="flex-align gap-2 mb-1">
            <span className="dot dot-pulsar" />
            <h2 className="card-title m-0">Wealth &amp; Step-Up SIP Compounding</h2>
          </div>
          <p className="muted text-xs">Simulate equity mutual fund portfolio growth with annual SIP step-up</p>
        </div>

        <div className="controls-inline flex-align gap-3">
          <label className="hipuku-checkbox">
            <input
              type="checkbox"
              checked={showInflationAdjusted}
              onChange={(e) => setShowInflationAdjusted(e.target.checked)}
            />
            <span className="checkbox-box" />
            <span className="text-xs font-medium">Inflation-Adjusted</span>
          </label>

          <div className="pill-segmented segmented-sm" role="group" aria-label="Projection horizon">
            {horizonOptions.map((opt) => (
              <button
                key={opt.months}
                type="button"
                className={horizonMonths === opt.months ? 'pill-active' : ''}
                onClick={() => onHorizonChange(opt.months)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hipuku Telemetry Capsule Row */}
      {finalPoint && (
        <div className="telemetry-capsule-row mb-4">
          <div className="telemetry-pill">
            <span className="telemetry-label font-mono">Nominal Corpus @ M{finalPoint.month}</span>
            <span className="telemetry-val font-mono text-nebula">{formatINR(finalPoint.nominalCorpus)}</span>
            <span className="telemetry-sub muted text-xs">Future Value</span>
          </div>

          <div className="telemetry-pill">
            <span className="telemetry-label font-mono">Real Purchasing Power</span>
            <span className="telemetry-val font-mono text-pulsar">{formatINR(finalPoint.realCorpus)}</span>
            <span className="telemetry-sub muted text-xs">At {plan.savings.inflationPercent}% Inflation</span>
          </div>

          <div className="telemetry-pill">
            <span className="telemetry-label font-mono">Principal Invested</span>
            <span className="telemetry-val font-mono text-primary">{formatINR(finalPoint.totalContributed)}</span>
            <span className="telemetry-sub muted text-xs">Out of Pocket</span>
          </div>

          <div className="telemetry-pill">
            <span className="telemetry-label font-mono">Wealth Multiplier</span>
            <span className="telemetry-val font-mono text-solstice">{wealthMultiplier}x</span>
            <span className="telemetry-sub muted text-xs">Compound Multiple</span>
          </div>
        </div>
      )}

      <div className="two-col-grid">
        {/* Sliders */}
        <div className="projection-inputs">
          <div className="sub-group mt-0">
            <h3 className="group-title text-pulsar">
              <span>●</span> Compounding Levers
            </h3>
            <SliderNumberField id="sav-ef" label="Emergency Cash Reserve" value={plan.savings.emergencyFundBalance} min={0} max={2_000_000} step={10_000} onChange={(v) => updateSavings('emergencyFundBalance', v)} />
            <SliderNumberField id="sav-cash" label="Monthly Liquid Bank Savings" value={plan.savings.monthlySavings} min={0} max={150_000} step={1_000} onChange={(v) => updateSavings('monthlySavings', v)} />
            <SliderNumberField id="sav-sip" label="Monthly Mutual Fund SIP" value={plan.savings.monthlySip} min={0} max={250_000} step={1_000} onChange={(v) => updateSavings('monthlySip', v)} />
            <SliderNumberField id="sav-stepup" label="Annual SIP Step-Up (%)" value={plan.savings.stepUpSipPercent} min={0} max={30} step={1} unit="%" onChange={(v) => updateSavings('stepUpSipPercent', v)} />
            <SliderNumberField id="sav-ret" label="Expected Portfolio CAGR (%)" value={plan.savings.expectedReturnPercent} min={0} max={24} step={0.5} unit="%" onChange={(v) => updateSavings('expectedReturnPercent', v)} />
            <SliderNumberField id="sav-inf" label="Assumed Annual Inflation (%)" value={plan.savings.inflationPercent} min={0} max={12} step={0.5} unit="%" onChange={(v) => updateSavings('inflationPercent', v)} />
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={projections} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="hipukuMint" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5ec491" stopOpacity={0.35} />
                  <stop offset="90%" stopColor="#5ec491" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="hipukuPulsar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7193ed" stopOpacity={0.3} />
                  <stop offset="90%" stopColor="#7193ed" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'JetBrains Mono' }} />
              <YAxis
                tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'JetBrains Mono' }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="hipuku-tooltip font-mono">
                        <div className="tooltip-name">{label} Forecast</div>
                        {payload.map((entry, idx) => (
                          <div key={idx} className="flex-align gap-2">
                            <span className="dot" style={{ backgroundColor: entry.color }} />
                            <span className="muted text-xs">{entry.name}:</span>
                            <span className="font-bold text-xs">{formatINR(Number(entry.value))}</span>
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
                formatter={(value) => <span className="muted font-mono text-xs">{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="nominalCorpus"
                name="Nominal Corpus"
                stroke="#5ec491"
                strokeWidth={2.5}
                fill="url(#hipukuMint)"
              />
              {showInflationAdjusted && (
                <Area
                  type="monotone"
                  dataKey="realCorpus"
                  name="Real (Inflation-Adj.)"
                  stroke="#7193ed"
                  strokeWidth={2}
                  fill="url(#hipukuPulsar)"
                />
              )}
              {baseline && (
                <Area
                  type="monotone"
                  dataKey="baselineCorpus"
                  name="Pinned Baseline"
                  stroke="#f78d2c"
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

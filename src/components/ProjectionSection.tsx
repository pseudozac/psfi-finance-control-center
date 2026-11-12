import React, { useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp, Sliders } from 'lucide-react';
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
    { label: '1Y Horizon', months: 12 },
    { label: '2Y Horizon', months: 24 },
    { label: '3Y Horizon', months: 36 },
    { label: '5Y Horizon', months: 60 },
  ];

  const totalContributed = finalPoint?.totalContributed ?? 1;
  const wealthMultiplier = finalPoint ? (finalPoint.nominalCorpus / Math.max(1, totalContributed)).toFixed(2) : '1.0';

  return (
    <section className="card projection-card" aria-label="Wealth Projection">
      <div className="section-head mb-3">
        <div className="flex-align gap-3">
          <div className="icon-chip icon-chip-cyan">
            <TrendingUp size={16} />
          </div>
          <div>
            <div className="flex-align gap-2">
              <span className="tech-badge">// MODULE 04</span>
              <span className="text-xs font-mono text-cyan">STEP-UP COMPOUNDING ALGORITHM</span>
            </div>
            <h2 className="title-sm m-0">Forward Wealth Accumulation Curve</h2>
          </div>
        </div>

        <div className="controls-inline flex-align gap-3">
          <label className="checkbox-toggle" title="Discount future corpus by assumed annual inflation">
            <input
              type="checkbox"
              checked={showInflationAdjusted}
              onChange={(e) => setShowInflationAdjusted(e.target.checked)}
            />
            <span className="toggle-slider" />
            <span className="toggle-label text-xs font-mono">Real Value (Inflation-Adjusted)</span>
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

      {/* High-Tech Telemetry KPI Ribbon */}
      {finalPoint && (
        <div className="projection-stats-ribbon mb-4">
          <div className="stat-pod">
            <span className="stat-pod-label font-mono">NOMINAL CORPUS @ M{finalPoint.month}</span>
            <span className="stat-pod-value font-mono text-emerald">{formatINR(finalPoint.nominalCorpus)}</span>
            <span className="stat-pod-sub text-xs muted font-mono">Undiscounted Future Asset Value</span>
          </div>

          <div className="stat-pod">
            <span className="stat-pod-label font-mono">REAL PURCHASING POWER</span>
            <span className="stat-pod-value font-mono text-cyan">{formatINR(finalPoint.realCorpus)}</span>
            <span className="stat-pod-sub text-xs muted font-mono">Discounted at {plan.savings.inflationPercent}% Inflation</span>
          </div>

          <div className="stat-pod">
            <span className="stat-pod-label font-mono">TOTAL CASH DEPOSITED</span>
            <span className="stat-pod-value font-mono">{formatINR(finalPoint.totalContributed)}</span>
            <span className="stat-pod-sub text-xs muted font-mono">Principal Invested Capital</span>
          </div>

          <div className="stat-pod">
            <span className="stat-pod-label font-mono">COMPOUND MULTIPLIER</span>
            <span className="stat-pod-value font-mono text-purple">{wealthMultiplier}x</span>
            <span className="stat-pod-sub text-xs muted font-mono">Net Asset Growth Multiple</span>
          </div>
        </div>
      )}

      <div className="two-col-grid">
        {/* Sliders */}
        <div className="projection-inputs">
          <div className="sub-group mt-0">
            <h3 className="section-subtitle text-cyan">
              <Sliders size={13} /> Compounding Parameters
            </h3>
            <SliderNumberField id="sav-ef" label="Emergency Cash Reserve" value={plan.savings.emergencyFundBalance} min={0} max={2_000_000} step={10_000} onChange={(v) => updateSavings('emergencyFundBalance', v)} />
            <SliderNumberField id="sav-cash" label="Monthly Liquid Bank Savings" value={plan.savings.monthlySavings} min={0} max={150_000} step={1_000} onChange={(v) => updateSavings('monthlySavings', v)} />
            <SliderNumberField id="sav-sip" label="Monthly Mutual Fund SIP" value={plan.savings.monthlySip} min={0} max={250_000} step={1_000} onChange={(v) => updateSavings('monthlySip', v)} />
            <SliderNumberField id="sav-stepup" label="Annual SIP Step-Up (%)" value={plan.savings.stepUpSipPercent} min={0} max={30} step={1} unit="%" onChange={(v) => updateSavings('stepUpSipPercent', v)} />
            <SliderNumberField id="sav-ret" label="Expected Portfolio CAGR (%)" value={plan.savings.expectedReturnPercent} min={0} max={24} step={0.5} unit="%" onChange={(v) => updateSavings('expectedReturnPercent', v)} />
            <SliderNumberField id="sav-inf" label="Assumed Inflation Rate (%)" value={plan.savings.inflationPercent} min={0} max={12} step={0.5} unit="%" onChange={(v) => updateSavings('inflationPercent', v)} />
          </div>
        </div>

        {/* Glowing Modern Recharts Area Chart */}
        <div className="chart-box projection-chart-box">
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={projections} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="neonEmeraldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00F5A0" stopOpacity={0.4} />
                  <stop offset="90%" stopColor="#00F5A0" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="neonCyanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.35} />
                  <stop offset="90%" stopColor="#00E5FF" stopOpacity={0.0} />
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
                wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                formatter={(value) => <span className="legend-label font-mono">{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="nominalCorpus"
                name="Nominal Corpus"
                stroke="#00F5A0"
                strokeWidth={2.5}
                fill="url(#neonEmeraldGrad)"
              />
              {showInflationAdjusted && (
                <Area
                  type="monotone"
                  dataKey="realCorpus"
                  name="Real (Inflation-Adj.)"
                  stroke="#00E5FF"
                  strokeWidth={2}
                  fill="url(#neonCyanGrad)"
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

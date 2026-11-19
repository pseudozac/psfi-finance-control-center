import React, { useState, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  TrendingUp,
  Sparkles,
  Layers,
  Zap,
  Target,
  CheckCircle2,
  Clock,
  Coins,
} from 'lucide-react';
import type { FinancePlan, MonthlyProjectionPoint } from '../types/finance';
import {
  formatINR,
  formatCompactINR,
  calculateCrossoverPoint,
  calculateStepUpComparison,
} from '../lib/finance';
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
  const [showInflationAdjusted, setShowInflationAdjusted] = useState<boolean>(true);
  const [chartMode, setChartMode] = useState<'trajectory' | 'composition'>('trajectory');

  const updateSavings = (key: keyof FinancePlan['savings'], val: number) => {
    onChange({
      ...plan,
      savings: { ...plan.savings, [key]: val },
    });
  };

  const finalPoint = projections[projections.length - 1];
  const horizonYears = Math.round(horizonMonths / 12);

  const horizonOptions = [
    { label: '1Y', months: 12 },
    { label: '3Y', months: 36 },
    { label: '5Y', months: 60 },
    { label: '10Y', months: 120 },
    { label: '15Y', months: 180 },
    { label: '20Y', months: 240 },
    { label: '30Y', months: 360 },
  ];

  const totalContributed = finalPoint?.totalContributed ?? 1;
  const nominalCorpus = finalPoint?.nominalCorpus ?? 0;
  const compoundGrowth = Math.max(0, nominalCorpus - totalContributed);
  const growthPercent = nominalCorpus > 0 ? ((compoundGrowth / nominalCorpus) * 100).toFixed(1) : '0';
  const wealthMultiplier = finalPoint ? (nominalCorpus / Math.max(1, totalContributed)).toFixed(2) : '1.0';
  const safeWithdrawalMonthly = Math.round((nominalCorpus * 0.035) / 12);

  // Financial Independence Crossover Point calculation
  const crossover = useMemo(() => calculateCrossoverPoint(plan, 360), [plan]);

  // Step-Up SIP Alpha Comparison
  const stepUpComparison = useMemo(
    () => calculateStepUpComparison(plan, horizonMonths),
    [plan, horizonMonths]
  );

  // Milestones detection within current horizon
  const landmarkMilestones = useMemo(() => {
    const targets = [
      { id: '10l', label: '₹10 Lakhs', amount: 1_000_000 },
      { id: '25l', label: '₹25 Lakhs', amount: 2_500_000 },
      { id: '50l', label: '₹50 Lakhs', amount: 5_000_000 },
      { id: '1cr', label: '₹1 Crore', amount: 10_000_000 },
      { id: '2.5cr', label: '₹2.5 Crores', amount: 25_000_000 },
      { id: '5cr', label: '₹5 Crores', amount: 50_000_000 },
      { id: '10cr', label: '₹10 Crores', amount: 100_000_000 },
    ];

    return targets.map((t) => {
      const match = projections.find((p) => p.nominalCorpus >= t.amount);
      return {
        ...t,
        reached: Boolean(match),
        month: match ? match.month : null,
        year: match ? (match.month / 12).toFixed(1) : null,
      };
    });
  }, [projections]);

  // Downsample large series for smooth SVG rendering (>120 months)
  const chartData = useMemo(() => {
    if (projections.length <= 60) return projections;
    const step = projections.length > 200 ? 3 : 2;
    return projections.filter(
      (p, idx) => idx === 0 || idx === projections.length - 1 || p.month % step === 0
    );
  }, [projections]);

  return (
    <section className="hipuku-card projection-card" aria-label="Wealth Projection">
      {/* Section Header */}
      <div className="section-head mb-3">
        <div>
          <div className="flex-align gap-2 mb-1">
            <span className="dot dot-pulsar" />
            <h2 className="card-title m-0">Wealth Compounding &amp; Long-Term SIP Scenarios</h2>
            <span className="tag-pill tag-nebula font-mono text-[10px]">SCENARIO PROJECTION MODEL</span>
          </div>
          <p className="muted text-xs">
            Multi-decade equity mutual fund simulations, milestone countdowns, and financial freedom crossover scenarios under assumed market CAGR
          </p>
        </div>

        {/* Top Controls: Mode & Horizon */}
        <div className="controls-inline flex flex-wrap items-center gap-3">
          {/* Chart Mode Toggle */}
          <div className="pill-segmented segmented-sm" role="group" aria-label="Chart View Mode">
            <button
              type="button"
              className={chartMode === 'trajectory' ? 'pill-active' : ''}
              onClick={() => setChartMode('trajectory')}
            >
              <TrendingUp size={12} className="inline mr-1" />
              Trajectory
            </button>
            <button
              type="button"
              className={chartMode === 'composition' ? 'pill-active' : ''}
              onClick={() => setChartMode('composition')}
            >
              <Layers size={12} className="inline mr-1" />
              Composition
            </button>
          </div>

          {/* Inflation Toggle */}
          {chartMode === 'trajectory' && (
            <label className="hipuku-checkbox">
              <input
                type="checkbox"
                checked={showInflationAdjusted}
                onChange={(e) => setShowInflationAdjusted(e.target.checked)}
              />
              <span className="checkbox-box" />
              <span className="text-xs font-medium">Inflation-Adjusted</span>
            </label>
          )}

          {/* Horizon Segmented Switch */}
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

      {/* Freedom Crossover Point Highlight Banner (Scenario Mode) */}
      {crossover.achieved && crossover.month ? (
        <div className="mb-4 rounded-xl bg-slate-950/70 border border-emerald-500/40 p-3.5 text-xs animate-fadeIn space-y-3">
          <div className="flex items-start gap-2.5">
            <Sparkles size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                <span className="font-bold text-white text-sm">
                  🎯 Financial Freedom Crossover Point (Scenario Model): Month {crossover.month} ({crossover.years} Years{crossover.monthsRemainder ? `, ${crossover.monthsRemainder} Months` : ''})
                </span>
                <span className="tag-pill tag-nebula font-mono text-[10px]">
                  [ILLUSTRATIVE SCENARIO · NOT DEPENDABLE CASHFLOW]
                </span>
              </div>
              <p className="text-emerald-300 leading-relaxed mb-2">
                At this milestone, hypothetical monthly compounding gains ({formatINR(crossover.monthlyPassiveGain ?? 0)}/mo) surpass your baseline living burn ({formatINR(crossover.monthlyExpenses)}/mo).
              </p>
              <details className="group rounded-xl border border-amber-500/25 bg-amber-950/20 text-xs overflow-hidden transition-all">
                <summary className="cursor-pointer select-none p-2.5 font-mono text-[11px] text-amber-300 font-semibold flex items-center justify-between hover:bg-amber-500/10 transition-colors">
                  <span className="flex items-center gap-1.5">
                    <span>⚠️ Actuarial Reality Notice: Projected Gain ≠ Dependable Cashflow</span>
                  </span>
                  <span className="text-[10px] font-mono text-amber-400/80 flex items-center gap-1">
                    <span>Disclosure</span>
                    <span className="transition-transform group-open:rotate-180">▾</span>
                  </span>
                </summary>
                <div className="px-3 pb-3 pt-1.5 text-[11px] text-amber-200/90 leading-relaxed border-t border-amber-500/20">
                  Equity returns are non-linear and volatile (about 18% annual deviation). Paper compounding cannot be withdrawn smoothly every month like a salary. Selling units to spend incurs <strong>Section 112A LTCG tax (12.5% over ₹1.25L)</strong>, while living expenses inflate with <strong>CPI ({plan.savings.inflationPercent}%/yr)</strong>. Dependable spendable income requires a conservative <strong>3.0%–3.5% Safe Withdrawal Rate (SWR)</strong> backed by a liquid cash wedge.
                </div>
              </details>
            </div>
          </div>

          {/* Scenario Assumptions & Friction Matrix Close to Headline */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pt-2 border-t border-subtle/60 font-mono text-[11px]">
            <div className="p-2 rounded bg-slate-900/50 border border-subtle">
              <span className="text-muted block text-[10px]">ASSUMED EQUITY CAGR</span>
              <span className="font-bold text-nebula">{crossover.assumptions.expectedReturnPercent}% Gross</span>
            </div>
            <div className="p-2 rounded bg-slate-900/50 border border-subtle">
              <span className="text-muted block text-[10px]">CPI INFLATION DRAG</span>
              <span className="font-bold text-rose-300">{crossover.assumptions.inflationPercent}% / yr</span>
            </div>
            <div className="p-2 rounded bg-slate-900/50 border border-subtle">
              <span className="text-muted block text-[10px]">SEC 112A LTCG TAX</span>
              <span className="font-bold text-amber-300">Not modeled</span>
            </div>
            <div className="p-2 rounded bg-slate-900/50 border border-subtle">
              <span className="text-muted block text-[10px]">MUTUAL FUND TER</span>
              <span className="font-bold text-slate-300">Not modeled</span>
            </div>
            <div className="p-2 rounded bg-slate-900/50 border border-subtle">
              <span className="text-muted block text-[10px]">INFLATED BURN @ M{crossover.month}</span>
              <span className="font-bold text-corona">{formatINR(crossover.inflatedMonthlyExpenses ?? crossover.monthlyExpenses)}/mo</span>
            </div>
            <div className="p-2 rounded bg-slate-900/50 border border-subtle">
              <span className="text-muted block text-[10px]">PRE-TAX WITHDRAWAL (3.5%)</span>
              <span className="font-bold text-emerald-400">{formatINR(crossover.realSpendableCashflow ?? 0)}/mo</span>
            </div>
          </div>

          {crossover.realCrossoverMonth && (
            <div className="text-[11px] font-mono text-cyan-300 flex items-center gap-1.5 pt-1">
              <CheckCircle2 size={12} className="text-cyan-400" />
              <span>
                <strong>Illustrative Pre-Tax Withdrawal Crossover:</strong> Reached at Month {crossover.realCrossoverMonth} ({crossover.realCrossoverYears} Years), where the modeled 3.5% withdrawal covers your inflated monthly burn.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-4 p-3 rounded-xl bg-slate-900/40 border border-subtle text-muted flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-amber-400" />
            <span>
              Scenario Living Burn: <strong className="text-primary font-mono">{formatINR(crossover.monthlyExpenses)}/mo</strong>. Boost SIP or Step-Up to reach your Crossover Scenario within 10–15 years.
            </span>
          </div>
          <span className="text-[11px] font-mono text-amber-400/80">Assumptions: {plan.savings.expectedReturnPercent}% CAGR · {plan.savings.inflationPercent}% Inflation</span>
        </div>
      )}

      {/* Telemetry Capsule Row (5 Key Cockpit Metrics) */}
      {finalPoint && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          <div className="telemetry-pill">
            <span className="telemetry-label font-mono">Nominal Corpus ({horizonYears}Y Scenario)</span>
            <span className="telemetry-val font-mono text-nebula">
              {formatCompactINR(finalPoint.nominalCorpus)}
            </span>
            <span className="telemetry-sub muted text-[11px] font-mono">
              {formatINR(finalPoint.nominalCorpus)}
            </span>
          </div>

          <div className="telemetry-pill">
            <span className="telemetry-label font-mono">Real Purchasing Power</span>
            <span className="telemetry-val font-mono text-pulsar">
              {formatCompactINR(finalPoint.realCorpus)}
            </span>
            <span className="telemetry-sub muted text-[11px]">
              At {plan.savings.inflationPercent}% Annual Inflation
            </span>
          </div>

          <div className="telemetry-pill">
            <span className="telemetry-label font-mono">Compound Wealth (Scenario)</span>
            <span className="telemetry-val font-mono text-emerald-400">
              {formatCompactINR(compoundGrowth)}
            </span>
            <span className="telemetry-sub text-emerald-300 text-[11px] font-mono">
              {growthPercent}% of Total Corpus
            </span>
          </div>

          <div className="telemetry-pill">
            <span className="telemetry-label font-mono">Wealth Multiplier</span>
            <span className="telemetry-val font-mono text-solstice">{wealthMultiplier}x</span>
            <span className="telemetry-sub muted text-[11px]">
              Principal: {formatCompactINR(finalPoint.totalContributed)}
            </span>
          </div>

          <div className="telemetry-pill col-span-2 sm:col-span-1">
            <span className="telemetry-label font-mono flex items-center gap-1">
              <Coins size={11} className="text-amber-400" /> Illustrative Monthly Withdrawal
            </span>
            <span className="telemetry-val font-mono text-amber-400">
              {formatCompactINR(safeWithdrawalMonthly)}/mo
            </span>
            <span className="telemetry-sub muted text-[11px]">3.5% annual withdrawal before taxes and fees</span>
          </div>
        </div>
      )}

      {/* Landmark Milestone Chips Row */}
      <div className="mb-4 p-3 bg-slate-950/40 rounded-xl border border-subtle">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
            <Target size={13} className="text-solstice" />
            <span>Landmark Milestone Crossings ({horizonYears}-Year Horizon)</span>
          </span>
          <span className="text-[10px] font-mono text-muted">Equity SIP Trajectory</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {landmarkMilestones.map((m) => (
            <div
              key={m.id}
              className={`text-xs font-mono px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all ${
                m.reached
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-sm'
                  : 'bg-slate-900/30 border-subtle text-muted opacity-60'
              }`}
            >
              {m.reached ? (
                <CheckCircle2 size={12} className="text-emerald-400" />
              ) : (
                <Clock size={12} className="text-slate-500" />
              )}
              <span className="font-bold">{m.label}</span>
              <span className="text-[10px] opacity-80">
                {m.reached ? `Year ${m.year} (M${m.month})` : `>${horizonYears}Y`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Two-Column Grid: Sliders & Main Recharts Stage */}
      <div className="two-col-grid">
        {/* Compounding Levers Controls */}
        <div className="projection-inputs space-y-4">
          <div className="sub-group mt-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="group-title text-pulsar m-0 flex items-center gap-1.5">
                <span>●</span> Compounding Levers
              </h3>
              <span className="text-[11px] font-mono text-muted">Real-Time Reactive</span>
            </div>

            <SliderNumberField
              id="sav-ef"
              label="Emergency Cash Reserve"
              value={plan.savings.emergencyFundBalance}
              min={0}
              max={2_000_000}
              step={10_000}
              onChange={(v) => updateSavings('emergencyFundBalance', v)}
            />
            <SliderNumberField
              id="sav-cash"
              label="Monthly Liquid Bank Savings"
              value={plan.savings.monthlySavings}
              min={0}
              max={150_000}
              step={1_000}
              onChange={(v) => updateSavings('monthlySavings', v)}
            />
            <SliderNumberField
              id="sav-sip"
              label="Monthly Mutual Fund SIP"
              value={plan.savings.monthlySip}
              min={0}
              max={250_000}
              step={1_000}
              onChange={(v) => updateSavings('monthlySip', v)}
            />

            {/* Step-Up Quick Booster Buttons */}
            <div className="pt-1">
              <SliderNumberField
                id="sav-stepup"
                label="Annual SIP Step-Up (%)"
                value={plan.savings.stepUpSipPercent}
                min={0}
                max={30}
                step={1}
                unit="%"
                onChange={(v) => updateSavings('stepUpSipPercent', v)}
              />
              <div className="flex items-center gap-1.5 mt-1.5 font-mono text-[11px]">
                <span className="text-muted text-[10px]">Step-Up Presets:</span>
                {[0, 5, 10, 15, 20].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => updateSavings('stepUpSipPercent', rate)}
                    className={`px-2 py-0.5 rounded border transition-colors ${
                      plan.savings.stepUpSipPercent === rate
                        ? 'bg-purple-900/60 border-purple-500 text-purple-200 font-bold'
                        : 'bg-slate-900/40 border-subtle text-muted hover:text-primary'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            <SliderNumberField
              id="sav-ret"
              label="Expected Portfolio CAGR (%)"
              value={plan.savings.expectedReturnPercent}
              min={0}
              max={24}
              step={0.5}
              unit="%"
              onChange={(v) => updateSavings('expectedReturnPercent', v)}
            />
            <SliderNumberField
              id="sav-inf"
              label="Assumed Annual Inflation (%)"
              value={plan.savings.inflationPercent}
              min={0}
              max={12}
              step={0.5}
              unit="%"
              onChange={(v) => updateSavings('inflationPercent', v)}
            />
          </div>

          {/* Step-Up Alpha Comparison Box */}
          {plan.savings.stepUpSipPercent > 0 && stepUpComparison.difference > 0 && (
            <div className="p-3 rounded-xl bg-purple-950/25 border border-purple-800/30 text-purple-200 text-xs font-mono space-y-1">
              <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                <Zap size={13} className="text-purple-400" />
                <span>Step-Up SIP Accelerator Advantage</span>
              </div>
              <p className="text-[11px] text-muted">
                Your <span className="text-purple-300 font-semibold">{plan.savings.stepUpSipPercent}% annual step-up</span> generates{' '}
                <strong className="text-emerald-400">+{formatCompactINR(stepUpComparison.difference)}</strong> (+{stepUpComparison.differencePercent}%) extra corpus over {horizonYears} years compared to keeping SIP flat.
              </p>
            </div>
          )}
        </div>

        {/* Recharts Chart Stage */}
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={360}>
            {chartMode === 'trajectory' ? (
              <AreaChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="hipukuMint" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5ec491" stopOpacity={0.4} />
                    <stop offset="90%" stopColor="#5ec491" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="hipukuPulsar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7193ed" stopOpacity={0.3} />
                    <stop offset="90%" stopColor="#7193ed" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="hipukuPurple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.25} />
                    <stop offset="90%" stopColor="#a78bfa" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'JetBrains Mono' }}
                  interval={horizonMonths > 120 ? 11 : horizonMonths > 48 ? 5 : 2}
                />
                <YAxis
                  tickFormatter={(v) => formatCompactINR(v)}
                  tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'JetBrains Mono' }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="hipuku-tooltip font-mono">
                          <div className="tooltip-name">{label} Compounding Forecast</div>
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
                <Area
                  type="monotone"
                  dataKey="totalContributed"
                  name="Out-of-Pocket Invested"
                  stroke="#a78bfa"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                  fill="url(#hipukuPurple)"
                />
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
            ) : (
              // Composition Stacked Area Chart (Principal vs Pure Compound Growth)
              <AreaChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="stackPrincipal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.6} />
                    <stop offset="90%" stopColor="#38bdf8" stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id="stackGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.7} />
                    <stop offset="90%" stopColor="#10b981" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'JetBrains Mono' }}
                  interval={horizonMonths > 120 ? 11 : horizonMonths > 48 ? 5 : 2}
                />
                <YAxis
                  tickFormatter={(v) => formatCompactINR(v)}
                  tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'JetBrains Mono' }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="hipuku-tooltip font-mono">
                          <div className="tooltip-name">{label} Wealth Stack</div>
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
                  dataKey="totalContributed"
                  stackId="wealth"
                  name="Out-of-Pocket Invested"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fill="url(#stackPrincipal)"
                />
                <Area
                  type="monotone"
                  dataKey="compoundGrowth"
                  stackId="wealth"
                  name="Pure Compounding Gains"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#stackGrowth)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};

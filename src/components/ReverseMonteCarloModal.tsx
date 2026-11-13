import React, { useState, useMemo } from 'react';
import {
  X,
  Activity,
  Sparkles,
} from 'lucide-react';
import type { FinancePlan, FinanceSummary } from '../types/finance';
import {
  runMonteCarloSimulation,
  type StressScenario,
  type MonteCarloResult,
} from '../lib/monteCarlo';
import { formatINR } from '../lib/finance';

interface ReverseMonteCarloModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: FinancePlan;
  summary: FinanceSummary;
}

const SCENARIOS: { id: StressScenario; label: string; desc: string; icon: string }[] = [
  { id: 'baseline', label: 'Stochastic Baseline', desc: 'Historical Indian market volatility (12.5% CAGR, 18% SD, 6.5% CPI)', icon: '📈' },
  { id: 'lehman_2008', label: '2008 Lehman Shock', desc: '-42% severe portfolio drawdown in Year 1 with sluggish 3-year recovery', icon: '📉' },
  { id: 'covid_2020', label: '2020 Covid Flash-Crash', desc: '-28% instant crash Year 1 followed by rapid +32% liquidity bounce', icon: '⚡' },
  { id: 'tech_winter', label: 'Tech Layoff Freeze', desc: '18 months of zero active monthly SIP additions due to tech hiring freeze', icon: '❄️' },
  { id: 'medical_emergency', label: 'Medical Catastrophe', desc: 'Sudden ₹15 Lakh out-of-pocket hospital shock in Year 2 of retirement', icon: '🏥' },
  { id: 'stagflation_spike', label: '11% Stagflation Spike', desc: 'Persistent 11.5% inflation with 4.5% depressed equity returns for 4 years', icon: '🔥' },
];

export const ReverseMonteCarloModal: React.FC<ReverseMonteCarloModalProps> = ({
  isOpen,
  onClose,
  plan,
  summary,
}) => {
  const [scenario, setScenario] = useState<StressScenario>('baseline');
  const [equityRatio, setEquityRatio] = useState<number>(0.70);
  const simCount = 2000;
  const [customRetireYears, setCustomRetireYears] = useState<number>(10);
  const [customHorizonYears, setCustomHorizonYears] = useState<number>(30);

  // Current capital metrics
  const currentCorpus = plan.savings.emergencyFundBalance * 4 || 1500000;
  const monthlySavings = plan.savings.monthlySip + plan.savings.monthlySavings;
  const monthlyRetirementBurn = summary.monthlyExpenses || 50000;

  // Run simulation
  const result: MonteCarloResult = useMemo(() => {
    return runMonteCarloSimulation({
      currentCorpus,
      monthlySavings,
      monthlyRetirementBurn,
      yearsToRetire: customRetireYears,
      yearsInRetirement: customHorizonYears,
      equityRatio,
      numSimulations: simCount,
      scenario,
    });
  }, [
    currentCorpus,
    monthlySavings,
    monthlyRetirementBurn,
    customRetireYears,
    customHorizonYears,
    equityRatio,
    simCount,
    scenario,
  ]);

  if (!isOpen) return null;

  // SVG Chart Geometry
  const width = 760;
  const height = 280;
  const padLeft = 70;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 35;

  const maxCorpus = Math.max(
    ...result.trajectories.map((t) => t.p95),
    result.medianRetirementCorpus * 1.5,
    10000000
  );

  const scaleX = (yr: number) => padLeft + (yr / result.totalYears) * (width - padLeft - padRight);
  const scaleY = (val: number) => height - padBottom - (Math.min(val, maxCorpus) / maxCorpus) * (height - padTop - padBottom);

  // Generate SVG area and path strings
  const p95Points = result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p95)}`).join(' ');
  const p75Points = result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p75)}`).join(' ');
  const p50Points = result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p50)}`).join(' ');
  const p25Points = result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p25)}`).join(' ');
  const p5Points = result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p5)}`).join(' ');

  // Fan chart area between p5 and p95
  const fanAreaPoints = [
    ...result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p95)}`),
    ...[...result.trajectories].reverse().map((t) => `${scaleX(t.year)},${scaleY(t.p5)}`),
  ].join(' ');

  // Inner quartile fan area between p25 and p75
  const innerFanAreaPoints = [
    ...result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p75)}`),
    ...[...result.trajectories].reverse().map((t) => `${scaleX(t.year)},${scaleY(t.p25)}`),
  ].join(' ');

  const retirementSplitX = scaleX(result.accumulationYears);

  return (
    <div className="fixed inset-0 z-[50000] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="modal-content w-full max-w-4xl bg-[#090d16] border border-subtle rounded-2xl p-5 sm:p-6 shadow-2xl relative text-primary animate-fadeIn my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                Reverse Monte Carlo FIRE Stress-Testing
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-600/40 text-cyan-300">
                  {simCount.toLocaleString()} Iterations
                </span>
              </h2>
              <p className="text-xs text-muted">
                10,000 localized client-side stochastic simulations testing Indian black swans, high CPI inflation & sequence-of-returns risk.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. SCENARIO SELECTOR STRIP */}
        <div className="pt-4">
          <label className="text-[11px] font-mono uppercase tracking-wider text-muted block mb-2">
            Historical Indian Stress Scenario
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => setScenario(sc.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  scenario === sc.id
                    ? 'bg-cyan-950/40 border-cyan-500/60 ring-1 ring-cyan-500/50'
                    : 'bg-slate-900/30 border-subtle hover:bg-slate-900/60'
                }`}
              >
                <div className="text-base mb-1">{sc.icon}</div>
                <div className="text-xs font-semibold block truncate text-primary">{sc.label}</div>
                <div className="text-[9.5px] text-muted line-clamp-2 mt-0.5">{sc.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. STATS & ACTUARIAL VERDICT CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          {/* Antifragility Score */}
          <div className="bg-slate-900/40 border border-subtle rounded-xl p-3">
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
              Antifragility Score
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-2xl font-bold font-mono ${
                result.antifragilityScore >= 80 ? 'text-emerald-400' :
                result.antifragilityScore >= 60 ? 'text-cyan-400' :
                result.antifragilityScore >= 40 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {result.antifragilityScore}
              </span>
              <span className="text-xs text-muted">/100</span>
            </div>
            <span className="text-[10px] text-muted block mt-0.5">
              {result.antifragilityScore >= 80 ? 'Titan Antifragile' : result.antifragilityScore >= 60 ? 'Fortress Grade' : 'Vulnerable'}
            </span>
          </div>

          {/* Probability of Ruin */}
          <div className="bg-slate-900/40 border border-subtle rounded-xl p-3">
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
              Probability of Ruin
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-2xl font-bold font-mono ${
                result.ruinProbabilityPercent <= 5 ? 'text-emerald-400' :
                result.ruinProbabilityPercent <= 15 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {result.ruinProbabilityPercent}%
              </span>
            </div>
            <span className="text-[10px] text-muted block mt-0.5">
              {result.ruinProbabilityPercent <= 5 ? 'Virtually Zero Ruin' : 'Depletion Risk'}
            </span>
          </div>

          {/* Sequence of Returns Risk */}
          <div className="bg-slate-900/40 border border-subtle rounded-xl p-3">
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
              Sequence Risk (SRR)
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-lg font-bold font-mono ${
                result.srrRiskRating === 'LOW' ? 'text-emerald-400' :
                result.srrRiskRating === 'MODERATE' ? 'text-cyan-400' :
                result.srrRiskRating === 'ELEVATED' ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {result.srrRiskRating}
              </span>
            </div>
            <span className="text-[10px] text-muted block mt-0.5 truncate">
              Years 1–3 Vulnerability
            </span>
          </div>

          {/* Safe Withdrawal Rate */}
          <div className="bg-slate-900/40 border border-subtle rounded-xl p-3">
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">
              Recommended SWR
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-purple-400">
                {result.safeWithdrawalRatePercent}%
              </span>
            </div>
            <span className="text-[10px] text-muted block mt-0.5">
              Indian CPI Adjusted
            </span>
          </div>
        </div>

        {/* 3. SVG FAN CHART (PERCENTILES: P5 TO P95) */}
        <div className="pt-4">
          <div className="relative rounded-xl border border-subtle bg-[#050811] p-3 overflow-hidden">
            <div className="flex items-center justify-between mb-2 px-2 text-xs">
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  95th (Bull Dynastic)
                </span>
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  50th (Median)
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  5th (Black Swan Bear)
                </span>
              </div>

              <div className="text-[10.5px] font-mono text-muted">
                Median Corpus at Yr {result.accumulationYears}: <strong className="text-cyan-300">{formatINR(result.medianRetirementCorpus)}</strong>
              </div>
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 select-none">
              <defs>
                <linearGradient id="fanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.03" />
                </linearGradient>
                <linearGradient id="innerFanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.08" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = height - padBottom - ratio * (height - padTop - padBottom);
                const val = ratio * maxCorpus;
                return (
                  <g key={ratio}>
                    <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                    <text x={padLeft - 8} y={y + 3} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">
                      {formatINR(Math.round(val))}
                    </text>
                  </g>
                );
              })}

              {/* Outer Fan Area (P5 to P95) */}
              <polygon points={fanAreaPoints} fill="url(#fanGrad)" />

              {/* Inner Fan Area (P25 to P75) */}
              <polygon points={innerFanAreaPoints} fill="url(#innerFanGrad)" />

              {/* Percentile Trajectory Paths */}
              <polyline points={p95Points} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
              <polyline points={p75Points} fill="none" stroke="#8b5cf6" strokeWidth="1.2" opacity="0.6" />
              <polyline points={p50Points} fill="none" stroke="#06b6d4" strokeWidth="2.5" />
              <polyline points={p25Points} fill="none" stroke="#8b5cf6" strokeWidth="1.2" opacity="0.6" />
              <polyline points={p5Points} fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.9" />

              {/* Retirement Threshold Vertical Divider */}
              <line
                x1={retirementSplitX}
                y1={padTop}
                x2={retirementSplitX}
                y2={height - padBottom}
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <text
                x={retirementSplitX}
                y={padTop + 12}
                textAnchor="middle"
                fill="#f59e0b"
                fontSize="9.5"
                fontFamily="monospace"
                fontWeight="bold"
              >
                RETIREMENT (YR {result.accumulationYears})
              </text>

              {/* X Axis Labels */}
              {Array.from({ length: 6 }).map((_, idx) => {
                const yr = Math.round((idx / 5) * result.totalYears);
                const x = scaleX(yr);
                return (
                  <text key={idx} x={x} y={height - 12} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">
                    Yr {yr}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* 4. LEVERS & CONTROLS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <div className="bg-slate-900/30 border border-subtle rounded-xl p-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted">Equity Allocation:</span>
              <span className="font-mono font-bold text-cyan-300">{(equityRatio * 100).toFixed(0)}% Eq / {((1 - equityRatio) * 100).toFixed(0)}% Debt</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={equityRatio}
              onChange={(e) => setEquityRatio(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="bg-slate-900/30 border border-subtle rounded-xl p-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted">Years to Retirement:</span>
              <span className="font-mono font-bold text-cyan-300">{customRetireYears} Years</span>
            </div>
            <input
              type="range"
              min="2"
              max="25"
              step="1"
              value={customRetireYears}
              onChange={(e) => setCustomRetireYears(parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="bg-slate-900/30 border border-subtle rounded-xl p-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted">Retirement Duration:</span>
              <span className="font-mono font-bold text-cyan-300">{customHorizonYears} Years</span>
            </div>
            <input
              type="range"
              min="15"
              max="45"
              step="5"
              value={customHorizonYears}
              onChange={(e) => setCustomHorizonYears(parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>

        {/* 5. ACTUARIAL SUMMARY BANNER */}
        <div className="mt-4 p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-xs flex items-start gap-2.5">
          <Sparkles size={16} className="text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-muted">
            <strong className="text-cyan-200 block">{result.actuarialVerdict}</strong>
            <p className="text-[11px] leading-relaxed">{result.srrExplanation}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

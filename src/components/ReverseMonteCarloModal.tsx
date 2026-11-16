import React, { useState, useMemo } from 'react';
import {
  X,
  Activity,
  Sparkles,
  Dices,
  RotateCcw,
  Info,
  ShieldCheck,
  Copy,
  Check,
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
  { id: 'ketan_parekh_2001', label: '2001 Ketan Parekh Crash', desc: '-45% tech collapse followed by a 4-year sideways grind', icon: '💥' },
  { id: 'demonetisation_nbfc_2016', label: '2016 NBFC Credit Freeze', desc: 'IL&FS liquidity crisis: debt yields compressed, equity sideways', icon: '🏦' },
  { id: 'bop_crisis_1991', label: '1991 BOP Currency Crisis', desc: '13.8% runaway CPI inflation spike with severe rupee devaluation shock', icon: '🚨' },
];

export const ReverseMonteCarloModal: React.FC<ReverseMonteCarloModalProps> = ({
  isOpen,
  onClose,
  plan,
  summary,
}) => {
  const [scenario, setScenario] = useState<StressScenario>('baseline');
  const [equityRatio, setEquityRatio] = useState<number>(0.70);
  const [simCount, setSimCount] = useState<number>(5000);
  const [randomSeed, setRandomSeed] = useState<number>(42);
  const [customRetireYears, setCustomRetireYears] = useState<number>(10);
  const [customHorizonYears, setCustomHorizonYears] = useState<number>(30);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Current capital metrics
  const currentCorpus = plan.savings.emergencyFundBalance * 4 || 1500000;
  const monthlySavings = plan.savings.monthlySip + plan.savings.monthlySavings;
  const monthlyRetirementBurn = summary.monthlyExpenses || 50000;

  // Run simulation with deterministic or re-seeded generator
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
      randomSeed,
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
    randomSeed,
  ]);

  const handleCopyReport = () => {
    const activeScenario = SCENARIOS.find((s) => s.id === scenario);
    const text = `=== PSFI SEQUENCE-OF-RETURNS & STOCHASTIC STRESS REPORT ===
Scenario: ${activeScenario?.label || scenario} (${activeScenario?.desc})
Simulations: ${result.simulationsRun.toLocaleString()} runs | Horizon: ${result.accumulationYears}y accumulation + ${result.retirementYears}y retirement (${result.totalYears}y total)
Portfolio: ${(equityRatio * 100).toFixed(0)}% Equity / ${((1 - equityRatio) * 100).toFixed(0)}% Debt

[ACTUARIAL TELEMETRY]
Antifragility Score: ${result.antifragilityScore} / 100
Ruin Probability: ${result.ruinProbabilityPercent}%
Sequence Risk Rating: ${result.srrRiskRating}
Safe Withdrawal Rate (SWR): ${result.safeWithdrawalRatePercent}%
Recommended Cash Wedge: ${formatINR(result.recommendedCashWedgeRupees)} (${result.recommendedCashWedgeMonths} Months)
Projected Median Retirement Corpus: ${formatINR(result.medianRetirementCorpus)}
Projected Median Terminal Corpus: ${formatINR(result.medianTerminalCorpus)}

[SAFE WITHDRAWAL RATE MATRIX]
${result.swrScenarios.map((s) => `• ${s.swrPercent}% SWR: ${formatINR(s.annualWithdrawalRupees)}/yr — ${s.successProbabilityPercent}% Success (${s.verdict})`).join('\n')}

Verdict: "${result.actuarialVerdict}"
Advice: "${result.srrExplanation}"
Generated client-side via Pseudo-Fi Sovereign Actuarial Engine
============================================================`;

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2200);
  };

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
        <div className="flex items-center justify-between pb-4 border-b border-subtle flex-wrap gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Activity size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold">
                  Reverse Monte Carlo FIRE Stress-Testing
                </h2>
                <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-600/40 text-cyan-300">
                  {simCount.toLocaleString()} Stochastic Iterations
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-950/40 border border-purple-500/30 text-purple-300">
                  Seed #{randomSeed}
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                {simCount.toLocaleString()} client-side stochastic simulations testing Indian black swans, high CPI inflation &amp; sequence-of-returns risk.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Seed & Iteration Controls */}
            <div className="flex items-center gap-1.5 bg-slate-900/60 border border-subtle rounded-xl p-1 text-xs font-mono">
              <button
                type="button"
                className={`px-2 py-0.5 rounded-lg text-[10.5px] transition-all ${simCount === 5000 ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-muted hover:text-primary'}`}
                onClick={() => setSimCount(5000)}
                title="Run 5,000 stochastic lifespan paths"
              >
                5k Sim
              </button>
              <button
                type="button"
                className={`px-2 py-0.5 rounded-lg text-[10.5px] transition-all ${simCount === 10000 ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' : 'text-muted hover:text-primary'}`}
                onClick={() => setSimCount(10000)}
                title="Run 10,000 stochastic lifespan paths (higher statistical convergence)"
              >
                10k Sim
              </button>

              <div className="w-[1px] h-3.5 bg-white/10 mx-0.5" />

              <button
                type="button"
                className="px-2 py-0.5 rounded-lg text-[10.5px] flex items-center gap-1 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                onClick={() => setRandomSeed(Math.floor(Math.random() * 900000) + 100000)}
                title="Generate new stochastic pseudo-random seed"
              >
                <Dices size={12} />
                <span>New Run</span>
              </button>
              {randomSeed !== 42 && (
                <button
                  type="button"
                  className="px-1.5 py-0.5 rounded-lg text-[10.5px] text-muted hover:text-primary hover:bg-white/5 transition-colors"
                  onClick={() => setRandomSeed(42)}
                  title="Reset to deterministic baseline Seed #42"
                >
                  <RotateCcw size={11} />
                </button>
              )}
            </div>

            <button
              type="button"
              className="px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 bg-slate-900/60 border border-subtle text-slate-200 hover:text-white hover:border-slate-500 transition-all"
              onClick={handleCopyReport}
              title="Copy Full Stochastic Audit Summary"
            >
              {copiedReport ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedReport ? 'Copied!' : 'Copy Audit'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
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

        {/* 5. SEQUENCE RISK & SAFE WITHDRAWAL RATE MATRIX */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
          <div className="bg-slate-900/40 border border-subtle rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-200">
                  <ShieldCheck size={14} className="text-cyan-400" />
                  <span>SEQUENCE RISK &amp; CASH WEDGE</span>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  result.srrRiskRating === 'LOW'
                    ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-400'
                    : result.srrRiskRating === 'MODERATE'
                    ? 'bg-amber-950/60 border border-amber-500/40 text-amber-400'
                    : 'bg-rose-950/60 border border-rose-500/40 text-rose-400'
                }`}>
                  {result.srrRiskRating} RISK
                </span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed mb-3">
                Early-retirement market crashes can deplete equity units prematurely. Holding an arbitrage/liquid cash cushion insulates you from selling equities during bear market years.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-surface-page/60 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-muted uppercase block">Recommended Cash Wedge</span>
                <span className="text-sm font-bold font-mono text-cyan-300">
                  {formatINR(result.recommendedCashWedgeRupees)}
                </span>
              </div>
              <span className="text-xs font-mono text-slate-300 bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                {result.recommendedCashWedgeMonths} Months Runway
              </span>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-subtle rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-slate-200">
                SAFE WITHDRAWAL RATE (SWR) MATRIX
              </span>
              <span className="text-[10px] font-mono text-muted">
                Indian 30-Yr SWR: <strong className="text-cyan-300">{result.safeWithdrawalRatePercent}%</strong>
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              {result.swrScenarios.map((s) => (
                <div
                  key={s.swrPercent}
                  className="flex items-center justify-between p-1.5 rounded-lg bg-surface-page/40 border border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{s.swrPercent.toFixed(1)}%</span>
                    <span className="text-[10px] text-muted">({formatINR(s.annualWithdrawalRupees)}/yr)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          s.verdict === 'SAFE'
                            ? 'bg-emerald-500'
                            : s.verdict === 'CAUTION'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${s.successProbabilityPercent}%` }}
                      />
                    </div>
                    <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                      s.verdict === 'SAFE'
                        ? 'bg-emerald-950/60 text-emerald-400'
                        : s.verdict === 'CAUTION'
                        ? 'bg-amber-950/60 text-amber-400'
                        : 'bg-rose-950/60 text-rose-400'
                    }`}>
                      {s.successProbabilityPercent}% {s.verdict}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 6. ACTUARIAL SUMMARY BANNER */}
        <div className="mt-4 p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-xs flex items-start gap-2.5">
          <Sparkles size={16} className="text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-muted">
            <strong className="text-cyan-200 block">{result.actuarialVerdict}</strong>
            <p className="text-[11px] leading-relaxed">{result.srrExplanation}</p>
          </div>
        </div>

        {/* 6. ACTUARIAL ASSUMPTIONS & DISCLOSURES */}
        <div className="mt-3 p-3 rounded-xl bg-slate-900/40 border border-subtle text-[11px] text-muted space-y-1.5">
          <div className="flex items-center gap-1.5 text-primary font-semibold font-mono text-xs">
            <Info size={13} className="text-cyan-400" />
            <span>Actuarial Model Parameters &amp; Stochastic Assumptions</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[10.5px] pt-1">
            <div className="p-2 rounded-lg bg-surface-page/50 border border-white/5">
              <span className="text-secondary block font-sans font-medium">Equity Distribution (Nifty 50):</span>
              <span className="text-cyan-300">μ = 12.5% CAGR, σ = 18.0%</span>
              <span className="text-muted/70 block text-[9.5px]">Log-normal annual returns with fat-tail drawdown sampling</span>
            </div>
            <div className="p-2 rounded-lg bg-surface-page/50 border border-white/5">
              <span className="text-secondary block font-sans font-medium">Debt &amp; Fixed Income:</span>
              <span className="text-cyan-300">μ = 7.0%, σ = 3.0%</span>
              <span className="text-muted/70 block text-[9.5px]">Target maturity G-Sec &amp; corporate bond baseline</span>
            </div>
            <div className="p-2 rounded-lg bg-surface-page/50 border border-white/5">
              <span className="text-secondary block font-sans font-medium">Indian CPI Inflation:</span>
              <span className="text-cyan-300">μ = 6.5%, σ = 2.0%</span>
              <span className="text-muted/70 block text-[9.5px]">Annual compounding living expense adjustment</span>
            </div>
          </div>
          <p className="text-[10px] text-muted/80 leading-normal pt-1">
            * Methodology: Box-Muller transform Gaussian paths. Rebalanced annually. Deterministic PRNG seed ensures reproducible scenario audits. Stochastic models present probability distributions, not guaranteed future performance.
          </p>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Activity,
  Dices,
  RotateCcw,
  Info,
  ShieldCheck,
  Copy,
  Check,
  Flame,
  Compass,
  Sliders,
  ChevronDown,
  ChevronUp,
  ArrowRight,
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

type ScenarioCategory = 'all' | 'indian' | 'global' | 'domestic' | 'baseline';
type ModalTab = 'cockpit' | 'crises' | 'wedge_swr' | 'levers';

interface ScenarioMeta {
  id: StressScenario;
  label: string;
  category: 'indian' | 'global' | 'domestic' | 'baseline';
  categoryLabel: string;
  desc: string;
  historicalContext: string;
  impactTag: string;
  severity: 'CRITICAL' | 'SEVERE' | 'MODERATE' | 'BASELINE';
  icon: string;
}

const SCENARIOS: ScenarioMeta[] = [
  {
    id: 'baseline',
    label: 'Stochastic Baseline',
    category: 'baseline',
    categoryLabel: 'Historical Indian Baseline',
    desc: 'Historical Indian market baseline: 12.5% Nifty CAGR, 18% SD, 6.5% CPI inflation.',
    historicalContext: 'Calibrated from 25 years of post-1999 Nifty 50 TRI and RBI CPI data. Rebalanced annually.',
    impactTag: 'Normal Volatility',
    severity: 'BASELINE',
    icon: '📈',
  },
  {
    id: 'ketan_parekh_2001',
    label: '2001 Ketan Parekh Crash',
    category: 'indian',
    categoryLabel: 'Indian Market Crisis',
    desc: '-45% equity shock in Year 1 followed by a 4-year sideways grind before structural recovery.',
    historicalContext: 'Circular trading & dot-com collapse in Indian tech equities; Nifty cratered ~45% with elevated 32% volatility.',
    impactTag: '-45% Equity Shock',
    severity: 'CRITICAL',
    icon: '💥',
  },
  {
    id: 'demonetisation_nbfc_2016',
    label: '2016 NBFC Credit Freeze',
    category: 'indian',
    categoryLabel: 'Indian Market Crisis',
    desc: 'IL&FS / DHFL credit freeze: debt mutual fund yields collapse to 2.5%, equity moves sideways.',
    historicalContext: 'Severe interbank shadow banking liquidity crunch; commercial paper markets seized up and fixed-income returns plummeted.',
    impactTag: 'Debt Yield Collapse',
    severity: 'SEVERE',
    icon: '🏦',
  },
  {
    id: 'bop_crisis_1991',
    label: '1991 BOP Currency Crisis',
    category: 'indian',
    categoryLabel: 'Indian Market Crisis',
    desc: 'Runaway 13.8% CPI inflation spike with severe rupee devaluation and emergency gold pledging.',
    historicalContext: 'Forex reserves dwindled to 3 weeks of imports; living expenses surged dramatically under runaway inflation.',
    impactTag: '13.8% Inflation Spike',
    severity: 'CRITICAL',
    icon: '🚨',
  },
  {
    id: 'lehman_2008',
    label: '2008 Lehman Shock',
    category: 'global',
    categoryLabel: 'Global Contagion',
    desc: '-42% severe portfolio drawdown in Year 1 with sluggish 3-year global contagion recovery.',
    historicalContext: 'Global Financial Crisis subprime collapse; foreign institutional investors liquidated ~₹48,000 Cr in Indian equities.',
    impactTag: '-42% Global Contagion',
    severity: 'SEVERE',
    icon: '📉',
  },
  {
    id: 'covid_2020',
    label: '2020 Covid Flash-Crash',
    category: 'global',
    categoryLabel: 'Global Contagion',
    desc: '-28% instant crash in Year 1 followed by massive monetary easing and rapid +32% bounce.',
    historicalContext: 'Fastest 30% drop in Indian stock market history, followed by historic retail participation surge and central bank liquidity.',
    impactTag: '-28% Flash Crash & Bounce',
    severity: 'MODERATE',
    icon: '⚡',
  },
  {
    id: 'tech_winter',
    label: 'Tech Layoff Freeze',
    category: 'domestic',
    categoryLabel: 'Domestic Shock',
    desc: '18 months of zero active monthly SIP additions due to tech restructuring or hiring freeze.',
    historicalContext: 'Simulates prolonged career disruption or salary freeze where accumulation halts while living costs continue compounding.',
    impactTag: '18-Mo Zero SIP Freeze',
    severity: 'MODERATE',
    icon: '❄️',
  },
  {
    id: 'medical_emergency',
    label: 'Medical Catastrophe',
    category: 'domestic',
    categoryLabel: 'Domestic Shock',
    desc: 'Sudden ₹15 Lakh out-of-pocket tertiary hospital shock in Year 2 of early retirement.',
    historicalContext: 'Exhausts emergency reserves immediately, forcing distressed redemption of equity units during early decumulation years.',
    impactTag: '-₹15 Lakh Cash Outflow',
    severity: 'SEVERE',
    icon: '🏥',
  },
  {
    id: 'stagflation_spike',
    label: '11% Stagflation Spike',
    category: 'domestic',
    categoryLabel: 'Domestic Shock',
    desc: 'Persistent 11.5% inflation with 4.5% depressed equity returns for 4 consecutive years.',
    historicalContext: 'Double-whammy macroeconomic regime: costs escalate aggressively while portfolio real purchasing power suffers severe negative drag.',
    impactTag: '11.5% Stagflation Grind',
    severity: 'CRITICAL',
    icon: '🔥',
  },
];

export const ReverseMonteCarloModal: React.FC<ReverseMonteCarloModalProps> = ({
  isOpen,
  onClose,
  plan,
  summary,
}) => {
  // Navigation & State
  const [activeTab, setActiveTab] = useState<ModalTab>('cockpit');
  const [categoryFilter, setCategoryFilter] = useState<ScenarioCategory>('all');
  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedSeed, setCopiedSeed] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);

  // Simulation Controls & Hyperparameters
  const [simCount, setSimCount] = useState<number>(5000);
  const [scenario, setScenario] = useState<StressScenario>('baseline');
  const [randomSeed, setRandomSeed] = useState<number>(42);

  // Percentile visibility toggles
  const [visibleTrajectories, setVisibleTrajectories] = useState({
    p95: true,
    p75: true,
    p50: true,
    p25: true,
    p5: true,
  });

  // What-If Levers (derived initially from user live plan)
  const baselineCorpus = Math.max(500000, (plan?.savings?.emergencyFundBalance || 0) * 4 || 2500000);
  const baselineMonthlySavings = Math.max(5000, ((plan?.savings?.monthlySip || 0) + (plan?.savings?.monthlySavings || 0)) || summary.monthlySurplus || 40000);
  const baselineMonthlyBurn = Math.max(20000, summary.monthlyExpenses || 60000);

  const [startingCorpus, setStartingCorpus] = useState<number>(baselineCorpus);
  const [monthlySavings, setMonthlySavings] = useState<number>(baselineMonthlySavings);
  const [monthlyRetirementBurn, setMonthlyRetirementBurn] = useState<number>(baselineMonthlyBurn);
  const [equityRatio, setEquityRatio] = useState<number>(0.70);
  const [customRetireYears, setCustomRetireYears] = useState<number>(10);
  const [customHorizonYears, setCustomHorizonYears] = useState<number>(30);

  // Interactive Year Hover
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Execute Active Scenario Simulation
  const result: MonteCarloResult = useMemo(() => {
    return runMonteCarloSimulation({
      currentCorpus: startingCorpus,
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
    startingCorpus,
    monthlySavings,
    monthlyRetirementBurn,
    customRetireYears,
    customHorizonYears,
    equityRatio,
    simCount,
    scenario,
    randomSeed,
  ]);

  // Execute Comparative Baseline Simulation (if crisis active)
  const baselineResult: MonteCarloResult | null = useMemo(() => {
    if (scenario === 'baseline') return null;
    return runMonteCarloSimulation({
      currentCorpus: startingCorpus,
      monthlySavings,
      monthlyRetirementBurn,
      yearsToRetire: customRetireYears,
      yearsInRetirement: customHorizonYears,
      equityRatio,
      numSimulations: simCount,
      scenario: 'baseline',
      randomSeed,
    });
  }, [
    startingCorpus,
    monthlySavings,
    monthlyRetirementBurn,
    customRetireYears,
    customHorizonYears,
    equityRatio,
    simCount,
    scenario,
    randomSeed,
  ]);

  const handleResetToBaseline = () => {
    setStartingCorpus(baselineCorpus);
    setMonthlySavings(baselineMonthlySavings);
    setMonthlyRetirementBurn(baselineMonthlyBurn);
    setEquityRatio(0.70);
    setCustomRetireYears(10);
    setCustomHorizonYears(30);
  };

  const handleCopyReport = () => {
    const activeScenario = SCENARIOS.find((s) => s.id === scenario);
    const text = `=== PSFI REVERSE MONTE CARLO & STOCHASTIC STRESS REPORT ===
Scenario: ${activeScenario?.label || scenario} (${activeScenario?.impactTag})
Simulations: ${result.simulationsRun.toLocaleString()} runs | Horizon: ${result.accumulationYears}y accumulation + ${result.retirementYears}y retirement (${result.totalYears}y total)
Portfolio: ${(equityRatio * 100).toFixed(0)}% Equity / ${((1 - equityRatio) * 100).toFixed(0)}% Debt
Starting Capital: ${formatINR(startingCorpus)} | Monthly SIP: ${formatINR(monthlySavings)}/mo | Retirement Burn: ${formatINR(monthlyRetirementBurn)}/mo

[ACTUARIAL TELEMETRY]
Antifragility Score: ${result.antifragilityScore} / 100 (${result.antifragilityScore >= 80 ? 'TITAN' : result.antifragilityScore >= 60 ? 'FORTRESS' : 'VULNERABLE'})
Solvency Rate: ${(100 - result.ruinProbabilityPercent).toFixed(1)}% (Ruin Risk: ${result.ruinProbabilityPercent}%)
Sequence Risk Rating (SRR): ${result.srrRiskRating}
Safe Withdrawal Rate (SWR): ${result.safeWithdrawalRatePercent}% (Max Safe Burn: ${formatINR(Math.round(result.medianRetirementCorpus * (result.safeWithdrawalRatePercent / 100) / 12))}/mo)
Recommended Cash Wedge: ${formatINR(result.recommendedCashWedgeRupees)} (${result.recommendedCashWedgeMonths} Months Buffer)
Projected Median Retirement Corpus: ${formatINR(result.medianRetirementCorpus)}
Projected Median Terminal Surplus: ${formatINR(result.medianTerminalCorpus)}

[SAFE WITHDRAWAL RATE BENGEN MATRIX]
${result.swrScenarios.map((s) => `• ${s.swrPercent}% SWR: ${formatINR(s.annualWithdrawalRupees)}/yr (${formatINR(Math.round(s.annualWithdrawalRupees / 12))}/mo) — ${s.successProbabilityPercent}% Survival (${s.verdict})`).join('\n')}

Verdict: "${result.actuarialVerdict}"
Tactical Advice: "${result.srrExplanation}"
Generated client-side via Pseudo-Fi Sovereign Actuarial Engine (Seed #${randomSeed})
============================================================`;

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2200);
  };

  const handleCopySeed = () => {
    navigator.clipboard.writeText(String(randomSeed));
    setCopiedSeed(true);
    setTimeout(() => setCopiedSeed(false), 1800);
  };

  if (!isOpen) return null;

  const activeScenarioMeta = SCENARIOS.find((s) => s.id === scenario) || SCENARIOS[0];

  const filteredScenarios = SCENARIOS.filter((sc) => {
    if (categoryFilter === 'all') return true;
    return sc.category === categoryFilter;
  });

  // SVG Chart Geometry
  const width = 860;
  const height = 270;
  const padLeft = 80;
  const padRight = 30;
  const padTop = 24;
  const padBottom = 34;

  const maxCorpus = Math.max(
    ...result.trajectories.map((t) => t.p95),
    result.medianRetirementCorpus * 1.5,
    10000000
  );

  const scaleX = (yr: number) => padLeft + (yr / result.totalYears) * (width - padLeft - padRight);
  const scaleY = (val: number) => height - padBottom - (Math.min(val, maxCorpus) / maxCorpus) * (height - padTop - padBottom);

  const p95Points = result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p95)}`).join(' ');
  const p75Points = result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p75)}`).join(' ');
  const p50Points = result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p50)}`).join(' ');
  const p25Points = result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p25)}`).join(' ');
  const p5Points = result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p5)}`).join(' ');

  const fanAreaPoints = [
    ...result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p95)}`),
    ...[...result.trajectories].reverse().map((t) => `${scaleX(t.year)},${scaleY(t.p5)}`),
  ].join(' ');

  const innerFanAreaPoints = [
    ...result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p75)}`),
    ...[...result.trajectories].reverse().map((t) => `${scaleX(t.year)},${scaleY(t.p25)}`),
  ].join(' ');

  const retirementSplitX = scaleX(result.accumulationYears);

  const handlePointerInteraction = (clientX: number) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const svgX = (mouseX / rect.width) * width;
    if (svgX < padLeft || svgX > width - padRight) {
      setHoveredYear(null);
      return;
    }
    const ratio = (svgX - padLeft) / (width - padLeft - padRight);
    const yr = Math.round(ratio * result.totalYears);
    setHoveredYear(Math.max(0, Math.min(result.totalYears, yr)));
  };

  const hoveredTrajectory = hoveredYear !== null ? result.trajectories[hoveredYear] : null;

  // Solvency Calculations
  const survivalRate = Math.max(0, 100 - result.ruinProbabilityPercent);
  const isHealthySolvency = survivalRate >= 90;
  const isCautionSolvency = survivalRate >= 75 && survivalRate < 90;

  // Gauge SVG math (240 degree arc)
  const gaugeRadius = 52;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius * (240 / 360);
  const strokeDashoffset = gaugeCircumference - (survivalRate / 100) * gaugeCircumference;

  return (
    <div className="monte-carlo-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Reverse Monte Carlo FIRE Simulator">
      <div className="monte-carlo-modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="monte-carlo-scanline" />

        {/* 1. EXECUTIVE HEADER */}
        <header className="p-4 sm:p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Activity size={20} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold font-sans tracking-tight text-white m-0">
                  Reverse Monte Carlo FIRE Simulator
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                  {simCount.toLocaleString()} Stochastic Paths
                </span>
                <button
                  type="button"
                  onClick={handleCopySeed}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-950/50 border border-purple-500/30 text-purple-300 hover:bg-purple-900/50 transition-colors"
                  title="Deterministic PRNG Seed"
                >
                  Seed #{randomSeed} {copiedSeed && '✓'}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate m-0">
                Box-Muller client-side simulation modeling historical Indian black swans, runaway CPI inflation &amp; sequence risk.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Iteration Selector */}
            <div className="flex items-center gap-1 bg-slate-900/80 border border-white/10 rounded-xl p-1 text-xs font-mono">
              <button
                type="button"
                className={`px-2 py-1 rounded-lg text-[10.5px] transition-all ${
                  simCount === 5000
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                onClick={() => setSimCount(5000)}
                title="5,000 stochastic lifespan paths"
              >
                5k
              </button>
              <button
                type="button"
                className={`px-2 py-1 rounded-lg text-[10.5px] transition-all ${
                  simCount === 10000
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                onClick={() => setSimCount(10000)}
                title="10,000 stochastic paths (maximum confidence)"
              >
                10k
              </button>

              <div className="w-[1px] h-3.5 bg-white/10 mx-0.5" />

              <button
                type="button"
                className="px-2 py-1 rounded-lg text-[10.5px] flex items-center gap-1 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                onClick={() => setRandomSeed(Math.floor(Math.random() * 900000) + 100000)}
                title="Roll new stochastic seed"
              >
                <Dices size={12} />
                <span>New Run</span>
              </button>
            </div>

            {/* Copy Fiduciary Audit */}
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 bg-slate-900/80 border border-white/10 text-slate-200 hover:text-white hover:border-cyan-500/50 transition-all shadow-sm"
              onClick={handleCopyReport}
              title="Copy Full Fiduciary Audit to Clipboard"
            >
              {copiedReport ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copiedReport ? 'Copied Audit!' : 'Copy Audit'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors border border-transparent hover:border-white/10"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* 2. PERSPECTIVE TABS */}
        <nav className="px-4 sm:px-5 pt-3 pb-2 border-b border-white/5 flex items-center justify-between gap-2 overflow-x-auto bg-slate-950/20">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('cockpit')}
              className={`monte-tab-btn ${activeTab === 'cockpit' ? 'active' : ''}`}
            >
              <Compass size={14} />
              <span>Horizon Cockpit</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('crises')}
              className={`monte-tab-btn ${activeTab === 'crises' ? 'active' : ''}`}
            >
              <Flame size={14} />
              <span>Historical Crises ({SCENARIOS.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('wedge_swr')}
              className={`monte-tab-btn ${activeTab === 'wedge_swr' ? 'active' : ''}`}
            >
              <ShieldCheck size={14} />
              <span>Safe SWR &amp; Cash Wedge</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('levers')}
              className={`monte-tab-btn ${activeTab === 'levers' ? 'active' : ''}`}
            >
              <Sliders size={14} />
              <span>What-If Lab</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 shrink-0">
            <span className="text-[11px] text-slate-500">Regime:</span>
            <span className="font-bold text-cyan-300 flex items-center gap-1 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-md text-[11px]">
              <span>{activeScenarioMeta.icon}</span>
              <span>{activeScenarioMeta.label}</span>
            </span>
          </div>
        </nav>

        {/* 3. MAIN MODAL BODY */}
        <div className="p-4 sm:p-5 max-h-[calc(88vh-130px)] overflow-y-auto space-y-4">

          {/* =============================================================== */}
          {/* TAB 1: HORIZON COCKPIT */}
          {/* =============================================================== */}
          {activeTab === 'cockpit' && (
            <div className="space-y-4">

              {/* HERO ACTUARIAL SOLVENCY HUD */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-950/80 border border-white/10 shadow-xl relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  
                  {/* Gauge Widget (Left 4 cols) */}
                  <div className="md:col-span-4 flex items-center gap-4 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-4">
                    <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-120" viewBox="0 0 120 120">
                        {/* Background track */}
                        <circle
                          cx="60"
                          cy="60"
                          r={gaugeRadius}
                          fill="none"
                          stroke="rgba(255, 255, 255, 0.08)"
                          strokeWidth="10"
                          strokeDasharray={gaugeCircumference}
                          strokeLinecap="round"
                        />
                        {/* Value arc */}
                        <circle
                          cx="60"
                          cy="60"
                          r={gaugeRadius}
                          fill="none"
                          stroke={isHealthySolvency ? '#10b981' : isCautionSolvency ? '#f59e0b' : '#f43f5e'}
                          strokeWidth="10"
                          strokeDasharray={gaugeCircumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>
                      {/* Center Gauge Text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className={`text-2xl font-extrabold font-mono tracking-tight ${isHealthySolvency ? 'text-emerald-400' : isCautionSolvency ? 'text-amber-400' : 'text-rose-400'}`}>
                          {survivalRate.toFixed(0)}%
                        </span>
                        <span className="text-[9.5px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                          Solvency
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded ${
                          result.antifragilityScore >= 80 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' :
                          result.antifragilityScore >= 60 ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30' :
                          result.antifragilityScore >= 40 ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30' :
                          'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                        }`}>
                          {result.antifragilityScore >= 80 ? 'TITAN GRADE' : result.antifragilityScore >= 60 ? 'FORTRESS' : result.antifragilityScore >= 40 ? 'MODERATE' : 'VULNERABLE'}
                        </span>
                        <span className="text-xs font-mono font-bold text-white">
                          {result.antifragilityScore}/100
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 m-0 leading-tight">
                        {isHealthySolvency ? 'Superior black swan resilience.' : 'Subject to premature decumulation strain.'}
                      </p>
                      <span className="text-[10px] text-slate-500 block font-mono">
                        Ruin Probability: <strong className={result.ruinProbabilityPercent > 10 ? 'text-rose-400' : 'text-emerald-400'}>{result.ruinProbabilityPercent}%</strong>
                      </span>
                    </div>
                  </div>

                  {/* 3 Core Telemetry Pillars (Right 8 cols) */}
                  <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    
                    {/* Pillar 1: Safe SWR Ceiling */}
                    <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
                        <span>Safe SWR Ceiling</span>
                        <span className="text-cyan-400 font-bold">≥90% Safe</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold font-mono text-cyan-300">
                          {result.safeWithdrawalRatePercent}%
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">/ yr</span>
                      </div>
                      <div className="text-[10.5px] font-mono text-slate-400 truncate">
                        Safe: <strong className="text-cyan-300">{formatINR(Math.round(result.medianRetirementCorpus * (result.safeWithdrawalRatePercent / 100) / 12))}/mo</strong>
                      </div>
                      <div className="text-[9.5px] text-slate-500 truncate pt-0.5 border-t border-white/5">
                        Planned: {formatINR(monthlyRetirementBurn)}/mo ({result.plannedWithdrawalRatePercent}% burn)
                      </div>
                    </div>

                    {/* Pillar 2: Cash Wedge Buffer */}
                    <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
                        <span>Sequence Risk Buffer</span>
                        <span className={`font-bold ${result.srrRiskRating === 'LOW' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {result.srrRiskRating}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold font-mono text-amber-400">
                          {formatINR(result.recommendedCashWedgeRupees)}
                        </span>
                      </div>
                      <div className="text-[10.5px] font-mono text-slate-400 truncate">
                        Runway: <strong className="text-amber-300">{result.recommendedCashWedgeMonths} Months Cash</strong>
                      </div>
                      <div className="text-[9.5px] text-slate-500 truncate pt-0.5 border-t border-white/5">
                        Insulates Years 1–3 drawdown
                      </div>
                    </div>

                    {/* Pillar 3: Median Nest Egg */}
                    <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
                        <span>Retirement Nest Egg</span>
                        <span className="text-purple-300 font-bold">Yr {result.accumulationYears}</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold font-mono text-white">
                          {formatINR(result.medianRetirementCorpus)}
                        </span>
                      </div>
                      <div className="text-[10.5px] font-mono text-slate-400 truncate">
                        Terminal: <strong className="text-purple-300">{formatINR(result.medianTerminalCorpus)}</strong>
                      </div>
                      <div className="text-[9.5px] text-slate-500 truncate pt-0.5 border-t border-white/5">
                        {result.depletionHorizon.worstCaseDepletionYear === null ? 'Full 30y Solvency' : `Depletes in Yr ${result.depletionHorizon.worstCaseDepletionYear}`}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Scenario Delta Bar (if crisis active) */}
                {baselineResult && (
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
                    <span className="text-cyan-300 font-semibold flex items-center gap-1.5">
                      <span>{activeScenarioMeta.icon}</span>
                      <span>{activeScenarioMeta.label} Shock vs Baseline:</span>
                    </span>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span>Ruin Risk: <strong className="text-slate-300">{baselineResult.ruinProbabilityPercent}%</strong> &rarr; <strong className="text-rose-400">{result.ruinProbabilityPercent}%</strong></span>
                      <span>Safe SWR: <strong className="text-slate-300">{baselineResult.safeWithdrawalRatePercent}%</strong> &rarr; <strong className="text-cyan-300">{result.safeWithdrawalRatePercent}%</strong></span>
                      <button
                        type="button"
                        onClick={() => setScenario('baseline')}
                        className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                      >
                        Reset to Baseline
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* INTERACTIVE PERCENTILE FAN CHART */}
              <div className="monte-chart-canvas-wrap">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1 text-xs">
                  {/* Legend toggles */}
                  <div className="flex items-center gap-2 font-mono text-[11px] flex-wrap">
                    <button
                      type="button"
                      onClick={() => setVisibleTrajectories((p) => ({ ...p, p95: !p.p95 }))}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
                        visibleTrajectories.p95 ? 'text-emerald-400 font-semibold bg-emerald-950/30 border border-emerald-500/20' : 'text-slate-600 line-through'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                      95th (Bull)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibleTrajectories((p) => ({ ...p, p75: !p.p75 }))}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
                        visibleTrajectories.p75 ? 'text-purple-300 font-semibold bg-purple-950/30 border border-purple-500/20' : 'text-slate-600 line-through'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      75th (Opt)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibleTrajectories((p) => ({ ...p, p50: !p.p50 }))}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
                        visibleTrajectories.p50 ? 'text-cyan-400 font-semibold bg-cyan-950/30 border border-cyan-500/20' : 'text-slate-600 line-through'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
                      50th (Median)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibleTrajectories((p) => ({ ...p, p25: !p.p25 }))}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
                        visibleTrajectories.p25 ? 'text-amber-400 font-semibold bg-amber-950/30 border border-amber-500/20' : 'text-slate-600 line-through'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      25th (Cons)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibleTrajectories((p) => ({ ...p, p5: !p.p5 }))}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
                        visibleTrajectories.p5 ? 'text-rose-400 font-semibold bg-rose-950/30 border border-rose-500/20' : 'text-slate-600 line-through'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_6px_#f43f5e]" />
                      5th (Floor)
                    </button>
                  </div>

                  <div className="font-mono text-[11px] text-slate-400">
                    Crossover: <strong className="text-amber-400 font-semibold">Year {result.accumulationYears} (Retirement)</strong>
                  </div>
                </div>

                {/* Floating Inspection Card */}
                {hoveredTrajectory && (
                  <div className="monte-chart-hud-box">
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1 mb-1.5">
                      <span className="font-mono font-bold text-xs text-white">
                        Year {hoveredTrajectory.year} ({hoveredTrajectory.year <= result.accumulationYears ? `Accumulation Yr ${hoveredTrajectory.year}` : `Retirement Yr ${hoveredTrajectory.year - result.accumulationYears}`})
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        hoveredTrajectory.year < result.accumulationYears
                          ? 'bg-cyan-950/80 text-cyan-300'
                          : 'bg-amber-950/80 text-amber-300'
                      }`}>
                        {hoveredTrajectory.year < result.accumulationYears ? 'Accumulation Phase' : 'Decumulation Phase'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10.5px]">
                      <div className="text-slate-400">95th (Bull): <strong className="text-emerald-400">{formatINR(hoveredTrajectory.p95)}</strong></div>
                      <div className="text-slate-400">75th (Opt): <strong className="text-purple-300">{formatINR(hoveredTrajectory.p75)}</strong></div>
                      <div className="text-slate-400">50th (Median): <strong className="text-cyan-300">{formatINR(hoveredTrajectory.p50)}</strong></div>
                      <div className="text-slate-400">25th (Cons): <strong className="text-amber-400">{formatINR(hoveredTrajectory.p25)}</strong></div>
                      <div className="text-slate-400 col-span-2">5th (Worst-Case): <strong className="text-rose-400">{formatINR(hoveredTrajectory.p5)}</strong></div>
                    </div>
                  </div>
                )}

                {/* SVG Canvas */}
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full h-64 sm:h-72 select-none cursor-crosshair touch-none"
                  onMouseMove={(e) => handlePointerInteraction(e.clientX)}
                  onMouseLeave={() => setHoveredYear(null)}
                  onTouchMove={(e) => e.touches?.[0] && handlePointerInteraction(e.touches[0].clientX)}
                  onTouchStart={(e) => e.touches?.[0] && handlePointerInteraction(e.touches[0].clientX)}
                  onTouchEnd={() => setHoveredYear(null)}
                >
                  <defs>
                    <linearGradient id="fanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="innerFanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.06" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = height - padBottom - ratio * (height - padTop - padBottom);
                    const val = ratio * maxCorpus;
                    return (
                      <g key={ratio}>
                        <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                        <text x={padLeft - 10} y={y + 3} textAnchor="end" fill="#64748b" fontSize="9.5" fontFamily="monospace">
                          {formatINR(Math.round(val))}
                        </text>
                      </g>
                    );
                  })}

                  {/* Fan Fills */}
                  {visibleTrajectories.p95 && visibleTrajectories.p5 && (
                    <polygon points={fanAreaPoints} fill="url(#fanGrad)" />
                  )}
                  {visibleTrajectories.p75 && visibleTrajectories.p25 && (
                    <polygon points={innerFanAreaPoints} fill="url(#innerFanGrad)" />
                  )}

                  {/* Polylines */}
                  {visibleTrajectories.p95 && (
                    <polyline points={p95Points} fill="none" stroke="#10b981" strokeWidth="1.8" strokeDasharray="3 3" opacity="0.85" />
                  )}
                  {visibleTrajectories.p75 && (
                    <polyline points={p75Points} fill="none" stroke="#8b5cf6" strokeWidth="1.4" opacity="0.65" />
                  )}
                  {visibleTrajectories.p50 && (
                    <polyline points={p50Points} fill="none" stroke="#06b6d4" strokeWidth="2.8" />
                  )}
                  {visibleTrajectories.p25 && (
                    <polyline points={p25Points} fill="none" stroke="#f59e0b" strokeWidth="1.4" opacity="0.65" />
                  )}
                  {visibleTrajectories.p5 && (
                    <polyline points={p5Points} fill="none" stroke="#f43f5e" strokeWidth="1.8" strokeDasharray="3 3" opacity="0.9" />
                  )}

                  {/* Retirement Divider */}
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
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    RETIREMENT CROSSOVER (YR {result.accumulationYears})
                  </text>

                  {/* Hover Crosshair */}
                  {hoveredYear !== null && (
                    <g>
                      <line
                        x1={scaleX(hoveredYear)}
                        y1={padTop}
                        x2={scaleX(hoveredYear)}
                        y2={height - padBottom}
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />
                      {visibleTrajectories.p95 && (
                        <circle cx={scaleX(hoveredYear)} cy={scaleY(result.trajectories[hoveredYear].p95)} r="4" fill="#10b981" stroke="#fff" strokeWidth="1" />
                      )}
                      {visibleTrajectories.p50 && (
                        <circle cx={scaleX(hoveredYear)} cy={scaleY(result.trajectories[hoveredYear].p50)} r="5" fill="#06b6d4" stroke="#fff" strokeWidth="1.5" />
                      )}
                      {visibleTrajectories.p5 && (
                        <circle cx={scaleX(hoveredYear)} cy={scaleY(result.trajectories[hoveredYear].p5)} r="4" fill="#f43f5e" stroke="#fff" strokeWidth="1" />
                      )}
                    </g>
                  )}

                  {/* X Axis Labels */}
                  {Array.from({ length: 7 }).map((_, idx) => {
                    const yr = Math.round((idx / 6) * result.totalYears);
                    const x = scaleX(yr);
                    return (
                      <text key={idx} x={x} y={height - 10} textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontFamily="monospace">
                        Yr {yr}
                      </text>
                    );
                  })}
                </svg>

                {/* Tactile Scrubber Slider */}
                <div className="flex items-center justify-between px-2 pt-2 gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">Scrub Year:</span>
                    <input
                      type="range"
                      min="0"
                      max={result.totalYears}
                      value={hoveredYear !== null ? hoveredYear : 0}
                      onChange={(e) => setHoveredYear(parseInt(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-700/50 rounded-lg"
                      aria-label="Year Scrubber"
                    />
                    <span className="text-[10.5px] font-mono font-bold text-cyan-400 shrink-0 w-12 text-right">
                      Yr {hoveredYear !== null ? hoveredYear : 0}
                    </span>
                  </div>
                  <div className="text-[10.5px] font-mono text-slate-400">
                    Terminal Median: <strong className="text-cyan-300">{formatINR(result.medianTerminalCorpus)}</strong>
                  </div>
                </div>
              </div>

              {/* TACTICAL LIVE WHAT-IF ADJUSTMENTS DRAWER */}
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-cyan-400" />
                    <span className="font-mono font-bold text-xs uppercase tracking-wider text-slate-200">
                      Live Actuarial Levers (Interactive Sensitivity Tuning)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetToBaseline}
                    className="text-[10.5px] font-mono text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                  >
                    <RotateCcw size={11} />
                    <span>Reset Levers</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Slider 1: Monthly Retirement Burn */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-300">Target Monthly Burn:</span>
                      <span className="font-mono font-bold text-rose-400">{formatINR(monthlyRetirementBurn)}/mo</span>
                    </div>
                    <input
                      type="range"
                      min="20000"
                      max="300000"
                      step="5000"
                      value={monthlyRetirementBurn}
                      onChange={(e) => setMonthlyRetirementBurn(parseInt(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer h-1.5"
                    />
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>₹20k/mo</span>
                      <span>Safe: {formatINR(Math.round(result.medianRetirementCorpus * (result.safeWithdrawalRatePercent / 100) / 12))}</span>
                      <span>₹300k/mo</span>
                    </div>
                  </div>

                  {/* Slider 2: Asset Allocation */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-300">Equity / Debt Mix:</span>
                      <span className="font-mono font-bold text-purple-300">{(equityRatio * 100).toFixed(0)}% / {((1 - equityRatio) * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.30"
                      max="0.90"
                      step="0.05"
                      value={equityRatio}
                      onChange={(e) => setEquityRatio(parseFloat(e.target.value))}
                      className="w-full accent-purple-500 cursor-pointer h-1.5"
                    />
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>Conservative 30/70</span>
                      <span>Aggressive 90/10</span>
                    </div>
                  </div>

                  {/* Slider 3: Years to Retire */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-300">Accumulation Span:</span>
                      <span className="font-mono font-bold text-cyan-300">{customRetireYears} Years</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="25"
                      step="1"
                      value={customRetireYears}
                      onChange={(e) => setCustomRetireYears(parseInt(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer h-1.5"
                    />
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>3 Years</span>
                      <span>Retire at Yr {customRetireYears}</span>
                      <span>25 Years</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* QUICK SCENARIO CAROUSEL */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame size={14} className="text-amber-400" />
                    <span>Stress Regime Selector (Instant Simulation)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('crises')}
                    className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <span>View all 9 crises</span>
                    <ArrowRight size={12} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {SCENARIOS.slice(0, 6).map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setScenario(sc.id)}
                      className={`scenario-chip-card text-left transition-all ${scenario === sc.id ? 'active' : ''}`}
                    >
                      <div className="text-base mb-1">{sc.icon}</div>
                      <div className="text-xs font-bold text-white truncate">{sc.label}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{sc.impactTag}</div>
                      <div className="mt-2 pt-1 border-t border-white/5 text-[9px] font-mono text-cyan-400">
                        {scenario === sc.id ? 'Active ✓' : 'Test Shock'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: HISTORICAL CRISES (DEEP-DIVE) */}
          {/* =============================================================== */}
          {activeTab === 'crises' && (
            <div className="space-y-4">
              {/* Category Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'indian', 'global', 'domestic', 'baseline'] as ScenarioCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all border ${
                      categoryFilter === cat
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                        : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-white'
                    }`}
                  >
                    {cat === 'all' ? 'All Crises (9)' :
                     cat === 'indian' ? 'Indian Crises 🇮🇳 (3)' :
                     cat === 'global' ? 'Global Shocks 🌐 (2)' :
                     cat === 'domestic' ? 'Domestic Shocks ⚡ (3)' : 'Baseline 📈 (1)'}
                  </button>
                ))}
              </div>

              {/* Grid of Crisis Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredScenarios.map((sc) => (
                  <div
                    key={sc.id}
                    onClick={() => setScenario(sc.id)}
                    className={`scenario-chip-card cursor-pointer p-4 rounded-xl transition-all ${scenario === sc.id ? 'active' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{sc.icon}</span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        sc.severity === 'CRITICAL' ? 'bg-rose-950/80 text-rose-400 border border-rose-500/30' :
                        sc.severity === 'SEVERE' ? 'bg-amber-950/80 text-amber-400 border border-amber-500/30' :
                        sc.severity === 'MODERATE' ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30' :
                        'bg-slate-800 text-slate-300 border border-white/10'
                      }`}>
                        {sc.impactTag}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1 m-0">{sc.label}</h4>
                    <p className="text-xs text-slate-300 mb-2 leading-relaxed m-0">{sc.desc}</p>
                    <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5 text-[11px] text-slate-400 leading-normal">
                      <strong className="text-slate-300 block mb-0.5 font-mono text-[10px] uppercase">Historical Context:</strong>
                      {sc.historicalContext}
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">{sc.categoryLabel}</span>
                      <button
                        type="button"
                        className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg transition-all ${
                          scenario === sc.id
                            ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_#06b6d4]'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {scenario === sc.id ? 'Active Regime ✓' : 'Simulate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 3: SAFE SWR & CASH WEDGE */}
          {/* =============================================================== */}
          {activeTab === 'wedge_swr' && (
            <div className="space-y-4">
              {/* 3-Tier Cash Wedge Blueprint */}
              <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={20} className="text-cyan-400" />
                      <h3 className="text-sm sm:text-base font-bold text-white font-sans m-0">
                        3-Tier Sovereign Cash Wedge Architecture
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 m-0">
                      Construct an Indian retirement cash buffer to eliminate early Sequence of Returns Risk (SRR).
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10.5px] font-mono text-slate-400 block uppercase">Recommended Cushion</span>
                    <span className="text-xl font-bold font-mono text-cyan-300">
                      {formatINR(result.recommendedCashWedgeRupees)}
                    </span>
                    <span className="text-xs font-mono text-slate-400 block">
                      ({result.recommendedCashWedgeMonths} Months Runway)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="wedge-tier-box">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-emerald-400">TIER 1 (MONTHS 1–12)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                        Zero Volatility
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-white mb-1 m-0">Instant Liquid &amp; Overnight Funds</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-2 m-0">
                      Provides living expenses without liquidating equities during major market crashes.
                    </p>
                    <div className="font-mono text-xs text-cyan-300 pt-1 border-t border-white/5">
                      Target: {formatINR(monthlyRetirementBurn * 12)}
                    </div>
                  </div>

                  <div className="wedge-tier-box">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-cyan-400">TIER 2 (MONTHS 13–24)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                        Tax Arbitrage
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-white mb-1 m-0">Arbitrage Funds (Equity Taxation)</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-2 m-0">
                      Captures cash-futures spread with low volatility and qualifies for favorable 12.5% LTCG taxation.
                    </p>
                    <div className="font-mono text-xs text-cyan-300 pt-1 border-t border-white/5">
                      Target: {formatINR(monthlyRetirementBurn * 12)}
                    </div>
                  </div>

                  <div className="wedge-tier-box">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-purple-300">TIER 3 (MONTHS 25–36+)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/30">
                        Yield Inflation
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-white mb-1 m-0">Target Maturity G-Sec &amp; Multi-Asset</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-2 m-0">
                      Locks in sovereign G-Sec yields to replenish Tiers 1 and 2 systematically during bear markets.
                    </p>
                    <div className="font-mono text-xs text-cyan-300 pt-1 border-t border-white/5">
                      Target: {formatINR(monthlyRetirementBurn * Math.max(0, result.recommendedCashWedgeMonths - 24))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bengen SWR Matrix */}
              <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white font-sans m-0">
                      Safe Withdrawal Rate (SWR) Actuarial Matrix
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 m-0">
                      Probability of surviving 30 years across varying annual decumulation withdrawal rates.
                    </p>
                  </div>
                  <div className="text-xs font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
                    Recommended SWR Ceiling: <strong>{result.safeWithdrawalRatePercent}%</strong>
                  </div>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  {result.swrScenarios.map((s) => (
                    <div key={s.swrPercent} className="swr-interactive-row">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm text-white w-14">{s.swrPercent.toFixed(1)}%</span>
                        <div className="text-slate-300">
                          <span>{formatINR(s.annualWithdrawalRupees)}/yr</span>
                          <span className="text-slate-500 text-[10.5px] ml-2">({formatINR(Math.round(s.annualWithdrawalRupees / 12))}/mo)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-24 sm:w-36 h-2 rounded-full bg-slate-800 overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full transition-all ${
                              s.verdict === 'SAFE' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' :
                              s.verdict === 'CAUTION' ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${s.successProbabilityPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-200 w-12 text-right">
                          {s.successProbabilityPercent}%
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-24 text-center ${
                          s.verdict === 'SAFE' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' :
                          s.verdict === 'CAUTION' ? 'bg-amber-950/80 text-amber-400 border border-amber-500/30' :
                          'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                        }`}>
                          {s.verdict}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 4: WHAT-IF LAB */}
          {/* =============================================================== */}
          {activeTab === 'levers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white font-sans m-0">Full Actuarial What-If Lab</h3>
                  <p className="text-xs text-slate-400 m-0">Tune all simulation levers to explore sensitivity and boundary scenarios.</p>
                </div>
                <button
                  type="button"
                  onClick={handleResetToBaseline}
                  className="px-2.5 py-1 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-colors flex items-center gap-1"
                >
                  <RotateCcw size={12} />
                  <span>Reset to Plan Defaults</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Starting Capital */}
                <div className="tactile-lever-card">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-mono">Starting Nest Egg (Corpus):</span>
                    <span className="text-sm font-bold font-mono text-cyan-300">{formatINR(startingCorpus)}</span>
                  </div>
                  <input
                    type="range"
                    min="500000"
                    max="50000000"
                    step="250000"
                    value={startingCorpus}
                    onChange={(e) => setStartingCorpus(parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">Presets:</span>
                    {[2500000, 5000000, 10000000, 20000000].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setStartingCorpus(v)}
                        className={`tactile-preset-btn ${startingCorpus === v ? 'active' : ''}`}
                      >
                        {formatINR(v)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monthly SIP Additions */}
                <div className="tactile-lever-card">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-mono">Monthly Accumulation SIP:</span>
                    <span className="text-sm font-bold font-mono text-emerald-400">{formatINR(monthlySavings)}/mo</span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="300000"
                    step="5000"
                    value={monthlySavings}
                    onChange={(e) => setMonthlySavings(parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">Presets:</span>
                    {[25000, 50000, 100000, 150000].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setMonthlySavings(v)}
                        className={`tactile-preset-btn ${monthlySavings === v ? 'active' : ''}`}
                      >
                        {formatINR(v)}/mo
                      </button>
                    ))}
                  </div>
                </div>

                {/* Monthly Retirement Burn */}
                <div className="tactile-lever-card">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-mono">Target Retirement Burn (Today's INR):</span>
                    <span className="text-sm font-bold font-mono text-rose-400">{formatINR(monthlyRetirementBurn)}/mo</span>
                  </div>
                  <input
                    type="range"
                    min="20000"
                    max="400000"
                    step="5000"
                    value={monthlyRetirementBurn}
                    onChange={(e) => setMonthlyRetirementBurn(parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">Presets:</span>
                    {[40000, 60000, 80000, 120000, 150000].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setMonthlyRetirementBurn(v)}
                        className={`tactile-preset-btn ${monthlyRetirementBurn === v ? 'active' : ''}`}
                      >
                        {formatINR(v)}/mo
                      </button>
                    ))}
                  </div>
                </div>

                {/* Equity Ratio Slider */}
                <div className="tactile-lever-card">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-mono">Asset Allocation (Equity / Debt):</span>
                    <span className="text-sm font-bold font-mono text-purple-300">
                      {(equityRatio * 100).toFixed(0)}% Equity · {((1 - equityRatio) * 100).toFixed(0)}% Debt
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.30"
                    max="0.95"
                    step="0.05"
                    value={equityRatio}
                    onChange={(e) => setEquityRatio(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">Presets:</span>
                    {[0.50, 0.60, 0.70, 0.80, 0.90].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setEquityRatio(r)}
                        className={`tactile-preset-btn ${equityRatio === r ? 'active' : ''}`}
                      >
                        {(r * 100).toFixed(0)}/{(100 - r * 100).toFixed(0)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accumulation Horizon */}
                <div className="tactile-lever-card">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-mono">Accumulation Years to Retire:</span>
                    <span className="text-sm font-bold font-mono text-cyan-300">{customRetireYears} Years</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="25"
                    step="1"
                    value={customRetireYears}
                    onChange={(e) => setCustomRetireYears(parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">Presets:</span>
                    {[5, 7, 10, 15, 20].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setCustomRetireYears(yr)}
                        className={`tactile-preset-btn ${customRetireYears === yr ? 'active' : ''}`}
                      >
                        {yr} Yrs
                      </button>
                    ))}
                  </div>
                </div>

                {/* Retirement Horizon */}
                <div className="tactile-lever-card">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-mono">Decumulation Lifespan Horizon:</span>
                    <span className="text-sm font-bold font-mono text-cyan-300">{customHorizonYears} Years</span>
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
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">Presets:</span>
                    {[20, 25, 30, 35, 40].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setCustomHorizonYears(yr)}
                        className={`tactile-preset-btn ${customHorizonYears === yr ? 'active' : ''}`}
                      >
                        {yr} Yrs
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. COLLAPSIBLE ACTUARIAL ASSUMPTIONS & METHODOLOGY */}
          <div className="rounded-xl bg-slate-900/40 border border-white/5 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setShowAssumptions(!showAssumptions)}
              className="w-full p-3 flex items-center justify-between text-left text-slate-400 hover:text-slate-200 transition-colors font-mono"
            >
              <div className="flex items-center gap-2">
                <Info size={14} className="text-cyan-400" />
                <span className="font-semibold text-xs text-slate-300">
                  Actuarial Model Parameters &amp; Stochastic Assumptions
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span>Box-Muller Normal Dist · Seed #{randomSeed}</span>
                {showAssumptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {showAssumptions && (
              <div className="p-3.5 pt-0 border-t border-white/5 space-y-2.5 font-mono text-[10.5px]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                    <span className="text-slate-300 block font-sans font-medium">Equity (Nifty 50 TRI):</span>
                    <span className="text-cyan-300">μ = 12.5% CAGR, σ = 18.0%</span>
                    <span className="text-slate-500 block text-[9.5px] mt-0.5">Log-normal returns with fat-tail drawdown sampling</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                    <span className="text-slate-300 block font-sans font-medium">Debt &amp; Fixed Income:</span>
                    <span className="text-cyan-300">μ = 7.0%, σ = 3.0%</span>
                    <span className="text-slate-500 block text-[9.5px] mt-0.5">Target maturity G-Sec &amp; corporate bond baseline</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                    <span className="text-slate-300 block font-sans font-medium">Indian CPI Inflation:</span>
                    <span className="text-cyan-300">μ = 6.5%, σ = 2.0%</span>
                    <span className="text-slate-500 block text-[9.5px] mt-0.5">Annual compounding living expense adjustment</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed m-0 pt-1">
                  • <strong>Why Ruin Risk may be high while SWR has safe tiers:</strong> Ruin Risk tests your <em>actual planned withdrawal</em> of {formatINR(monthlyRetirementBurn)}/mo ({result.plannedWithdrawalRatePercent}% of median corpus). Under severe shocks like {activeScenarioMeta.label}, your corpus is depressed, making {formatINR(monthlyRetirementBurn)}/mo unsustainable.<br />
                  • <strong>Safe SWR ({result.safeWithdrawalRatePercent}%):</strong> The maximum percentage rate that <em>survives</em> ≥ 90% of paths in this specific crisis ({formatINR(Math.round(result.medianRetirementCorpus * (result.safeWithdrawalRatePercent / 100) / 12))}/mo at median corpus).
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

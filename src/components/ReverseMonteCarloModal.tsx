import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  TrendingUp,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { FinancePlan, FinanceSummary } from '../types/finance';
import {
  runMonteCarloSimulation,
  type StressScenario,
  type MonteCarloResult,
} from '../lib/monteCarlo';
import { formatINR } from '../lib/finance';

function formatCompactINR(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (abs >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  if (abs >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
  return `₹${Math.round(val)}`;
}

interface ReverseMonteCarloModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: FinancePlan;
  summary: FinanceSummary;
}

type ScenarioCategory = 'all' | 'indian' | 'global' | 'domestic' | 'baseline';
type ModalTab = 'overview' | 'stress' | 'guardrails';

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
  const [activeTab, setActiveTab] = useState<ModalTab>('overview');
  const [categoryFilter, setCategoryFilter] = useState<ScenarioCategory>('all');
  const [copiedReport, setCopiedReport] = useState(false);
  const [showAdvancedLevers, setShowAdvancedLevers] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);

  // Simulation Controls & Hyperparameters
  const [simCount, setSimCount] = useState<number>(5000);
  const [scenario, setScenario] = useState<StressScenario>('baseline');
  const [randomSeed, setRandomSeed] = useState<number>(42);

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

  // Interactive Year Hover on Chart
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



  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const origBodyOverflow = document.body.style.overflow;
    const origDocOverflowX = document.documentElement.style.overflowX;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    return () => {
      document.body.style.overflow = origBodyOverflow;
      document.documentElement.style.overflowX = origDocOverflowX;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const activeScenarioMeta = SCENARIOS.find((s) => s.id === scenario) || SCENARIOS[0];

  const filteredScenarios = SCENARIOS.filter((sc) => {
    if (categoryFilter === 'all') return true;
    return sc.category === categoryFilter;
  });

  // SVG Chart Geometry
  const width = 860;
  const height = 240;
  const padLeft = 62;
  const padRight = 24;
  const padTop = 18;
  const padBottom = 26;

  const maxCorpus = Math.max(
    ...result.trajectories.map((t) => t.p95),
    result.medianRetirementCorpus * 1.4,
    10000000
  );

  const scaleX = (yr: number) => padLeft + (yr / result.totalYears) * (width - padLeft - padRight);
  const scaleY = (val: number) => height - padBottom - (Math.min(val, maxCorpus) / maxCorpus) * (height - padTop - padBottom);

  const p50Points = result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p50)}`).join(' ');

  const confidenceBandPoints = [
    ...result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p95)}`),
    ...[...result.trajectories].reverse().map((t) => `${scaleX(t.year)},${scaleY(t.p5)}`),
  ].join(' ');

  const innerBandPoints = [
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

  const activeHoverYear = hoveredYear !== null ? hoveredYear : result.accumulationYears;
  const hoveredTrajectory = result.trajectories[activeHoverYear] || result.trajectories[0];

  // Solvency calculations
  const survivalRate = Math.max(0, 100 - result.ruinProbabilityPercent);
  const isHealthySolvency = survivalRate >= 85;
  const isCautionSolvency = survivalRate >= 70 && survivalRate < 85;

  // Gauge SVG Math (240° arc spanning from 150° to 30°)
  const gaugeRadius = 46;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius; // ~289.03
  const gaugeArcLength = gaugeCircumference * (240 / 360); // ~192.68
  const strokeDashoffset = gaugeArcLength * (1 - Math.max(0, Math.min(100, survivalRate)) / 100);

  const maxSafeMonthlyBurn = Math.round(
    result.medianRetirementCorpus * (result.safeWithdrawalRatePercent / 100) / 12
  );

  return createPortal(
    <div className="monte-carlo-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Reverse Monte Carlo FIRE Simulator">
      <div className="monte-carlo-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Mobile iOS-style drag handle indicator */}
        <div className="monte-drag-handle" />
        
        {/* ================================================================= */}
        {/* 1. CLEAN EXECUTIVE HEADER                                         */}
        {/* ================================================================= */}
        <header className="monte-header-bar">
          <div className="monte-header-left">
            <div className="monte-header-icon">
              <Activity size={18} className="text-cyan-400" />
            </div>
            <div className="monte-header-title-block min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="monte-header-title text-sm sm:text-base font-bold tracking-tight m-0 text-slate-900 dark:text-white truncate">
                  FIRE Stress Simulator
                </h2>
                <span className="monte-header-badge text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-semibold shrink-0">
                  {simCount >= 1000 ? `${(simCount / 1000).toFixed(0)}k` : simCount} Paths
                </span>
                {scenario !== 'baseline' && (
                  <span className="monte-header-shock-tag text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1 shrink-0">
                    <span>{activeScenarioMeta.icon}</span>
                    <span className="truncate max-w-[85px] sm:max-w-none">{activeScenarioMeta.label}</span>
                  </span>
                )}
              </div>
              <p className="monte-header-subtitle text-xs text-slate-500 dark:text-slate-400 m-0 truncate mt-0.5 hidden sm:block">
                Stochastic lifespan modeling of Indian inflation, equity volatility, and sequence risk.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="monte-header-actions flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Iterations Selector */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 rounded-lg p-0.5 border border-slate-200 dark:border-white/10 text-xs font-mono shrink-0">
              <button
                type="button"
                onClick={() => setSimCount(5000)}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10.5px] sm:text-[11px] transition-all font-semibold ${
                  simCount === 5000
                    ? 'bg-white dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="5,000 simulations"
              >
                5k
              </button>
              <button
                type="button"
                onClick={() => setSimCount(10000)}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10.5px] sm:text-[11px] transition-all font-semibold ${
                  simCount === 10000
                    ? 'bg-white dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="10,000 simulations (max precision)"
              >
                10k
              </button>
              <button
                type="button"
                onClick={() => setRandomSeed(Math.floor(Math.random() * 900000) + 100000)}
                className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors ml-0.5"
                title="Roll new stochastic seed"
                aria-label="New random seed"
              >
                <Dices size={12} />
              </button>
            </div>

            {/* Copy Audit */}
            <button
              type="button"
              onClick={handleCopyReport}
              className="monte-btn-ghost hidden sm:inline-flex items-center gap-1.5 shrink-0"
              title="Copy Fiduciary Audit to Clipboard"
            >
              {copiedReport ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              <span>{copiedReport ? 'Copied' : 'Audit'}</span>
            </button>

            {/* Close Modal - Always pinned top right */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* ================================================================= */}
        {/* 2. REFINED 3-TAB SEGMENTED NAVIGATION                             */}
        {/* ================================================================= */}
        <nav className="monte-nav-bar">
          <div className="monte-segmented-dock">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`monte-segment-btn ${activeTab === 'overview' ? 'active' : ''}`}
            >
              <TrendingUp size={13} className="shrink-0" />
              <span>
                <span className="monte-tab-label-short">Overview</span>
                <span className="monte-tab-label-full">Overview &amp; Trajectory</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stress')}
              className={`monte-segment-btn ${activeTab === 'stress' ? 'active' : ''}`}
            >
              <Flame size={13} className="shrink-0" />
              <span>
                <span className="monte-tab-label-short">Crises (9)</span>
                <span className="monte-tab-label-full">Stress Regimes (9)</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('guardrails')}
              className={`monte-segment-btn ${activeTab === 'guardrails' ? 'active' : ''}`}
            >
              <ShieldCheck size={13} className="shrink-0" />
              <span>
                <span className="monte-tab-label-short">Guardrails</span>
                <span className="monte-tab-label-full">Guardrails &amp; SWR</span>
              </span>
            </button>
          </div>
        </nav>

        {/* ================================================================= */}
        {/* 3. MAIN MODAL BODY                                                */}
        {/* ================================================================= */}
        <div className="p-3 sm:p-5 flex-1 overflow-y-auto overflow-x-hidden space-y-4 min-h-0 monte-modal-body">

          {/* =============================================================== */}
          {/* TAB 1: OVERVIEW & TRAJECTORY                                    */}
          {/* =============================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-5">

              {/* 1.1 EXECUTIVE SOLVENCY HERO CARD */}
              <div className="monte-solvency-hero">
                <div className="monte-solvency-hero-content">
                  
                  {/* Gauge Column */}
                  <div className="monte-hero-gauge-col">
                    <div className="monte-hero-svg-wrap">
                      <svg className="monte-hero-svg" viewBox="0 0 120 120">
                        {/* Background track */}
                        <circle
                          cx="60"
                          cy="60"
                          r={gaugeRadius}
                          fill="none"
                          stroke="currentColor"
                          className="text-slate-200 dark:text-slate-800"
                          strokeWidth="9"
                          strokeDasharray={`${gaugeArcLength} ${gaugeCircumference}`}
                          strokeDashoffset={0}
                          strokeLinecap="round"
                          transform="rotate(150 60 60)"
                        />
                        {/* Animated value arc */}
                        <circle
                          cx="60"
                          cy="60"
                          r={gaugeRadius}
                          fill="none"
                          stroke={isHealthySolvency ? '#10b981' : isCautionSolvency ? '#f59e0b' : '#ef4444'}
                          strokeWidth="9"
                          strokeDasharray={`${gaugeArcLength} ${gaugeCircumference}`}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          transform="rotate(150 60 60)"
                          className="transition-all duration-700 ease-out"
                        />
                        {/* Percentage */}
                        <text
                          x="60"
                          y="56"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={isHealthySolvency ? '#10b981' : isCautionSolvency ? '#f59e0b' : '#ef4444'}
                          fontSize="22"
                          fontWeight="800"
                          fontFamily="monospace"
                        >
                          {survivalRate.toFixed(0)}%
                        </text>
                        {/* SOLVENCY */}
                        <text
                          x="60"
                          y="73"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#94a3b8"
                          fontSize="8.5"
                          fontWeight="700"
                          fontFamily="monospace"
                          letterSpacing="1.2"
                        >
                          SOLVENCY
                        </text>
                      </svg>
                    </div>

                    <div className="text-center space-y-1">
                      <span className={`inline-flex items-center text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                        result.antifragilityScore >= 80 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' :
                        result.antifragilityScore >= 60 ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30' :
                        result.antifragilityScore >= 40 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30' :
                        'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                      }`}>
                        {result.antifragilityScore >= 80 ? 'TITAN GRADE' :
                         result.antifragilityScore >= 60 ? 'FORTRESS' :
                         result.antifragilityScore >= 40 ? 'MODERATE' : 'VULNERABLE'} ({result.antifragilityScore}/100)
                      </span>
                    </div>
                  </div>

                  {/* Story & Verdict Column */}
                  <div className="monte-hero-story-col">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white m-0">
                        {isHealthySolvency ? 'Your Retirement Plan is High-Resilience' :
                         isCautionSolvency ? 'Plan Requires Targeted Buffering' :
                         'High Decumulation Sequence Risk Detected'}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 m-0 leading-relaxed">
                        {isHealthySolvency
                          ? `With a planned burn of ${formatINR(monthlyRetirementBurn)}/mo, your portfolio has an estimated ${survivalRate.toFixed(0)}% probability of sustaining 30 years through Indian bear markets and inflation.`
                          : `At your planned burn of ${formatINR(monthlyRetirementBurn)}/mo (${result.plannedWithdrawalRatePercent}%/yr), your portfolio risks early exhaustion in adverse market regimes. Consider trimming planned burn to ${formatINR(maxSafeMonthlyBurn)}/mo.`}
                      </p>
                    </div>

                    {/* 3 Breathable Metric Tiles */}
                    <div className="monte-vitals-grid">
                      <div className="monte-vital-pill">
                        <span className="monte-vital-label">Safe Ceiling</span>
                        <span className="monte-vital-value text-cyan-600 dark:text-cyan-400">
                          {formatCompactINR(maxSafeMonthlyBurn)}<span className="text-xs font-normal text-slate-500">/mo</span>
                        </span>
                        <span className="monte-vital-sub text-[10px] text-slate-500 font-mono">
                          {result.safeWithdrawalRatePercent}% Safe SWR
                        </span>
                      </div>

                      <div className="monte-vital-pill">
                        <span className="monte-vital-label">Projected Corpus</span>
                        <span className="monte-vital-value text-slate-900 dark:text-white">
                          {formatCompactINR(result.medianRetirementCorpus)}
                        </span>
                        <span className="monte-vital-sub text-[10px] text-slate-500 font-mono">
                          At Yr {result.accumulationYears} Retirement
                        </span>
                      </div>

                      <div className="monte-vital-pill">
                        <span className="monte-vital-label">Sequence Buffer</span>
                        <span className="monte-vital-value text-amber-600 dark:text-amber-400">
                          {result.recommendedCashWedgeMonths} Mo Cash
                        </span>
                        <span className="monte-vital-sub text-[10px] text-slate-500 font-mono">
                          {formatCompactINR(result.recommendedCashWedgeRupees)} Liquid
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Scenario Delta Strip (if active shock) */}
                {baselineResult && (
                  <div className="monte-shock-delta-banner">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{activeScenarioMeta.icon}</span>
                      <span className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                        {activeScenarioMeta.label}:
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Solvency shifts from <strong className="text-slate-900 dark:text-white">{100 - baselineResult.ruinProbabilityPercent}%</strong> to <strong className={result.ruinProbabilityPercent > baselineResult.ruinProbabilityPercent ? 'text-rose-500' : 'text-emerald-500'}>{100 - result.ruinProbabilityPercent}%</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScenario('baseline')}
                      className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline shrink-0"
                    >
                      Reset to Baseline
                    </button>
                  </div>
                )}
              </div>

              {/* 1.2 CLEAN WEALTH TRAJECTORY RIBBON CHART */}
              <div className="monte-chart-wrapper">
                <div className="monte-chart-header">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <TrendingUp size={14} className="text-cyan-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Wealth Corridor
                    </span>
                  </div>

                  {/* Clean readout of currently scrubbed year */}
                  <div className="monte-scrub-readout">
                    <span className="text-slate-500 dark:text-slate-400">
                      Yr {hoveredTrajectory.year}:
                    </span>
                    <strong className="text-cyan-600 dark:text-cyan-400 ml-1">
                      {formatCompactINR(hoveredTrajectory.p50)} Expected
                    </strong>
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] ml-1">
                      ({formatCompactINR(hoveredTrajectory.p5)} – {formatCompactINR(hoveredTrajectory.p95)})
                    </span>
                  </div>
                </div>

                {/* SVG Visual Canvas */}
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full h-52 sm:h-60 select-none cursor-crosshair monte-corridor-svg"
                  style={{ touchAction: 'pan-y' }}
                  onMouseMove={(e) => handlePointerInteraction(e.clientX)}
                  onMouseLeave={() => setHoveredYear(null)}
                >
                  <defs>
                    <linearGradient id="corridorGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.03" />
                    </linearGradient>
                    <linearGradient id="innerCorridorGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.04" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = height - padBottom - ratio * (height - padTop - padBottom);
                    const val = ratio * maxCorpus;
                    return (
                      <g key={ratio}>
                        <line
                          x1={padLeft}
                          y1={y}
                          x2={width - padRight}
                          y2={y}
                          stroke="currentColor"
                          className="text-slate-200 dark:text-slate-800"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={padLeft - 8}
                          y={y + 3}
                          textAnchor="end"
                          fill="#94a3b8"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          {formatCompactINR(val)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Shaded Confidence Ribbon */}
                  <polygon points={confidenceBandPoints} fill="url(#corridorGrad)" />
                  <polygon points={innerBandPoints} fill="url(#innerCorridorGrad)" />

                  {/* Expected Median Path */}
                  <polyline
                    points={p50Points}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Retirement Boundary Line */}
                  <line
                    x1={retirementSplitX}
                    y1={padTop}
                    x2={retirementSplitX}
                    y2={height - padBottom}
                    stroke="#f59e0b"
                    strokeWidth="1.8"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={retirementSplitX}
                    y={padTop + 10}
                    textAnchor="middle"
                    fill="#f59e0b"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="700"
                  >
                    RETIRE AT YR {result.accumulationYears}
                  </text>

                  {/* Interactive Cursor */}
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
                      <circle
                        cx={scaleX(hoveredYear)}
                        cy={scaleY(result.trajectories[hoveredYear].p50)}
                        r="5"
                        fill="#06b6d4"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    </g>
                  )}

                  {/* X Axis Year Labels */}
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const yr = Math.round((idx / 5) * result.totalYears);
                    const x = scaleX(yr);
                    return (
                      <text
                        key={idx}
                        x={x}
                        y={height - 10}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="9.5"
                        fontFamily="monospace"
                      >
                        Yr {yr}
                      </text>
                    );
                  })}
                </svg>

                {/* Tactile Scrubber Track */}
                <div className="monte-scrub-bar">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-[11px] font-mono text-slate-500 shrink-0">Scrub Timeline:</span>
                    <input
                      type="range"
                      min="0"
                      max={result.totalYears}
                      value={activeHoverYear}
                      onChange={(e) => setHoveredYear(parseInt(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer h-1.5 rounded-lg bg-slate-200 dark:bg-slate-700"
                      aria-label="Timeline Year Scrubber"
                    />
                    <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 shrink-0 w-12 text-right">
                      Yr {activeHoverYear}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 font-mono shrink-0 hidden sm:block">
                    Terminal Surplus: <strong className="text-slate-900 dark:text-white">{formatCompactINR(result.medianTerminalCorpus)}</strong>
                  </div>
                </div>
              </div>

              {/* 1.3 ESSENTIAL TACTILE WHAT-IF LEVERS */}
              <div className="monte-levers-container">
                <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} className="text-cyan-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white m-0">
                      Tactile Sensitivity Levers
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetToBaseline}
                    className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw size={12} />
                    <span>Reset Levers</span>
                  </button>
                </div>

                {/* 2 Primary High-Impact Levers */}
                <div className="monte-levers-grid grid grid-cols-1 md:grid-cols-2 gap-3">
                  
                  {/* Lever 1: Planned Retirement Burn */}
                  <div className="monte-lever-card">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        Target Retirement Burn:
                      </span>
                      <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                        {formatINR(monthlyRetirementBurn)}/mo
                      </span>
                    </div>

                    <input
                      type="range"
                      min="20000"
                      max="300000"
                      step="5000"
                      value={monthlyRetirementBurn}
                      onChange={(e) => setMonthlyRetirementBurn(parseInt(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer h-2"
                    />

                    <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400">
                      <span>₹20k/mo</span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                        Safe Ceiling: {formatINR(maxSafeMonthlyBurn)}/mo
                      </span>
                      <span>₹300k/mo</span>
                    </div>
                  </div>

                  {/* Lever 2: Years to Retire */}
                  <div className="monte-lever-card">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        Accumulation Horizon:
                      </span>
                      <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                        {customRetireYears} Years (Yr {new Date().getFullYear() + customRetireYears})
                      </span>
                    </div>

                    <input
                      type="range"
                      min="3"
                      max="25"
                      step="1"
                      value={customRetireYears}
                      onChange={(e) => setCustomRetireYears(parseInt(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer h-2"
                    />

                    <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400">
                      <span>3 Yrs (Aggressive)</span>
                      <span>Retire at Yr {customRetireYears}</span>
                      <span>25 Yrs (Extended)</span>
                    </div>
                  </div>

                </div>

                {/* Collapsible Advanced Parameters */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedLevers(!showAdvancedLevers)}
                    className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <span>{showAdvancedLevers ? 'Hide' : 'Show'} Advanced Portfolio Levers</span>
                    {showAdvancedLevers ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {showAdvancedLevers && (
                    <div className="monte-advanced-levers-grid grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                      {/* Starting Corpus */}
                      <div className="monte-lever-card">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Starting Capital:</span>
                          <span className="font-bold font-mono text-slate-900 dark:text-white">{formatINR(startingCorpus)}</span>
                        </div>
                        <input
                          type="range"
                          min="500000"
                          max="20000000"
                          step="250000"
                          value={startingCorpus}
                          onChange={(e) => setStartingCorpus(parseInt(e.target.value))}
                          className="w-full accent-cyan-500 cursor-pointer h-1.5"
                        />
                      </div>

                      {/* Monthly SIP Additions */}
                      <div className="monte-lever-card">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Monthly SIP:</span>
                          <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatINR(monthlySavings)}/mo</span>
                        </div>
                        <input
                          type="range"
                          min="5000"
                          max="200000"
                          step="5000"
                          value={monthlySavings}
                          onChange={(e) => setMonthlySavings(parseInt(e.target.value))}
                          className="w-full accent-cyan-500 cursor-pointer h-1.5"
                        />
                      </div>

                      {/* Equity/Debt Ratio */}
                      <div className="monte-lever-card">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Equity / Debt Mix:</span>
                          <span className="font-bold font-mono text-purple-600 dark:text-purple-400">
                            {(equityRatio * 100).toFixed(0)}% / {((1 - equityRatio) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.30"
                          max="0.90"
                          step="0.05"
                          value={equityRatio}
                          onChange={(e) => setEquityRatio(parseFloat(e.target.value))}
                          className="w-full accent-cyan-500 cursor-pointer h-1.5"
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: STRESS REGIMES (9 HISTORICAL & DOMESTIC SHOCKS)          */}
          {/* =============================================================== */}
          {activeTab === 'stress' && (
            <div className="space-y-4">
              
              {/* Category Filter Pills */}
              <div className="monte-crisis-chips-row">
                {(['all', 'indian', 'global', 'domestic', 'baseline'] as ScenarioCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`monte-crisis-chip-btn ${
                      categoryFilter === cat ? 'active' : ''
                    }`}
                  >
                    {cat === 'all' ? 'All Crises (9)' :
                     cat === 'indian' ? 'Indian Crises 🇮🇳' :
                     cat === 'global' ? 'Global Shocks 🌐' :
                     cat === 'domestic' ? 'Domestic Shocks ⚡' : 'Baseline 📈'}
                  </button>
                ))}
              </div>

              {/* Grid of Crisis Cards */}
              <div className="monte-crisis-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredScenarios.map((sc) => {
                  const isCurrent = scenario === sc.id;
                  return (
                    <div
                      key={sc.id}
                      onClick={() => setScenario(sc.id)}
                      className={`monte-crisis-card cursor-pointer transition-all ${isCurrent ? 'active' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{sc.icon}</span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          sc.severity === 'CRITICAL' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30' :
                          sc.severity === 'SEVERE' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30' :
                          sc.severity === 'MODERATE' ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30' :
                          'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30'
                        }`}>
                          {sc.impactTag}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white m-0">{sc.label}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 m-0 leading-relaxed">
                        {sc.desc}
                      </p>

                      <div className="mt-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 text-[11px] text-slate-500 leading-normal">
                        <strong className="text-slate-700 dark:text-slate-300 block mb-0.5 font-sans font-semibold">
                          Historical Context:
                        </strong>
                        {sc.historicalContext}
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <span className="text-[10.5px] font-mono text-slate-400">{sc.categoryLabel}</span>
                        <button
                          type="button"
                          className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all ${
                            isCurrent
                              ? 'bg-cyan-500 text-slate-950 font-bold'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isCurrent ? 'Active Regime ✓' : 'Simulate'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 3: GUARDRAILS & SAFE SWR                                     */}
          {/* =============================================================== */}
          {activeTab === 'guardrails' && (
            <div className="space-y-4">
              
              {/* 3-Tier Cash Wedge Architecture */}
              <div className="monte-guardrails-card">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white m-0">
                      3-Tier Sovereign Cash Wedge Architecture
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 m-0">
                      Eliminate Sequence-of-Returns Risk (SRR) by funding early retirement from cash buffers.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-slate-500 uppercase block">Recommended Cash Wedge</span>
                    <span className="text-xl font-bold font-mono text-cyan-600 dark:text-cyan-400">
                      {formatINR(result.recommendedCashWedgeRupees)}
                    </span>
                    <span className="text-xs font-mono text-slate-500 block">
                      ({result.recommendedCashWedgeMonths} Months Runway)
                    </span>
                  </div>
                </div>

                <div className="monte-guardrails-grid grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="monte-wedge-card">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">TIER 1 (MONTHS 1–12)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        Zero Volatility
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white m-0">Instant Liquid &amp; Overnight Funds</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1 m-0">
                      Prevents forced equity sales during early bear market crashes.
                    </p>
                    <div className="font-mono text-xs text-cyan-600 dark:text-cyan-400 pt-2 mt-2 border-t border-slate-100 dark:border-white/5">
                      Target: {formatINR(monthlyRetirementBurn * 12)}
                    </div>
                  </div>

                  <div className="monte-wedge-card">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">TIER 2 (MONTHS 13–24)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                        Tax Arbitrage
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white m-0">Arbitrage Mutual Funds</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1 m-0">
                      Captures risk-free cash-futures spread with favorable 12.5% equity taxation.
                    </p>
                    <div className="font-mono text-xs text-cyan-600 dark:text-cyan-400 pt-2 mt-2 border-t border-slate-100 dark:border-white/5">
                      Target: {formatINR(monthlyRetirementBurn * 12)}
                    </div>
                  </div>

                  <div className="monte-wedge-card">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400">TIER 3 (MONTHS 25–36+)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400">
                        Sovereign Yield
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white m-0">Target Maturity G-Sec Funds</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1 m-0">
                      Locks in sovereign RBI bond yields to systematically replenish Tiers 1 and 2.
                    </p>
                    <div className="font-mono text-xs text-cyan-600 dark:text-cyan-400 pt-2 mt-2 border-t border-slate-100 dark:border-white/5">
                      Target: {formatINR(monthlyRetirementBurn * Math.max(0, result.recommendedCashWedgeMonths - 24))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bengen SWR Matrix */}
              <div className="monte-guardrails-card">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white m-0">
                      Safe Withdrawal Rate (SWR) Bengen Matrix
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 m-0">
                      Historical 30-year survival probability across varying annual withdrawal rates.
                    </p>
                  </div>
                  <div className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-lg">
                    Recommended SWR Ceiling: {result.safeWithdrawalRatePercent}%
                  </div>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  {result.swrScenarios.map((s) => (
                    <div key={s.swrPercent} className="monte-swr-row">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm text-slate-900 dark:text-white w-14">
                          {s.swrPercent.toFixed(1)}%
                        </span>
                        <div className="text-slate-600 dark:text-slate-300">
                          <span>{formatINR(s.annualWithdrawalRupees)}/yr</span>
                          <span className="text-slate-400 text-[10.5px] ml-2">
                            ({formatINR(Math.round(s.annualWithdrawalRupees / 12))}/mo)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-24 sm:w-36 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full transition-all ${
                              s.verdict === 'SAFE' ? 'bg-emerald-500' :
                              s.verdict === 'CAUTION' ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${s.successProbabilityPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white w-12 text-right">
                          {s.successProbabilityPercent}%
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-24 text-center ${
                          s.verdict === 'SAFE' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' :
                          s.verdict === 'CAUTION' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30' :
                          'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
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
          {/* 4. METHODOLOGY & ASSUMPTIONS ACCORDION                           */}
          {/* =============================================================== */}
          <div className="monte-assumptions-box">
            <button
              type="button"
              onClick={() => setShowAssumptions(!showAssumptions)}
              className="w-full p-3 flex items-center justify-between text-left text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info size={14} className="text-cyan-500" />
                <span className="text-xs font-semibold">
                  Actuarial Model Parameters &amp; Stochastic Engine
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span>Box-Muller Normal Dist · Seed #{randomSeed}</span>
                {showAssumptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {showAssumptions && (
              <div className="p-3.5 pt-0 border-t border-slate-200 dark:border-white/5 space-y-2.5 font-mono text-[10.5px]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5">
                    <span className="text-slate-700 dark:text-slate-300 block font-sans font-medium">Equity (Nifty 50 TRI):</span>
                    <span className="text-cyan-600 dark:text-cyan-400">μ = 12.5% CAGR, σ = 18.0%</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5">
                    <span className="text-slate-700 dark:text-slate-300 block font-sans font-medium">Debt &amp; Fixed Income:</span>
                    <span className="text-cyan-600 dark:text-cyan-400">μ = 7.0%, σ = 3.0%</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5">
                    <span className="text-slate-700 dark:text-slate-300 block font-sans font-medium">Indian CPI Inflation:</span>
                    <span className="text-cyan-600 dark:text-cyan-400">μ = 6.5%, σ = 2.0%</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed m-0 pt-1">
                  • <strong>Planned Burn vs Safe SWR:</strong> Ruin Risk calculates whether your planned ₹{monthlyRetirementBurn.toLocaleString('en-IN')}/mo depletes your portfolio over 30 years under severe sequences of negative returns. The Safe SWR ({result.safeWithdrawalRatePercent}%) models the spending rate that survives ≥ 90% of all black swans.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};

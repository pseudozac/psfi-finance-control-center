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
  ChevronRight,
  Clock,
  Zap,
  FileText,
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
type ModalViewTab = 'cockpit' | 'crises' | 'wedge_swr' | 'levers' | 'audit';

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
  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState<ModalViewTab>('cockpit');
  const [categoryFilter, setCategoryFilter] = useState<ScenarioCategory>('all');
  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedSeed, setCopiedSeed] = useState(false);

  // Simulation Controls & Hyperparameters
  const [simCount, setSimCount] = useState<number>(5000);
  const [scenario, setScenario] = useState<StressScenario>('baseline');
  const [randomSeed, setRandomSeed] = useState<number>(42);
  const [compareBaseline, setCompareBaseline] = useState<boolean>(true);

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

  // Hovered Year for Interactive SVG Inspection
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

  // Execute Comparative Baseline Simulation (if crisis active and compare enabled)
  const baselineResult: MonteCarloResult | null = useMemo(() => {
    if (scenario === 'baseline' || !compareBaseline) return null;
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
    compareBaseline,
  ]);

  // Reset what-if levers to saved plan baseline
  const handleResetToBaseline = () => {
    setStartingCorpus(baselineCorpus);
    setMonthlySavings(baselineMonthlySavings);
    setMonthlyRetirementBurn(baselineMonthlyBurn);
    setEquityRatio(0.70);
    setCustomRetireYears(10);
    setCustomHorizonYears(30);
  };

  // Clipboard copy handler
  const handleCopyReport = () => {
    const activeScenario = SCENARIOS.find((s) => s.id === scenario);
    const text = `=== PSFI REVERSE MONTE CARLO & STOCHASTIC STRESS REPORT ===
Scenario: ${activeScenario?.label || scenario} (${activeScenario?.impactTag})
Simulations: ${result.simulationsRun.toLocaleString()} runs | Horizon: ${result.accumulationYears}y accumulation + ${result.retirementYears}y retirement (${result.totalYears}y total)
Portfolio: ${(equityRatio * 100).toFixed(0)}% Equity / ${((1 - equityRatio) * 100).toFixed(0)}% Debt
Starting Capital: ${formatINR(startingCorpus)} | Monthly SIP: ${formatINR(monthlySavings)}/mo | Retirement Burn: ${formatINR(monthlyRetirementBurn)}/mo

[ACTUARIAL TELEMETRY]
Antifragility Score: ${result.antifragilityScore} / 100 (${result.antifragilityScore >= 80 ? 'TITAN' : result.antifragilityScore >= 60 ? 'FORTRESS' : 'VULNERABLE'})
Ruin Probability: ${result.ruinProbabilityPercent}% (Planned Burn: ${result.plannedWithdrawalRatePercent}%/yr)
Worst-Case Solvency: ${result.depletionHorizon.worstCaseDepletionYear === null ? 'Full 30+ Years Preserved' : `${result.depletionHorizon.worstCaseRetirementSolvencyYears} Years Solvency (Depletion Yr ${result.depletionHorizon.worstCaseDepletionYear})`}
Sequence Risk Rating (SRR): ${result.srrRiskRating}
Safe Withdrawal Rate (SWR): ${result.safeWithdrawalRatePercent}% (Max Safe: ${formatINR(Math.round(result.medianRetirementCorpus * (result.safeWithdrawalRatePercent / 100) / 12))}/mo)
Recommended Cash Wedge: ${formatINR(result.recommendedCashWedgeRupees)} (${result.recommendedCashWedgeMonths} Months Runway)
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

  // Filtered scenarios
  const filteredScenarios = SCENARIOS.filter((sc) => {
    if (categoryFilter === 'all') return true;
    return sc.category === categoryFilter;
  });

  const activeScenarioMeta = SCENARIOS.find((s) => s.id === scenario) || SCENARIOS[0];

  // SVG Chart Geometry
  const width = 860;
  const height = 290;
  const padLeft = 85;
  const padRight = 35;
  const padTop = 25;
  const padBottom = 38;

  const maxCorpus = Math.max(
    ...result.trajectories.map((t) => t.p95),
    result.medianRetirementCorpus * 1.5,
    10000000
  );

  const scaleX = (yr: number) => padLeft + (yr / result.totalYears) * (width - padLeft - padRight);
  const scaleY = (val: number) => height - padBottom - (Math.min(val, maxCorpus) / maxCorpus) * (height - padTop - padBottom);

  // Percentile trajectory points
  const p95Points = result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p95)}`).join(' ');
  const p75Points = result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p75)}`).join(' ');
  const p50Points = result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p50)}`).join(' ');
  const p25Points = result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p25)}`).join(' ');
  const p5Points = result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p5)}`).join(' ');

  // Fan chart areas
  const fanAreaPoints = [
    ...result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p95)}`),
    ...[...result.trajectories].reverse().map((t) => `${scaleX(t.year)},${scaleY(t.p5)}`),
  ].join(' ');

  const innerFanAreaPoints = [
    ...result.trajectories.map((t) => `${scaleX(t.year)},${scaleY(t.p75)}`),
    ...[...result.trajectories].reverse().map((t) => `${scaleX(t.year)},${scaleY(t.p25)}`),
  ].join(' ');

  const retirementSplitX = scaleX(result.accumulationYears);

  // Unified Mouse & Touch Scrubbing Handler
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

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    handlePointerInteraction(e.clientX);
  };

  const handleSvgTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches && e.touches.length > 0) {
      handlePointerInteraction(e.touches[0].clientX);
    }
  };

  const handleSvgTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches && e.touches.length > 0) {
      handlePointerInteraction(e.touches[0].clientX);
    }
  };

  const hoveredTrajectory = hoveredYear !== null ? result.trajectories[hoveredYear] : null;

  return (
    <div className="monte-carlo-modal-overlay">
      <div className="monte-carlo-modal-window">
        <div className="monte-carlo-scanline" />

        {/* ================================================================= */}
        {/* 1. HEADER TOOLBAR */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Activity size={22} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold font-sans tracking-tight text-white m-0">
                  Reverse Monte Carlo FIRE Stress-Testing
                </h2>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                  {simCount.toLocaleString()} Stochastic Paths
                </span>
                <button
                  type="button"
                  onClick={handleCopySeed}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-950/50 border border-purple-500/30 text-purple-300 hover:bg-purple-900/50 transition-colors"
                  title="Click to copy deterministic PRNG seed"
                >
                  Seed #{randomSeed} {copiedSeed && '✓'}
                </button>
                <span className="text-[9.5px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md hidden md:inline-flex items-center gap-1">
                  <ShieldCheck size={10} /> 100% Client-Side PRNG
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate m-0">
                Box-Muller stochastic simulation modeling historical Indian black swans, runaway CPI inflation &amp; sequence-of-returns risk.
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
                title="10,000 stochastic paths (maximum statistical confidence)"
              >
                10k
              </button>

              <div className="w-[1px] h-3.5 bg-white/10 mx-0.5" />

              <button
                type="button"
                className="px-2 py-1 rounded-lg text-[10.5px] flex items-center gap-1 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                onClick={() => setRandomSeed(Math.floor(Math.random() * 900000) + 100000)}
                title="Generate new pseudo-random stochastic seed"
              >
                <Dices size={12} />
                <span>New Run</span>
              </button>
              {randomSeed !== 42 && (
                <button
                  type="button"
                  className="px-1.5 py-1 rounded-lg text-[10.5px] text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  onClick={() => setRandomSeed(42)}
                  title="Reset to deterministic baseline Seed #42"
                >
                  <RotateCcw size={11} />
                </button>
              )}
            </div>

            {/* Copy Report */}
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 bg-slate-900/80 border border-white/10 text-slate-200 hover:text-white hover:border-cyan-500/50 transition-all shadow-sm"
              onClick={handleCopyReport}
              title="Copy Full Actuarial Audit Summary to Clipboard"
            >
              {copiedReport ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copiedReport ? 'Copied Audit!' : 'Copy Audit'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors border border-transparent hover:border-white/10"
              aria-label="Close Monte Carlo Modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. NAVIGATION TABS */}
        {/* ================================================================= */}
        <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-white/5 flex items-center justify-between gap-2 overflow-x-auto bg-slate-950/20">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('cockpit')}
              className={`monte-tab-btn ${activeTab === 'cockpit' ? 'active' : ''}`}
            >
              <Compass size={14} />
              <span>Stochastic Cockpit</span>
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
              <span>Cash Wedge &amp; SWR Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('levers')}
              className={`monte-tab-btn ${activeTab === 'levers' ? 'active' : ''}`}
            >
              <Sliders size={14} />
              <span>What-If Levers</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`monte-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            >
              <FileText size={14} />
              <span>Actuarial Certificate</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-slate-400">
            {scenario !== 'baseline' && (
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-cyan-300">
                <input
                  type="checkbox"
                  checked={compareBaseline}
                  onChange={(e) => setCompareBaseline(e.target.checked)}
                  className="rounded accent-cyan-500 cursor-pointer"
                />
                <span>Compare vs Baseline</span>
              </label>
            )}
            <div className="flex items-center gap-1.5">
              <span>Active Scenario:</span>
              <span className="font-bold text-cyan-300 flex items-center gap-1">
                <span>{activeScenarioMeta.icon}</span>
                <span>{activeScenarioMeta.label}</span>
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. MAIN BODY CONTAINER */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-5 max-h-[calc(88vh-130px)] overflow-y-auto space-y-4">

          {/* =============================================================== */}
          {/* TOP TELEMETRY SCORECARD GRID (ALL TABS) */}
          {/* =============================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Antifragility Score */}
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-3.5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                  Antifragility Score
                </span>
                <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded ${
                  result.antifragilityScore >= 80 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' :
                  result.antifragilityScore >= 60 ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30' :
                  result.antifragilityScore >= 40 ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30' :
                  'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                }`}>
                  {result.antifragilityScore >= 80 ? 'TITAN' : result.antifragilityScore >= 60 ? 'FORTRESS' : result.antifragilityScore >= 40 ? 'MODERATE' : 'VULNERABLE'}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 my-2">
                <span className={`text-3xl font-extrabold font-mono tracking-tight ${
                  result.antifragilityScore >= 80 ? 'text-emerald-400' :
                  result.antifragilityScore >= 60 ? 'text-cyan-400' :
                  result.antifragilityScore >= 40 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {result.antifragilityScore}
                </span>
                <span className="text-xs font-mono text-slate-500">/ 100</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    result.antifragilityScore >= 80 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' :
                    result.antifragilityScore >= 60 ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]' :
                    result.antifragilityScore >= 40 ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' :
                    'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                  }`}
                  style={{ width: `${result.antifragilityScore}%` }}
                />
              </div>
              <span className="text-[10.5px] text-slate-400 mt-2 truncate">
                {result.antifragilityScore >= 80 ? 'Superior Indian black swan resilience' : 'Vulnerable to multi-year bear grinds'}
              </span>
            </div>

            {/* Card 2: Planned Burn Ruin Risk */}
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-3.5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                  Planned Burn Ruin Risk
                </span>
                <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded ${
                  result.ruinProbabilityPercent <= 5 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' :
                  result.ruinProbabilityPercent <= 15 ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30' :
                  'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                }`}>
                  {result.ruinProbabilityPercent <= 5 ? 'SAFE CEILING' : result.ruinProbabilityPercent <= 15 ? 'CAUTION' : 'HIGH DEPLETION'}
                </span>
              </div>
              <div className="flex items-baseline gap-2 my-2 flex-wrap">
                <span className={`text-3xl font-extrabold font-mono tracking-tight ${
                  result.ruinProbabilityPercent <= 5 ? 'text-emerald-400' :
                  result.ruinProbabilityPercent <= 15 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {result.ruinProbabilityPercent}%
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  ({result.plannedWithdrawalRatePercent}%/yr burn)
                </span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    result.ruinProbabilityPercent <= 5 ? 'bg-emerald-500' :
                    result.ruinProbabilityPercent <= 15 ? 'bg-amber-500' :
                    'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                  }`}
                  style={{ width: `${Math.min(100, result.ruinProbabilityPercent)}%` }}
                />
              </div>
              <span className="text-[10.5px] text-slate-400 mt-2 truncate">
                {result.depletionHorizon.worstCaseDepletionYear === null
                  ? 'Zero depletion across full retirement horizon'
                  : `Worst-case depletion in Year ${result.depletionHorizon.worstCaseDepletionYear}`}
              </span>
            </div>

            {/* Card 3: Sequence of Returns Risk */}
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-3.5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                  Sequence Risk (SRR)
                </span>
                <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded ${
                  result.srrRiskRating === 'LOW' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' :
                  result.srrRiskRating === 'MODERATE' ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30' :
                  result.srrRiskRating === 'ELEVATED' ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30' :
                  'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                }`}>
                  {result.srrRiskRating} RISK
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 my-2">
                <span className={`text-xl font-bold font-mono tracking-tight ${
                  result.srrRiskRating === 'LOW' ? 'text-emerald-400' :
                  result.srrRiskRating === 'MODERATE' ? 'text-cyan-400' :
                  result.srrRiskRating === 'ELEVATED' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {result.recommendedCashWedgeMonths} Mo Runway
                </span>
              </div>
              <div className="text-[11.5px] font-mono text-cyan-300">
                Recommended Buffer: {formatINR(result.recommendedCashWedgeRupees)}
              </div>
              <span className="text-[10.5px] text-slate-400 mt-2 truncate">
                Years 1–3 decumulation vulnerability insulation
              </span>
            </div>

            {/* Card 4: Safe Withdrawal Rate Ceiling */}
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-3.5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                  Safe SWR Ceiling
                </span>
                <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded ${
                  result.plannedWithdrawalRatePercent <= result.safeWithdrawalRatePercent
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                }`}>
                  {result.plannedWithdrawalRatePercent <= result.safeWithdrawalRatePercent ? 'SUSTAINABLE' : 'EXCEEDS CEILING'}
                </span>
              </div>
              <div className="flex items-baseline gap-2 my-2">
                <span className="text-3xl font-extrabold font-mono tracking-tight text-cyan-300">
                  {result.safeWithdrawalRatePercent}%
                </span>
                <span className="text-xs font-mono text-slate-400">/ year</span>
              </div>
              <div className="text-[11.5px] font-mono text-slate-300">
                Max Safe Burn: <strong className="text-cyan-300">{formatINR(Math.round(result.medianRetirementCorpus * (result.safeWithdrawalRatePercent / 100) / 12))}/mo</strong>
              </div>
              <span className="text-[10.5px] text-slate-400 mt-2 truncate">
                Max rate for &ge; 90% survival in {activeScenarioMeta.label}
              </span>
            </div>
          </div>

          {/* =============================================================== */}
          {/* COMPARATIVE STRESS DELTA BANNER (CRISIS vs BASELINE) */}
          {/* =============================================================== */}
          {baselineResult && (
            <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap text-xs font-mono">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <span>{activeScenarioMeta.icon}</span>
                  <span>{activeScenarioMeta.label} Shock Delta vs Baseline:</span>
                </span>
                {/* Ruin Risk Delta */}
                <span className="flex items-center gap-1">
                  <span className="text-slate-400">Ruin Risk:</span>
                  <span className="text-slate-300">{baselineResult.ruinProbabilityPercent}%</span>
                  <span>&rarr;</span>
                  <span className={`font-bold ${result.ruinProbabilityPercent > baselineResult.ruinProbabilityPercent ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {result.ruinProbabilityPercent}%
                    ({result.ruinProbabilityPercent >= baselineResult.ruinProbabilityPercent ? '+' : ''}
                    {(result.ruinProbabilityPercent - baselineResult.ruinProbabilityPercent).toFixed(1)}%)
                  </span>
                </span>
                {/* SWR Delta */}
                <span className="flex items-center gap-1">
                  <span className="text-slate-400">Safe SWR:</span>
                  <span className="text-slate-300">{baselineResult.safeWithdrawalRatePercent}%</span>
                  <span>&rarr;</span>
                  <span className={`font-bold ${result.safeWithdrawalRatePercent < baselineResult.safeWithdrawalRatePercent ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {result.safeWithdrawalRatePercent}%
                    ({result.safeWithdrawalRatePercent >= baselineResult.safeWithdrawalRatePercent ? '+' : ''}
                    {(result.safeWithdrawalRatePercent - baselineResult.safeWithdrawalRatePercent).toFixed(2)}%)
                  </span>
                </span>
                {/* Antifragility Delta */}
                <span className="flex items-center gap-1">
                  <span className="text-slate-400">Score:</span>
                  <span className="text-slate-300">{baselineResult.antifragilityScore}</span>
                  <span>&rarr;</span>
                  <span className={`font-bold ${result.antifragilityScore < baselineResult.antifragilityScore ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {result.antifragilityScore}
                    ({result.antifragilityScore >= baselineResult.antifragilityScore ? '+' : ''}
                    {result.antifragilityScore - baselineResult.antifragilityScore})
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setScenario('baseline')}
                className="text-xs font-mono px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-colors shadow-sm"
              >
                Reset to Baseline Scenario
              </button>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 1: STOCHASTIC COCKPIT (FAN CHART & ESSENTIALS) */}
          {/* =============================================================== */}
          {activeTab === 'cockpit' && (
            <div className="space-y-4">
              {/* Interactive Fan Chart */}
              <div className="monte-chart-canvas-wrap">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1 text-xs">
                  {/* Legend with Interactive Toggle Filters */}
                  <div className="flex items-center gap-2.5 font-mono text-[11px] flex-wrap">
                    <button
                      type="button"
                      onClick={() => setVisibleTrajectories((p) => ({ ...p, p95: !p.p95 }))}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
                        visibleTrajectories.p95 ? 'text-emerald-400 font-semibold bg-emerald-950/30' : 'text-slate-600 line-through'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]"></span>
                      95th (Bull)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibleTrajectories((p) => ({ ...p, p75: !p.p75 }))}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
                        visibleTrajectories.p75 ? 'text-purple-300 font-semibold bg-purple-950/30' : 'text-slate-600 line-through'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                      75th (Opt)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibleTrajectories((p) => ({ ...p, p50: !p.p50 }))}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
                        visibleTrajectories.p50 ? 'text-cyan-400 font-semibold bg-cyan-950/30' : 'text-slate-600 line-through'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]"></span>
                      50th (Median)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibleTrajectories((p) => ({ ...p, p25: !p.p25 }))}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
                        visibleTrajectories.p25 ? 'text-amber-400 font-semibold bg-amber-950/30' : 'text-slate-600 line-through'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      25th (Cons)
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibleTrajectories((p) => ({ ...p, p5: !p.p5 }))}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
                        visibleTrajectories.p5 ? 'text-rose-400 font-semibold bg-rose-950/30' : 'text-slate-600 line-through'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_6px_#f43f5e]"></span>
                      5th (Worst-Case)
                    </button>
                  </div>

                  <div className="font-mono text-[11px] text-slate-400">
                    Median Corpus at Retirement: <strong className="text-cyan-300">{formatINR(result.medianRetirementCorpus)}</strong>
                  </div>
                </div>

                {/* Floating Inspection Tooltip */}
                {hoveredTrajectory && (
                  <div className="monte-chart-hud-box">
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1 mb-1.5">
                      <span className="font-mono font-bold text-xs text-white">
                        Year {hoveredTrajectory.year} ({hoveredTrajectory.year <= result.accumulationYears ? `Accumulation Yr ${hoveredTrajectory.year}` : `Retirement Yr ${hoveredTrajectory.year - result.accumulationYears}`})
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
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

                {/* SVG Fan Chart Canvas */}
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full h-64 sm:h-72 select-none cursor-crosshair touch-none"
                  onMouseMove={handleSvgMouseMove}
                  onMouseLeave={() => setHoveredYear(null)}
                  onTouchMove={handleSvgTouchMove}
                  onTouchStart={handleSvgTouchStart}
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

                  {/* Horizontal Grid Lines */}
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

                  {/* Outer Fan Area (P5 to P95) */}
                  {visibleTrajectories.p95 && visibleTrajectories.p5 && (
                    <polygon points={fanAreaPoints} fill="url(#fanGrad)" />
                  )}

                  {/* Inner Fan Area (P25 to P75) */}
                  {visibleTrajectories.p75 && visibleTrajectories.p25 && (
                    <polygon points={innerFanAreaPoints} fill="url(#innerFanGrad)" />
                  )}

                  {/* Trajectory Polylines */}
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

                  {/* Retirement Transition Divider Line */}
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

                  {/* Crosshair Cursor on Hover */}
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
                      {/* Percentile Dots */}
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

                  {/* X Axis Timeline Labels */}
                  {Array.from({ length: 7 }).map((_, idx) => {
                    const yr = Math.round((idx / 6) * result.totalYears);
                    const x = scaleX(yr);
                    return (
                      <text key={idx} x={x} y={height - 12} textAnchor="middle" fill="#94a3b8" fontSize="9.5" fontFamily="monospace">
                        Yr {yr}
                      </text>
                    );
                  })}
                </svg>

                {/* Tactile Year Scrubber Bar (Accessible across mobile and desktop) */}
                <div className="flex items-center justify-between px-2 pt-2 gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">Year Scrub:</span>
                    <input
                      type="range"
                      min="0"
                      max={result.totalYears}
                      value={hoveredYear !== null ? hoveredYear : 0}
                      onChange={(e) => setHoveredYear(parseInt(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-700/50 rounded-lg"
                      aria-label="Interactive Year Scrubber"
                    />
                    <span className="text-[10.5px] font-mono font-bold text-cyan-400 shrink-0 w-12 text-right">
                      Yr {hoveredYear !== null ? hoveredYear : 0}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Terminal Year {result.totalYears} Median: <strong className="text-cyan-300">{formatINR(result.medianTerminalCorpus)}</strong>
                  </div>
                </div>
              </div>

              {/* ============================================================= */}
              {/* PORTFOLIO DEPLETION LIFESPAN & SOLVENCY ANATOMY */}
              {/* ============================================================= */}
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-cyan-400" />
                    <span className="font-mono font-bold text-xs uppercase tracking-wider text-slate-200">
                      Decumulation Solvency &amp; Depletion Horizon
                    </span>
                  </div>
                  <span className="text-[10.5px] font-mono text-slate-400">
                    Target Retirement Horizon: {result.retirementYears} Years
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  {/* Worst-Case 5th Percentile Solvency */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-slate-400">5th Percentile (Severe Shock):</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        result.depletionHorizon.worstCaseDepletionYear === null
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                      }`}>
                        {result.depletionHorizon.worstCaseDepletionYear === null ? '100% SOLVENT' : 'PREMATURE DEPLETION'}
                      </span>
                    </div>
                    <div className="text-lg font-bold text-white mb-1.5">
                      {result.depletionHorizon.worstCaseDepletionYear === null
                        ? `${result.retirementYears} / ${result.retirementYears} Years (Zero Depletion)`
                        : `${result.depletionHorizon.worstCaseRetirementSolvencyYears} Years Solvency (Depletes in Yr ${result.depletionHorizon.worstCaseDepletionYear})`}
                    </div>
                    {/* Solvency Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-1">
                      <div
                        className={`h-full rounded-full transition-all ${
                          result.depletionHorizon.worstCaseDepletionYear === null
                            ? 'bg-emerald-500'
                            : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.round((result.depletionHorizon.worstCaseRetirementSolvencyYears / result.retirementYears) * 100))}%`
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">
                      {result.depletionHorizon.worstCaseDepletionYear === null
                        ? 'Capital survives full retirement lifespan even under severe black swans'
                        : `Exhausts all liquid capital ${result.retirementYears - result.depletionHorizon.worstCaseRetirementSolvencyYears} years before plan end`}
                    </span>
                  </div>

                  {/* Median 50th Percentile Solvency */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-slate-400">50th Percentile (Median Expected):</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        result.depletionHorizon.medianDepletionYear === null
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                      }`}>
                        {result.depletionHorizon.medianDepletionYear === null ? 'DYNASTIC SURPLUS' : 'DEPLETION RISK'}
                      </span>
                    </div>
                    <div className="text-lg font-bold text-cyan-300 mb-1.5">
                      {result.depletionHorizon.medianDepletionYear === null
                        ? `${result.retirementYears} / ${result.retirementYears} Years · ${formatINR(result.medianTerminalCorpus)} Surplus`
                        : `${result.depletionHorizon.medianSolvencyYears} Years Solvency`}
                    </div>
                    {/* Solvency Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-1">
                      <div
                        className="h-full rounded-full bg-cyan-500 transition-all shadow-[0_0_8px_#06b6d4]"
                        style={{
                          width: `${Math.min(100, Math.round((result.depletionHorizon.medianSolvencyYears / result.retirementYears) * 100))}%`
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">
                      {result.depletionHorizon.medianDepletionYear === null
                        ? 'Terminal wealth outlives lifespan, creating multigenerational capital buffer'
                        : 'Median path experiences liquidity stress; taper monthly expenses'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ============================================================= */}
              {/* TACTICAL AUTO-HEAL REMEDY ACTIONS (WHEN STRESSED) */}
              {/* ============================================================= */}
              {(result.ruinProbabilityPercent > 15 || result.srrRiskRating === 'CRITICAL' || result.srrRiskRating === 'ELEVATED') && (
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-amber-400 shrink-0" />
                      <span className="font-mono font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                        Tactical Auto-Heal Remedies to Reach &ge; 90% Survival
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400/80">Click any remedy to test live</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Remedy 1: Safe SWR Spending Alignment */}
                    <button
                      type="button"
                      onClick={() => {
                        const safeMonthlyBurn = Math.max(10000, Math.round(result.medianRetirementCorpus * (result.safeWithdrawalRatePercent / 100) / 12));
                        setMonthlyRetirementBurn(safeMonthlyBurn);
                      }}
                      className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-amber-500/20 hover:border-amber-400/50 text-left transition-all group"
                    >
                      <span className="text-[10px] font-mono text-amber-400 block mb-1">REMEDY A · SPENDING ALIGNMENT</span>
                      <span className="font-bold text-white text-xs block group-hover:text-amber-200">
                        Cap Burn to {formatINR(Math.max(10000, Math.round(result.medianRetirementCorpus * (result.safeWithdrawalRatePercent / 100) / 12)))}/mo
                      </span>
                      <span className="text-[9.5px] text-slate-400 block mt-1">
                        Aligns withdrawal with {result.safeWithdrawalRatePercent}% Safe SWR
                      </span>
                    </button>

                    {/* Remedy 2: Extend Accumulation Horizon */}
                    <button
                      type="button"
                      onClick={() => {
                        setCustomRetireYears((prev) => prev + 2);
                      }}
                      className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-amber-500/20 hover:border-amber-400/50 text-left transition-all group"
                    >
                      <span className="text-[10px] font-mono text-cyan-400 block mb-1">REMEDY B · HORIZON EXTENSION</span>
                      <span className="font-bold text-white text-xs block group-hover:text-cyan-200">
                        Delay Retirement by +2 Years
                      </span>
                      <span className="text-[9.5px] text-slate-400 block mt-1">
                        Adds compounding runway and reduces decumulation span
                      </span>
                    </button>

                    {/* Remedy 3: Step-Up Accumulation SIP */}
                    <button
                      type="button"
                      onClick={() => {
                        setMonthlySavings((prev) => Math.round(prev * 1.25));
                      }}
                      className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-amber-500/20 hover:border-amber-400/50 text-left transition-all group"
                    >
                      <span className="text-[10px] font-mono text-emerald-400 block mb-1">REMEDY C · SIP REINFORCEMENT</span>
                      <span className="font-bold text-white text-xs block group-hover:text-emerald-200">
                        Boost SIP +25% ({formatINR(Math.round(monthlySavings * 1.25))}/mo)
                      </span>
                      <span className="text-[9.5px] text-slate-400 block mt-1">
                        Strengthens terminal nest egg to absorb black swans
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Scenario Chips Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                    <Flame size={14} className="text-amber-400" />
                    <span>Quick Stress Regimes</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('crises')}
                    className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <span>View all 9 crises</span>
                    <ChevronRight size={12} />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {SCENARIOS.slice(0, 6).map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setScenario(sc.id)}
                      className={`scenario-chip-card ${scenario === sc.id ? 'active' : ''}`}
                    >
                      <div>
                        <div className="text-lg mb-1">{sc.icon}</div>
                        <div className="text-xs font-bold text-white truncate">{sc.label}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-tight">{sc.desc}</div>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9.5px] font-mono">
                        <span className={`px-1.5 py-0.2 rounded font-semibold ${
                          sc.severity === 'CRITICAL' ? 'bg-rose-950/60 text-rose-400' :
                          sc.severity === 'SEVERE' ? 'bg-amber-950/60 text-amber-400' :
                          sc.severity === 'MODERATE' ? 'bg-cyan-950/60 text-cyan-300' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {sc.impactTag}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actuarial Reconciliation & Assumptions Banner */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 text-[11px] text-slate-300 flex items-start gap-3">
                <Info size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-mono font-bold text-slate-200 block text-xs">
                    Actuarial Telemetry Reconciliation &amp; Assumptions
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed m-0">
                    • <strong>Why Ruin Risk may be high while SWR has safe tiers:</strong> The top card ({result.ruinProbabilityPercent}% Ruin Risk) tests your <em>actual planned withdrawal</em> of {formatINR(monthlyRetirementBurn)}/mo ({result.plannedWithdrawalRatePercent}% of median corpus). Under severe shocks like {activeScenarioMeta.label}, your corpus is depressed, making {formatINR(monthlyRetirementBurn)}/mo unsustainable.<br />
                    • <strong>Safe Withdrawal Rate ({result.safeWithdrawalRatePercent}%):</strong> Shows the maximum percentage rate that <em>would survive</em> &ge; 90% of paths in this specific crisis. That modeled threshold corresponds to {formatINR(Math.round(result.medianRetirementCorpus * (result.safeWithdrawalRatePercent / 100) / 12))}/mo at the median retirement corpus.<br />
                    • <strong>Success Criterion:</strong> A path succeeds if its balance stays positive through {result.retirementYears} years of retirement after withdrawals adjusted by simulated inflation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: HISTORICAL CRISIS REGIMES DEEP-DIVE */}
          {/* =============================================================== */}
          {activeTab === 'crises' && (
            <div className="space-y-4">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 flex-wrap pb-1">
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

              {/* Grid of Scenario Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredScenarios.map((sc) => (
                  <div
                    key={sc.id}
                    onClick={() => setScenario(sc.id)}
                    className={`scenario-chip-card cursor-pointer ${scenario === sc.id ? 'active' : ''}`}
                  >
                    <div>
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
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">{sc.categoryLabel}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setScenario(sc.id);
                        }}
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
          {/* TAB 3: CASH WEDGE & SWR MATRIX BLUEPRINT */}
          {/* =============================================================== */}
          {activeTab === 'wedge_swr' && (
            <div className="space-y-4">
              {/* 3-Tier Cash Wedge Architecture */}
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
                      How to construct an Indian retirement cash buffer to eliminate Sequence of Returns Risk (SRR).
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
                  {/* Tier 1 */}
                  <div className="wedge-tier-box">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-emerald-400">TIER 1 (MONTHS 1–12)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                        Zero Volatility
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-white mb-1 m-0">Instant Liquid &amp; Overnight Funds</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-2 m-0">
                      Provides immediate living expenses without touching equities during market crashes.
                    </p>
                    <div className="font-mono text-xs text-cyan-300 pt-1 border-t border-white/5">
                      Target: {formatINR(monthlyRetirementBurn * 12)}
                    </div>
                  </div>

                  {/* Tier 2 */}
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

                  {/* Tier 3 */}
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

              {/* Safe Withdrawal Rate Bengen Matrix */}
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
                    <div
                      key={s.swrPercent}
                      className="swr-interactive-row"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm text-white w-14">{s.swrPercent.toFixed(1)}%</span>
                        <div className="text-slate-300">
                          <span>{formatINR(s.annualWithdrawalRupees)}/yr</span>
                          <span className="text-slate-500 text-[10.5px] ml-2">({formatINR(Math.round(s.annualWithdrawalRupees / 12))}/mo)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Survival Progress Meter */}
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
          {/* TAB 4: WHAT-IF TACTILE LEVERS */}
          {/* =============================================================== */}
          {activeTab === 'levers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white font-sans m-0">Tactile Actuarial Levers</h3>
                  <p className="text-xs text-slate-400 m-0">Adjust simulation parameters to test plan sensitivity in real time.</p>
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

          {/* =============================================================== */}
          {/* TAB 5: ACTUARIAL CERTIFICATE & AUDIT EXPORT */}
          {/* =============================================================== */}
          {activeTab === 'audit' && (
            <div className="space-y-4 font-mono">
              <div className="p-5 rounded-2xl bg-slate-900/50 border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] text-cyan-400 uppercase tracking-widest block font-bold">
                      FIDUCIARY ACTUARIAL CERTIFICATE
                    </span>
                    <h3 className="text-base font-bold text-white font-sans m-0">
                      Sovereign Lifespan Solvency Audit · {activeScenarioMeta.label}
                    </h3>
                    <span className="text-xs text-slate-400">
                      Engine: Box-Muller Client-Side PRNG · Seed #{randomSeed} · Iterations: {result.simulationsRun.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyReport}
                      className="btn-primary text-xs px-3 py-1.5"
                    >
                      {copiedReport ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedReport ? 'Copied Full Audit' : 'Copy Full Audit'}</span>
                    </button>
                  </div>
                </div>

                {/* Audit Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                    <span className="text-slate-400 block text-[10px]">ANTIFRAGILITY SCORE</span>
                    <span className="text-lg font-bold text-white">{result.antifragilityScore} / 100</span>
                    <span className="text-slate-500 block text-[9.5px] mt-0.5">{result.antifragilityScore >= 80 ? 'TITAN GRADE' : 'STRESSED'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                    <span className="text-slate-400 block text-[10px]">RUIN PROBABILITY</span>
                    <span className={`text-lg font-bold ${result.ruinProbabilityPercent > 15 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {result.ruinProbabilityPercent}%
                    </span>
                    <span className="text-slate-500 block text-[9.5px] mt-0.5">Planned: {formatINR(monthlyRetirementBurn)}/mo</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                    <span className="text-slate-400 block text-[10px]">SAFE SWR CEILING</span>
                    <span className="text-lg font-bold text-cyan-300">{result.safeWithdrawalRatePercent}%</span>
                    <span className="text-slate-500 block text-[9.5px] mt-0.5">Max: {formatINR(Math.round(result.medianRetirementCorpus * (result.safeWithdrawalRatePercent / 100) / 12))}/mo</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                    <span className="text-slate-400 block text-[10px]">RECOMMENDED WEDGE</span>
                    <span className="text-lg font-bold text-amber-400">{formatINR(result.recommendedCashWedgeRupees)}</span>
                    <span className="text-slate-500 block text-[9.5px] mt-0.5">{result.recommendedCashWedgeMonths} Months Runway</span>
                  </div>
                </div>

                {/* Actuarial Verdict & Commentary */}
                <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs">
                  <strong className="text-cyan-300 block mb-1">Actuarial Verdict:</strong>
                  <p className="text-slate-300 leading-relaxed m-0">{result.actuarialVerdict}</p>
                  <p className="text-slate-400 text-[11px] leading-relaxed mt-1.5 m-0">{result.srrExplanation}</p>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* FIDUCIARY BANNER & MODEL DISCLOSURES */}
          {/* =============================================================== */}
          <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/5 text-[11px] text-slate-400 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-slate-200 font-semibold font-mono text-xs">
                <Info size={14} className="text-cyan-400" />
                <span>Actuarial Model Parameters &amp; Stochastic Assumptions</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Box-Muller Normal Dist · Seed #{randomSeed}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[10.5px] pt-1">
              <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                <span className="text-slate-300 block font-sans font-medium">Equity (Nifty 50 TRI):</span>
                <span className="text-cyan-300">μ = 12.5% CAGR, σ = 18.0%</span>
                <span className="text-slate-500 block text-[9.5px] mt-0.5">Log-normal returns with fat-tail drawdown sampling</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                <span className="text-slate-300 block font-sans font-medium">Debt &amp; Fixed Income:</span>
                <span className="text-cyan-300">μ = 7.0%, σ = 3.0%</span>
                <span className="text-slate-500 block text-[9.5px] mt-0.5">Target maturity G-Sec &amp; corporate bond baseline</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                <span className="text-slate-300 block font-sans font-medium">Indian CPI Inflation:</span>
                <span className="text-cyan-300">μ = 6.5%, σ = 2.0%</span>
                <span className="text-slate-500 block text-[9.5px] mt-0.5">Annual compounding living expense adjustment</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal pt-1 m-0">
              * Methodology: Box-Muller transform Gaussian paths. Rebalanced annually. Deterministic PRNG seed ensures reproducible scenario audits. Stochastic models present probability distributions, not guaranteed future performance. Zero data transmitted over network.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo, useRef } from 'react';
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
  Flame,
  Compass,
  Sliders,
  ChevronRight,
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
type ModalViewTab = 'cockpit' | 'crises' | 'wedge_swr' | 'levers';

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
  // Navigation & filtering state
  const [activeTab, setActiveTab] = useState<ModalViewTab>('cockpit');
  const [categoryFilter, setCategoryFilter] = useState<ScenarioCategory>('all');
  const [scenario, setScenario] = useState<StressScenario>('baseline');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Simulation controls
  const [simCount, setSimCount] = useState<number>(5000);
  const [randomSeed, setRandomSeed] = useState<number>(42);
  const [equityRatio, setEquityRatio] = useState<number>(0.70);
  const [customRetireYears, setCustomRetireYears] = useState<number>(10);
  const [customHorizonYears, setCustomHorizonYears] = useState<number>(30);

  // Dynamic what-if baseline levers
  const baselineCorpus = useMemo(() => plan.savings.emergencyFundBalance * 4 || 1500000, [plan]);
  const baselineMonthlySavings = useMemo(() => plan.savings.monthlySip + plan.savings.monthlySavings || 35000, [plan]);
  const baselineMonthlyBurn = useMemo(() => summary.monthlyExpenses || 50000, [summary]);

  const [startingCorpus, setStartingCorpus] = useState<number>(baselineCorpus);
  const [monthlySavings, setMonthlySavings] = useState<number>(baselineMonthlySavings);
  const [monthlyRetirementBurn, setMonthlyRetirementBurn] = useState<number>(baselineMonthlyBurn);

  // Interactive SVG chart hover & inspection state
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [selectedSwrPercent, setSelectedSwrPercent] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Run Monte Carlo simulation
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
Antifragility Score: ${result.antifragilityScore} / 100
Ruin Probability: ${result.ruinProbabilityPercent}%
Sequence Risk Rating (SRR): ${result.srrRiskRating}
Safe Withdrawal Rate (SWR): ${result.safeWithdrawalRatePercent}%
Recommended Cash Wedge: ${formatINR(result.recommendedCashWedgeRupees)} (${result.recommendedCashWedgeMonths} Months Runway)
Projected Median Retirement Corpus: ${formatINR(result.medianRetirementCorpus)}
Projected Median Terminal Corpus: ${formatINR(result.medianTerminalCorpus)}

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

  if (!isOpen) return null;

  // Filtered scenarios
  const filteredScenarios = SCENARIOS.filter((sc) => {
    if (categoryFilter === 'all') return true;
    return sc.category === categoryFilter;
  });

  const activeScenarioMeta = SCENARIOS.find((s) => s.id === scenario) || SCENARIOS[0];

  // SVG Chart Geometry
  const width = 860;
  const height = 300;
  const padLeft = 85;
  const padRight = 35;
  const padTop = 25;
  const padBottom = 40;

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

  // SVG Mouse Hover Interaction Handler
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
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

  return (
    <div className="monte-carlo-modal-overlay">
      <div className="monte-carlo-modal-window">
        <div className="monte-carlo-scanline" />

        {/* ================================================================= */}
        {/* MODAL HEADER TOOLBAR */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Activity size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold font-sans tracking-tight text-white">
                  Reverse Monte Carlo FIRE Stress-Testing
                </h2>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                  {simCount.toLocaleString()} Stochastic Paths
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-950/50 border border-purple-500/30 text-purple-300">
                  Seed #{randomSeed}
                </span>
                <span className="text-[9.5px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-md hidden md:inline-flex items-center gap-1">
                  <ShieldCheck size={10} /> 100% Client-Side PRNG
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                Box-Muller stochastic simulation modeling historical Indian black swans, runaway CPI inflation &amp; sequence-of-returns risk.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Iteration & Seed Controls */}
            <div className="flex items-center gap-1 bg-slate-900/80 border border-white/10 rounded-xl p-1 text-xs font-mono">
              <button
                type="button"
                className={`px-2 py-1 rounded-lg text-[10.5px] transition-all ${
                  simCount === 5000
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
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
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
                onClick={() => setSimCount(10000)}
                title="10,000 stochastic paths (higher statistical confidence)"
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

            {/* Copy Full Audit */}
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 bg-slate-900/80 border border-white/10 text-slate-200 hover:text-white hover:border-cyan-500/50 transition-all shadow-sm"
              onClick={handleCopyReport}
              title="Copy Full Actuarial Audit Summary to Clipboard"
            >
              {copiedReport ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copiedReport ? 'Copied!' : 'Copy Audit'}</span>
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
        {/* VIEW NAVIGATION TABS */}
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
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Active Scenario:</span>
            <span className="font-bold text-cyan-300 flex items-center gap-1">
              <span>{activeScenarioMeta.icon}</span>
              <span>{activeScenarioMeta.label}</span>
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* MAIN BODY CONTENT CONTAINER */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-5 max-h-[calc(88vh-130px)] overflow-y-auto space-y-4">
          
          {/* =============================================================== */}
          {/* 1. TOP ACTUARIAL GAUGES & SCORECARDS (ALL VIEWS) */}
          {/* =============================================================== */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Antifragility Score */}
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-3.5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-mono text-slate-400 uppercase tracking-wider">
                  Antifragility Score
                </span>
                <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  result.antifragilityScore >= 80 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' :
                  result.antifragilityScore >= 60 ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30' :
                  result.antifragilityScore >= 40 ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30' :
                  'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                }`}>
                  {result.antifragilityScore >= 80 ? 'TITAN' : result.antifragilityScore >= 60 ? 'FORTRESS' : 'VULNERABLE'}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 my-1.5">
                <span className={`text-3xl font-extrabold font-mono tracking-tight ${
                  result.antifragilityScore >= 80 ? 'text-emerald-400' :
                  result.antifragilityScore >= 60 ? 'text-cyan-400' :
                  result.antifragilityScore >= 40 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {result.antifragilityScore}
                </span>
                <span className="text-xs font-mono text-slate-500">/100</span>
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
              <span className="text-[10px] text-slate-400 mt-1.5 truncate">
                {result.antifragilityScore >= 80 ? 'Superior Indian black swan resilience' : 'Vulnerable to multi-year bear grinds'}
              </span>
            </div>

            {/* Probability of Ruin (Planned Burn) */}
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-3.5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-mono text-slate-400 uppercase tracking-wider">
                  Planned Burn Ruin Risk
                </span>
                <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  result.ruinProbabilityPercent <= 5 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' :
                  result.ruinProbabilityPercent <= 15 ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30' :
                  'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                }`}>
                  {result.ruinProbabilityPercent <= 5 ? 'SAFE CEILING' : 'HIGH DEPLETION'}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 my-1.5">
                <span className={`text-3xl font-extrabold font-mono tracking-tight ${
                  result.ruinProbabilityPercent <= 5 ? 'text-emerald-400' :
                  result.ruinProbabilityPercent <= 15 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {result.ruinProbabilityPercent}%
                </span>
                <span className="text-[10px] font-mono text-slate-400">
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
              <span className="text-[10px] text-slate-400 mt-1.5 truncate">
                Planned burn: {formatINR(monthlyRetirementBurn)}/mo in {activeScenarioMeta.label}
              </span>
            </div>

            {/* Sequence of Returns Risk */}
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-3.5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-mono text-slate-400 uppercase tracking-wider">
                  Sequence Risk (SRR)
                </span>
                <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  result.srrRiskRating === 'LOW' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' :
                  result.srrRiskRating === 'MODERATE' ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30' :
                  result.srrRiskRating === 'ELEVATED' ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30' :
                  'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                }`}>
                  {result.srrRiskRating}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 my-1.5">
                <span className={`text-2xl font-bold font-mono ${
                  result.srrRiskRating === 'LOW' ? 'text-emerald-400' :
                  result.srrRiskRating === 'MODERATE' ? 'text-cyan-400' :
                  result.srrRiskRating === 'ELEVATED' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {result.srrRiskRating} RISK
                </span>
              </div>
              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    result.srrRiskRating === 'LOW' ? 'bg-emerald-500 w-1/4' :
                    result.srrRiskRating === 'MODERATE' ? 'bg-cyan-500 w-2/4' :
                    result.srrRiskRating === 'ELEVATED' ? 'bg-amber-500 w-3/4' :
                    'bg-rose-500 w-full'
                  }`}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1.5 truncate">
                Years 1–3 decumulation vulnerability
              </span>
            </div>

            {/* Scenario Safe Withdrawal Rate Ceiling */}
            <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-3.5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-mono text-slate-400 uppercase tracking-wider">
                  Scenario Safe SWR
                </span>
                <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  result.plannedWithdrawalRatePercent <= result.safeWithdrawalRatePercent
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                }`}>
                  {result.plannedWithdrawalRatePercent <= result.safeWithdrawalRatePercent ? 'WITHIN SAFE CEILING' : 'EXCEEDS SAFE CEILING'}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 my-1.5">
                <span className="text-3xl font-extrabold font-mono tracking-tight text-purple-300">
                  {result.safeWithdrawalRatePercent}%
                </span>
                <span className="text-xs font-mono text-slate-400">/year</span>
              </div>
              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full shadow-[0_0_8px_#a855f7]"
                  style={{ width: `${(result.safeWithdrawalRatePercent / 6.0) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1.5 truncate">
                Max safe rate for &ge; 90% survival under {activeScenarioMeta.label}
              </span>
            </div>
          </div>

          {/* Actuarial Reconciliation & Success Criteria Banner */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-[11px] text-slate-300 flex items-start gap-2.5">
            <Info size={15} className="text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-mono font-bold text-slate-200 block text-[10.5px]">
                Actuarial Telemetry Reconciliation &amp; Assumptions
              </span>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                • <strong>Why Ruin Risk may be high while SWR has safe tiers:</strong> The top card ({result.ruinProbabilityPercent}% Ruin Risk) tests your <em>actual planned withdrawal</em> of {formatINR(monthlyRetirementBurn)}/mo ({result.plannedWithdrawalRatePercent}% of median corpus). Under severe shocks like {activeScenarioMeta.label}, your corpus is depressed, making {formatINR(monthlyRetirementBurn)}/mo unsustainable.<br />
                • <strong>Safe Withdrawal Rate ({result.safeWithdrawalRatePercent}%):</strong> Shows the maximum percentage rate that <em>would survive</em> &ge; 90% of paths in this specific crisis. If you lower your withdrawal to {formatINR(Math.round(result.medianRetirementCorpus * (result.safeWithdrawalRatePercent / 100) / 12))}/mo, portfolio survival is restored.<br />
                • <strong>Success Criterion:</strong> A 30-year trajectory is successful if portfolio net worth remains positive (&gt; ₹0) through Year {result.totalYears} after living costs compounded at 6.5% Indian CPI inflation.
              </p>
            </div>
          </div>

          {/* =============================================================== */}
          {/* 2. TAB: STOCHASTIC COCKPIT (FAN CHART & ESSENTIALS) */}
          {/* =============================================================== */}
          {activeTab === 'cockpit' && (
            <div className="space-y-4">
              {/* Interactive Fan Chart */}
              <div className="monte-chart-canvas-wrap">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1 text-xs">
                  <div className="flex items-center gap-3 font-mono text-[11px] flex-wrap">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]"></span>
                      95th (Dynastic Bull)
                    </span>
                    <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]"></span>
                      50th (Median Path)
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_6px_#f43f5e]"></span>
                      5th (Black Swan Bear)
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-white/10">
                    Median Corpus at Retirement: <strong className="text-cyan-300">{formatINR(result.medianRetirementCorpus)}</strong>
                  </div>
                </div>

                {/* Floating Inspection Tooltip */}
                {hoveredTrajectory && (
                  <div className="monte-chart-hud-box">
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1 mb-1.5">
                      <span className="font-mono font-bold text-xs text-white">
                        Year {hoveredTrajectory.year}
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
                  className="w-full h-64 sm:h-72 select-none cursor-crosshair"
                  onMouseMove={handleSvgMouseMove}
                  onMouseLeave={() => setHoveredYear(null)}
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
                  <polygon points={fanAreaPoints} fill="url(#fanGrad)" />

                  {/* Inner Fan Area (P25 to P75) */}
                  <polygon points={innerFanAreaPoints} fill="url(#innerFanGrad)" />

                  {/* Trajectory Polylines */}
                  <polyline points={p95Points} fill="none" stroke="#10b981" strokeWidth="1.8" strokeDasharray="3 3" opacity="0.85" />
                  <polyline points={p75Points} fill="none" stroke="#8b5cf6" strokeWidth="1.4" opacity="0.65" />
                  <polyline points={p50Points} fill="none" stroke="#06b6d4" strokeWidth="2.8" />
                  <polyline points={p25Points} fill="none" stroke="#f59e0b" strokeWidth="1.4" opacity="0.65" />
                  <polyline points={p5Points} fill="none" stroke="#f43f5e" strokeWidth="1.8" strokeDasharray="3 3" opacity="0.9" />

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
                      <circle cx={scaleX(hoveredYear)} cy={scaleY(result.trajectories[hoveredYear].p95)} r="4" fill="#10b981" stroke="#fff" strokeWidth="1" />
                      <circle cx={scaleX(hoveredYear)} cy={scaleY(result.trajectories[hoveredYear].p50)} r="5" fill="#06b6d4" stroke="#fff" strokeWidth="1.5" />
                      <circle cx={scaleX(hoveredYear)} cy={scaleY(result.trajectories[hoveredYear].p5)} r="4" fill="#f43f5e" stroke="#fff" strokeWidth="1" />
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
                <div className="flex items-center justify-between px-2 pt-1 text-[10px] font-mono text-slate-400">
                  <span>💡 Move cursor across chart to inspect percentile values year-by-year</span>
                  <span>Terminal Year {result.totalYears} Median: <strong className="text-cyan-300">{formatINR(result.medianTerminalCorpus)}</strong></span>
                </div>
              </div>

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
                          sc.severity === 'MODERATE' ? 'bg-cyan-950/60 text-cyan-300' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {sc.impactTag}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sequence Risk & Cash Wedge Summary Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
                        <ShieldCheck size={16} className="text-cyan-400" />
                        <span>SEQUENCE RISK &amp; CASH WEDGE</span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        result.srrRiskRating === 'LOW' ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400' :
                        result.srrRiskRating === 'MODERATE' ? 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-300' :
                        result.srrRiskRating === 'ELEVATED' ? 'bg-amber-950/80 border border-amber-500/40 text-amber-400' :
                        'bg-rose-950/80 border border-rose-500/40 text-rose-400'
                      }`}>
                        {result.srrRiskRating} RISK
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">
                      Early retirement crashes permanently impair portfolio longevity if equities must be sold at depressed valuations. A liquid cash cushion insulates living burn.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">Recommended Liquid Cushion</span>
                      <span className="text-base font-extrabold font-mono text-cyan-300">
                        {formatINR(result.recommendedCashWedgeRupees)}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 font-bold">
                      {result.recommendedCashWedgeMonths} Months Runway
                    </span>
                  </div>
                </div>

                {/* SWR Bengen Matrix Preview */}
                <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-slate-200">
                      SAFE WITHDRAWAL RATE (SWR) MATRIX
                    </span>
                    <span className="text-[10.5px] font-mono text-slate-400">
                      Indian 30-Yr SWR: <strong className="text-cyan-300">{result.safeWithdrawalRatePercent}%</strong>
                    </span>
                  </div>

                  <div className="space-y-1.5 font-mono text-[11px]">
                    {result.swrScenarios.map((s) => (
                      <div
                        key={s.swrPercent}
                        className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-slate-950/50 border border-white/5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{s.swrPercent.toFixed(1)}%</span>
                          <span className="text-[10px] text-slate-400">({formatINR(s.annualWithdrawalRupees)}/yr)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                s.verdict === 'SAFE' ? 'bg-emerald-500' :
                                s.verdict === 'CAUTION' ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${s.successProbabilityPercent}%` }}
                            />
                          </div>
                          <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                            s.verdict === 'SAFE' ? 'bg-emerald-950/60 text-emerald-400' :
                            s.verdict === 'CAUTION' ? 'bg-amber-950/60 text-amber-400' : 'bg-rose-950/60 text-rose-400'
                          }`}>
                            {s.successProbabilityPercent}% {s.verdict}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* 3. TAB: HISTORICAL CRISIS REGIMES DEEP-DIVE */}
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
                      <h4 className="text-sm font-bold text-white mb-1">{sc.label}</h4>
                      <p className="text-xs text-slate-300 mb-2 leading-relaxed">{sc.desc}</p>
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
          {/* 4. TAB: CASH WEDGE & SWR MATRIX BLUEPRINT */}
          {/* =============================================================== */}
          {activeTab === 'wedge_swr' && (
            <div className="space-y-4">
              {/* 3-Tier Cash Wedge Architecture */}
              <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={20} className="text-cyan-400" />
                      <h3 className="text-sm sm:text-base font-bold text-white font-sans">
                        3-Tier Sovereign Cash Wedge Architecture
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
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
                    <h5 className="text-xs font-bold text-white mb-1">Instant Liquid &amp; Overnight Funds</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
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
                    <h5 className="text-xs font-bold text-white mb-1">Arbitrage Funds (Equity Taxation)</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                      Captures cash-futures spread with low volatility and qualifies for favorable 12.5% LTCG taxation.
                    </p>
                    <div className="font-mono text-xs text-cyan-300 pt-1 border-t border-white/5">
                      Target: {formatINR(monthlyRetirementBurn * 12)}
                    </div>
                  </div>

                  {/* Tier 3 */}
                  <div className="wedge-tier-box">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-purple-400">TIER 3 (MONTHS 25–36)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/30">
                        Locked Yield
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-white mb-1">Target Maturity G-Sec &amp; SDLs</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                      Roll-down sovereign bonds lock in guaranteed coupon yields without interest rate duration risk.
                    </p>
                    <div className="font-mono text-xs text-cyan-300 pt-1 border-t border-white/5">
                      Target: {formatINR(monthlyRetirementBurn * Math.max(0, result.recommendedCashWedgeMonths - 24))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bengen SWR Actuarial Deep-Dive */}
              <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white font-sans">
                      Safe Withdrawal Rate (SWR) Actuarial Matrix
                    </h3>
                    <p className="text-xs text-slate-400">
                      William Bengen actuarial methodology applied across 30-year Indian macroeconomic horizons.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                    Recommended: <strong>{result.safeWithdrawalRatePercent}% SWR</strong>
                  </span>
                </div>

                <div className="space-y-2">
                  {result.swrScenarios.map((s) => (
                    <div
                      key={s.swrPercent}
                      onClick={() => setSelectedSwrPercent(s.swrPercent)}
                      className={`swr-interactive-row ${selectedSwrPercent === s.swrPercent ? 'selected' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold font-mono text-white w-12">{s.swrPercent.toFixed(1)}%</span>
                        <div>
                          <div className="text-xs font-mono text-slate-200">
                            {formatINR(s.annualWithdrawalRupees)} / year
                            <span className="text-slate-400 text-[10.5px] ml-1.5 font-normal">
                              ({formatINR(Math.round(s.annualWithdrawalRupees / 12))} / month living burn)
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {s.verdict === 'SAFE' ? 'Dynastic capital preservation with virtually zero ruin risk' :
                             s.verdict === 'CAUTION' ? 'Moderate vulnerability during prolonged 4+ year Indian bear markets' :
                             'High probability of portfolio exhaustion before year 25'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${
                              s.verdict === 'SAFE' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' :
                              s.verdict === 'CAUTION' ? 'bg-amber-500' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                            }`}
                            style={{ width: `${s.successProbabilityPercent}%` }}
                          />
                        </div>
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${
                          s.verdict === 'SAFE' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' :
                          s.verdict === 'CAUTION' ? 'bg-amber-950/80 text-amber-400 border border-amber-500/30' :
                          'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                        }`}>
                          {s.successProbabilityPercent}% Survival
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* 5. TAB: WHAT-IF LEVERS & SIMULATION CONTROLS */}
          {/* =============================================================== */}
          {activeTab === 'levers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h3 className="text-sm font-bold text-white font-sans">
                    Tactile Simulation Levers &amp; Dynamic What-If Testing
                  </h3>
                  <p className="text-xs text-slate-400">
                    Adjust inputs dynamically to see how additional SIPs, different horizons, or higher expenses affect your probability of ruin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetToBaseline}
                  className="px-2.5 py-1 text-xs font-mono flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 rounded-lg border border-white/10"
                >
                  <RotateCcw size={12} />
                  <span>Reset to Plan Baseline</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Starting Portfolio Corpus */}
                <div className="tactile-lever-card">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Starting Net Worth / Corpus:</span>
                    <span className="font-mono font-bold text-cyan-300 text-sm">{formatINR(startingCorpus)}</span>
                  </div>
                  <input
                    type="range"
                    min="500000"
                    max="30000000"
                    step="500000"
                    value={startingCorpus}
                    onChange={(e) => setStartingCorpus(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">Quick Sets:</span>
                    {[1500000, 2500000, 5000000, 10000000, 20000000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setStartingCorpus(val)}
                        className={`tactile-preset-btn ${startingCorpus === val ? 'active' : ''}`}
                      >
                        {formatINR(val)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Monthly SIP Additions */}
                <div className="tactile-lever-card">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Monthly Investment (SIP):</span>
                    <span className="font-mono font-bold text-cyan-300 text-sm">{formatINR(monthlySavings)} / mo</span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="300000"
                    step="5000"
                    value={monthlySavings}
                    onChange={(e) => setMonthlySavings(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">Quick Sets:</span>
                    {[25000, 50000, 75000, 100000, 150000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setMonthlySavings(val)}
                        className={`tactile-preset-btn ${monthlySavings === val ? 'active' : ''}`}
                      >
                        {formatINR(val)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Retirement Living Expenses Burn */}
                <div className="tactile-lever-card">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Retirement Monthly Living Burn:</span>
                    <span className="font-mono font-bold text-rose-300 text-sm">{formatINR(monthlyRetirementBurn)} / mo</span>
                  </div>
                  <input
                    type="range"
                    min="20000"
                    max="250000"
                    step="5000"
                    value={monthlyRetirementBurn}
                    onChange={(e) => setMonthlyRetirementBurn(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">Quick Sets:</span>
                    {[35000, 50000, 75000, 100000, 150000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setMonthlyRetirementBurn(val)}
                        className={`tactile-preset-btn ${monthlyRetirementBurn === val ? 'active' : ''}`}
                      >
                        {formatINR(val)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Equity / Debt Allocation Ratio */}
                <div className="tactile-lever-card">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Portfolio Asset Allocation:</span>
                    <span className="font-mono font-bold text-cyan-300 text-sm">
                      {(equityRatio * 100).toFixed(0)}% Eq / {((1 - equityRatio) * 100).toFixed(0)}% Debt
                    </span>
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
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">Presets:</span>
                    {[
                      { label: '80/20 Aggressive', val: 0.8 },
                      { label: '70/30 Sovereign', val: 0.7 },
                      { label: '50/50 Defensive', val: 0.5 },
                      { label: '40/60 Shield', val: 0.4 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setEquityRatio(p.val)}
                        className={`tactile-preset-btn ${Math.abs(equityRatio - p.val) < 0.01 ? 'active' : ''}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Years to Retirement */}
                <div className="tactile-lever-card">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Years to Retirement:</span>
                    <span className="font-mono font-bold text-cyan-300 text-sm">{customRetireYears} Years</span>
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
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">Presets:</span>
                    {[5, 8, 10, 15, 20].map((yr) => (
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

                {/* 6. Retirement Duration Horizon */}
                <div className="tactile-lever-card">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Retirement Lifespan Duration:</span>
                    <span className="font-mono font-bold text-cyan-300 text-sm">{customHorizonYears} Years</span>
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
          {/* 6. ACTUARIAL SUMMARY & FIDUCIARY BANNER */}
          {/* =============================================================== */}
          <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-800/30 text-xs flex items-start gap-3">
            <Sparkles size={18} className="text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-slate-300">
              <strong className="text-cyan-200 block text-sm">{result.actuarialVerdict}</strong>
              <p className="text-[11.5px] leading-relaxed text-slate-400">{result.srrExplanation}</p>
            </div>
          </div>

          {/* =============================================================== */}
          {/* 7. MATHEMATICAL MODEL PARAMETERS & DISCLOSURES */}
          {/* =============================================================== */}
          <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/5 text-[11px] text-slate-400 space-y-2">
            <div className="flex items-center justify-between">
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

            <p className="text-[10px] text-slate-500 leading-normal pt-1">
              * Methodology: Box-Muller transform Gaussian paths. Rebalanced annually. Deterministic PRNG seed ensures reproducible scenario audits. Stochastic models present probability distributions, not guaranteed future performance. Zero data transmitted over network.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

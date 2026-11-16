import { useMemo, useState } from 'react';
import {
  X,
  Scale,
  TrendingUp,
  ShieldCheck,
  IndianRupee,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Home,
  Car,
  GraduationCap,
  Banknote,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { calculateLoanArbitrage, type LoanArbitrageInputs } from '../lib/loanArbitrage';

interface LoanPrepaymentArbitrageModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLoanAmount?: number;
}

interface LoanPreset {
  id: string;
  name: string;
  icon: typeof Home;
  amount: number;
  rate: number;
  years: number;
  prepayment: number;
}

const LOAN_PRESETS: LoanPreset[] = [
  {
    id: 'home_loan',
    name: 'Home Loan',
    icon: Home,
    amount: 5000000,
    rate: 8.5,
    years: 20,
    prepayment: 10000,
  },
  {
    id: 'car_loan',
    name: 'Car Loan',
    icon: Car,
    amount: 1200000,
    rate: 9.25,
    years: 7,
    prepayment: 5000,
  },
  {
    id: 'education_loan',
    name: 'Education Loan',
    icon: GraduationCap,
    amount: 3000000,
    rate: 10.25,
    years: 10,
    prepayment: 8000,
  },
  {
    id: 'personal_loan',
    name: 'Personal Loan',
    icon: Banknote,
    amount: 800000,
    rate: 13.5,
    years: 5,
    prepayment: 4000,
  },
];

export function LoanPrepaymentArbitrageModal({
  isOpen,
  onClose,
  defaultLoanAmount = 5000000,
}: LoanPrepaymentArbitrageModalProps) {
  const [loanAmount, setLoanAmount] = useState<number>(defaultLoanAmount);
  const [annualInterestRate, setAnnualInterestRate] = useState<number>(8.5);
  const [tenureYears, setTenureYears] = useState<number>(20);
  const [extraMonthlyPrepayment, setExtraMonthlyPrepayment] = useState<number>(10000);
  const [lumpSumPrepayment, setLumpSumPrepayment] = useState<number>(0);
  const [sipExpectedCagr, setSipExpectedCagr] = useState<number>(12);
  const [taxRegime, setTaxRegime] = useState<'new_regime' | 'old_regime'>('new_regime');
  const [selectedPreset, setSelectedPreset] = useState<string>('home_loan');
  const [showScheduleTable, setShowScheduleTable] = useState<boolean>(false);

  const applyPreset = (preset: LoanPreset) => {
    setSelectedPreset(preset.id);
    setLoanAmount(preset.amount);
    setAnnualInterestRate(preset.rate);
    setTenureYears(preset.years);
    setExtraMonthlyPrepayment(preset.prepayment);
  };

  const inputs: LoanArbitrageInputs = useMemo(
    () => ({
      loanAmount,
      annualInterestRate,
      tenureYears,
      extraMonthlyPrepayment,
      lumpSumPrepayment,
      sipExpectedCagr,
      taxRegime,
    }),
    [loanAmount, annualInterestRate, tenureYears, extraMonthlyPrepayment, lumpSumPrepayment, sipExpectedCagr, taxRegime]
  );

  const result = useMemo(() => calculateLoanArbitrage(inputs), [inputs]);

  // Sensitivity scenarios across market cycles
  const bearOutcome = useMemo(() => calculateLoanArbitrage({ ...inputs, sipExpectedCagr: 8.0 }), [inputs]);
  const baseOutcome = useMemo(() => calculateLoanArbitrage({ ...inputs, sipExpectedCagr: 12.0 }), [inputs]);
  const bullOutcome = useMemo(() => calculateLoanArbitrage({ ...inputs, sipExpectedCagr: 15.0 }), [inputs]);

  if (!isOpen) return null;

  const formatLakhs = (val: number) => {
    if (Math.abs(val) >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(val) >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Loan Prepayment vs Equity SIP Arbitrage">
      <div
        className="modal-card loan-arbitrage-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '980px', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="loan-arbitrage-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-solstice/10 border border-solstice/30 flex items-center justify-center text-solstice shadow-inner">
              <Scale size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-ink-primary tracking-tight">
                  Loan Prepayment vs. Equity SIP Arbitrage
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-solstice/15 text-solstice border border-solstice/30">
                  ACTUARIAL ARBITRAGE ENGINE
                </span>
              </div>
              <p className="text-xs text-ink-secondary">
                Model debt prepayment vs. compounding equity SIPs with Indian statutory tax rules (Section 24b vs 115BAC)
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-pill"
            onClick={onClose}
            title="Close Arbitrage Simulator"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="loan-arbitrage-body space-y-4">
          {/* Preset Selector Strip */}
          <div className="p-2.5 rounded-xl bg-surface-raised/40 border border-subtle/70 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-muted flex items-center gap-1.5">
              <Sparkles size={12} className="text-quasar" /> Loan Archetypes:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {LOAN_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isActive = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`action-pill text-xs py-1 px-2.5 flex items-center gap-1.5 transition-all ${
                      isActive ? 'pill-active-mode font-semibold' : ''
                    }`}
                    onClick={() => applyPreset(preset)}
                  >
                    <Icon size={12} />
                    <span>{preset.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">({formatLakhs(preset.amount)})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actuarial Verdict Hero Banner */}
          <div
            className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
              result.recommendedStrategy === 'invest_sip'
                ? 'bg-nebula/10 border-nebula/30 text-nebula'
                : result.recommendedStrategy === 'prepay_debt'
                ? 'bg-solstice/10 border-solstice/30 text-solstice'
                : 'bg-quasar/10 border-quasar/30 text-quasar'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-surface-base border border-current/30 flex items-center justify-center shrink-0">
                {result.recommendedStrategy === 'invest_sip' ? (
                  <TrendingUp size={22} />
                ) : result.recommendedStrategy === 'prepay_debt' ? (
                  <ShieldCheck size={22} />
                ) : (
                  <Scale size={22} />
                )}
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold block opacity-80">
                  {result.recommendedStrategy === 'invest_sip'
                    ? '⚡ Scenario Projection: Equity Advantage (Assumption-Dependent)'
                    : result.recommendedStrategy === 'prepay_debt'
                    ? '🛡️ Scenario Projection: Debt Elimination Favored (Guaranteed)'
                    : '⚖️ Scenario Projection: Balanced 50/50 Split'}
                </span>
                <span className="text-sm font-semibold text-ink-primary">
                  {result.recommendedStrategy === 'invest_sip'
                    ? `At an assumed ${sipExpectedCagr}% CAGR vs an ${annualInterestRate}% loan rate, equity compounding projects ${formatLakhs(result.netArbitrageAdvantage)} extra terminal wealth.`
                    : result.recommendedStrategy === 'prepay_debt'
                    ? `Guaranteed ${annualInterestRate}% risk-free debt interest savings outpaces conservative equity return.`
                    : `Spread extra cashflow: prepay 50% for peace of mind, compound 50% for wealth.`}
                </span>
                <span className="text-[10.5px] text-muted block mt-0.5">
                  Sensitivity depends on market return volatility, loan terms, and Section 24(b) / 115BAC tax deductions.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 font-mono text-xs bg-surface-base/80 px-3 py-1.5 rounded-lg border border-current/20 shrink-0">
                <span className="text-muted">Break-Even Market CAGR:</span>
                <span className="font-bold text-ink-primary">{result.breakEvenCagr}%</span>
              </div>
            </div>
          </div>

          {/* 3-Tier Market Sensitivity Range Banner */}
          <div className="p-3.5 rounded-xl bg-surface-raised/40 border border-subtle/80 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-mono font-bold text-ink-primary flex items-center gap-1.5">
                <Scale size={13} className="text-solstice" />
                <span>Market Outcome Range &amp; Sensitivity Spectrum:</span>
              </span>
              <span className="text-[10.5px] font-mono text-muted">
                {taxRegime === 'old_regime' ? 'Section 24(b) Tax Deductible (Eff. Rate ~' + result.taxDetails.effectiveLoanRate + '%)' : 'Section 115BAC Default (No Sec 24b Deduction)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
              {/* Bear Market */}
              <div className={`p-2.5 rounded-lg border ${
                bearOutcome.netArbitrageAdvantage <= 0 ? 'bg-solstice/10 border-solstice/30' : 'bg-surface-page border-subtle'
              }`}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-solstice font-semibold">📉 Bear (8.0% CAGR)</span>
                  <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-white/5 text-muted">Depressed</span>
                </div>
                <div className="text-xs text-ink-secondary">
                  Delta vs Prepay:{' '}
                  <strong className={bearOutcome.netArbitrageAdvantage >= 0 ? 'text-nebula' : 'text-solstice'}>
                    {bearOutcome.netArbitrageAdvantage >= 0 ? `+${formatLakhs(bearOutcome.netArbitrageAdvantage)}` : `-${formatLakhs(Math.abs(bearOutcome.netArbitrageAdvantage))}`}
                  </strong>
                </div>
                <span className="text-[10px] text-muted block mt-0.5">
                  {bearOutcome.netArbitrageAdvantage <= 0 ? 'Prepaying debt wins (guaranteed savings)' : 'Marginal equity edge'}
                </span>
              </div>

              {/* Base Case */}
              <div className={`p-2.5 rounded-lg border ${
                baseOutcome.recommendedStrategy === 'invest_sip' ? 'bg-nebula/10 border-nebula/30' : 'bg-surface-page border-subtle'
              }`}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-nebula font-semibold">📈 Base Case (12.0% CAGR)</span>
                  <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-nebula/15 text-nebula font-bold">Standard</span>
                </div>
                <div className="text-xs text-ink-secondary">
                  Delta vs Prepay:{' '}
                  <strong className="text-nebula font-bold">
                    +{formatLakhs(baseOutcome.netArbitrageAdvantage)}
                  </strong>
                </div>
                <span className="text-[10px] text-muted block mt-0.5">
                  Equity compounding outpaces debt cost
                </span>
              </div>

              {/* Bull Market */}
              <div className="p-2.5 rounded-lg bg-surface-page border border-subtle">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-cyan-400 font-semibold">🚀 Bull (15.0% CAGR)</span>
                  <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-white/5 text-muted">Optimistic</span>
                </div>
                <div className="text-xs text-ink-secondary">
                  Delta vs Prepay:{' '}
                  <strong className="text-cyan-300 font-bold">
                    +{formatLakhs(bullOutcome.netArbitrageAdvantage)}
                  </strong>
                </div>
                <span className="text-[10px] text-muted block mt-0.5">
                  Aggressive compounding dominance
                </span>
              </div>
            </div>

            <p className="text-[10px] text-muted/80 leading-normal pt-1">
              * Note: Equity investments carry sequence-of-returns volatility and 12.5% LTCG tax above ₹1.25L exemption (Finance Act 2024 / TY 2026–27). Debt prepayment delivers an unconditional, guaranteed post-tax return equal to your effective borrowing rate.
            </p>
          </div>

          {/* Virtual Debt-Free Milestone Banner */}
          {result.virtualDebtFreeYear && (
            <div className="p-3 px-4 rounded-xl bg-solstice/10 border border-solstice/30 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-solstice shrink-0" />
                <span className="text-xs text-ink-secondary">
                  <strong className="text-solstice font-semibold">Virtual Debt-Free Milestone:</strong> In{' '}
                  <strong className="font-mono text-ink-primary">Year {result.virtualDebtFreeYear}</strong>, your equity SIP corpus overtakes your remaining loan balance. You can pay off the debt at any time or keep compounding!
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-solstice bg-solstice/15 px-2.5 py-0.5 rounded border border-solstice/25">
                Year {result.virtualDebtFreeYear} Crossover
              </span>
            </div>
          )}

          {/* 3-Strategy Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Strategy 1: Path A (100% Prepayment) */}
            <div className={`p-4 rounded-xl border transition-all ${
              result.recommendedStrategy === 'prepay_debt'
                ? 'bg-solstice/10 border-solstice/50 shadow-sm'
                : 'bg-surface-raised/40 border-subtle/80'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-solstice uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck size={14} /> Path A: 100% Prepay
                </span>
                {result.recommendedStrategy === 'prepay_debt' && (
                  <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-solstice/20 text-solstice font-bold">OPTIMAL</span>
                )}
              </div>
              <div className="space-y-1.5 pt-1">
                <div>
                  <span className="text-[10.5px] text-muted block font-mono">Interest Saved</span>
                  <strong className="text-lg font-bold font-mono text-solstice">{formatLakhs(result.interestSaved)}</strong>
                </div>
                <div>
                  <span className="text-[10.5px] text-muted block font-mono">Tenure Reduced</span>
                  <span className="text-sm font-semibold font-mono text-ink-primary">
                    Shaves {Math.floor(result.monthsSaved / 12)}y {result.monthsSaved % 12}m
                  </span>
                </div>
                <div className="pt-1 border-t border-subtle/50 text-[11px] text-muted">
                  Guaranteed risk-free return of {annualInterestRate}% p.a.
                </div>
              </div>
            </div>

            {/* Strategy 2: Path B (100% Equity SIP) */}
            <div className={`p-4 rounded-xl border transition-all ${
              result.recommendedStrategy === 'invest_sip'
                ? 'bg-nebula/10 border-nebula/50 shadow-sm'
                : 'bg-surface-raised/40 border-subtle/80'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-nebula uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp size={14} /> Path B: 100% SIP
                </span>
                {result.recommendedStrategy === 'invest_sip' && (
                  <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-nebula/20 text-nebula font-bold">OPTIMAL</span>
                )}
              </div>
              <div className="space-y-1.5 pt-1">
                <div>
                  <span className="text-[10.5px] text-muted block font-mono">Gross SIP Future Value</span>
                  <strong className="text-lg font-bold font-mono text-nebula">{formatLakhs(result.grossSipFutureValue)}</strong>
                </div>
                <div>
                  <span className="text-[10.5px] text-muted block font-mono">Net Post-Tax Corpus (Sec 112A)</span>
                  <span className="text-sm font-semibold font-mono text-emerald-400">
                    {formatLakhs(result.postTaxSipFutureValue)} <span className="text-[10px] text-muted">(-{formatLakhs(result.estimatedLtcgTax)} tax)</span>
                  </span>
                </div>
                <div className="pt-1 border-t border-subtle/50 text-[11px] text-muted">
                  Net post-tax delta: <strong className="text-nebula">+{formatLakhs(result.netArbitrageAdvantage)}</strong> (Gross: +{formatLakhs(result.grossArbitrageAdvantage)})
                </div>
              </div>
            </div>

            {/* Strategy 3: Path C (Smart 50/50 Hybrid) */}
            <div className={`p-4 rounded-xl border transition-all ${
              result.recommendedStrategy === 'balanced_split'
                ? 'bg-quasar/10 border-quasar/50 shadow-sm'
                : 'bg-surface-raised/40 border-subtle/80'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-quasar uppercase tracking-wider flex items-center gap-1">
                  <Layers size={14} /> Path C: 50/50 Hybrid
                </span>
                {result.recommendedStrategy === 'balanced_split' && (
                  <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-quasar/20 text-quasar font-bold">BALANCED</span>
                )}
              </div>
              <div className="space-y-1.5 pt-1">
                <div>
                  <span className="text-[10.5px] text-muted block font-mono">Combined Benefit</span>
                  <strong className="text-lg font-bold font-mono text-quasar">{formatLakhs(result.hybrid.totalCombinedBenefit)}</strong>
                </div>
                <div>
                  <span className="text-[10.5px] text-muted block font-mono">Tenure Shaved + SIP Corpus</span>
                  <span className="text-sm font-semibold font-mono text-ink-primary">
                    {Math.floor(result.hybrid.monthsSaved / 12)}y saved + {formatLakhs(result.hybrid.sipFutureValue)}
                  </span>
                </div>
                <div className="pt-1 border-t border-subtle/50 text-[11px] text-muted">
                  50% to Prepay ({formatLakhs(extraMonthlyPrepayment / 2)}/mo), 50% to SIP
                </div>
              </div>
            </div>
          </div>

          {/* Actuarial Calculation Breakdown & Reconciliation Ledger */}
          <div className="p-4 rounded-xl bg-surface-raised/40 border border-subtle/80 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Scale size={15} className="text-solstice" />
                <h3 className="text-xs font-mono font-bold text-ink-primary tracking-tight m-0">
                  ACTUARIAL ARBITRAGE RECONCILIATION &amp; MATHEMATICAL LEDGER
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-base border border-subtle text-muted">
                Section 112A (12.5% LTCG) · Gross vs. Post-Tax Audit
              </span>
            </div>

            <p className="text-xs text-ink-secondary leading-relaxed m-0">
              Traces step-by-step how the <strong>{annualInterestRate}%</strong> loan interest saved, the <strong>{sipExpectedCagr}%</strong> gross equity compounding, the <strong>{result.taxDetails.postTaxEquityCagr}%</strong> post-tax equity yield, and statutory capital gains taxes combine to produce both the gross (+{formatLakhs(result.grossArbitrageAdvantage)}) and post-tax (+{formatLakhs(result.netArbitrageAdvantage)}) arbitrage advantages.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              {/* Box 1: Path A Debt Prepayment */}
              <div className="p-3 rounded-lg bg-surface-base border border-solstice/30 space-y-2">
                <div className="flex items-center justify-between text-solstice font-bold border-b border-subtle/40 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={13} /> Path A: Guaranteed Prepayment
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-solstice/15">RISK-FREE</span>
                </div>
                <div className="space-y-1 text-[11px] text-ink-secondary">
                  <div className="flex justify-between">
                    <span>Baseline Interest ({result.baselineTenureMonths}m):</span>
                    <span className="text-ink-primary">{formatLakhs(result.baselineTotalInterest)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prepay Interest ({result.newTenureMonths}m):</span>
                    <span className="text-ink-primary">{formatLakhs(result.prepayTotalInterest)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tenure Acceleration:</span>
                    <span className="text-solstice font-semibold">Shaves {Math.floor(result.monthsSaved / 12)}y {result.monthsSaved % 12}m</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-subtle/40 text-solstice font-bold">
                    <span>Guaranteed Interest Saved:</span>
                    <span>{formatLakhs(result.interestSaved)}</span>
                  </div>
                </div>
                <span className="text-[10px] text-muted block">
                  * Prepayment delivers an unconditional post-tax return equal to your effective borrowing rate ({result.taxDetails.effectiveLoanRate}%).
                </span>
              </div>

              {/* Box 2: Path B Gross vs Post-Tax Equity SIP */}
              <div className="p-3 rounded-lg bg-surface-base border border-nebula/30 space-y-2">
                <div className="flex items-center justify-between text-nebula font-bold border-b border-subtle/40 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp size={13} /> Path B: Equity SIP Compounding
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-nebula/15">MARKET COMPOUNDING</span>
                </div>
                <div className="space-y-1 text-[11px] text-ink-secondary">
                  <div className="flex justify-between">
                    <span>Total Invested Principal ({tenureYears}y):</span>
                    <span className="text-ink-primary">{formatLakhs(result.sipInvestedPrincipal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gross Terminal Corpus (@ {sipExpectedCagr}% CAGR):</span>
                    <span className="text-ink-primary font-bold">{formatLakhs(result.grossSipFutureValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gross Wealth Gain (Pre-Tax):</span>
                    <span className="text-nebula">{formatLakhs(result.grossSipNetGain)}</span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>Sec 112A LTCG Tax (12.5% over ₹1.25L):</span>
                    <span>-{formatLakhs(result.estimatedLtcgTax)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-subtle/40 text-emerald-400 font-bold">
                    <span>Net Post-Tax Corpus (Net Gain {formatLakhs(result.postTaxSipNetGain)}):</span>
                    <span>{formatLakhs(result.postTaxSipFutureValue)}</span>
                  </div>
                </div>
                <span className="text-[10px] text-muted block">
                  * Post-tax equity CAGR equivalent is ~{result.taxDetails.postTaxEquityCagr}% after statutory LTCG tax deduction.
                </span>
              </div>
            </div>

            {/* Reconciliation Comparison Row */}
            <div className="p-3 rounded-lg bg-surface-base border border-subtle/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
              <div className="space-y-0.5">
                <span className="text-[10.5px] uppercase tracking-wider text-muted font-bold block">
                  Reconciliation of Advantage Over Prepayment:
                </span>
                <span className="text-[11px] text-ink-secondary">
                  Arbitrage Delta = Equity Wealth Gain minus Guaranteed Debt Interest Saved
                </span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-right">
                  <span className="text-[10px] text-muted block">Gross Advantage (Pre-Tax):</span>
                  <span className="text-xs font-bold text-ink-primary">
                    {formatLakhs(result.grossSipNetGain)} - {formatLakhs(result.interestSaved)} = <strong className="text-nebula">+{formatLakhs(result.grossArbitrageAdvantage)}</strong>
                  </span>
                </div>
                <div className="h-6 w-px bg-subtle/60 hidden sm:block" />
                <div className="text-right">
                  <span className="text-[10px] text-muted block">Net Advantage (Post-12.5% Tax):</span>
                  <span className="text-xs font-bold text-emerald-400">
                    {formatLakhs(result.postTaxSipNetGain)} - {formatLakhs(result.interestSaved)} = <strong>+{formatLakhs(result.netArbitrageAdvantage)}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Controls & Tax Adjustment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Left: Debt Parameters */}
            <div className="p-4 rounded-xl bg-surface-raised/30 border border-subtle/60 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider font-mono text-solstice flex items-center gap-1.5">
                  <IndianRupee size={13} /> Loan Debt Profile
                </span>
                <span className="text-[11px] font-mono text-muted">EMI: ₹{result.monthlyEmi.toLocaleString('en-IN')}/mo</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-ink-secondary">Loan Principal Outstanding</span>
                  <span className="font-mono font-bold text-ink-primary">{formatLakhs(loanAmount)}</span>
                </div>
                <input
                  type="range"
                  min={500000}
                  max={25000000}
                  step={100000}
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full accent-solstice h-1.5 bg-surface-base rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-ink-secondary">Interest Rate</span>
                    <span className="font-mono font-bold text-ink-primary">{annualInterestRate}%</span>
                  </div>
                  <input
                    type="range"
                    min={6.5}
                    max={16.0}
                    step={0.1}
                    value={annualInterestRate}
                    onChange={(e) => setAnnualInterestRate(Number(e.target.value))}
                    className="w-full accent-solstice h-1.5 bg-surface-base rounded-lg"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-ink-secondary">Tenure (Years)</span>
                    <span className="font-mono font-bold text-ink-primary">{tenureYears} yrs</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={1}
                    value={tenureYears}
                    onChange={(e) => setTenureYears(Number(e.target.value))}
                    className="w-full accent-solstice h-1.5 bg-surface-base rounded-lg"
                  />
                </div>
              </div>

              {/* Tax Regime Selector */}
              <div className="pt-2 border-t border-subtle/50">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-ink-secondary font-mono text-[11px]">Indian Statutory Tax Adjustment</span>
                  <span className="font-mono text-[10.5px] text-solstice">
                    Effective Cost: {result.taxDetails.effectiveLoanRate}%
                  </span>
                </div>
                <div className="pill-segmented flex text-xs">
                  <button
                    type="button"
                    className={`flex-1 py-1 text-[11px] font-mono ${taxRegime === 'new_regime' ? 'pill-active' : ''}`}
                    onClick={() => setTaxRegime('new_regime')}
                  >
                    New Regime (Sec 115BAC)
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-1 text-[11px] font-mono ${taxRegime === 'old_regime' ? 'pill-active' : ''}`}
                    onClick={() => setTaxRegime('old_regime')}
                  >
                    Old Regime (Sec 24b)
                  </button>
                </div>
                <p className="text-[10px] text-muted mt-1">
                  {taxRegime === 'new_regime'
                    ? 'Under Sec 115BAC, no home loan interest deduction is permitted. Nominal rate = effective borrowing cost.'
                    : `Sec 24(b) permits deduction up to ₹2 Lakhs, saving ~₹${(result.taxDetails.annualTaxSavingsSec24b).toLocaleString('en-IN')}/yr in 30% slab.`}
                </p>
              </div>
            </div>

            {/* Right: Arbitrage Parameters */}
            <div className="p-4 rounded-xl bg-surface-raised/30 border border-subtle/60 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider font-mono text-nebula flex items-center gap-1.5">
                  <TrendingUp size={13} /> Arbitrage Capital Allocation
                </span>
                <span className="text-[11px] font-mono text-muted">Surplus Outflow</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-ink-secondary">Extra Monthly Prepayment / SIP</span>
                  <span className="font-mono font-bold text-nebula">₹{extraMonthlyPrepayment.toLocaleString('en-IN')}/mo</span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={100000}
                  step={1000}
                  value={extraMonthlyPrepayment}
                  onChange={(e) => setExtraMonthlyPrepayment(Number(e.target.value))}
                  className="w-full accent-nebula h-1.5 bg-surface-base rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-ink-secondary">1-Time Lumpsum</span>
                    <span className="font-mono font-bold text-ink-primary">{formatLakhs(lumpSumPrepayment)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2000000}
                    step={50000}
                    value={lumpSumPrepayment}
                    onChange={(e) => setLumpSumPrepayment(Number(e.target.value))}
                    className="w-full accent-nebula h-1.5 bg-surface-base rounded-lg"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-ink-secondary">Nifty 50 Expected CAGR</span>
                    <span className="font-mono font-bold text-nebula">{sipExpectedCagr}%</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={18}
                    step={0.5}
                    value={sipExpectedCagr}
                    onChange={(e) => setSipExpectedCagr(Number(e.target.value))}
                    className="w-full accent-nebula h-1.5 bg-surface-base rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-subtle/50 text-[11px] text-muted space-y-1">
                <div className="flex justify-between font-mono text-[10.5px]">
                  <span>Post-12.5% LTCG Equity Return:</span>
                  <span className="text-nebula font-bold">{result.taxDetails.postTaxEquityCagr}%</span>
                </div>
                <p className="text-[10px]">
                  Adjusted for Finance Act 2024 LTCG tax (12.5% on capital gains over ₹1.25 Lakh per year).
                </p>
              </div>
            </div>
          </div>

          {/* Collapsible Year-by-Year Milestone Schedule Table */}
          <div className="p-3.5 rounded-xl bg-surface-raised/30 border border-subtle/60">
            <button
              type="button"
              className="w-full flex items-center justify-between text-xs font-mono font-bold text-ink-primary cursor-pointer"
              onClick={() => setShowScheduleTable(!showScheduleTable)}
            >
              <span className="flex items-center gap-1.5">
                <Layers size={13} className="text-quasar" /> Year-by-Year Amortization & Crossover Schedule ({result.yearlySchedule.length} Years)
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted">
                {showScheduleTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                <span>{showScheduleTable ? 'Collapse Table' : 'Expand Schedule'}</span>
              </span>
            </button>

            {showScheduleTable && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-subtle text-muted text-[10px]">
                      <th className="py-2 px-2">Year</th>
                      <th className="py-2 px-2">Standard Balance</th>
                      <th className="py-2 px-2">Prepay Balance</th>
                      <th className="py-2 px-2">SIP Gross (@ {sipExpectedCagr}%)</th>
                      <th className="py-2 px-2">SIP Net (Post-Tax)</th>
                      <th className="py-2 px-2">Est. LTCG Tax</th>
                      <th className="py-2 px-2">Interest Saved</th>
                      <th className="py-2 px-2">Milestone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.yearlySchedule.map((row) => (
                      <tr
                        key={row.year}
                        className={`border-b border-subtle/30 hover:bg-white/5 transition-colors ${
                          row.isVirtualDebtFree ? 'bg-solstice/5 font-semibold text-solstice' : ''
                        }`}
                      >
                        <td className="py-1.5 px-2 font-bold">Yr {row.year}</td>
                        <td className="py-1.5 px-2">{formatLakhs(row.loanBalanceStandard)}</td>
                        <td className="py-1.5 px-2 text-solstice">{formatLakhs(row.loanBalancePrepay)}</td>
                        <td className="py-1.5 px-2 text-nebula font-medium">{formatLakhs(row.sipPortfolioValueGross)}</td>
                        <td className="py-1.5 px-2 text-emerald-400 font-semibold">{formatLakhs(row.sipPortfolioValueNet)}</td>
                        <td className="py-1.5 px-2 text-rose-400/90">{row.estimatedLtcgTax > 0 ? `-${formatLakhs(row.estimatedLtcgTax)}` : '₹0'}</td>
                        <td className="py-1.5 px-2 text-muted">{formatLakhs(row.interestSavedCumulative)}</td>
                        <td className="py-1.5 px-2">
                          {row.isVirtualDebtFree ? (
                            <span className="px-1.5 py-0.5 rounded bg-solstice/20 text-solstice text-[9.5px]">
                              ✦ Virtual Debt-Free
                            </span>
                          ) : row.loanBalancePrepay === 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-nebula/20 text-nebula text-[9.5px]">
                              ✓ 100% Paid Off
                            </span>
                          ) : (
                            <span className="text-muted/60">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Non-Advisory Actuarial Disclaimer */}
          <div className="p-3 rounded-xl bg-solstice/10 border border-solstice/25 text-[10.5px] text-ink-secondary flex items-start gap-2 leading-relaxed">
            <AlertTriangle size={14} className="text-solstice shrink-0 mt-0.5" />
            <div>
              <strong className="text-solstice block font-mono font-semibold">Educational Actuarial Model — Not Financial or Investment Advice:</strong>
              Equity returns are volatile and non-linear; past or expected CAGR does not guarantee future gains. Prepaying home debt delivers an unconditional, guaranteed post-tax return equal to your effective borrowing rate. Assess personal liquidity, job stability, and emergency runway before prioritizing aggressive equity allocations over debt elimination.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="loan-arbitrage-footer">
          <span className="text-[11px] font-mono text-muted">
            Indian Statutory Amortization Engine · Section 24(b) & Section 112A Compliant · 100% Client-Side
          </span>
          <button
            type="button"
            className="action-pill font-mono text-xs px-4 py-1.5"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

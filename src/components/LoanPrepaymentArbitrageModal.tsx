import { useMemo, useState } from 'react';
import {
  X,
  Scale,
  TrendingUp,
  ShieldCheck,
  IndianRupee,
  Sparkles,
} from 'lucide-react';
import { calculateLoanArbitrage, type LoanArbitrageInputs } from '../lib/loanArbitrage';

interface LoanPrepaymentArbitrageModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLoanAmount?: number;
}

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

  const inputs: LoanArbitrageInputs = useMemo(
    () => ({
      loanAmount,
      annualInterestRate,
      tenureYears,
      extraMonthlyPrepayment,
      lumpSumPrepayment,
      sipExpectedCagr,
    }),
    [loanAmount, annualInterestRate, tenureYears, extraMonthlyPrepayment, lumpSumPrepayment, sipExpectedCagr]
  );

  const result = useMemo(() => calculateLoanArbitrage(inputs), [inputs]);

  if (!isOpen) return null;

  const formatLakhs = (val: number) => {
    if (Math.abs(val) >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(val) >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div
        className="modal-container w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-surface-base border border-subtle/80 shadow-2xl overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header flex items-center justify-between px-6 py-4 border-b border-subtle/60 bg-surface-raised/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-solstice/10 border border-solstice/30 flex items-center justify-center text-solstice shadow-inner">
              <Scale size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink-primary tracking-tight">
                  Loan Prepayment vs. Equity SIP Arbitrage
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-solstice/15 text-solstice border border-solstice/30">
                  ACTUARIAL VERDICT
                </span>
              </div>
              <p className="text-xs text-ink-secondary">
                Model whether extra monthly cashflow should prepay debt or compound in Nifty 50 equity
              </p>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn-ghost text-muted hover:text-ink-primary p-2 rounded-lg transition-colors"
            onClick={onClose}
            title="Close Arbitrage Simulator"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="modal-content overflow-y-auto px-6 py-5 space-y-6">
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
              <div className="w-10 h-10 rounded-full bg-surface-base border border-current/30 flex items-center justify-center shrink-0">
                {result.recommendedStrategy === 'invest_sip' ? (
                  <TrendingUp size={20} />
                ) : result.recommendedStrategy === 'prepay_debt' ? (
                  <ShieldCheck size={20} />
                ) : (
                  <Scale size={20} />
                )}
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold block opacity-80">
                  {result.recommendedStrategy === 'invest_sip'
                    ? '⚡ Equity Compounding Superior'
                    : result.recommendedStrategy === 'prepay_debt'
                    ? '🛡️ Guaranteed Debt Elimination Favored'
                    : '⚖️ Balanced 50/50 Split Recommended'}
                </span>
                <span className="text-sm font-semibold text-ink-primary">
                  {result.recommendedStrategy === 'invest_sip'
                    ? `Equity SIP creates ${formatLakhs(result.netArbitrageAdvantage)} extra wealth over prepaying loan.`
                    : result.recommendedStrategy === 'prepay_debt'
                    ? `Guaranteed ${annualInterestRate}% debt interest savings outpaces conservative equity return.`
                    : `Spread extra cashflow: prepay 50% for peace of mind, compound 50% for wealth.`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs bg-surface-base/80 px-3 py-1.5 rounded-lg border border-current/20 shrink-0">
              <span className="text-muted">Break-Even Market CAGR:</span>
              <span className="font-bold text-ink-primary">{result.breakEvenCagr}%</span>
            </div>
          </div>

          {/* 4 Stat Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-surface-raised/50 border border-subtle/80">
              <span className="text-[11px] font-mono text-muted block mb-1">Standard Monthly EMI</span>
              <span className="text-lg font-bold font-mono text-ink-primary">
                ₹{result.monthlyEmi.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-muted block mt-0.5">Over {tenureYears * 12} months baseline</span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-raised/50 border border-subtle/80">
              <span className="text-[11px] font-mono text-solstice block mb-1">Interest Saved (Debt)</span>
              <span className="text-lg font-bold font-mono text-solstice">
                {formatLakhs(result.interestSaved)}
              </span>
              <span className="text-[10px] text-muted block mt-0.5">
                Shaves {Math.floor(result.monthsSaved / 12)}y {result.monthsSaved % 12}m off loan
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-raised/50 border border-subtle/80">
              <span className="text-[11px] font-mono text-nebula block mb-1">SIP Net Wealth Gain</span>
              <span className="text-lg font-bold font-mono text-nebula">
                {formatLakhs(result.sipNetWealthGain)}
              </span>
              <span className="text-[10px] text-muted block mt-0.5">
                Total FV: {formatLakhs(result.sipFutureValue)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-raised/50 border border-subtle/80">
              <span className="text-[11px] font-mono text-quasar block mb-1">Net Arbitrage Delta</span>
              <span className="text-lg font-bold font-mono text-quasar">
                {result.netArbitrageAdvantage >= 0 ? '+' : ''}
                {formatLakhs(result.netArbitrageAdvantage)}
              </span>
              <span className="text-[10px] text-muted block mt-0.5">SIP Wealth vs Interest Saved</span>
            </div>
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Left: Debt Parameters */}
            <div className="p-4 rounded-xl bg-surface-raised/30 border border-subtle/60 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider font-mono text-solstice flex items-center gap-1.5">
                  <IndianRupee size={13} /> Loan Debt Profile
                </span>
                <span className="text-[11px] font-mono text-muted">Home / Education Loan</span>
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
                    max={14.0}
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
            </div>

            {/* Right: Arbitrage Parameters */}
            <div className="p-4 rounded-xl bg-surface-raised/30 border border-subtle/60 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider font-mono text-nebula flex items-center gap-1.5">
                  <TrendingUp size={13} /> Arbitrage Capital Outflow
                </span>
                <span className="text-[11px] font-mono text-muted">Surplus Allocation</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-ink-secondary">Extra Monthly Prepayment / SIP</span>
                  <span className="font-mono font-bold text-nebula">₹{extraMonthlyPrepayment.toLocaleString('en-IN')}/mo</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50000}
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
                    <span className="text-ink-secondary">Equity Expected CAGR</span>
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
            </div>
          </div>

          {/* Educational Actuarial Footnote */}
          <div className="p-3.5 rounded-xl bg-surface-base border border-subtle/60 text-xs text-muted flex items-start gap-2.5">
            <Sparkles size={16} className="text-solstice shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-ink-primary">Psychological vs. Mathematical Decision:</strong> Prepaying debt provides a guaranteed, risk-free return equal to your loan interest rate ({annualInterestRate}%). Meanwhile, Equity SIPs compound at market rates ({sipExpectedCagr}% CAGR) with volatility. A proven rule of thumb: prepay until debt is &lt;30% of liquid net worth, then compound aggressively in diversified index equity.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer flex items-center justify-between px-6 py-3.5 border-t border-subtle/60 bg-surface-raised/40">
          <span className="text-[11px] font-mono text-muted">
            Indian Statutory Amortization Engine · 100% Client-Side
          </span>
          <button
            type="button"
            className="px-4 py-1.5 rounded-lg bg-surface-raised border border-subtle text-xs font-medium text-ink-primary hover:bg-surface-base transition-colors"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { CreditCard, Landmark, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';
import type { DebtPayoffResult, FinancePlan, TaxComparisonResult } from '../types/finance';
import { formatINR } from '../lib/finance';
import { SliderNumberField } from './SliderNumberField';

interface IndiaTaxAndDebtPanelProps {
  plan: FinancePlan;
  debtPayoff: DebtPayoffResult;
  taxComparison: TaxComparisonResult;
  onChange: (next: FinancePlan) => void;
}

export const IndiaTaxAndDebtPanel: React.FC<IndiaTaxAndDebtPanelProps> = ({
  plan,
  debtPayoff,
  taxComparison,
  onChange,
}) => {
  const updateDebt = (key: keyof FinancePlan['debt'], val: number) => {
    onChange({ ...plan, debt: { ...plan.debt, [key]: val } });
  };

  const updateTax = (key: keyof FinancePlan['tax'], val: number) => {
    onChange({ ...plan, tax: { ...plan.tax, [key]: val } });
  };

  const hasDebt = plan.debt.cardBalance > 0;

  return (
    <div className="two-col-grid">
      {/* 1. High-APR Debt Payoff Engine */}
      <section className="card flex-col justify-between">
        <div>
          <div className="section-head mb-2">
            <div className="flex-align gap-3">
              <div className="icon-chip icon-chip-amber">
                <CreditCard size={16} />
              </div>
              <div>
                <div className="flex-align gap-2">
                  <span className="tech-badge">// MODULE 05</span>
                  <span className="text-xs font-mono text-amber">AMORTIZATION ENGINE</span>
                </div>
                <h2 className="title-sm m-0">Credit Card &amp; Personal Debt Elimination</h2>
              </div>
            </div>
            {hasDebt && (
              <span className="badge-pill badge-amber">
                {plan.debt.aprPercent}% APR
              </span>
            )}
          </div>

          <SliderNumberField id="debt-bal" label="Current Revolving Balance" value={plan.debt.cardBalance} min={0} max={1_000_000} step={2_500} onChange={(v) => updateDebt('cardBalance', v)} />
          <SliderNumberField id="debt-apr" label="Annual Percentage Rate (APR %)" value={plan.debt.aprPercent} min={0} max={48} step={0.5} unit="%" onChange={(v) => updateDebt('aprPercent', v)} />
          <SliderNumberField id="debt-pay" label="Dedicated Monthly Capital" value={plan.debt.monthlyPayment} min={0} max={100_000} step={500} onChange={(v) => updateDebt('monthlyPayment', v)} />
        </div>

        <div>
          {debtPayoff.warning ? (
            <div className="alert-box alert-warn flex-align gap-2">
              <ShieldAlert size={18} className="shrink-0" />
              <div>
                <strong className="font-mono">NEGATIVE AMORTIZATION:</strong> {debtPayoff.warning}
              </div>
            </div>
          ) : !hasDebt ? (
            <div className="alert-box alert-success flex-align gap-2">
              <CheckCircle2 size={18} className="text-emerald shrink-0" />
              <div>
                <strong className="font-mono">REVOLVING DEBT CLEARED:</strong> Zero high-APR interest leaks. 100% of discretionary surplus compounds in mutual funds.
              </div>
            </div>
          ) : (
            <div className="debt-summary-box">
              <div className="debt-metric">
                <span className="muted text-xs font-mono">PAYOFF HORIZON</span>
                <span className="font-mono font-bold text-base text-amber">{debtPayoff.months} Months</span>
              </div>
              <div className="debt-metric">
                <span className="muted text-xs font-mono">FINANCE CHARGES</span>
                <span className="font-mono font-bold text-base text-rose">{formatINR(debtPayoff.totalInterest ?? 0)}</span>
              </div>
              <div className="debt-metric">
                <span className="muted text-xs font-mono">TOTAL REPAYMENT</span>
                <span className="font-mono font-bold text-base">{formatINR(debtPayoff.totalPaid ?? 0)}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. Indian Tax Regime Optimization */}
      <section className="card flex-col justify-between">
        <div>
          <div className="section-head mb-2">
            <div className="flex-align gap-3">
              <div className="icon-chip icon-chip-purple">
                <Landmark size={16} />
              </div>
              <div>
                <div className="flex-align gap-2">
                  <span className="tech-badge">// MODULE 06</span>
                  <span className="text-xs font-mono text-purple">FY 2024-25 REBATE COMPARISON</span>
                </div>
                <h2 className="title-sm m-0">Old vs New Tax Regime Verdict</h2>
              </div>
            </div>
            <span className="badge-pill badge-purple">Sec 87A + 4% Cess</span>
          </div>

          <SliderNumberField id="tax-80c" label="Section 80C Deductions (PPF, ELSS, EPF, max ₹1.5L)" value={plan.tax.deductions80C} min={0} max={150_000} step={5_000} onChange={(v) => updateTax('deductions80C', v)} />
          <SliderNumberField id="tax-80d" label="Section 80D Health Premiums (Self + Parents, max ₹75k)" value={plan.tax.deductions80D} min={0} max={75_000} step={2_500} onChange={(v) => updateTax('deductions80D', v)} />

          <div className="tax-regime-grid">
            {/* New Regime Card */}
            <div className={`tax-card ${taxComparison.recommended === 'new' ? 'tax-card-winner' : ''}`}>
              <div className="tax-card-head">
                <span className="font-semibold text-sm">New Regime</span>
                {taxComparison.recommended === 'new' && (
                  <span className="tax-winner-tag font-mono">
                    <CheckCircle2 size={12} /> VERIFIED OPTIMAL
                  </span>
                )}
              </div>
              <div className="tax-card-val font-mono font-bold text-lg">
                {formatINR(taxComparison.newRegimeTax)}
              </div>
              <span className="muted text-xs font-mono">₹75k Std Ded · Rebate &le; ₹7L</span>
            </div>

            {/* Old Regime Card */}
            <div className={`tax-card ${taxComparison.recommended === 'old' ? 'tax-card-winner' : ''}`}>
              <div className="tax-card-head">
                <span className="font-semibold text-sm">Old Regime</span>
                {taxComparison.recommended === 'old' && (
                  <span className="tax-winner-tag font-mono">
                    <CheckCircle2 size={12} /> VERIFIED OPTIMAL
                  </span>
                )}
              </div>
              <div className="tax-card-val font-mono font-bold text-lg">
                {formatINR(taxComparison.oldRegimeTax)}
              </div>
              <span className="muted text-xs font-mono">₹50k Std Ded + 80C/80D</span>
            </div>
          </div>
        </div>

        <div className="tax-verdict-banner">
          {taxComparison.recommended === 'tie' ? (
            <span className="font-mono text-xs">Both tax regimes produce identical tax liability for this income structure.</span>
          ) : (
            <div className="flex-align gap-2 font-mono text-xs">
              <span className="text-emerald font-bold">
                {taxComparison.recommended === 'new' ? 'NEW REGIME' : 'OLD REGIME'} IS RECOMMENDED
              </span>
              <ArrowRight size={14} className="text-muted" />
              <span>
                Net Annual Savings:{' '}
                <strong className="text-emerald font-mono font-bold">{formatINR(taxComparison.savings)}</strong>
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

import React from 'react';
import { CreditCard, Landmark, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
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
      {/* 1. Debt Card */}
      <section className="card flex-col justify-between">
        <div>
          <div className="section-head mb-2">
            <div className="flex-align gap-2">
              <div className="icon-badge icon-badge-amber">
                <CreditCard size={18} />
              </div>
              <div>
                <h2 className="title-sm m-0">Credit Card &amp; Personal Loan Payoff</h2>
                <p className="muted text-xs">Amortization calculator for high-APR revolving debt</p>
              </div>
            </div>
            {hasDebt && (
              <span className="badge-pill badge-amber">
                {plan.debt.aprPercent}% APR
              </span>
            )}
          </div>

          <SliderNumberField id="debt-bal" label="Current Outstanding Balance" value={plan.debt.cardBalance} min={0} max={1_000_000} step={2_500} onChange={(v) => updateDebt('cardBalance', v)} />
          <SliderNumberField id="debt-apr" label="Annual Percentage Rate (APR)" value={plan.debt.aprPercent} min={0} max={48} step={0.5} unit="%" onChange={(v) => updateDebt('aprPercent', v)} />
          <SliderNumberField id="debt-pay" label="Dedicated Monthly Payment" value={plan.debt.monthlyPayment} min={0} max={100_000} step={500} onChange={(v) => updateDebt('monthlyPayment', v)} />
        </div>

        <div>
          {debtPayoff.warning ? (
            <div className="alert-box alert-warn flex-align gap-2">
              <AlertTriangle size={18} className="shrink-0" />
              <div>
                <strong>Payoff Alert:</strong> {debtPayoff.warning}
              </div>
            </div>
          ) : !hasDebt ? (
            <div className="alert-box alert-success flex-align gap-2">
              <CheckCircle2 size={18} className="text-emerald shrink-0" />
              <div>
                <strong>Zero Revolving Debt!</strong> You are not paying any high-interest penalties. Your entire surplus compounds in savings and SIP.
              </div>
            </div>
          ) : (
            <div className="debt-summary-box">
              <div className="debt-metric">
                <span className="muted text-xs">Debt-Free In</span>
                <span className="font-mono font-bold text-base text-amber">{debtPayoff.months} Months</span>
              </div>
              <div className="debt-metric">
                <span className="muted text-xs">Total Interest</span>
                <span className="font-mono font-bold text-base text-rose">{formatINR(debtPayoff.totalInterest ?? 0)}</span>
              </div>
              <div className="debt-metric">
                <span className="muted text-xs">Total Cash Outflow</span>
                <span className="font-mono font-bold text-base">{formatINR(debtPayoff.totalPaid ?? 0)}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. India Tax Estimator */}
      <section className="card flex-col justify-between">
        <div>
          <div className="section-head mb-2">
            <div className="flex-align gap-2">
              <div className="icon-badge icon-badge-purple">
                <Landmark size={18} />
              </div>
              <div>
                <h2 className="title-sm m-0">Income Tax Regime (FY 2024-25)</h2>
                <p className="muted text-xs">Gross Income: <strong>{formatINR(taxComparison.annualGrossIncome)}</strong> / year</p>
              </div>
            </div>
            <span className="badge-pill badge-purple">Sec 87A + 4% Cess</span>
          </div>

          <SliderNumberField id="tax-80c" label="Section 80C Deductions (PPF, ELSS, EPF, max ₹1.5L)" value={plan.tax.deductions80C} min={0} max={150_000} step={5_000} onChange={(v) => updateTax('deductions80C', v)} />
          <SliderNumberField id="tax-80d" label="Section 80D Health Cover (Self + Parents, max ₹75k)" value={plan.tax.deductions80D} min={0} max={75_000} step={2_500} onChange={(v) => updateTax('deductions80D', v)} />

          <div className="tax-regime-grid">
            {/* New Regime Card */}
            <div className={`tax-card ${taxComparison.recommended === 'new' ? 'tax-card-winner' : ''}`}>
              <div className="tax-card-head">
                <span className="font-semibold text-sm">New Regime</span>
                {taxComparison.recommended === 'new' && (
                  <span className="tax-winner-tag">
                    <CheckCircle2 size={12} /> Best Choice
                  </span>
                )}
              </div>
              <div className="tax-card-val font-mono font-bold text-lg">
                {formatINR(taxComparison.newRegimeTax)}
              </div>
              <span className="muted text-xs">₹75k Standard Ded. · Zero tax &le; ₹7L</span>
            </div>

            {/* Old Regime Card */}
            <div className={`tax-card ${taxComparison.recommended === 'old' ? 'tax-card-winner' : ''}`}>
              <div className="tax-card-head">
                <span className="font-semibold text-sm">Old Regime</span>
                {taxComparison.recommended === 'old' && (
                  <span className="tax-winner-tag">
                    <CheckCircle2 size={12} /> Best Choice
                  </span>
                )}
              </div>
              <div className="tax-card-val font-mono font-bold text-lg">
                {formatINR(taxComparison.oldRegimeTax)}
              </div>
              <span className="muted text-xs">₹50k Std. Ded. + 80C + 80D Slabs</span>
            </div>
          </div>
        </div>

        <div className="tax-verdict-banner">
          {taxComparison.recommended === 'tie' ? (
            <span>Both tax regimes result in identical tax liability for this income bracket.</span>
          ) : (
            <div className="flex-align gap-2">
              <span className="text-emerald font-bold">
                {taxComparison.recommended === 'new' ? 'New' : 'Old'} Regime is optimal
              </span>
              <ArrowRight size={14} className="text-muted" />
              <span>
                Saves <strong className="text-emerald font-mono">{formatINR(taxComparison.savings)}</strong> annually
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

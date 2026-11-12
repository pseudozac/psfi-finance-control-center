import React from 'react';
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

  return (
    <div className="two-col-grid">
      <section className="card">
        <h2>Credit Card / Loan Payoff</h2>
        <SliderNumberField id="debt-bal" label="Outstanding Balance" value={plan.debt.cardBalance} min={0} max={1_000_000} step={2_500} onChange={(v) => updateDebt('cardBalance', v)} />
        <SliderNumberField id="debt-apr" label="Annual Interest (APR)" value={plan.debt.aprPercent} min={0} max={45} step={0.5} unit="%" onChange={(v) => updateDebt('aprPercent', v)} />
        <SliderNumberField id="debt-pay" label="Monthly Payment" value={plan.debt.monthlyPayment} min={0} max={100_000} step={500} onChange={(v) => updateDebt('monthlyPayment', v)} />

        {debtPayoff.warning ? (
          <div className="alert-warn" role="alert">{debtPayoff.warning}</div>
        ) : (
          <div className="info-box">
            <div>Payoff time: <strong>{debtPayoff.months} months</strong></div>
            <div>Total interest: <strong>{formatINR(debtPayoff.totalInterest ?? 0)}</strong></div>
            <div>Total paid: <strong>{formatINR(debtPayoff.totalPaid ?? 0)}</strong></div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>India Tax Regime Estimator (FY 2024-25)</h2>
        <p className="muted">Based on annual gross income of <strong>{formatINR(taxComparison.annualGrossIncome)}</strong></p>

        <SliderNumberField id="tax-80c" label="Section 80C (max ₹1.5L)" value={plan.tax.deductions80C} min={0} max={150_000} step={5_000} onChange={(v) => updateTax('deductions80C', v)} />
        <SliderNumberField id="tax-80d" label="Section 80D Health (max ₹75k)" value={plan.tax.deductions80D} min={0} max={75_000} step={2_500} onChange={(v) => updateTax('deductions80D', v)} />

        <div className="tax-grid">
          <div className={`tax-pill ${taxComparison.recommended === 'new' ? 'tax-best' : ''}`}>
            <span>New Regime</span>
            <strong>{formatINR(taxComparison.newRegimeTax)}</strong>
          </div>
          <div className={`tax-pill ${taxComparison.recommended === 'old' ? 'tax-best' : ''}`}>
            <span>Old Regime</span>
            <strong>{formatINR(taxComparison.oldRegimeTax)}</strong>
          </div>
        </div>
        <p className="muted">
          {taxComparison.recommended === 'tie'
            ? 'Both regimes result in the same estimated tax.'
            : `${taxComparison.recommended === 'new' ? 'New' : 'Old'} Regime saves ${formatINR(taxComparison.savings)}/year (incl. 4% cess).`}
        </p>
      </section>
    </div>
  );
};

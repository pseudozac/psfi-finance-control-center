import React from 'react';
import { CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';
import type { DebtPayoffResult, FinancePlan, TaxComparisonResult } from '../types/finance';
import { formatINR } from '../lib/finance';
import { SliderNumberField } from './SliderNumberField';
import { InfoTooltip } from './InfoTooltip';

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
    <div className="two-col-grid" id="tour-tax">
      {/* 1. Debt Payoff & Amortization */}
      <section className="hipuku-card flex-col justify-between">
        <div>
          <div className="card-header-row mb-4">
            <div className="flex-align gap-2">
              <span className="tag-pill tag-solstice">amortization</span>
              <span className="card-title">Debt Elimination</span>
            </div>
            {hasDebt && (
              <span className="tag-pill tag-flare">
                {plan.debt.aprPercent}% APR
              </span>
            )}
          </div>

          <SliderNumberField
            id="debt-bal"
            label="Current Revolving Balance"
            value={plan.debt.cardBalance}
            min={0}
            max={1_000_000}
            step={2_500}
            onChange={(v) => updateDebt('cardBalance', v)}
          />
          <SliderNumberField
            id="debt-apr"
            label="Annual Percentage Rate (APR %)"
            value={plan.debt.aprPercent}
            min={0}
            max={48}
            step={0.5}
            unit="%"
            onChange={(v) => updateDebt('aprPercent', v)}
          />
          <SliderNumberField
            id="debt-pay"
            label="Dedicated Monthly Capital"
            value={plan.debt.monthlyPayment}
            min={0}
            max={100_000}
            step={500}
            onChange={(v) => updateDebt('monthlyPayment', v)}
          />
        </div>

        <div className="mt-4">
          {debtPayoff.warning ? (
            <div className="alert-pill alert-pill-warn flex-align gap-2">
              <ShieldAlert size={16} className="shrink-0 text-flare" />
              <span><strong>Warning:</strong> {debtPayoff.warning}</span>
            </div>
          ) : !hasDebt ? (
            <div className="alert-pill alert-pill-success flex-align gap-2">
              <CheckCircle2 size={16} className="text-nebula shrink-0" />
              <span><strong>Zero revolving debt:</strong> 100% of discretionary surplus is available for compounding.</span>
            </div>
          ) : (
            <div className="hipuku-metric-row">
              <div className="hipuku-metric-pill">
                <span className="metric-label">Payoff Horizon</span>
                <span className="metric-val text-solstice font-mono">{debtPayoff.months} mos</span>
              </div>
              <div className="hipuku-metric-pill">
                <span className="metric-label">Finance Charges</span>
                <span className="metric-val text-flare font-mono">{formatINR(debtPayoff.totalInterest ?? 0)}</span>
              </div>
              <div className="hipuku-metric-pill">
                <span className="metric-label">Total Outflow</span>
                <span className="metric-val font-mono">{formatINR(debtPayoff.totalPaid ?? 0)}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 2. Indian Tax Regime Optimization */}
      <section className="hipuku-card flex-col justify-between">
        <div>
          <div className="card-header-row mb-4">
            <div className="flex-align gap-2">
              <span className="tag-pill tag-quasar">tax engine</span>
              <span className="card-title">FY 2024-25 Regime Verdict</span>
              <InfoTooltip
                title="FY 2024–25 Indian Tax Regime Engine"
                explanation="Calculates net tax liabilities under both Old and New Tax Regimes. The New Regime features a standard deduction of ₹75,000, revised slab brackets, and Section 87A rebate (zero tax up to ₹7.75L). The Old Regime permits deductions under 80C, 80D, NPS 80CCD(1B), and HRA exemptions."
                formula="Tax Liability = Slab Computation − Rebate 87A + 4% Health & Edu Cess"
                benchmark="PsFi automatically highlights the optimal regime and calculates your exact net rupee savings delta."
              />
            </div>
            <span className="tag-pill tag-pulsar">Sec 87A + 4% Cess</span>
          </div>

          <SliderNumberField
            id="tax-80c"
            label="Section 80C Deductions (PPF, ELSS, EPF, max ₹1.5L)"
            value={plan.tax.deductions80C}
            min={0}
            max={150_000}
            step={5_000}
            onChange={(v) => updateTax('deductions80C', v)}
          />
          <SliderNumberField
            id="tax-80d"
            label="Section 80D Health Premiums (Self + Parents, max ₹75k)"
            value={plan.tax.deductions80D}
            min={0}
            max={75_000}
            step={2_500}
            onChange={(v) => updateTax('deductions80D', v)}
          />
          <SliderNumberField
            id="tax-nps"
            label="Section 80CCD(1B) National Pension System (NPS, max ₹50k)"
            value={plan.tax.deductionsNPS ?? 0}
            min={0}
            max={50_000}
            step={5_000}
            onChange={(v) => updateTax('deductionsNPS', v)}
          />

          <div className="hra-config-box mt-2">
            <div className="flex-between flex-align mb-1">
              <span className="text-xs font-semibold text-muted">HRA Exemption Lever (Old Regime)</span>
              <button
                type="button"
                className={`tag-pill cursor-pointer ${plan.tax.isMetroCity ? 'tag-nebula' : 'tag-muted'}`}
                onClick={() => onChange({ ...plan, tax: { ...plan.tax, isMetroCity: !plan.tax.isMetroCity } })}
                title="Toggle Metro (Delhi/Mumbai/Kolkata/Chennai) 50% vs Non-Metro 40%"
              >
                {plan.tax.isMetroCity ? '● Metro (50% Basic)' : '○ Non-Metro (40% Basic)'}
              </button>
            </div>
            <SliderNumberField
              id="tax-rent"
              label="Monthly Rent Paid for HRA Exemption"
              value={plan.tax.rentPaidMonthly ?? 0}
              min={0}
              max={100_000}
              step={1_000}
              onChange={(v) => updateTax('rentPaidMonthly', v)}
            />
            {Boolean(taxComparison.hraExemption && taxComparison.hraExemption > 0) && (
              <div className="text-xs font-mono text-nebula mt-1 flex-align gap-1">
                <CheckCircle2 size={11} />
                <span>Calculated Annual HRA Exemption: <strong>{formatINR(taxComparison.hraExemption ?? 0)}</strong></span>
              </div>
            )}
          </div>

          <div className="tax-regime-grid mt-3">
            {/* New Regime Card */}
            <div className={`tax-compare-card ${taxComparison.recommended === 'new' ? 'winner-card' : ''}`}>
              <div className="tax-compare-head">
                <span className="tax-name">New Regime</span>
                {taxComparison.recommended === 'new' && (
                  <span className="winner-badge">
                    <CheckCircle2 size={11} /> OPTIMAL
                  </span>
                )}
              </div>
              <div className="tax-amount font-mono">
                {formatINR(taxComparison.newRegimeTax)}
              </div>
              <span className="tax-note">₹75k Std Ded · Rebate &le; ₹7L</span>
            </div>

            {/* Old Regime Card */}
            <div className={`tax-compare-card ${taxComparison.recommended === 'old' ? 'winner-card' : ''}`}>
              <div className="tax-compare-head">
                <span className="tax-name">Old Regime</span>
                {taxComparison.recommended === 'old' && (
                  <span className="winner-badge">
                    <CheckCircle2 size={11} /> OPTIMAL
                  </span>
                )}
              </div>
              <div className="tax-amount font-mono">
                {formatINR(taxComparison.oldRegimeTax)}
              </div>
              <span className="tax-note">₹50k Std + 80C + 80D + NPS + HRA</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="verdict-banner">
            {taxComparison.recommended === 'tie' ? (
              <span className="font-mono text-xs">Both regimes produce identical tax liability for this income structure.</span>
            ) : (
              <div className="flex-align gap-2 text-xs">
                <span className="text-nebula font-bold font-mono">
                  {taxComparison.recommended === 'new' ? 'NEW REGIME' : 'OLD REGIME'} RECOMMENDED
                </span>
                <ArrowRight size={13} className="text-muted" />
                <span>
                  Net Annual Savings:{' '}
                  <strong className="text-nebula font-mono">{formatINR(taxComparison.savings)}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

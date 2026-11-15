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
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="tag-pill tag-quasar shrink-0 text-[11px]">tax engine</span>
              <h3 className="card-title m-0 text-base font-bold flex items-center gap-1.5 flex-wrap">
                <span>Tax Year 2026–27 (Income-tax Act, 2025) &amp; Prior Act</span>
                <InfoTooltip
                  title="Tax Year 2026–27 (Income-tax Act, 2025) Statutory Audit"
                  explanation="Distinguishes current-year planning under the newly enacted Income-tax Act, 2025 (TY 2026–27) from historical comparisons under the prior Income-tax Act, 1961 (FY 2024-25 & FY 2025-26). The 2025 Act establishes the Simplified Regime as default (₹75k standard deduction, 87A rebate with zero tax up to ₹7.75L). Prior Act 1961 allows itemized 80C, 80D, 80CCD, and HRA deductions."
                  formula="Tax Liability = Slab Computation − Rebate 87A + 4% Health & Edu Cess"
                  benchmark="PsFi audits both acts to highlight your mathematically optimal regime and exact rupee savings delta."
                />
              </h3>
            </div>
            <span className="tag-pill tag-pulsar shrink-0 text-xs">Income-tax Act, 2025</span>
          </div>

          {/* Statutory Transition Note & Authority Links */}
          <div style={{ padding: '10px 12px', borderRadius: 'var(--radius-lg)', background: 'var(--surface-overlay)', border: '1px solid var(--border-subtle)', marginBottom: '14px', fontSize: '11.5px', lineHeight: 1.5 }}>
            <div className="flex items-center justify-between gap-2 flex-wrap text-muted">
              <span className="text-secondary font-medium">
                🏛️ <strong>Statutory Distinction:</strong> TY 2026–27 uses <em>Income-tax Act, 2025</em>; prior years remain under the 1961 Act.
              </span>
              <div className="flex items-center gap-2 font-mono text-[10.5px]">
                <a
                  href="https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/objective-and-scope-new-act-faq?mobile-app=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-quasar hover:underline"
                  title="Income Tax Department transition FAQ"
                >
                  ITD Transition FAQ ↗
                </a>
                <span className="text-muted/40">·</span>
                <a
                  href="https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/income-and-tax-estimator-um"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline"
                  title="Tax estimator manual for TY 2026–27"
                >
                  TY 26–27 Estimator Manual ↗
                </a>
              </div>
            </div>
          </div>

          <SliderNumberField
            id="tax-80c"
            label="Section 80C Deductions (PPF, ELSS, EPF, max ₹1.5L) · Prior Act"
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
            <div className="flex-between flex-align mb-1 flex-wrap gap-1.5">
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
            {/* Income-tax Act, 2025 Card */}
            <div className={`tax-compare-card ${taxComparison.recommended === 'new' ? 'winner-card' : ''}`}>
              <div className="tax-compare-head">
                <span className="tax-name">Income-tax Act, 2025</span>
                {taxComparison.recommended === 'new' && (
                  <span className="winner-badge">
                    <CheckCircle2 size={11} /> OPTIMAL
                  </span>
                )}
              </div>
              <div className="tax-amount font-mono">
                {formatINR(taxComparison.newRegimeTax)}
              </div>
              <span className="tax-note">TY 2026–27 Default · ₹75k Std Ded · Sec 87A Rebate &le; ₹7L</span>
            </div>

            {/* Prior Act 1961 Card */}
            <div className={`tax-compare-card ${taxComparison.recommended === 'old' ? 'winner-card' : ''}`}>
              <div className="tax-compare-head">
                <span className="tax-name">Prior Act 1961</span>
                {taxComparison.recommended === 'old' && (
                  <span className="winner-badge">
                    <CheckCircle2 size={11} /> OPTIMAL
                  </span>
                )}
              </div>
              <div className="tax-amount font-mono">
                {formatINR(taxComparison.oldRegimeTax)}
              </div>
              <span className="tax-note">Historical Itemized · ₹50k Std + 80C + 80D + NPS + HRA</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="verdict-banner">
            {taxComparison.recommended === 'tie' ? (
              <span className="font-mono text-xs">Both acts produce identical tax liability for this income structure.</span>
            ) : (
              <div className="flex-align gap-2 text-xs flex-wrap">
                <span className="text-nebula font-bold font-mono">
                  {taxComparison.recommended === 'new' ? 'INCOME-TAX ACT, 2025 (TY 2026–27)' : 'PRIOR ACT 1961 (ITEMIZED)'} RECOMMENDED
                </span>
                <ArrowRight size={13} className="text-muted shrink-0" />
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

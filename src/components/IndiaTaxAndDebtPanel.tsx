import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Zap,
  TrendingDown,
  Plus,
  Trash2,
  Coins,
  Scale,
  Sparkles,
} from 'lucide-react';
import type {
  DebtItem,
  DebtPayoffResult,
  FinancePlan,
  TaxComparisonResult,
} from '../types/finance';
import {
  formatINR,
  calculateMultiDebtPayoff,
} from '../lib/finance';
import { SliderNumberField } from './SliderNumberField';
import { InfoTooltip } from './InfoTooltip';

interface IndiaTaxAndDebtPanelProps {
  plan: FinancePlan;
  debtPayoff: DebtPayoffResult;
  taxComparison: TaxComparisonResult;
  onChange: (next: FinancePlan) => void;
  onOpenLoanArbitrage?: () => void;
}

export const IndiaTaxAndDebtPanel: React.FC<IndiaTaxAndDebtPanelProps> = ({
  plan,
  debtPayoff,
  taxComparison,
  onChange,
  onOpenLoanArbitrage,
}) => {
  const [debtMode, setDebtMode] = useState<'single' | 'multi'>('single');
  const [taxTab, setTaxTab] = useState<'verdict' | 'slabs' | 'capital_gains'>('verdict');

  const updateDebt = (key: keyof FinancePlan['debt'], val: number) => {
    onChange({ ...plan, debt: { ...plan.debt, [key]: val } });
  };

  const updateTax = (key: keyof FinancePlan['tax'], val: number) => {
    onChange({ ...plan, tax: { ...plan.tax, [key]: val } });
  };

  // Multi-liability management
  const liabilities = useMemo(() => {
    if (plan.debt.liabilities && plan.debt.liabilities.length > 0) {
      return plan.debt.liabilities;
    }
    // Fall back to primary revolving balance if no list exists
    if (plan.debt.cardBalance > 0) {
      return [
        {
          id: 'card_primary',
          name: 'Primary Credit Card / Loan',
          balance: plan.debt.cardBalance,
          aprPercent: plan.debt.aprPercent,
          minMonthlyPayment: plan.debt.monthlyPayment,
        },
      ];
    }
    return [];
  }, [plan.debt]);

  const multiDebtResult = useMemo(
    () => calculateMultiDebtPayoff(liabilities, plan.debt.monthlyPayment),
    [liabilities, plan.debt.monthlyPayment]
  );

  const addLiability = () => {
    const newLiability: DebtItem = {
      id: `debt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: 'Personal Loan / Card 2',
      balance: 50_000,
      aprPercent: 18,
      minMonthlyPayment: 2_500,
    };
    const nextLiabilities = [...liabilities, newLiability];
    const totalBal = nextLiabilities.reduce((sum, d) => sum + d.balance, 0);
    onChange({
      ...plan,
      debt: {
        ...plan.debt,
        cardBalance: totalBal,
        liabilities: nextLiabilities,
      },
    });
  };

  const updateLiability = (id: string, updates: Partial<DebtItem>) => {
    const nextLiabilities = liabilities.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    const totalBal = nextLiabilities.reduce((sum, d) => sum + d.balance, 0);
    onChange({
      ...plan,
      debt: {
        ...plan.debt,
        cardBalance: totalBal,
        liabilities: nextLiabilities,
      },
    });
  };

  const removeLiability = (id: string) => {
    const nextLiabilities = liabilities.filter((item) => item.id !== id);
    const totalBal = nextLiabilities.reduce((sum, d) => sum + d.balance, 0);
    onChange({
      ...plan,
      debt: {
        ...plan.debt,
        cardBalance: totalBal,
        liabilities: nextLiabilities,
      },
    });
  };

  const hasDebt = plan.debt.cardBalance > 0;

  return (
    <div className="two-col-grid" id="tour-tax">
      {/* 1. Debt Payoff & Strategy Engine */}
      <section className="hipuku-card flex-col justify-between">
        <div>
          <div className="card-header-row mb-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="tag-pill tag-solstice">amortization</span>
              <span className="card-title">Debt Elimination &amp; Avalanche</span>
            </div>

            {/* Mode Switcher */}
            <div className="pill-segmented segmented-sm" role="group" aria-label="Debt strategy mode">
              <button
                type="button"
                className={debtMode === 'single' ? 'pill-active' : ''}
                onClick={() => setDebtMode('single')}
              >
                Quick Sliders
              </button>
              <button
                type="button"
                className={debtMode === 'multi' ? 'pill-active' : ''}
                onClick={() => setDebtMode('multi')}
              >
                Avalanche vs Snowball
              </button>
            </div>
          </div>

          {/* Quick Sliders Mode */}
          {debtMode === 'single' ? (
            <div className="space-y-3">
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
          ) : (
            /* Multi-Liability Avalanche vs Snowball Mode */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted">
                  Multi-Account Ledger ({liabilities.length} liabilities)
                </span>
                <button
                  type="button"
                  className="tag-pill tag-pulsar cursor-pointer flex items-center gap-1 text-[11px]"
                  onClick={addLiability}
                >
                  <Plus size={11} /> Add Liability
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {liabilities.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-slate-900/40 border border-subtle flex items-center gap-2 flex-wrap sm:flex-nowrap text-xs font-mono"
                  >
                    <input
                      type="text"
                      value={item.name}
                      placeholder="Account Name"
                      className="bg-transparent text-primary text-xs font-sans px-1 py-0.5 flex-1 focus:outline-none border-b border-transparent focus:border-subtle"
                      onChange={(e) => updateLiability(item.id, { name: e.target.value })}
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted text-[10px]">Bal:</span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={item.balance || ''}
                        className="bg-slate-950 px-1.5 py-0.5 rounded border border-subtle w-20 text-right focus:outline-none"
                        onChange={(e) =>
                          updateLiability(item.id, {
                            balance: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted text-[10px]">APR:</span>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        step={0.5}
                        value={item.aprPercent || ''}
                        className="bg-slate-950 px-1 py-0.5 rounded border border-subtle w-12 text-right focus:outline-none text-rose-300"
                        onChange={(e) =>
                          updateLiability(item.id, {
                            aprPercent: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                      />
                      <span className="text-muted text-[10px]">%</span>
                    </div>
                    <button
                      type="button"
                      className="text-muted hover:text-rose-400 p-1"
                      onClick={() => removeLiability(item.id)}
                      title="Remove debt"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Avalanche vs Snowball Comparison Box */}
              {multiDebtResult.hasMultipleLiabilities && (
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  {/* Avalanche Pod */}
                  <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-300 flex items-center gap-1">
                        <Zap size={12} className="text-purple-400" /> Avalanche
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold">Min Interest</span>
                    </div>
                    <div className="font-mono text-primary font-bold">
                      {multiDebtResult.avalanche.monthsToDebtFree} mos
                    </div>
                    <div className="text-[11px] text-muted">
                      Interest: <strong className="text-rose-300">{formatINR(multiDebtResult.avalanche.totalInterestPaid)}</strong>
                    </div>
                    <div className="text-[10px] text-muted truncate">
                      Order: {multiDebtResult.avalanche.payoffOrder.join(' ➔ ')}
                    </div>
                  </div>

                  {/* Snowball Pod */}
                  <div className="p-2.5 rounded-xl bg-slate-900/50 border border-subtle space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-solstice flex items-center gap-1">
                        <TrendingDown size={12} /> Snowball
                      </span>
                      <span className="text-[10px] font-mono text-muted">Quick Win</span>
                    </div>
                    <div className="font-mono text-primary font-bold">
                      {multiDebtResult.snowball.monthsToDebtFree} mos
                    </div>
                    <div className="text-[11px] text-muted">
                      Interest: <strong className="text-rose-300">{formatINR(multiDebtResult.snowball.totalInterestPaid)}</strong>
                    </div>
                    <div className="text-[10px] text-muted truncate">
                      Order: {multiDebtResult.snowball.payoffOrder.join(' ➔ ')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Debt Payoff Telemetry & Prepayment Arbitrage Link */}
        <div className="mt-4 space-y-2.5">
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

          {/* Prepayment Arbitrage Launcher */}
          {onOpenLoanArbitrage && (
            <button
              type="button"
              onClick={onOpenLoanArbitrage}
              className="w-full py-2 px-3 rounded-xl border border-subtle bg-slate-900/60 hover:bg-slate-900 text-xs text-primary font-medium flex items-center justify-between transition-colors shadow-sm"
            >
              <div className="flex items-center gap-1.5 text-solstice font-semibold">
                <Scale size={13} />
                <span>Prepay Debt vs. Invest in Equity SIP Arbitrage</span>
              </div>
              <span className="text-[11px] font-mono text-muted flex items-center gap-1">
                Open Simulator <ArrowRight size={11} />
              </span>
            </button>
          )}
        </div>
      </section>

      {/* 2. Indian Tax Regime Optimization & Slabs */}
      <section className="hipuku-card flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="tag-pill tag-quasar shrink-0 text-[11px]">tax engine</span>
              <h3 className="card-title m-0 text-base font-bold flex items-center gap-1.5 flex-wrap">
                <span>Tax Year 2026–27 (Income-tax Act, 2025)</span>
                <InfoTooltip
                  title="Tax Year 2026–27 Statutory Audit"
                  explanation="Distinguishes current-year planning under the newly enacted Income-tax Act, 2025 (TY 2026–27) from historical comparisons under the prior Income-tax Act, 1961 (FY 2024-25 & FY 2025-26). The 2025 Act establishes the Simplified Regime as default (₹75k standard deduction, 87A rebate with zero tax up to ₹7.75L). Prior Act 1961 allows itemized 80C, 80D, 80CCD, and HRA deductions."
                  formula="Tax Liability = Slab Computation − Rebate 87A + 4% Health & Edu Cess"
                  benchmark="PsFi audits both acts to highlight your mathematically optimal regime and exact rupee savings delta."
                />
              </h3>
            </div>

            {/* Tax View Tabs */}
            <div className="pill-segmented segmented-sm" role="group" aria-label="Tax view options">
              <button
                type="button"
                className={taxTab === 'verdict' ? 'pill-active' : ''}
                onClick={() => setTaxTab('verdict')}
              >
                Verdict
              </button>
              <button
                type="button"
                className={taxTab === 'slabs' ? 'pill-active' : ''}
                onClick={() => setTaxTab('slabs')}
              >
                Slabs
              </button>
              <button
                type="button"
                className={taxTab === 'capital_gains' ? 'pill-active' : ''}
                onClick={() => setTaxTab('capital_gains')}
              >
                Capital Gains
              </button>
            </div>
          </div>

          {/* TAB 1: VERDICT & DEDUCTION LEVERS */}
          {taxTab === 'verdict' && (
            <div className="space-y-3">
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
                  <span className="tax-note">TY 2026–27 Default · ₹75k Std Ded · Effective {taxComparison.effectiveRateNew}%</span>
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
                  <span className="tax-note">Itemized · ₹50k Std + 80C + 80D + HRA · Effective {taxComparison.effectiveRateOld}%</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SLAB-BY-SLAB AUDIT */}
          {taxTab === 'slabs' && (
            <div className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3 text-muted text-[11px] pb-1 border-b border-subtle">
                <div>
                  <strong className="text-purple-300 block font-sans">2025 Act Slabs (TY 26–27)</strong>
                  <span>Taxable: {formatINR(taxComparison.newRegimeTaxableIncome ?? 0)}</span>
                </div>
                <div>
                  <strong className="text-solstice block font-sans">Prior Act 1961 Slabs</strong>
                  <span>Taxable: {formatINR(taxComparison.oldRegimeTaxableIncome ?? 0)}</span>
                </div>
              </div>

              {/* Slabs Side-by-Side Breakdown */}
              <div className="grid grid-cols-2 gap-3 max-h-56 overflow-y-auto">
                {/* 2025 Act */}
                <div className="space-y-1.5">
                  {(taxComparison.newRegimeSlabs ?? []).map((slab, i) => (
                    <div key={i} className="p-1.5 rounded bg-slate-900/40 border border-subtle text-[11px]">
                      <div className="flex justify-between text-muted">
                        <span>{slab.slab}</span>
                        <span className="font-bold text-purple-300">{slab.rate}</span>
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-muted">Tax:</span>
                        <strong className="text-primary">{formatINR(slab.tax)}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Prior Act */}
                <div className="space-y-1.5">
                  {(taxComparison.oldRegimeSlabs ?? []).map((slab, i) => (
                    <div key={i} className="p-1.5 rounded bg-slate-900/40 border border-subtle text-[11px]">
                      <div className="flex justify-between text-muted">
                        <span>{slab.slab}</span>
                        <span className="font-bold text-solstice">{slab.rate}</span>
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-muted">Tax:</span>
                        <strong className="text-primary">{formatINR(slab.tax)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CAPITAL GAINS TAXATION */}
          {taxTab === 'capital_gains' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-purple-950/25 border border-purple-800/40 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-purple-200">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-400" />
                    <span>Budget 2024–25 Capital Gains Framework</span>
                  </span>
                  <span className="font-mono text-emerald-400">12.5% LTCG</span>
                </div>
                <p className="text-[11.5px] text-muted m-0 leading-relaxed font-sans">
                  Long-Term Capital Gains on equity funds and stocks held &gt; 12 months are taxed at a flat <strong className="text-white">12.5%</strong>. You enjoy an annual tax-free exemption of <strong className="text-emerald-300 font-mono">₹1,25,000</strong> per financial year.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900/50 border border-subtle">
                  <span className="text-[10px] text-muted block uppercase">Annual Tax-Free Exemption</span>
                  <strong className="text-emerald-400 text-sm block mt-0.5">₹1,25,000 / FY</strong>
                  <span className="text-[10.5px] text-muted block mt-1">Section 112A LTCG threshold</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/50 border border-subtle">
                  <span className="text-[10px] text-muted block uppercase">Short-Term Gains (&lt;1Y)</span>
                  <strong className="text-rose-400 text-sm block mt-0.5">20.0% STCG</strong>
                  <span className="text-[10.5px] text-muted block mt-1">Section 111A flat rate</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/30 border border-subtle text-[11px] text-muted flex items-start gap-1.5">
                <Coins size={14} className="text-solstice shrink-0 mt-0.5" />
                <span>
                  <strong>Tax-Gain Harvesting Tip:</strong> Redeem and immediately re-buy equity mutual fund units each financial year up to ₹1.25 Lakh of profit. This resets your purchase cost basis to zero out future capital gains liability permanently.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Verdict Banner */}
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

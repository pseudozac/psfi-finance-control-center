import React from 'react';
import { ShieldCheck, TrendingUp, Wallet, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { DebtPayoffResult, FinanceSummary, ViewPeriod } from '../types/finance';
import { formatINR } from '../lib/finance';
import { InfoTooltip } from './InfoTooltip';

interface SummaryCardsProps {
  summary: FinanceSummary;
  debtPayoff: DebtPayoffResult;
  period: ViewPeriod;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, debtPayoff, period }) => {
  const mult = period === 'annual' ? 12 : 1;
  const periodLabel = period === 'annual' ? 'Annual' : 'Monthly';
  const isSurplusPositive = summary.monthlySurplus >= 0;

  return (
    <section className="summary-grid" id="tour-vitals" aria-label="Key Financial Metrics">
      {/* 1. Cash Surplus */}
      <div className="hipuku-kpi-card card-nebula">
        <div className="kpi-top">
          <div className="flex-align gap-1.5">
            <span className="kpi-title">{periodLabel} Surplus</span>
            <InfoTooltip
              title={`${periodLabel} Surplus (Free Cashflow)`}
              explanation="The net unencumbered liquidity generated each month. Any positive surplus flows into step-up SIPs and emergency reserves."
              formula="Surplus = Total Inflows − Total Outflows"
              benchmark="Target: > 20% of net monthly income."
            />
          </div>
          <div className="kpi-icon-pill icon-nebula">
            <Wallet size={15} />
          </div>
        </div>
        <div className={`kpi-big-num font-mono ${isSurplusPositive ? 'text-nebula' : 'text-flare'}`}>
          {formatINR(summary.monthlySurplus * mult)}
        </div>
        <div className="kpi-footer">
          <span className="tag-pill tag-nebula">
            {isSurplusPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {isSurplusPositive ? 'Positive Cashflow' : 'Deficit'}
          </span>
          <span className="kpi-detail font-mono muted">
            +{formatINR(summary.monthlyIncome * mult)} / −{formatINR(summary.monthlyExpenses * mult)}
          </span>
        </div>
      </div>

      {/* 2. Compounding Rate */}
      <div className="hipuku-kpi-card card-pulsar">
        <div className="kpi-top">
          <div className="flex-align gap-1.5">
            <span className="kpi-title">Savings &amp; SIP Rate</span>
            <InfoTooltip
              title="Compounding Savings Rate"
              explanation="The percentage of your total inflow that is preserved and directed toward investments and emergency reserves."
              formula="(Monthly Surplus ÷ Gross Inflow) × 100"
              benchmark="20% is good; 35%+ accelerates financial independence (FIRE) by over a decade."
            />
          </div>
          <div className="kpi-icon-pill icon-pulsar">
            <TrendingUp size={15} />
          </div>
        </div>
        <div className="kpi-big-num font-mono text-pulsar">
          {summary.savingsRatePercent.toFixed(1)}%
        </div>
        <div className="kpi-footer">
          <span className={`tag-pill ${summary.savingsRatePercent >= 20 ? 'tag-pulsar' : 'tag-solstice'}`}>
            {summary.savingsRatePercent >= 20 ? 'Target Met (20%+)' : 'Below 20% Goal'}
          </span>
          <span className="kpi-detail muted">of gross income</span>
        </div>
      </div>

      {/* 3. Emergency Runway */}
      <div className="hipuku-kpi-card card-quasar">
        <div className="kpi-top">
          <div className="flex-align gap-1.5">
            <span className="kpi-title">Emergency Runway</span>
            <InfoTooltip
              title="Emergency Runway Duration"
              explanation="How many months your household can survive with zero income using current liquid reserves."
              formula="Liquid Savings ÷ Total Monthly Expenses"
              benchmark="Maintain at least 6 months of living expenses in high-liquidity instruments."
            />
          </div>
          <div className="kpi-icon-pill icon-quasar">
            <ShieldCheck size={15} />
          </div>
        </div>
        <div className="kpi-big-num font-mono text-quasar">
          {summary.emergencyRunwayMonths.toFixed(1)} <span className="text-sm font-sans font-normal muted">mo</span>
        </div>
        <div className="kpi-footer">
          <span className={`tag-pill ${summary.emergencyRunwayMonths >= 6 ? 'tag-quasar' : 'tag-solstice'}`}>
            {summary.emergencyRunwayMonths >= 6 ? '6+ Months Shield' : 'Rebuild to 6 Months'}
          </span>
          <span className="kpi-detail muted">liquid buffer</span>
        </div>
      </div>

      {/* 4. Debt Payoff */}
      <div className="hipuku-kpi-card card-solstice">
        <div className="kpi-top">
          <div className="flex-align gap-1.5">
            <span className="kpi-title">Debt-Free ETA</span>
            <InfoTooltip
              title="Debt Amortization ETA"
              explanation="The calculated time required to eliminate credit card and personal loan balances at your current repayment velocity."
              formula="Standard amortization incorporating monthly APR compounding"
              benchmark="Aim for zero high-interest revolving debt (APR > 15%)."
            />
          </div>
          <div className="kpi-icon-pill icon-solstice">
            <CreditCard size={15} />
          </div>
        </div>
        <div className="kpi-big-num font-mono text-solstice">
          {debtPayoff.months === null ? (
            'Overdrawn'
          ) : debtPayoff.months === 0 ? (
            <span className="text-nebula">Zero Debt</span>
          ) : (
            <>
              {debtPayoff.months} <span className="text-sm font-sans font-normal muted">mo</span>
            </>
          )}
        </div>
        <div className="kpi-footer">
          <span className="tag-pill tag-solstice">
            {debtPayoff.months === 0 ? 'No Revolving Debt' : `Interest: ${formatINR(debtPayoff.totalInterest ?? 0)}`}
          </span>
          <span className="kpi-detail muted">
            {debtPayoff.months === 0 ? 'Clean Slate' : 'Payoff Target'}
          </span>
        </div>
      </div>
    </section>
  );
};

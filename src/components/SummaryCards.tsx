import React from 'react';
import { ShieldCheck, TrendingUp, Wallet, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { DebtPayoffResult, FinanceSummary, ViewPeriod } from '../types/finance';
import { formatINR } from '../lib/finance';

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
      <div
        className="hipuku-kpi-card card-nebula"
        title="Income remaining after living costs & debt payments, before scheduled investments."
      >
        <div className="kpi-top">
          <span className="kpi-title">{periodLabel} Free Cashflow</span>
          <div className="kpi-icon-pill icon-nebula">
            <Wallet size={15} />
          </div>
        </div>
        <div className={`kpi-big-num font-mono ${isSurplusPositive ? 'text-nebula' : 'text-flare'}`}>
          {formatINR(summary.monthlySurplus * mult)}
        </div>
        <div className="kpi-footer">
          <span className={`tag-pill ${isSurplusPositive ? 'tag-nebula' : 'tag-flare'}`}>
            {isSurplusPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {isSurplusPositive ? 'Positive Cashflow' : 'Deficit'}
          </span>
          <span className="kpi-detail font-mono muted">
            +{formatINR(summary.monthlyIncome * mult)} In / −{formatINR(summary.monthlyExpenses * mult)} Out
          </span>
        </div>
      </div>

      {/* 2. Compounding Rate */}
      <div
        className="hipuku-kpi-card card-pulsar"
        title="Percentage of total inflow saved or invested toward wealth building."
      >
        <div className="kpi-top">
          <span className="kpi-title">Savings &amp; SIP Velocity</span>
          <div className="kpi-icon-pill icon-pulsar">
            <TrendingUp size={15} />
          </div>
        </div>
        <div className="kpi-big-num font-mono text-pulsar">
          {summary.monthlyIncome > 0 ? `${summary.savingsRatePercent.toFixed(1)}%` : '—'}
        </div>
        <div className="kpi-footer">
          <span className={`tag-pill ${summary.savingsFundingGap === 0 && summary.savingsRatePercent >= 20 ? 'tag-pulsar' : 'tag-solstice'}`}>
            {summary.savingsFundingGap > 0 ? `${formatINR(summary.savingsFundingGap)}/mo gap` : summary.monthlyIncome === 0 ? 'No income' : summary.savingsRatePercent >= 20 ? 'Target Met (20%+)' : 'Below 20% Goal'}
          </span>
          <span className="kpi-detail muted">scheduled · net inflow</span>
        </div>
      </div>

      {/* 3. Emergency Runway */}
      <div
        className="hipuku-kpi-card card-quasar"
        title="Survival duration in months at current full living expenses with zero income."
      >
        <div className="kpi-top">
          <span className="kpi-title">Emergency Runway</span>
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
          <span className="kpi-detail muted">liquid capital buffer</span>
        </div>
      </div>

      {/* 4. Debt Payoff */}
      <div
        className="hipuku-kpi-card card-solstice"
        title="Estimated timeline to eliminate all revolving debt at current payment run-rate."
      >
        <div className="kpi-top">
          <span className="kpi-title">Debt-Free Horizon</span>
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

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
    <section className="summary-grid" aria-label="Key Financial Metrics">
      {/* 1. Surplus Card */}
      <div className="kpi-card kpi-emerald">
        <div className="kpi-head">
          <span className="kpi-label">{periodLabel} Surplus</span>
          <div className="icon-chip icon-chip-emerald">
            <Wallet size={18} />
          </div>
        </div>
        <div className={`kpi-value font-mono ${!isSurplusPositive ? 'text-rose' : 'text-emerald'}`}>
          {formatINR(summary.monthlySurplus * mult)}
        </div>
        <div className="kpi-footer">
          <div className="kpi-badge">
            {isSurplusPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            <span>{isSurplusPositive ? 'Positive Cashflow' : 'Deficit'}</span>
          </div>
          <span className="kpi-sub font-mono">
            +{formatINR(summary.monthlyIncome * mult)} / −{formatINR(summary.monthlyExpenses * mult)}
          </span>
        </div>
      </div>

      {/* 2. Savings & SIP Rate Card */}
      <div className="kpi-card kpi-sky">
        <div className="kpi-head">
          <span className="kpi-label">Savings &amp; SIP Rate</span>
          <div className="icon-chip icon-chip-sky">
            <TrendingUp size={18} />
          </div>
        </div>
        <div className="kpi-value font-mono text-sky">
          {summary.savingsRatePercent.toFixed(1)}%
        </div>
        <div className="kpi-footer">
          <div className={`kpi-badge ${summary.savingsRatePercent >= 20 ? 'kpi-badge-good' : 'kpi-badge-warn'}`}>
            {summary.savingsRatePercent >= 20 ? 'Target Met (20%+)' : 'Below 20% Goal'}
          </div>
          <span className="kpi-sub">of Gross Income</span>
        </div>
      </div>

      {/* 3. Emergency Runway Card */}
      <div className="kpi-card kpi-purple">
        <div className="kpi-head">
          <span className="kpi-label">Emergency Runway</span>
          <div className="icon-chip icon-chip-purple">
            <ShieldCheck size={18} />
          </div>
        </div>
        <div className="kpi-value font-mono text-purple">
          {summary.emergencyRunwayMonths.toFixed(1)} <span className="kpi-unit">mo</span>
        </div>
        <div className="kpi-footer">
          <div className={`kpi-badge ${summary.emergencyRunwayMonths >= 6 ? 'kpi-badge-good' : 'kpi-badge-warn'}`}>
            {summary.emergencyRunwayMonths >= 6 ? 'Rock Solid (6+ mo)' : 'Rebuild to 6 mo'}
          </div>
          <span className="kpi-sub">Expense Buffer</span>
        </div>
      </div>

      {/* 4. Debt Payoff ETA Card */}
      <div className="kpi-card kpi-amber">
        <div className="kpi-head">
          <span className="kpi-label">Debt-Free ETA</span>
          <div className="icon-chip icon-chip-amber">
            <CreditCard size={18} />
          </div>
        </div>
        <div className="kpi-value font-mono text-amber">
          {debtPayoff.months === null ? (
            'Overdrawn'
          ) : debtPayoff.months === 0 ? (
            <span className="text-emerald">Debt Free</span>
          ) : (
            <>
              {debtPayoff.months} <span className="kpi-unit">mo</span>
            </>
          )}
        </div>
        <div className="kpi-footer">
          <div className="kpi-badge">
            {debtPayoff.totalInterest !== null ? (
              <span>Interest: {formatINR(debtPayoff.totalInterest)}</span>
            ) : (
              <span>Warning</span>
            )}
          </div>
          <span className="kpi-sub">
            {debtPayoff.months === 0 ? 'Zero Card Balance' : 'Full Amortization'}
          </span>
        </div>
      </div>
    </section>
  );
};

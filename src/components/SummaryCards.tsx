import React from 'react';
import { ShieldCheck, TrendingUp, Wallet, CreditCard } from 'lucide-react';
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

  return (
    <section className="summary-grid" aria-label="Key Financial Metrics">
      <div className="kpi-card">
        <div className="kpi-head">
          <span>{periodLabel} Surplus</span>
          <Wallet size={18} className="icon-emerald" />
        </div>
        <div className={`kpi-value ${summary.monthlySurplus < 0 ? 'text-rose' : ''}`}>
          {formatINR(summary.monthlySurplus * mult)}
        </div>
        <div className="kpi-sub">
          Income {formatINR(summary.monthlyIncome * mult)} − Expenses {formatINR(summary.monthlyExpenses * mult)}
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-head">
          <span>Savings + SIP Rate</span>
          <TrendingUp size={18} className="icon-sky" />
        </div>
        <div className="kpi-value">{summary.savingsRatePercent.toFixed(1)}%</div>
        <div className="kpi-sub">Target benchmark: 20%+ of gross income</div>
      </div>

      <div className="kpi-card">
        <div className="kpi-head">
          <span>Emergency Runway</span>
          <ShieldCheck size={18} className="icon-emerald" />
        </div>
        <div className="kpi-value">{summary.emergencyRunwayMonths.toFixed(1)} mo</div>
        <div className="kpi-sub">
          {summary.emergencyRunwayMonths >= 6 ? 'Healthy (6+ months covered)' : 'Below 6-month target'}
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-head">
          <span>Debt-Free ETA</span>
          <CreditCard size={18} className="icon-amber" />
        </div>
        <div className="kpi-value">
          {debtPayoff.months === null ? 'Never' : debtPayoff.months === 0 ? 'Debt-Free' : `${debtPayoff.months} mo`}
        </div>
        <div className="kpi-sub">
          {debtPayoff.totalInterest !== null
            ? `Total interest: ${formatINR(debtPayoff.totalInterest)}`
            : 'Increase monthly payment'}
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import { ShieldCheck, TrendingUp, Wallet, CreditCard, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
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
  const surplusPct = summary.monthlyIncome > 0
    ? Math.max(0, Math.min(100, (summary.monthlySurplus / summary.monthlyIncome) * 100))
    : 0;
  const runwayPct = Math.min(100, (summary.emergencyRunwayMonths / 6) * 100);

  return (
    <section className="summary-grid" aria-label="Executive Financial Telemetry">
      {/* 1. Cashflow Surplus Card */}
      <div className="kpi-card kpi-emerald group">
        <div className="kpi-top">
          <div className="kpi-tag-chip">
            <span className="tech-index">[01]</span>
            <span className="kpi-label">{periodLabel} Surplus</span>
          </div>
          <div className="icon-chip icon-chip-emerald">
            <Wallet size={16} />
          </div>
        </div>

        <div className="kpi-body">
          <div className={`kpi-value font-mono ${!isSurplusPositive ? 'text-rose' : 'text-emerald'}`}>
            {formatINR(summary.monthlySurplus * mult)}
          </div>
          <div className="mini-meter-wrap">
            <div
              className="mini-meter-bar bg-emerald"
              style={{ width: `${surplusPct}%` }}
              title={`Surplus share: ${surplusPct.toFixed(0)}% of income`}
            />
          </div>
        </div>

        <div className="kpi-footer">
          <div className="kpi-badge kpi-badge-emerald">
            {isSurplusPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            <span>{isSurplusPositive ? 'Positive Cashflow' : 'Deficit Outflow'}</span>
          </div>
          <span className="kpi-sub font-mono">
            +{formatINR(summary.monthlyIncome * mult)} / −{formatINR(summary.monthlyExpenses * mult)}
          </span>
        </div>
      </div>

      {/* 2. Savings & SIP Rate Card */}
      <div className="kpi-card kpi-cyan group">
        <div className="kpi-top">
          <div className="kpi-tag-chip">
            <span className="tech-index">[02]</span>
            <span className="kpi-label">Compounding Rate</span>
          </div>
          <div className="icon-chip icon-chip-cyan">
            <TrendingUp size={16} />
          </div>
        </div>

        <div className="kpi-body">
          <div className="kpi-value font-mono text-cyan">
            {summary.savingsRatePercent.toFixed(1)}<span className="kpi-unit">%</span>
          </div>
          <div className="mini-meter-wrap">
            <div
              className="mini-meter-bar bg-cyan"
              style={{ width: `${Math.min(100, (summary.savingsRatePercent / 40) * 100)}%` }}
              title={`Compounding: ${summary.savingsRatePercent.toFixed(1)}%`}
            />
          </div>
        </div>

        <div className="kpi-footer">
          <div className={`kpi-badge ${summary.savingsRatePercent >= 20 ? 'kpi-badge-good' : 'kpi-badge-warn'}`}>
            <Activity size={12} />
            <span>{summary.savingsRatePercent >= 20 ? 'Target Achieved (20%+)' : 'Below 20% Benchmark'}</span>
          </div>
          <span className="kpi-sub font-mono">Liquid + Equity SIP</span>
        </div>
      </div>

      {/* 3. Emergency Runway Card */}
      <div className="kpi-card kpi-purple group">
        <div className="kpi-top">
          <div className="kpi-tag-chip">
            <span className="tech-index">[03]</span>
            <span className="kpi-label">Capital Runway</span>
          </div>
          <div className="icon-chip icon-chip-purple">
            <ShieldCheck size={16} />
          </div>
        </div>

        <div className="kpi-body">
          <div className="kpi-value font-mono text-purple">
            {summary.emergencyRunwayMonths.toFixed(1)} <span className="kpi-unit">mo</span>
          </div>
          <div className="mini-meter-wrap">
            <div
              className="mini-meter-bar bg-purple"
              style={{ width: `${runwayPct}%` }}
              title={`Runway: ${summary.emergencyRunwayMonths.toFixed(1)} of 6 months`}
            />
          </div>
        </div>

        <div className="kpi-footer">
          <div className={`kpi-badge ${summary.emergencyRunwayMonths >= 6 ? 'kpi-badge-good' : 'kpi-badge-warn'}`}>
            <span>{summary.emergencyRunwayMonths >= 6 ? 'Shield Active (6+ mo)' : 'Rebuild 6-Mo Goal'}</span>
          </div>
          <span className="kpi-sub font-mono">Expense Coverage</span>
        </div>
      </div>

      {/* 4. Debt Payoff ETA Card */}
      <div className="kpi-card kpi-amber group">
        <div className="kpi-top">
          <div className="kpi-tag-chip">
            <span className="tech-index">[04]</span>
            <span className="kpi-label">Debt-Free Horizon</span>
          </div>
          <div className="icon-chip icon-chip-amber">
            <CreditCard size={16} />
          </div>
        </div>

        <div className="kpi-body">
          <div className="kpi-value font-mono text-amber">
            {debtPayoff.months === null ? (
              'Underfunded'
            ) : debtPayoff.months === 0 ? (
              <span className="text-emerald">Debt Free</span>
            ) : (
              <>
                {debtPayoff.months} <span className="kpi-unit">mo</span>
              </>
            )}
          </div>
          <div className="mini-meter-wrap">
            <div
              className="mini-meter-bar bg-amber"
              style={{
                width: debtPayoff.months === 0 ? '100%' : `${Math.max(10, 100 - (debtPayoff.months ?? 0) * 3)}%`,
              }}
            />
          </div>
        </div>

        <div className="kpi-footer">
          <div className="kpi-badge kpi-badge-amber">
            {debtPayoff.totalInterest !== null ? (
              <span>Interest: {formatINR(debtPayoff.totalInterest)}</span>
            ) : (
              <span>Action Required</span>
            )}
          </div>
          <span className="kpi-sub font-mono">
            {debtPayoff.months === 0 ? 'Zero Revolving APR' : 'Amortized Payoff'}
          </span>
        </div>
      </div>
    </section>
  );
};

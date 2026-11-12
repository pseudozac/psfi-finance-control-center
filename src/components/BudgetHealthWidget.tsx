import React from 'react';
import { CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';
import type { BudgetRuleAnalysis } from '../types/finance';
import { formatINR } from '../lib/finance';

interface BudgetHealthWidgetProps {
  analysis: BudgetRuleAnalysis;
}

export const BudgetHealthWidget: React.FC<BudgetHealthWidgetProps> = ({ analysis }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald border-emerald/30 bg-emerald/10';
    if (score >= 60) return 'text-sky border-sky/30 bg-sky/10';
    return 'text-amber border-amber/30 bg-amber/10';
  };

  return (
    <section className="card budget-health-card" aria-label="50/30/20 Financial Health">
      <div className="section-head mb-3">
        <div className="flex-align gap-2">
          <div className="icon-badge icon-badge-emerald">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="title-sm m-0">50 / 30 / 20 Budget Health Audit</h2>
            <p className="muted text-xs">Standard wealth benchmark: 50% Needs · 30% Wants · 20%+ Savings &amp; SIP</p>
          </div>
        </div>
        <div className="flex-align gap-3">
          <div className={`health-score-pill ${getScoreColor(analysis.score)}`}>
            {analysis.score >= 80 ? (
              <CheckCircle2 size={16} />
            ) : analysis.score >= 60 ? (
              <Info size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <span className="font-bold">{analysis.score} / 100</span>
            <span className="muted-pill">({analysis.rating})</span>
          </div>
        </div>
      </div>

      <div className="multi-bar-wrap mb-4">
        <div className="multi-bar" role="progressbar" aria-valuenow={analysis.score} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="bar-seg bar-needs"
            style={{ width: `${Math.min(100, analysis.needsPercent)}%` }}
            title={`Needs: ${analysis.needsPercent}%`}
          />
          <div
            className="bar-seg bar-wants"
            style={{ width: `${Math.min(100, analysis.wantsPercent)}%` }}
            title={`Wants: ${analysis.wantsPercent}%`}
          />
          <div
            className="bar-seg bar-savings"
            style={{ width: `${Math.min(100, analysis.savingsPercent)}%` }}
            title={`Savings & SIP: ${analysis.savingsPercent}%`}
          />
        </div>
      </div>

      <div className="budget-breakdown-grid">
        <div className="budget-item">
          <div className="budget-item-top">
            <span className="dot dot-needs" />
            <span className="font-semibold text-sm">Essential Needs</span>
            <span className="budget-target">Target &le; 50%</span>
          </div>
          <div className="budget-item-val font-mono">
            {formatINR(analysis.needsAmount)}
            <span className={`budget-pct ${analysis.needsPercent > 50 ? 'pct-warn' : 'pct-good'}`}>
              {analysis.needsPercent}%
            </span>
          </div>
          <div className="budget-sub muted text-xs">Housing, Groceries, Utilities, Transport, Term Cover</div>
        </div>

        <div className="budget-item">
          <div className="budget-item-top">
            <span className="dot dot-wants" />
            <span className="font-semibold text-sm">Lifestyle &amp; Wants</span>
            <span className="budget-target">Target &le; 30%</span>
          </div>
          <div className="budget-item-val font-mono">
            {formatINR(analysis.wantsAmount)}
            <span className={`budget-pct ${analysis.wantsPercent > 30 ? 'pct-warn' : 'pct-good'}`}>
              {analysis.wantsPercent}%
            </span>
          </div>
          <div className="budget-sub muted text-xs">Dining, Shopping, Entertainment &amp; Hobbies</div>
        </div>

        <div className="budget-item">
          <div className="budget-item-top">
            <span className="dot dot-savings" />
            <span className="font-semibold text-sm">Savings &amp; Investments</span>
            <span className="budget-target">Target &ge; 20%</span>
          </div>
          <div className="budget-item-val font-mono">
            {formatINR(analysis.savingsAmount)}
            <span className={`budget-pct ${analysis.savingsPercent >= 20 ? 'pct-good' : 'pct-warn'}`}>
              {analysis.savingsPercent}%
            </span>
          </div>
          <div className="budget-sub muted text-xs">Emergency Cash + Compounding Monthly SIP</div>
        </div>
      </div>
    </section>
  );
};

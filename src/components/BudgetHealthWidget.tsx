import React from 'react';
import { CheckCircle2, AlertCircle, Info, Cpu } from 'lucide-react';
import type { BudgetRuleAnalysis } from '../types/finance';
import { formatINR } from '../lib/finance';

interface BudgetHealthWidgetProps {
  analysis: BudgetRuleAnalysis;
}

export const BudgetHealthWidget: React.FC<BudgetHealthWidgetProps> = ({ analysis }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'score-optimal';
    if (score >= 60) return 'score-healthy';
    return 'score-attention';
  };

  return (
    <section className="card budget-health-card" aria-label="50/30/20 Financial Health Audit">
      <div className="section-head mb-3">
        <div className="flex-align gap-3">
          <div className="icon-chip icon-chip-emerald">
            <Cpu size={16} />
          </div>
          <div>
            <div className="flex-align gap-2">
              <span className="tech-badge">// MODULE 02</span>
              <span className="live-dot-pulse">
                <span className="live-dot" /> LIVE AUDIT
              </span>
            </div>
            <h2 className="title-sm m-0">50 / 30 / 20 Capital Allocation Architecture</h2>
          </div>
        </div>

        <div className="flex-align gap-3">
          <div className={`health-score-hud ${getScoreColor(analysis.score)}`}>
            {analysis.score >= 80 ? (
              <CheckCircle2 size={16} className="text-emerald" />
            ) : analysis.score >= 60 ? (
              <Info size={16} className="text-cyan" />
            ) : (
              <AlertCircle size={16} className="text-amber" />
            )}
            <div className="score-numbers font-mono">
              <span className="score-main font-bold">{analysis.score}</span>
              <span className="score-max muted">/100</span>
            </div>
            <span className="score-status-badge font-mono">[{analysis.rating.toUpperCase()}]</span>
          </div>
        </div>
      </div>

      {/* High-Tech Diagnostic Multi-Bar */}
      <div className="hud-bar-container mb-4">
        <div className="hud-bar-labels font-mono text-xs">
          <span className="text-emerald">Needs: {analysis.needsPercent}%</span>
          <span className="text-pink">Wants: {analysis.wantsPercent}%</span>
          <span className="text-cyan">Compounding: {analysis.savingsPercent}%</span>
        </div>
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
        <div className="hud-target-markers font-mono text-xs muted">
          <span>0%</span>
          <span className="marker-50">50% Benchmark</span>
          <span className="marker-80">80% Total Outflow</span>
          <span>100%</span>
        </div>
      </div>

      <div className="budget-breakdown-grid">
        {/* Needs Card */}
        <div className="budget-hud-item">
          <div className="budget-hud-top">
            <span className="neon-dot neon-dot-emerald" />
            <span className="font-semibold text-sm">Essential Base</span>
            <span className="tech-target-pill font-mono">TARGET &le; 50%</span>
          </div>
          <div className="budget-hud-val font-mono">
            <span>{formatINR(analysis.needsAmount)}</span>
            <span className={`hud-pct ${analysis.needsPercent > 50 ? 'pct-warn' : 'pct-good'}`}>
              {analysis.needsPercent}%
            </span>
          </div>
          <div className="budget-sub muted text-xs">Housing EMI, Groceries, Utilities, Transit, Term Health</div>
        </div>

        {/* Wants Card */}
        <div className="budget-hud-item">
          <div className="budget-hud-top">
            <span className="neon-dot neon-dot-pink" />
            <span className="font-semibold text-sm">Discretionary Lifestyle</span>
            <span className="tech-target-pill font-mono">TARGET &le; 30%</span>
          </div>
          <div className="budget-hud-val font-mono">
            <span>{formatINR(analysis.wantsAmount)}</span>
            <span className={`hud-pct ${analysis.wantsPercent > 30 ? 'pct-warn' : 'pct-good'}`}>
              {analysis.wantsPercent}%
            </span>
          </div>
          <div className="budget-sub muted text-xs">Dining, Shopping, Entertainment, Vacations &amp; Gadgets</div>
        </div>

        {/* Savings & Compounding Card */}
        <div className="budget-hud-item">
          <div className="budget-hud-top">
            <span className="neon-dot neon-dot-cyan" />
            <span className="font-semibold text-sm">Wealth Compounding</span>
            <span className="tech-target-pill font-mono">TARGET &ge; 20%</span>
          </div>
          <div className="budget-hud-val font-mono">
            <span>{formatINR(analysis.savingsAmount)}</span>
            <span className={`hud-pct ${analysis.savingsPercent >= 20 ? 'pct-good' : 'pct-warn'}`}>
              {analysis.savingsPercent}%
            </span>
          </div>
          <div className="budget-sub muted text-xs">Liquid Emergency Fund + Step-Up Equity Mutual Fund SIP</div>
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import type { BudgetRuleAnalysis } from '../types/finance';
import { formatINR } from '../lib/finance';

interface BudgetHealthWidgetProps {
  analysis: BudgetRuleAnalysis;
}

export const BudgetHealthWidget: React.FC<BudgetHealthWidgetProps> = ({ analysis }) => {
  return (
    <section className="hipuku-card" aria-label="50/30/20 Budget Health">
      <div className="section-head mb-3">
        <div>
          <div className="flex-align gap-2 mb-1">
            <span className="dot dot-nebula" />
            <h2 className="card-title m-0">50 / 30 / 20 Budget Health Audit</h2>
          </div>
          <p className="muted text-xs">
            Balanced wealth benchmark: 50% Essential Needs · 30% Lifestyle · 20%+ Savings &amp; SIP
          </p>
        </div>

        <div className="flex-align gap-2">
          <div className="health-score-pill">
            {analysis.score >= 80 ? (
              <CheckCircle2 size={15} className="text-nebula" />
            ) : analysis.score >= 60 ? (
              <Info size={15} className="text-pulsar" />
            ) : (
              <AlertCircle size={15} className="text-solstice" />
            )}
            <span className="font-mono font-bold">{analysis.score} / 100</span>
            <span className="score-status font-sans">({analysis.rating})</span>
          </div>
        </div>
      </div>

      {/* Segmented Progress Track */}
      <div className="multi-bar-container mb-4">
        <div className="multi-bar">
          <div
            className="bar-seg seg-needs"
            style={{ width: `${Math.min(100, analysis.needsPercent)}%` }}
            title={`Needs: ${analysis.needsPercent}%`}
          />
          <div
            className="bar-seg seg-wants"
            style={{ width: `${Math.min(100, analysis.wantsPercent)}%` }}
            title={`Wants: ${analysis.wantsPercent}%`}
          />
          <div
            className="bar-seg seg-savings"
            style={{ width: `${Math.min(100, analysis.savingsPercent)}%` }}
            title={`Savings & SIP: ${analysis.savingsPercent}%`}
          />
        </div>
        <div className="multi-bar-labels font-mono text-xs">
          <span className="text-nebula">● Needs {analysis.needsPercent}% (target &le; 50%)</span>
          <span className="text-corona">● Wants {analysis.wantsPercent}% (target &le; 30%)</span>
          <span className="text-pulsar">● Savings {analysis.savingsPercent}% (target &ge; 20%)</span>
        </div>
      </div>

      <div className="budget-breakdown-grid">
        {/* Needs Pod */}
        <div className="budget-pod pod-needs">
          <div className="pod-header">
            <span className="pod-dot dot-nebula" />
            <span className="pod-label">Essential Needs</span>
            <span className="pod-target font-mono">target &le; 50%</span>
          </div>
          <div className="pod-value font-mono">
            {formatINR(analysis.needsAmount)}
            <span className={`pod-pct ${analysis.needsPercent > 50 ? 'pct-warn' : 'pct-good'}`}>
              {analysis.needsPercent}%
            </span>
          </div>
          <div className="pod-sub muted text-xs">Housing, groceries, utilities, transport, insurance</div>
        </div>

        {/* Wants Pod */}
        <div className="budget-pod pod-wants">
          <div className="pod-header">
            <span className="pod-dot dot-corona" />
            <span className="pod-label">Lifestyle &amp; Dining</span>
            <span className="pod-target font-mono">target &le; 30%</span>
          </div>
          <div className="pod-value font-mono">
            {formatINR(analysis.wantsAmount)}
            <span className={`pod-pct ${analysis.wantsPercent > 30 ? 'pct-warn' : 'pct-good'}`}>
              {analysis.wantsPercent}%
            </span>
          </div>
          <div className="pod-sub muted text-xs">Dining out, leisure, shopping, travel, subscriptions</div>
        </div>

        {/* Savings Pod */}
        <div className="budget-pod pod-savings">
          <div className="pod-header">
            <span className="pod-dot dot-pulsar" />
            <span className="pod-label">Savings &amp; Investing</span>
            <span className="pod-target font-mono">target &ge; 20%</span>
          </div>
          <div className="pod-value font-mono">
            {formatINR(analysis.savingsAmount)}
            <span className={`pod-pct ${analysis.savingsPercent >= 20 ? 'pct-good' : 'pct-warn'}`}>
              {analysis.savingsPercent}%
            </span>
          </div>
          <div className="pod-sub muted text-xs">Emergency cash buffer + step-up equity mutual funds</div>
        </div>
      </div>
    </section>
  );
};

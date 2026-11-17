import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Info, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { BudgetRuleAnalysis } from '../types/finance';
import { formatINR } from '../lib/finance';
import { InfoTooltip } from './InfoTooltip';

interface BudgetHealthWidgetProps {
  analysis: BudgetRuleAnalysis;
}

export const BudgetHealthWidget: React.FC<BudgetHealthWidgetProps> = ({ analysis }) => {
  const [showScoreAudit, setShowScoreAudit] = useState(false);

  return (
    <section className="hipuku-card" aria-label="50/30/20 Budget Health">
      <div className="section-head mb-3">
        <div>
          <div className="flex-align gap-2 mb-1">
            <span className="dot dot-nebula" />
            <h2 className="card-title m-0">50 / 30 / 20 Budget Health Audit</h2>
            <InfoTooltip
              title="50/30/20 Budgeting Rule & Denominator"
              explanation="A personal financial equilibrium framework: 50% for Essential Needs (housing, groceries, utilities, transport, insurance), 30% for Lifestyle Wants, and 20%+ strictly dedicated to Savings, Step-Up SIPs, and Emergency Reserves. All percentages are calculated against your Total Monthly Inflow (100% Net Take-Home Base)."
              formula="Score = 100 − (Needs Variance + Wants Variance + Savings Shortfall)"
              benchmark="Needs ≤ 50% · Wants ≤ 30% · Savings ≥ 20%"
            />
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

      {/* Denominator Banner */}
      <div className="mb-3 px-3 py-2 rounded-lg bg-slate-900/60 border border-subtle flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-muted">DENOMINATOR BASE:</span>
          <strong className="text-white">Total Monthly Inflow {formatINR(analysis.totalIncome)}</strong>
          <span className="text-[10px] text-muted">(100% Net Take-Home)</span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-emerald-400">Pillars: {analysis.pillarPercentSum}%</span>
          <span className="text-muted">·</span>
          <span className="text-amber-400">Debt: {analysis.debtPercent}%</span>
          <span className="text-muted">·</span>
          <span className="text-cyan-400">Buffer: {analysis.unallocatedBufferPercent}%</span>
          <span className="text-muted">·</span>
          <span className="text-slate-300 font-bold">Shares rounded</span>
        </div>
      </div>

      {/* Income Allocation Track */}
      <div className="multi-bar-container mb-4">
        <div className="multi-bar">
          <div
            className="bar-seg seg-needs"
            style={{ width: `${Math.min(100, analysis.needsPercent)}%` }}
            title={`Needs: ${analysis.needsPercent}% (${formatINR(analysis.needsAmount)})`}
          />
          <div
            className="bar-seg seg-wants"
            style={{ width: `${Math.min(100, analysis.wantsPercent)}%` }}
            title={`Wants: ${analysis.wantsPercent}% (${formatINR(analysis.wantsAmount)})`}
          />
          <div
            className="bar-seg seg-savings"
            style={{ width: `${Math.min(100, analysis.savingsPercent)}%` }}
            title={`Savings & SIP: ${analysis.savingsPercent}% (${formatINR(analysis.savingsAmount)})`}
          />
          {analysis.debtPercent > 0 && (
            <div
              className="bar-seg bg-amber-500/80"
              style={{ width: `${Math.min(100, analysis.debtPercent)}%` }}
              title={`Debt Servicing: ${analysis.debtPercent}% (${formatINR(analysis.debtAmount)})`}
            />
          )}
          {analysis.unallocatedBufferPercent > 0 && (
            <div
              className="bar-seg bg-cyan-500/60"
              style={{ width: `${Math.min(100, analysis.unallocatedBufferPercent)}%` }}
              title={`Unallocated Buffer: ${analysis.unallocatedBufferPercent}% (${formatINR(analysis.unallocatedBufferAmount)})`}
            />
          )}
        </div>
        <div className="multi-bar-labels font-mono text-[11px] flex flex-wrap gap-x-3 gap-y-1">
          <span className="text-purple-300">● Needs {analysis.needsPercent}% (&le;50%)</span>
          <span className="text-rose-300">● Wants {analysis.wantsPercent}% (&le;30%)</span>
          <span className="text-emerald-300">● Savings {analysis.savingsPercent}% (&ge;20%)</span>
          {analysis.debtPercent > 0 && (
            <span className="text-amber-400">● Debt Service {analysis.debtPercent}%</span>
          )}
          {analysis.unallocatedBufferPercent > 0 && (
            <span className="text-cyan-300">● Unallocated Buffer {analysis.unallocatedBufferPercent}%</span>
          )}
        </div>
      </div>

      {/* 5-Pod Allocation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-3">
        {/* Needs Pod */}
        <div className="budget-pod pod-needs p-2.5 rounded-xl border border-subtle bg-slate-900/40">
          <div className="pod-header flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="pod-dot dot-nebula" />
              <span className="pod-label text-xs font-semibold">Essential Needs</span>
            </div>
            <span className="pod-target font-mono text-[10px] text-muted">&le;50%</span>
          </div>
          <div className="pod-value font-mono text-sm font-bold flex items-baseline justify-between">
            <span>{formatINR(analysis.needsAmount)}</span>
            <span className={`pod-pct text-xs ${analysis.needsPercent > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {analysis.needsPercent}%
            </span>
          </div>
          <div className="pod-sub muted text-[10px] mt-0.5">Housing, food, utilities, transport, insurance</div>
        </div>

        {/* Wants Pod */}
        <div className="budget-pod pod-wants p-2.5 rounded-xl border border-subtle bg-slate-900/40">
          <div className="pod-header flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="pod-dot dot-corona" />
              <span className="pod-label text-xs font-semibold">Lifestyle &amp; Dining</span>
            </div>
            <span className="pod-target font-mono text-[10px] text-muted">&le;30%</span>
          </div>
          <div className="pod-value font-mono text-sm font-bold flex items-baseline justify-between">
            <span>{formatINR(analysis.wantsAmount)}</span>
            <span className={`pod-pct text-xs ${analysis.wantsPercent > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {analysis.wantsPercent}%
            </span>
          </div>
          <div className="pod-sub muted text-[10px] mt-0.5">Dining out, hobbies, shopping, subscriptions</div>
        </div>

        {/* Savings Pod */}
        <div className="budget-pod pod-savings p-2.5 rounded-xl border border-subtle bg-slate-900/40">
          <div className="pod-header flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="pod-dot dot-pulsar" />
              <span className="pod-label text-xs font-semibold">Savings &amp; SIP</span>
            </div>
            <span className="pod-target font-mono text-[10px] text-muted">&ge;20%</span>
          </div>
          <div className="pod-value font-mono text-sm font-bold flex items-baseline justify-between">
            <span>{formatINR(analysis.savingsAmount)}</span>
            <span className={`pod-pct text-xs ${analysis.savingsPercent >= 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {analysis.savingsPercent}%
            </span>
          </div>
          <div className="pod-sub muted text-[10px] mt-0.5">Emergency bank buffer + equity mutual fund SIPs</div>
        </div>

        {/* Debt Service Pod */}
        <div className="p-2.5 rounded-xl border border-subtle bg-slate-900/40">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs font-semibold text-amber-300">Debt Service</span>
            </div>
            <span className="font-mono text-[10px] text-muted">Fixed Outflow</span>
          </div>
          <div className="font-mono text-sm font-bold flex items-baseline justify-between">
            <span>{formatINR(analysis.debtAmount)}</span>
            <span className="text-xs text-amber-400">{analysis.debtPercent}%</span>
          </div>
          <div className="muted text-[10px] mt-0.5">Credit card &amp; personal loan monthly EMIs</div>
        </div>

        {/* Unallocated Buffer Pod */}
        <div className="p-2.5 rounded-xl border border-subtle bg-slate-900/40">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-xs font-semibold text-cyan-300">Retained Buffer</span>
            </div>
            <span className="font-mono text-[10px] text-muted">Uncommitted</span>
          </div>
          <div className="font-mono text-sm font-bold flex items-baseline justify-between">
            <span>{formatINR(analysis.unallocatedBufferAmount)}</span>
            <span className="text-xs text-cyan-300">{analysis.unallocatedBufferPercent}%</span>
          </div>
          <div className="muted text-[10px] mt-0.5">Monthly uncommitted cashflow surplus</div>
        </div>
      </div>

      {/* Score Explanation & Denominator Mechanics Accordion */}
      <div className="rounded-xl bg-slate-950/40 border border-subtle overflow-hidden">
        <button
          type="button"
          onClick={() => setShowScoreAudit(!showScoreAudit)}
          className="w-full p-2.5 flex items-center justify-between text-left hover:bg-slate-900/40 transition-colors"
        >
          <div className="flex items-center gap-2 text-xs">
            <HelpCircle size={14} className="text-nebula" />
            <span className="font-semibold text-white">How the 50/30/20 Score &amp; Denominator are Reconciled</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted">
            <span>Score: <strong className="text-white">{analysis.score}/100</strong></span>
            {showScoreAudit ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </button>

        {showScoreAudit && (
          <div className="p-3 border-t border-subtle bg-slate-900/40 text-xs leading-relaxed space-y-2.5 font-sans">
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-subtle text-slate-300">
              <strong className="text-white font-mono block mb-1">1. Denominator &amp; Total Income Relationship</strong>
              Every percentage in this audit is calculated using your <strong className="text-white font-mono">Total Monthly Inflow of {formatINR(analysis.totalIncome)}</strong> as the base denominator (100% of net take-home earnings).
              <div className="mt-1 font-mono text-[11px] text-muted">
                Formula: Allocation % = (Category Monthly Amount &divide; Total Monthly Inflow) &times; 100
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-subtle text-slate-300">
              <strong className="text-white font-mono block mb-1">2. How the allocations share monthly income</strong>
              The classic 50/30/20 framework defines optimal spending boundaries for your <strong className="text-purple-300">Needs ({analysis.needsPercent}%)</strong>, <strong className="text-rose-300">Wants ({analysis.wantsPercent}%)</strong>, and <strong className="text-emerald-300">Savings/SIP ({analysis.savingsPercent}%)</strong>, which total {analysis.pillarPercentSum}%.
              Additional allocations are <strong className="text-amber-300 font-mono">Debt Servicing ({analysis.debtPercent}%)</strong> and <strong className="text-cyan-300 font-mono">Unallocated Cash Buffer ({analysis.unallocatedBufferPercent}%)</strong>. Rounded percentages can differ from 100%. If allocations exceed income, reduce them or identify how the shortfall will be funded.
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-subtle text-slate-300">
              <strong className="text-white font-mono block mb-1">3. Which Allocations Count Toward the Health Score ({analysis.score}/100)</strong>
              The score applies penalties for spending above the target and for funded savings below 20%. A budget shortfall caps the score at 59. Percentages require positive income.
              <ul className="list-disc pl-5 mt-1 space-y-1 font-mono text-[11px]">
                <li>
                  <span className="text-purple-300">Needs Target (&le;50%):</span> {analysis.needsPercent}% &rarr; {analysis.scoringBreakdown.needsPenalty > 0 ? <span className="text-amber-400">-{analysis.scoringBreakdown.needsPenalty} pts penalty</span> : <span className="text-emerald-400">0 penalty (Compliant)</span>}
                </li>
                <li>
                  <span className="text-rose-300">Wants Target (&le;30%):</span> {analysis.wantsPercent}% &rarr; {analysis.scoringBreakdown.wantsPenalty > 0 ? <span className="text-amber-400">-{analysis.scoringBreakdown.wantsPenalty} pts penalty</span> : <span className="text-emerald-400">0 penalty (Compliant)</span>}
                </li>
                <li>
                  <span className="text-emerald-300">Savings Target (&ge;20%):</span> {analysis.savingsPercent}% &rarr; {analysis.scoringBreakdown.savingsPenalty > 0 ? <span className="text-amber-400">-{analysis.scoringBreakdown.savingsPenalty} pts penalty</span> : <span className="text-emerald-400">0 penalty (Compliant)</span>}
                </li>
                <li className="text-muted">
                  <span>Debt &amp; Buffer:</span> Debt payments reduce free cashflow and are audited in the Debt Avalanche module, while unallocated buffers remain retained surplus. Neither is double-penalized in the 50/30/20 score.
                </li>
              </ul>
              <div className="mt-1 text-[11px] font-mono text-emerald-300">
                Final Score: 100 &minus; {analysis.scoringBreakdown.needsPenalty} &minus; {analysis.scoringBreakdown.wantsPenalty} &minus; {analysis.scoringBreakdown.savingsPenalty} = {analysis.score} / 100 ({analysis.rating})
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

import React from 'react';
import { Target, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import type { FinancePlan } from '../types/finance';
import { calculateFireAnalysis, formatINR } from '../lib/finance';

interface FireMilestoneTrackerProps {
  plan: FinancePlan;
}

export const FireMilestoneTracker: React.FC<FireMilestoneTrackerProps> = ({ plan }) => {
  const fireData = calculateFireAnalysis(plan);

  return (
    <section className="hipuku-card fire-section" aria-label="FIRE & Wealth Milestones">
      <div className="section-head mb-3">
        <div>
          <div className="flex-align gap-2 mb-1">
            <span className="dot dot-solstice" />
            <h2 className="card-title m-0">FIRE &amp; Wealth Milestone Countdown</h2>
          </div>
          <p className="muted text-xs">
            Financial Independence target (25× annual expenses) &amp; compounding timeline to key Indian Rupee landmarks
          </p>
        </div>

        <div className="flex-align gap-2">
          <span className="tag-pill tag-solstice font-mono font-bold">
            <Target size={12} /> Target: {formatINR(fireData.fireTarget)}
          </span>
          {fireData.fireEtaYears !== null ? (
            <span className="tag-pill tag-nebula font-mono">
              <Sparkles size={12} /> Freedom ETA: {fireData.fireEtaYears} yrs
            </span>
          ) : (
            <span className="tag-pill tag-corona font-mono">
              Increase monthly SIP to calculate ETA
            </span>
          )}
        </div>
      </div>

      {/* Progress towards FIRE Goal */}
      <div className="fire-progress-card mb-4">
        <div className="fire-progress-head">
          <span className="text-xs font-semibold">
            Progress to Financial Independence (25× Annual Burn)
          </span>
          <span className="font-mono text-xs font-bold text-nebula">
            {formatINR(fireData.currentLiquidNetWorth)} / {formatINR(fireData.fireTarget)} ({fireData.fireProgressPercent.toFixed(1)}%)
          </span>
        </div>
        <div className="fire-progress-track">
          <div
            className="fire-progress-fill"
            style={{ width: `${Math.min(100, fireData.fireProgressPercent)}%` }}
          />
        </div>
        <div className="fire-tiers-row font-mono text-xs muted">
          <span>Lean FIRE (20×): <strong>{formatINR(fireData.leanFireTarget)}</strong></span>
          <span>Standard FIRE (25×): <strong>{formatINR(fireData.fireTarget)}</strong></span>
          <span>Fat FIRE (35×): <strong>{formatINR(fireData.fatFireTarget)}</strong></span>
        </div>
      </div>

      {/* Landmark Milestone Cards */}
      <div className="milestones-grid">
        {fireData.milestones.map((m) => (
          <div
            key={m.id}
            className={`milestone-card ${m.achieved ? 'milestone-achieved' : ''}`}
          >
            <div className="milestone-head">
              <span className="milestone-name">{m.label}</span>
              {m.achieved && (
                <span className="achieved-tag font-mono">
                  <CheckCircle2 size={11} /> ACHIEVED
                </span>
              )}
            </div>
            <div className="milestone-val font-mono">
              {formatINR(m.targetAmount)}
            </div>
            <div className="milestone-eta font-mono text-xs">
              {m.achieved ? (
                <span className="text-nebula">Secured in current liquid reserves</span>
              ) : m.years !== null ? (
                <span className="flex-align gap-1 text-solstice">
                  <Clock size={11} /> ETA: {m.years} yrs ({m.month} mos)
                </span>
              ) : (
                <span className="muted">Horizon &gt; 30 yrs</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

import React from 'react';
import { Target, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import type { FinancePlan } from '../types/finance';
import { calculateFireAnalysis, formatINR } from '../lib/finance';
import { InfoTooltip } from './InfoTooltip';

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
            <InfoTooltip
              title="FIRE 25× Rule & Milestones"
              explanation="The 25× spending target is a planning benchmark. The estimated date compares projected savings against the target adjusted for inflation."
              formula="FIRE Corpus Target = Annual Living Expenses × 25"
              benchmark="ETA accelerates by 3–7 years for every +5% step-up SIP boost."
            />
          </div>
          <p className="muted text-xs">
            FIRE target in today’s rupees (25× annual living expenses). The estimated date accounts for inflation.
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
              Target not reached within the projection horizon
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
        <div className="fire-tiers-row font-mono text-xs">
          <div className="fire-tier-pill">
            <span className="muted">Lean FIRE (20×)</span>
            <strong>{formatINR(fireData.leanFireTarget)}</strong>
          </div>
          <div className="fire-tier-pill">
            <span className="muted">Standard FIRE (25×)</span>
            <strong className="text-nebula">{formatINR(fireData.fireTarget)}</strong>
          </div>
          <div className="fire-tier-pill">
            <span className="muted">Fat FIRE (35×)</span>
            <strong className="text-corona">{formatINR(fireData.fatFireTarget)}</strong>
          </div>
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

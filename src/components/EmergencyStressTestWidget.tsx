import React from 'react';
import { ShieldAlert, ShieldCheck, AlertCircle, HeartPulse } from 'lucide-react';
import type { FinancePlan } from '../types/finance';
import { calculateEmergencyStressTest, formatINR } from '../lib/finance';

interface EmergencyStressTestWidgetProps {
  plan: FinancePlan;
}

export const EmergencyStressTestWidget: React.FC<EmergencyStressTestWidgetProps> = ({ plan }) => {
  const stress = calculateEmergencyStressTest(plan);

  return (
    <section className="hipuku-card stress-test-section" aria-label="Emergency Survival Stress Test">
      <div className="section-head mb-3">
        <div>
          <div className="flex-align gap-2 mb-1">
            <span className="dot dot-corona" />
            <h2 className="card-title m-0">Emergency Runway &amp; Survival Stress Test</h2>
          </div>
          <p className="muted text-xs">
            How many months would your family survive if primary income stopped tomorrow?
          </p>
        </div>

        <div className="flex-align gap-2">
          {stress.status === 'fortified' ? (
            <span className="tag-pill tag-nebula font-mono">
              <ShieldCheck size={13} /> FORTIFIED BUFFER (&ge; 6 MOS)
            </span>
          ) : stress.status === 'moderate' ? (
            <span className="tag-pill tag-solstice font-mono">
              <AlertCircle size={13} /> MODERATE BUFFER (3–6 MOS)
            </span>
          ) : (
            <span className="tag-pill tag-flare font-mono">
              <ShieldAlert size={13} /> CRITICAL BUFFER (&lt; 3 MOS)
            </span>
          )}
        </div>
      </div>

      <div className="stress-grid">
        {/* Tier 1: Barebones Survival */}
        <div className="stress-tier-card">
          <div className="stress-tier-head">
            <span className="tag-pill tag-quasar">TIER 1</span>
            <span className="tier-name">Barebones Survival</span>
          </div>
          <p className="tier-sub muted text-xs">Rent + Groceries + Power/Utilities + Loan EMI</p>
          <div className="tier-burn font-mono">
            {formatINR(stress.barebonesMonthly)} <span className="muted text-xs">/ month</span>
          </div>
          <div className="tier-runway-box">
            <span className="tier-runway-val font-mono font-bold text-nebula">
              {stress.barebonesRunwayMonths} months
            </span>
            <span className="muted text-xs">cash runway</span>
          </div>
        </div>

        {/* Tier 2: Standard Living */}
        <div className="stress-tier-card">
          <div className="stress-tier-head">
            <span className="tag-pill tag-pulsar">TIER 2</span>
            <span className="tier-name">Standard Living</span>
          </div>
          <p className="tier-sub muted text-xs">Needs + Term/Health Insurance + Commute + EMI</p>
          <div className="tier-burn font-mono">
            {formatINR(stress.standardMonthly)} <span className="muted text-xs">/ month</span>
          </div>
          <div className="tier-runway-box">
            <span className="tier-runway-val font-mono font-bold text-pulsar">
              {stress.standardRunwayMonths} months
            </span>
            <span className="muted text-xs">cash runway</span>
          </div>
        </div>

        {/* Tier 3: Current Lifestyle */}
        <div className="stress-tier-card">
          <div className="stress-tier-head">
            <span className="tag-pill tag-corona">TIER 3</span>
            <span className="tier-name">Full Lifestyle</span>
          </div>
          <p className="tier-sub muted text-xs">100% current burn (Dining, leisure, OTT, shopping)</p>
          <div className="tier-burn font-mono">
            {formatINR(stress.fullMonthly)} <span className="muted text-xs">/ month</span>
          </div>
          <div className="tier-runway-box">
            <span className="tier-runway-val font-mono font-bold text-solstice">
              {stress.fullRunwayMonths} months
            </span>
            <span className="muted text-xs">cash runway</span>
          </div>
        </div>
      </div>

      <div className="stress-footer-note font-mono text-xs">
        <HeartPulse size={13} className="text-corona shrink-0" />
        <span>
          Liquid Reserve: <strong>{formatINR(stress.liquidReserve)}</strong>. In a severe crisis, trimming to Tier 1 extends your runway by{' '}
          <strong className="text-nebula">{Math.max(0, Number((stress.barebonesRunwayMonths - stress.fullRunwayMonths).toFixed(1)))} additional months</strong>.
        </span>
      </div>
    </section>
  );
};

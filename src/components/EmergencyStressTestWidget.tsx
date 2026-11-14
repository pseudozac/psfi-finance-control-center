import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertCircle, HeartPulse, Zap, RotateCcw, AlertTriangle } from 'lucide-react';
import type { FinancePlan } from '../types/finance';
import { calculateEmergencyStressTest, formatINR } from '../lib/finance';
import { InfoTooltip } from './InfoTooltip';

interface EmergencyStressTestWidgetProps {
  plan: FinancePlan;
}

type ShockScenario = 'baseline' | 'paycut_30' | 'layoff_60' | 'zero_income' | 'medical_hit';

export const EmergencyStressTestWidget: React.FC<EmergencyStressTestWidgetProps> = ({ plan }) => {
  const [activeScenario, setActiveScenario] = useState<ShockScenario>('baseline');

  const baseStress = calculateEmergencyStressTest(plan);

  // Audio feedback helper
  const playTactileClick = (freq = 480) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch {
      // Audio fallback
    }
  };

  // Derive shock adjusted parameters
  const totalMonthlyIncome = (plan.income.salary || 0) + (plan.income.freelance || 0) + (plan.income.other || 0);
  let simulatedReserve = baseStress.liquidReserve;
  let simulatedIncome = totalMonthlyIncome;

  if (activeScenario === 'paycut_30') {
    simulatedIncome = totalMonthlyIncome * 0.7;
  } else if (activeScenario === 'layoff_60') {
    simulatedIncome = totalMonthlyIncome * 0.4;
  } else if (activeScenario === 'zero_income') {
    simulatedIncome = 0;
  } else if (activeScenario === 'medical_hit') {
    simulatedReserve = Math.max(0, baseStress.liquidReserve - 300_000);
  }

  // Calculate simulated monthly deficits
  const barebonesDeficit = Math.max(0, baseStress.barebonesMonthly - simulatedIncome);
  const standardDeficit = Math.max(0, baseStress.standardMonthly - simulatedIncome);
  const fullDeficit = Math.max(0, baseStress.fullMonthly - simulatedIncome);

  // Calculate adjusted runway months
  const simBarebonesMonths = barebonesDeficit > 0
    ? Number((simulatedReserve / barebonesDeficit).toFixed(1))
    : 99.9;
  const simStandardMonths = standardDeficit > 0
    ? Number((simulatedReserve / standardDeficit).toFixed(1))
    : 99.9;
  const simFullMonths = fullDeficit > 0
    ? Number((simulatedReserve / fullDeficit).toFixed(1))
    : 99.9;

  const displayStressStatus =
    simStandardMonths >= 6 ? 'fortified' : simStandardMonths >= 3 ? 'moderate' : 'critical';

  return (
    <section className="hipuku-card stress-test-section" aria-label="Emergency Survival Stress Test">
      <div className="section-head mb-3">
        <div>
          <div className="flex-align gap-2 mb-1 flex-wrap">
            <span className="dot dot-corona" />
            <h2 className="card-title m-0">Emergency Runway &amp; Survival Stress Test</h2>
            <InfoTooltip
              title="3-Tier Emergency Survival Runway"
              explanation="Simulates cash survival across three real-world hardship tiers: Tier 1 Barebones (rent + food + EMIs), Tier 2 Lean Living (+ essential utilities & health), and Tier 3 Full Lifestyle (zero cutbacks). Tier 2 is the institutional benchmark."
              formula="Runway Months = Liquid Reserve ÷ Tier Monthly Outflow"
              benchmark="Maintain ≥ 6.0 months of Tier 2 runway for financial antifragility."
            />
          </div>
          <p className="muted text-xs">
            How many months would your family survive if primary income stopped tomorrow?
          </p>
        </div>

        <div className="flex-align gap-2">
          {displayStressStatus === 'fortified' ? (
            <span className="tag-pill tag-nebula font-mono text-[11px]">
              <ShieldCheck size={13} /> FORTIFIED BUFFER (&ge; 6 MOS)
            </span>
          ) : displayStressStatus === 'moderate' ? (
            <span className="tag-pill tag-solstice font-mono text-[11px]">
              <AlertCircle size={13} /> MODERATE BUFFER (3–6 MOS)
            </span>
          ) : (
            <span className="tag-pill tag-flare font-mono text-[11px] animate-pulse">
              <ShieldAlert size={13} /> CRITICAL BUFFER (&lt; 3 MOS)
            </span>
          )}
        </div>
      </div>

      {/* 1-Tap Catastrophic Income Shock Dial */}
      <div className="p-2.5 rounded-xl bg-surface-overlay border border-subtle mb-3">
        <div className="flex-between items-center mb-2 flex-wrap gap-1.5 text-xs font-mono">
          <span className="flex-align gap-1.5 text-secondary">
            <Zap size={12} className="text-corona" /> 1-Tap Catastrophic Shock Dial:
          </span>
          {activeScenario !== 'baseline' && (
            <button
              type="button"
              className="text-muted hover:text-primary flex-align gap-1 text-[11px] cursor-pointer"
              onClick={() => {
                setActiveScenario('baseline');
                playTactileClick(380);
              }}
            >
              <RotateCcw size={10} /> Reset to Baseline
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 font-mono text-[11px]">
          <button
            type="button"
            className={`action-pill text-center py-1.5 px-2 cursor-pointer ${activeScenario === 'baseline' ? 'pill-active-mode' : ''}`}
            onClick={() => {
              setActiveScenario('baseline');
              playTactileClick(440);
            }}
          >
            Baseline (100%)
          </button>
          <button
            type="button"
            className={`action-pill text-center py-1.5 px-2 cursor-pointer ${activeScenario === 'paycut_30' ? 'pill-active-mode' : ''}`}
            onClick={() => {
              setActiveScenario('paycut_30');
              playTactileClick(480);
            }}
            title="30% Pay Cut / Sabbatical / Transition"
          >
            -30% Pay Cut
          </button>
          <button
            type="button"
            className={`action-pill text-center py-1.5 px-2 cursor-pointer ${activeScenario === 'layoff_60' ? 'pill-active-mode' : ''}`}
            onClick={() => {
              setActiveScenario('layoff_60');
              playTactileClick(520);
            }}
            title="Layoff with 40% Severance Retainer"
          >
            -60% Layoff
          </button>
          <button
            type="button"
            className={`action-pill text-center py-1.5 px-2 cursor-pointer ${activeScenario === 'zero_income' ? 'pill-active-mode font-bold' : ''}`}
            onClick={() => {
              setActiveScenario('zero_income');
              playTactileClick(360);
            }}
            title="Sudden 100% Zero Income Stop"
          >
            🚨 0% Income
          </button>
          <button
            type="button"
            className={`action-pill text-center py-1.5 px-2 cursor-pointer ${activeScenario === 'medical_hit' ? 'pill-active-mode' : ''}`}
            onClick={() => {
              setActiveScenario('medical_hit');
              playTactileClick(340);
            }}
            title="Emergency Medical Hit (-₹3 Lakhs Reserve Drain)"
          >
            -₹3L Health Hit
          </button>
        </div>

        {/* Live Shock Scenario Explainer Banner */}
        {activeScenario !== 'baseline' && (
          <div className="mt-2.5 p-2 rounded-lg bg-surface-page border border-subtle text-xs flex items-start gap-2">
            <AlertTriangle size={13} className="text-solstice shrink-0 mt-0.5" />
            <div className="leading-relaxed text-secondary font-sans">
              {activeScenario === 'zero_income' && (
                <span>
                  <strong>Catastrophic 0% Income Shock Active:</strong> Entire burn funded exclusively by{' '}
                  <strong className="text-primary font-mono">{formatINR(simulatedReserve)}</strong> liquid reserves.
                  Tier 2 living lasts <strong className="text-solstice font-mono">{simStandardMonths} months</strong>.
                </span>
              )}
              {activeScenario === 'layoff_60' && (
                <span>
                  <strong>Layoff (-60% Income) Active:</strong> Inflows drop to{' '}
                  <strong className="text-primary font-mono">{formatINR(simulatedIncome)}/mo</strong>. Tier 2 runway is{' '}
                  <strong className="text-solstice font-mono">{simStandardMonths} months</strong> before reserve depletion.
                </span>
              )}
              {activeScenario === 'paycut_30' && (
                <span>
                  <strong>30% Pay Cut / Sabbatical Active:</strong> Inflows reduced to{' '}
                  <strong className="text-primary font-mono">{formatINR(simulatedIncome)}/mo</strong>. Tier 2 runway extends to{' '}
                  <strong className="text-solstice font-mono">{simStandardMonths} months</strong>.
                </span>
              )}
              {activeScenario === 'medical_hit' && (
                <span>
                  <strong>Medical Shock (-₹3L) Active:</strong> Reserve reduced to{' '}
                  <strong className="text-primary font-mono">{formatINR(simulatedReserve)}</strong>. Tier 2 runway is{' '}
                  <strong className="text-solstice font-mono">{simStandardMonths} months</strong>.
                </span>
              )}
            </div>
          </div>
        )}
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
            {formatINR(baseStress.barebonesMonthly)} <span className="muted text-xs">/ month</span>
          </div>
          <div className="tier-runway-box">
            <span className="tier-runway-val font-mono font-bold text-nebula">
              {activeScenario === 'baseline' ? `${baseStress.barebonesRunwayMonths} months` : `${simBarebonesMonths} months`}
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
            {formatINR(baseStress.standardMonthly)} <span className="muted text-xs">/ month</span>
          </div>
          <div className="tier-runway-box">
            <span className="tier-runway-val font-mono font-bold text-pulsar">
              {activeScenario === 'baseline' ? `${baseStress.standardRunwayMonths} months` : `${simStandardMonths} months`}
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
            {formatINR(baseStress.fullMonthly)} <span className="muted text-xs">/ month</span>
          </div>
          <div className="tier-runway-box">
            <span className="tier-runway-val font-mono font-bold text-solstice">
              {activeScenario === 'baseline' ? `${baseStress.fullRunwayMonths} months` : `${simFullMonths} months`}
            </span>
            <span className="muted text-xs">cash runway</span>
          </div>
        </div>
      </div>

      <div className="stress-footer-note font-mono text-xs">
        <HeartPulse size={13} className="text-corona shrink-0" />
        <span>
          Liquid Reserve: <strong>{formatINR(simulatedReserve)}</strong>. In a severe crisis, trimming to Tier 1 extends your runway by{' '}
          <strong className="text-nebula">
            {Math.max(
              0,
              Number(
                (
                  (activeScenario === 'baseline' ? baseStress.barebonesRunwayMonths : simBarebonesMonths) -
                  (activeScenario === 'baseline' ? baseStress.fullRunwayMonths : simFullMonths)
                ).toFixed(1)
              )
            )}{' '}
            additional months
          </strong>.
        </span>
      </div>
    </section>
  );
};

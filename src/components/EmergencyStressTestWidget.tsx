import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertCircle, HeartPulse, Zap, RotateCcw, AlertTriangle, Info } from 'lucide-react';
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
    : baseStress.barebonesRunwayMonths;
  const simStandardMonths = standardDeficit > 0
    ? Number((simulatedReserve / standardDeficit).toFixed(1))
    : baseStress.standardRunwayMonths;
  const simFullMonths = fullDeficit > 0
    ? Number((simulatedReserve / fullDeficit).toFixed(1))
    : baseStress.fullRunwayMonths;

  // The institutional benchmark runway for status badges must be derived from actual standard living runway
  const evaluatedRunwayMonths = activeScenario === 'baseline'
    ? baseStress.standardRunwayMonths
    : simStandardMonths;

  const displayStressStatus =
    evaluatedRunwayMonths >= 6 ? 'fortified' : evaluatedRunwayMonths >= 3 ? 'moderate' : 'critical';

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
            <span
              className="tag-pill tag-nebula font-mono text-[11px]"
              title={`Tier 2 Standard living runway: ${evaluatedRunwayMonths.toFixed(1)} months (Core essentials excluding lifestyle)`}
            >
              <ShieldCheck size={13} /> TIER 2 BUFFER: {evaluatedRunwayMonths.toFixed(1)} MOS (&ge; 6 MOS FORTIFIED)
            </span>
          ) : displayStressStatus === 'moderate' ? (
            <span
              className="tag-pill tag-solstice font-mono text-[11px]"
              title={`Tier 2 Standard living runway: ${evaluatedRunwayMonths.toFixed(1)} months`}
            >
              <AlertCircle size={13} /> TIER 2 BUFFER: {evaluatedRunwayMonths.toFixed(1)} MOS (3–6 MOS MODERATE)
            </span>
          ) : (
            <span
              className="tag-pill tag-flare font-mono text-[11px] animate-pulse"
              title={`Tier 2 Standard living runway: ${evaluatedRunwayMonths.toFixed(1)} months`}
            >
              <ShieldAlert size={13} /> TIER 2 BUFFER: {evaluatedRunwayMonths.toFixed(1)} MOS (&lt; 3 MOS CRITICAL)
            </span>
          )}
        </div>
      </div>

      {/* Expense Runway Transparency Disclosure */}
      <div className="stress-disclosure-banner">
        <div className="stress-disclosure-pill" title="Uses all monthly expenses including lifestyle & discretionary shopping">
          <span className="stress-disclosure-label">Dashboard Runway (Full Burn)</span>
          <div className="flex-align gap-1.5">
            <span className="stress-disclosure-val text-corona">{baseStress.fullRunwayMonths} mos</span>
            <span className="text-muted text-[10.5px]">({formatINR(baseStress.fullMonthly)}/mo)</span>
          </div>
        </div>
        <div className="stress-disclosure-pill" title="Uses core living expenses: housing, food, utilities, health & debt EMI">
          <span className="stress-disclosure-label">Tier 2 Standard (Lean Living)</span>
          <div className="flex-align gap-1.5">
            <span className="stress-disclosure-val text-nebula">{baseStress.standardRunwayMonths} mos</span>
            <span className="text-muted text-[10.5px]">({formatINR(baseStress.standardMonthly)}/mo)</span>
          </div>
        </div>
        <div className="stress-disclosure-pill" title="Uses absolute bare survival: rent, rations & loan service only">
          <span className="stress-disclosure-label">Tier 1 Barebones</span>
          <div className="flex-align gap-1.5">
            <span className="stress-disclosure-val text-quasar">{baseStress.barebonesRunwayMonths} mos</span>
            <span className="text-muted text-[10.5px]">({formatINR(baseStress.barebonesMonthly)}/mo)</span>
          </div>
        </div>
      </div>

      {/* 1-Tap Catastrophic Income Shock Dial */}
      <div className="shock-dial-deck">
        <div className="shock-dial-header">
          <span className="flex-align gap-1.5 text-secondary">
            <Zap size={13} className="text-corona" /> 1-Tap Catastrophic Shock Dial:
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

        <div className="shock-dial-grid">
          <button
            type="button"
            className={`shock-dial-chip ${activeScenario === 'baseline' ? 'active' : ''}`}
            onClick={() => {
              setActiveScenario('baseline');
              playTactileClick(440);
            }}
          >
            Baseline (100%)
          </button>
          <button
            type="button"
            className={`shock-dial-chip ${activeScenario === 'paycut_30' ? 'active' : ''}`}
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
            className={`shock-dial-chip ${activeScenario === 'layoff_60' ? 'active' : ''}`}
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
            className={`shock-dial-chip chip-critical ${activeScenario === 'zero_income' ? 'active' : ''}`}
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
            className={`shock-dial-chip chip-critical ${activeScenario === 'medical_hit' ? 'active' : ''}`}
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
          <div className="shock-scenario-banner">
            <AlertTriangle size={14} className="text-solstice shrink-0 mt-0.5" />
            <div className="leading-relaxed text-secondary font-sans text-xs">
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
        <div className="stress-tier-card stress-tier-1">
          <div className="stress-tier-head">
            <span className="tag-pill tag-quasar">TIER 1</span>
            <span className="tier-name">Barebones Survival</span>
          </div>
          <p className="tier-sub">Rent + Groceries + Power/Utilities + Loan EMI</p>
          <div className="tier-burn font-mono">
            {formatINR(baseStress.barebonesMonthly)} <span className="muted text-xs">/ month</span>
          </div>
          <div className="tier-runway-box">
            <div className="tier-runway-top">
              <span className="muted text-xs font-mono">cash runway</span>
              <span className="tier-runway-val font-mono text-quasar">
                {activeScenario === 'baseline' ? `${baseStress.barebonesRunwayMonths} mos` : `${simBarebonesMonths} mos`}
              </span>
            </div>
            <div className="tier-runway-gauge">
              <div
                className="tier-runway-fill"
                style={{
                  width: `${Math.min(100, Math.max(6, ((activeScenario === 'baseline' ? baseStress.barebonesRunwayMonths : simBarebonesMonths) / 12) * 100))}%`,
                  background: 'linear-gradient(90deg, #a855f7, #c084fc)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Tier 2: Standard Living */}
        <div className="stress-tier-card stress-tier-2">
          <div className="stress-tier-head">
            <span className="tag-pill tag-pulsar">TIER 2</span>
            <span className="tier-name">Standard Living</span>
          </div>
          <p className="tier-sub">Needs + Term/Health Insurance + Commute + EMI</p>
          <div className="tier-burn font-mono">
            {formatINR(baseStress.standardMonthly)} <span className="muted text-xs">/ month</span>
          </div>
          <div className="tier-runway-box">
            <div className="tier-runway-top">
              <span className="muted text-xs font-mono">cash runway</span>
              <span className="tier-runway-val font-mono text-pulsar">
                {activeScenario === 'baseline' ? `${baseStress.standardRunwayMonths} mos` : `${simStandardMonths} mos`}
              </span>
            </div>
            <div className="tier-runway-gauge">
              <div
                className="tier-runway-fill"
                style={{
                  width: `${Math.min(100, Math.max(6, ((activeScenario === 'baseline' ? baseStress.standardRunwayMonths : simStandardMonths) / 12) * 100))}%`,
                  background: 'linear-gradient(90deg, #06b6d4, #38bdf8)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Tier 3: Current Lifestyle */}
        <div className="stress-tier-card stress-tier-3">
          <div className="stress-tier-head">
            <span className="tag-pill tag-corona">TIER 3</span>
            <span className="tier-name">Full Lifestyle</span>
          </div>
          <p className="tier-sub">100% current burn (Dining, leisure, OTT, shopping)</p>
          <div className="tier-burn font-mono">
            {formatINR(baseStress.fullMonthly)} <span className="muted text-xs">/ month</span>
          </div>
          <div className="tier-runway-box">
            <div className="tier-runway-top">
              <span className="muted text-xs font-mono">cash runway</span>
              <span className="tier-runway-val font-mono text-solstice">
                {activeScenario === 'baseline' ? `${baseStress.fullRunwayMonths} mos` : `${simFullMonths} mos`}
              </span>
            </div>
            <div className="tier-runway-gauge">
              <div
                className="tier-runway-fill"
                style={{
                  width: `${Math.min(100, Math.max(6, ((activeScenario === 'baseline' ? baseStress.fullRunwayMonths : simFullMonths) / 12) * 100))}%`,
                  background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expense Composition Explainer */}
      <div className="stress-composition-deck">
        <div className="flex-between items-center mb-1.5 flex-wrap gap-2 text-muted font-mono text-[11px]">
          <span className="font-semibold text-secondary flex-align gap-1">
            <Info size={12} className="text-quasar" /> Which expenses each runway figure includes:
          </span>
          <span className="text-[10px] bg-surface-card px-2 py-0.5 rounded-full border border-subtle">
            Liquid Reserve: <strong>{formatINR(baseStress.liquidReserve)}</strong>
          </span>
        </div>
        <div className="stress-composition-grid">
          <div className="stress-comp-box">
            <strong className="text-quasar block font-sans mb-1">Tier 1: Barebones ({formatINR(baseStress.barebonesMonthly)}/mo)</strong>
            <span className="text-muted block text-[10px] leading-relaxed">
              Housing ({formatINR(plan.expenses.housing)}) + Groceries ({formatINR(plan.expenses.groceries)}) + Utilities ({formatINR(plan.expenses.utilities)}) + Debt EMI ({formatINR(plan.debt.cardBalance > 0 ? plan.debt.monthlyPayment : 0)})
            </span>
          </div>
          <div className="stress-comp-box">
            <strong className="text-pulsar block font-sans mb-1">Tier 2: Standard ({formatINR(baseStress.standardMonthly)}/mo)</strong>
            <span className="text-muted block text-[10px] leading-relaxed">
              Tier 1 + Term Insurance ({formatINR(plan.expenses.insurance)}) + Transport ({formatINR(plan.expenses.transport)})
            </span>
          </div>
          <div className="stress-comp-box">
            <strong className="text-corona block font-sans mb-1">Tier 3: Full Burn ({formatINR(baseStress.fullMonthly)}/mo)</strong>
            <span className="text-muted block text-[10px] leading-relaxed">
              Tier 2 + Dining, Shopping &amp; All Discretionary Wants
            </span>
          </div>
        </div>
      </div>

      <div className="stress-footer-note">
        <HeartPulse size={14} className="text-corona shrink-0" />
        <span>
          Liquid Reserve: <strong className="text-primary">{formatINR(simulatedReserve)}</strong>. In a severe crisis, trimming to Tier 1 extends your runway by{' '}
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

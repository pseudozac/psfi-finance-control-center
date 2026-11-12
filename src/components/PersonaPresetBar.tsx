import React from 'react';
import { Sparkles, Briefcase, Home, Flame, ShieldAlert, Check } from 'lucide-react';
import { PLAN_PRESETS, formatINR } from '../lib/finance';
import type { FinancePlan } from '../types/finance';
import { InfoTooltip } from './InfoTooltip';

interface PersonaPresetBarProps {
  currentPlan: FinancePlan;
  onSelectPreset: (presetPlan: FinancePlan, name: string) => void;
}

const PRESET_ICONS: Record<string, React.ReactNode> = {
  starter: <Briefcase size={14} className="text-quasar" />,
  family: <Home size={14} className="text-pulsar" />,
  fire: <Flame size={14} className="text-solstice" />,
  debt_crush: <ShieldAlert size={14} className="text-corona" />,
};

export const PersonaPresetBar: React.FC<PersonaPresetBarProps> = ({ currentPlan, onSelectPreset }) => {
  const activePreset = PLAN_PRESETS.find(
    (p) =>
      p.plan.income.salary === currentPlan.income.salary &&
      p.plan.savings.monthlySip === currentPlan.savings.monthlySip
  );

  return (
    <section className="archetype-container" aria-label="Financial Archetype Models">
      <div className="archetype-header flex-between items-center mb-2.5">
        <div className="flex-align gap-2">
          <span className="dot dot-quasar" />
          <h3 className="archetype-heading font-mono text-xs uppercase tracking-wider text-muted m-0">
            Calibrated Financial Archetypes
          </h3>
          <InfoTooltip
            title="Actuarial Archetype Profiles"
            explanation="Select a pre-calibrated Indian economic profile to instantly model your cashflow, living overhead, emergency runway, and compounding step-up SIPs."
            benchmark="Click any archetype to preview how different life stages optimize their balance sheet."
          />
        </div>
        <span className="text-muted text-xs font-mono hidden md:inline">
          {activePreset ? `Active: ${activePreset.name}` : 'Custom Portfolio'}
        </span>
      </div>

      <div className="archetype-grid">
        {PLAN_PRESETS.map((preset) => {
          const isSelected = activePreset?.id === preset.id;
          const monthlyIncome = preset.plan.income.salary + preset.plan.income.freelance + preset.plan.income.other;
          const sipAmount = preset.plan.savings.monthlySip;

          return (
            <button
              key={preset.id}
              type="button"
              className={`archetype-card ${isSelected ? 'archetype-card-active' : ''}`}
              onClick={() => onSelectPreset(preset.plan, preset.name)}
              title={preset.tagline}
            >
              <div className="archetype-card-top flex-between items-center">
                <div className="flex-align gap-2">
                  <div className="archetype-icon-box">
                    {PRESET_ICONS[preset.id] || <Sparkles size={13} className="text-quasar" />}
                  </div>
                  <div>
                    <span className="archetype-badge font-mono">{preset.badge}</span>
                    <h4 className="archetype-name font-semibold text-xs m-0">{preset.name}</h4>
                  </div>
                </div>

                {isSelected ? (
                  <span className="archetype-active-badge">
                    <Check size={11} /> Active
                  </span>
                ) : (
                  <Sparkles size={12} className="archetype-sparkle text-muted opacity-40" />
                )}
              </div>

              <p className="archetype-tagline text-xs muted m-0 line-clamp-1">
                {preset.tagline}
              </p>

              <div className="archetype-metrics-strip font-mono text-[11px] flex-between">
                <span>Inflow: <strong className="text-nebula">+{formatINR(monthlyIncome)}</strong></span>
                <span>SIP: <strong className="text-quasar">{formatINR(sipAmount)}/mo</strong></span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

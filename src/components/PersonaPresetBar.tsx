import React from 'react';
import { Sparkles, Terminal } from 'lucide-react';
import { PLAN_PRESETS } from '../lib/finance';
import type { FinancePlan } from '../types/finance';

interface PersonaPresetBarProps {
  currentPlan: FinancePlan;
  onSelectPreset: (presetPlan: FinancePlan, name: string) => void;
}

export const PersonaPresetBar: React.FC<PersonaPresetBarProps> = ({ currentPlan, onSelectPreset }) => {
  const activePreset = PLAN_PRESETS.find(
    (p) =>
      p.plan.income.salary === currentPlan.income.salary &&
      p.plan.savings.monthlySip === currentPlan.savings.monthlySip
  );

  return (
    <div className="preset-bar-card">
      <div className="preset-bar-header">
        <div className="flex-align gap-2">
          <div className="icon-chip icon-chip-emerald icon-chip-sm">
            <Terminal size={14} />
          </div>
          <div>
            <span className="preset-title font-mono uppercase">Simulation Archetypes</span>
            <span className="muted text-xs hidden-mobile"> · Click to load realistic scenario models</span>
          </div>
        </div>
      </div>

      <div className="preset-pills-row">
        {PLAN_PRESETS.map((preset) => {
          const isSelected = activePreset?.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`preset-pill ${isSelected ? 'preset-pill-active' : ''}`}
              onClick={() => onSelectPreset(preset.plan, preset.name)}
              title={preset.tagline}
            >
              <span className="preset-badge font-mono">{preset.badge}</span>
              <span className="preset-name">{preset.name}</span>
              <Sparkles size={11} className={isSelected ? 'text-emerald' : 'muted'} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

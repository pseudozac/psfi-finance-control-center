import React from 'react';
import { Sparkles } from 'lucide-react';
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
    <div className="persona-bar">
      <div className="persona-label">
        <span className="dot dot-quasar" />
        <span className="font-semibold text-xs text-secondary uppercase font-mono">Archetype Models:</span>
      </div>

      <div className="persona-pills">
        {PLAN_PRESETS.map((preset) => {
          const isSelected = activePreset?.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`persona-pill ${isSelected ? 'pill-selected' : ''}`}
              onClick={() => onSelectPreset(preset.plan, preset.name)}
              title={preset.tagline}
            >
              <span className="pill-badge">{preset.badge}</span>
              <span className="pill-name">{preset.name}</span>
              <Sparkles size={11} className={isSelected ? 'text-nebula' : 'muted'} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

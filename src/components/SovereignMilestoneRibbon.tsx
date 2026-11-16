import React from 'react';
import {
  Crown,
  ShieldAlert,
  Castle,
  PieChart,
  Zap,
  Coins,
  ChevronRight,
  Award,
  Sparkles,
} from 'lucide-react';
import type { SkillTreeState } from '../types/skills';

interface SovereignMilestoneRibbonProps {
  skillTree: SkillTreeState;
  onOpenSkillTree: () => void;
}

const MILESTONE_KEYS = [
  { id: 'iron_fortress_6m', label: '6M Buffer', icon: Castle },
  { id: 'debt_free_fortress', label: 'Zero Debt', icon: ShieldAlert },
  { id: 'equilibrium_50_30_20', label: '50/30/20', icon: PieChart },
  { id: 'velocity_30_club', label: '30% Velocity', icon: Zap },
  { id: 'first_million_10l', label: 'First ₹10L', icon: Coins },
  { id: 'full_sovereign_fire', label: 'FIRE 25x', icon: Crown },
];

export const SovereignMilestoneRibbon: React.FC<SovereignMilestoneRibbonProps> = ({
  skillTree,
  onOpenSkillTree,
}) => {
  const badgeMap = React.useMemo(() => {
    const map = new Map<string, (typeof skillTree.badges)[0]>();
    skillTree.badges.forEach((b) => map.set(b.id, b));
    return map;
  }, [skillTree.badges]);

  return (
    <div className="sovereign-milestone-ribbon" role="region" aria-label="Sovereign Wealth Gamification Ribbon">
      <div className="ribbon-glow-ambient" aria-hidden="true" />

      {/* 1. Left: Level, Rank & XP Telemetry */}
      <div className="ribbon-level-stack">
        <div className="ribbon-avatar-badge">
          <Award size={18} className="text-solstice" />
          <span className="ribbon-lvl-num font-mono">{skillTree.level}</span>
        </div>

        <div className="ribbon-titles">
          <div className="ribbon-title-line">
            <span className="ribbon-rank-title text-white font-bold">{skillTree.levelTitle}</span>
            <span className="ribbon-rank-badge font-mono">{skillTree.currentRank}</span>
          </div>

          <div className="ribbon-xp-track-wrapper">
            <div className="ribbon-xp-track">
              <div
                className="ribbon-xp-fill"
                style={{ width: `${skillTree.currentLevelProgressPercent}%` }}
              />
            </div>
            <span className="ribbon-xp-label font-mono">
              {skillTree.totalXP} / {skillTree.nextLevelXP} XP
            </span>
          </div>
        </div>
      </div>

      {/* 2. Center: 6 Key Sovereign Milestone Chips */}
      <div className="ribbon-milestones-row" role="list" aria-label="Key Sovereign Wealth Milestones">
        {MILESTONE_KEYS.map((m) => {
          const badge = badgeMap.get(m.id);
          const isUnlocked = badge?.isUnlocked ?? false;
          const progress = badge?.progressPercent ?? 0;
          const Icon = m.icon;

          return (
            <button
              key={m.id}
              type="button"
              className={`ribbon-milestone-chip ${isUnlocked ? 'chip-unlocked' : progress > 0 ? 'chip-in-progress' : 'chip-locked'}`}
              onClick={onOpenSkillTree}
              title={`${badge?.title || m.label}: ${isUnlocked ? 'Unlocked' : `${progress}% completed`} - Click to open Trophy Hall`}
            >
              <Icon size={13} className="ribbon-chip-icon" />
              <span className="ribbon-chip-label">{m.label}</span>
              <span className="ribbon-chip-status font-mono">
                {isUnlocked ? '✓' : `${progress}%`}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Right: Quick Action to open Trophy Hall */}
      <div className="ribbon-action-wrapper">
        <button
          type="button"
          className="ribbon-hall-btn font-mono"
          onClick={onOpenSkillTree}
          title="Open Sovereign RPG Star-Chart & Trophy Hall"
        >
          <Sparkles size={13} className="text-solstice" />
          <span>Trophy Hall ({skillTree.unlockedBadgesCount}/14)</span>
          <ChevronRight size={13} className="text-muted" />
        </button>
      </div>
    </div>
  );
};

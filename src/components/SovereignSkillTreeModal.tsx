import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Umbrella,
  HeartPulse,
  Castle,
  Coins,
  PieChart,
  Zap,
  Scale,
  TrendingUp,
  Rocket,
  Flame,
  Anchor,
  Crown,
  Lock,
  CheckCircle2,
  Info,
  Award,
  ArrowRight,
} from 'lucide-react';
import type { FinancePlan, FinanceSummary } from '../types/finance';
import type { SkillTier } from '../types/skills';
import { calculateSkillTree } from '../lib/skillTree';

interface SovereignSkillTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: FinancePlan;
  summary: FinanceSummary;
  taxSavingsDelta?: number;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  ShieldAlert: <ShieldAlert size={18} className="text-corona" />,
  ShieldCheck: <ShieldCheck size={18} className="text-nebula" />,
  Umbrella: <Umbrella size={18} className="text-pulsar" />,
  HeartPulse: <HeartPulse size={18} className="text-solstice" />,
  Castle: <Castle size={18} className="text-quasar" />,
  Coins: <Coins size={18} className="text-solstice" />,
  PieChart: <PieChart size={18} className="text-pulsar" />,
  Zap: <Zap size={18} className="text-corona" />,
  Scale: <Scale size={18} className="text-quasar" />,
  TrendingUp: <TrendingUp size={18} className="text-nebula" />,
  Rocket: <Rocket size={18} className="text-quasar" />,
  Flame: <Flame size={18} className="text-corona" />,
  Anchor: <Anchor size={18} className="text-pulsar" />,
  Crown: <Crown size={18} className="text-solstice" />,
  Sparkles: <Sparkles size={18} className="text-quasar" />,
};

// Subtle Web Audio synthesizer chime on selecting or exploring nodes
function playChime(freq = 520) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

export const SovereignSkillTreeModal: React.FC<SovereignSkillTreeModalProps> = ({
  isOpen,
  onClose,
  plan,
  summary,
  taxSavingsDelta = 0,
}) => {
  const [selectedTier, setSelectedTier] = useState<SkillTier | 'all'>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const treeState = useMemo(
    () => calculateSkillTree(plan, summary, taxSavingsDelta),
    [plan, summary, taxSavingsDelta]
  );

  const activeNode = useMemo(() => {
    if (!selectedNodeId) return treeState.nodes[0];
    return treeState.nodes.find((n) => n.id === selectedNodeId) || treeState.nodes[0];
  }, [selectedNodeId, treeState.nodes]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredNodes = treeState.nodes.filter(
    (n) => selectedTier === 'all' || n.tier === selectedTier
  );

  const tier1Count = treeState.nodes.filter((n) => n.tier === 'tier1_survival' && n.status === 'mastered').length;
  const tier2Count = treeState.nodes.filter((n) => n.tier === 'tier2_velocity' && n.status === 'mastered').length;
  const tier3Count = treeState.nodes.filter((n) => n.tier === 'tier3_autonomy' && n.status === 'mastered').length;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Sovereign Wealth Skill Tree">
      <div className="modal-card skill-tree-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header flex-between items-center">
          <div className="flex-align gap-2.5 min-w-0">
            <div className="skill-tree-trophy-box">
              <Crown size={18} className="text-solstice" />
            </div>
            <div>
              <div className="flex-align gap-2 flex-wrap">
                <h3 className="modal-title font-semibold text-base m-0 text-primary">Sovereign Wealth RPG Skill Tree</h3>
                <span className="skill-rank-badge font-mono text-[11px] px-2 py-0.5 rounded-full">
                  {treeState.currentRank}
                </span>
              </div>
              <p className="text-xs text-muted m-0 mt-0.5">
                Actuarial Progression: {treeState.unlockedCount}/{treeState.totalCount} Milestones Mastered ({treeState.overallMasteryPercent}%)
              </p>
            </div>
          </div>

          <button type="button" className="icon-pill shrink-0" onClick={onClose} title="Close (Esc)">
            <X size={15} />
          </button>
        </div>

        {/* Global Progression Bar */}
        <div className="w-full bg-surface-overlay rounded-full h-2 my-3 overflow-hidden border border-subtle">
          <div
            className="h-full bg-gradient-to-r from-quasar via-pulsar to-nebula transition-all duration-500"
            style={{ width: `${treeState.overallMasteryPercent}%` }}
          />
        </div>

        {/* Tier Filter Tabs */}
        <div className="pill-segmented skill-tier-segmented mb-3.5 w-full flex flex-wrap gap-1" role="tablist">
          <button
            type="button"
            className={`flex-1 py-1.5 font-mono text-xs ${selectedTier === 'all' ? 'pill-active' : ''}`}
            onClick={() => setSelectedTier('all')}
          >
            All Milestones ({treeState.unlockedCount}/15)
          </button>
          <button
            type="button"
            className={`flex-1 py-1.5 font-mono text-xs ${selectedTier === 'tier1_survival' ? 'pill-active' : ''}`}
            onClick={() => setSelectedTier('tier1_survival')}
          >
            🛡️ Fortress ({tier1Count}/5)
          </button>
          <button
            type="button"
            className={`flex-1 py-1.5 font-mono text-xs ${selectedTier === 'tier2_velocity' ? 'pill-active' : ''}`}
            onClick={() => setSelectedTier('tier2_velocity')}
          >
            ⚡ Velocity ({tier2Count}/5)
          </button>
          <button
            type="button"
            className={`flex-1 py-1.5 font-mono text-xs ${selectedTier === 'tier3_autonomy' ? 'pill-active' : ''}`}
            onClick={() => setSelectedTier('tier3_autonomy')}
          >
            👑 Autonomy ({tier3Count}/5)
          </button>
        </div>

        {/* Two-Column Grid: Left is Node Tree / Right is Node Actuarial Drawer */}
        <div className="skill-tree-layout-grid">
          {/* Left Column: Interactive Node Cards Grid */}
          <div className="skill-nodes-scroll-container">
            <div className="skill-cards-grid">
              {filteredNodes.map((node) => {
                const isSelected = activeNode.id === node.id;
                const isMastered = node.status === 'mastered';
                const isInProgress = node.status === 'in_progress';

                return (
                  <button
                    key={node.id}
                    type="button"
                    className={`skill-node-card text-left ${isSelected ? 'skill-card-selected' : ''} ${
                      isMastered ? 'skill-card-mastered' : isInProgress ? 'skill-card-progress' : 'skill-card-locked'
                    }`}
                    onClick={() => {
                      setSelectedNodeId(node.id);
                      playChime(isMastered ? 660 : 440);
                    }}
                  >
                    <div className="skill-card-top flex-between items-center mb-2">
                      <div className="skill-node-icon-box">
                        {ICON_MAP[node.iconName] || <Award size={18} className="text-quasar" />}
                      </div>

                      <div className="flex-align gap-1.5">
                        <span className="skill-tier-badge font-mono text-[10px]">{node.badge}</span>
                        {isMastered ? (
                          <span className="skill-status-tag tag-mastered flex-align gap-1">
                            <CheckCircle2 size={11} /> Mastered
                          </span>
                        ) : isInProgress ? (
                          <span className="skill-status-tag tag-progress flex-align gap-1">
                            <Zap size={10} /> In Flight
                          </span>
                        ) : (
                          <span className="skill-status-tag tag-locked flex-align gap-1">
                            <Lock size={10} /> Locked
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="skill-node-title font-semibold text-xs m-0 text-primary mb-1">
                      {node.title}
                    </h4>

                    <div className="flex-between items-center font-mono text-[11px] text-muted mb-1.5">
                      <span>{node.currentMetricLabel}</span>
                      <span className="font-semibold text-primary">{node.progressPercent}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-surface-page rounded-full h-1.5 overflow-hidden border border-subtle">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isMastered ? 'bg-nebula' : 'bg-gradient-to-r from-quasar to-pulsar'
                        }`}
                        style={{ width: `${Math.min(100, node.progressPercent)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Node Actuarial Drawer */}
          <div className="skill-actuarial-drawer">
            <div className="drawer-header flex-align gap-2.5 pb-3 border-b border-subtle">
              <div className="skill-drawer-icon-box">
                {ICON_MAP[activeNode.iconName] || <Sparkles size={20} className="text-quasar" />}
              </div>
              <div className="min-w-0 flex-1">
                <span className="skill-tier-badge font-mono text-[10px] uppercase text-muted block">
                  {activeNode.badge} · {activeNode.category.toUpperCase()}
                </span>
                <h4 className="font-semibold text-sm m-0 text-primary truncate">{activeNode.title}</h4>
              </div>
            </div>

            <div className="drawer-body py-3 flex-column gap-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-mono text-muted block mb-1">
                  Tactile Overview
                </span>
                <p className="text-xs text-primary leading-relaxed m-0">{activeNode.description}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-overlay border border-subtle">
                <div className="flex-align gap-1.5 mb-1 text-solstice font-mono text-xs font-semibold">
                  <Info size={13} />
                  <span>Actuarial Financial Law</span>
                </div>
                <p className="text-[11.5px] text-secondary leading-relaxed m-0 font-sans">
                  {activeNode.actuarialPrinciple}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="p-2 rounded bg-surface-overlay border border-subtle">
                  <span className="text-[10px] text-muted block">Current Audit</span>
                  <strong className="text-primary block mt-0.5">{activeNode.currentMetricLabel}</strong>
                </div>
                <div className="p-2 rounded bg-surface-overlay border border-subtle">
                  <span className="text-[10px] text-muted block">Actuarial Target</span>
                  <strong className="text-nebula block mt-0.5">{activeNode.targetMetricLabel}</strong>
                </div>
              </div>

              {activeNode.gapRupeesOrMonths && (
                <div className="p-2.5 rounded-lg bg-corona/10 border border-corona/30 flex-between items-center font-mono text-xs">
                  <span className="text-corona font-semibold">Capital Gap:</span>
                  <span className="text-corona font-bold">{activeNode.gapRupeesOrMonths}</span>
                </div>
              )}

              <div>
                <span className="text-[11px] uppercase tracking-wider font-mono text-muted block mb-1">
                  Tactical Action Step
                </span>
                <div className="flex items-start gap-2 text-xs text-secondary leading-relaxed">
                  <ArrowRight size={13} className="text-quasar shrink-0 mt-0.5" />
                  <span>{activeNode.actionableStep}</span>
                </div>
              </div>
            </div>

            <div className="drawer-footer pt-3 border-t border-subtle flex-between items-center text-xs font-mono text-muted">
              <span>Status: <strong className="text-primary uppercase">{activeNode.status}</strong></span>
              <span>Next Rank: <strong className="text-quasar">{treeState.nextRank}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

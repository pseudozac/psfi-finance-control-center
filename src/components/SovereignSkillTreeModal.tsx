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
  GitBranch,
  Grid,
  Scroll,
  RotateCcw,
  Check,
  Copy,
  Sliders,
} from 'lucide-react';
import type { FinancePlan, FinanceSummary } from '../types/finance';
import type { SkillTier, SkillNode } from '../types/skills';
import { calculateSkillTree, RANK_LORE_PERKS } from '../lib/skillTree';
import { calculateSummary, formatINR } from '../lib/finance';

interface SovereignSkillTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: FinancePlan;
  summary: FinanceSummary;
  taxSavingsDelta?: number;
  onApplySimulatedPlan?: (updated: FinancePlan) => void;
}

type ViewMode = 'constellation' | 'matrix' | 'character_sheet';

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

// Victory arpeggio for What-If unlock or copying sheet
function playFanfare() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0.04, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.32);
    });
  } catch {
    // Ignore audio
  }
}

// Prerequisite conduit connections between node IDs for SVG rendering
const CONDUIT_PAIRS: Array<{ from: string; to: string }> = [
  { from: 'debt_elimination', to: 'liquidity_3m' },
  { from: 'liquidity_3m', to: 'iron_fortress_6m' },
  { from: 'term_shield_100x', to: 'iron_fortress_6m' },
  { from: 'health_shield_1cr', to: 'iron_fortress_6m' },
  { from: 'iron_fortress_6m', to: 'first_10l_core' },
  { from: 'savings_velocity_30', to: 'velocity_hyper_50' },
  { from: 'tax_drag_minimizer', to: 'direct_mf_indexer' },
  { from: 'first_10l_core', to: 'quarter_crore_hub' },
  { from: 'quarter_crore_hub', to: 'half_crore_inflection' },
  { from: 'half_crore_inflection', to: 'crore_foundation_1cr' },
  { from: 'crore_foundation_1cr', to: 'full_sovereign_fire' },
  { from: 'full_sovereign_fire', to: 'antifragile_dynasty' },
];

export const SovereignSkillTreeModal: React.FC<SovereignSkillTreeModalProps> = ({
  isOpen,
  onClose,
  plan,
  summary,
  taxSavingsDelta = 0,
  onApplySimulatedPlan,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('constellation');
  const [selectedTier, setSelectedTier] = useState<SkillTier | 'all'>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('debt_elimination');
  const [simulatedPlan, setSimulatedPlan] = useState<FinancePlan | null>(null);
  const [copiedSheet, setCopiedSheet] = useState<boolean>(false);

  // Derive current active plan (real vs simulated)
  const effectivePlan = simulatedPlan || plan;
  const effectiveSummary = useMemo(() => {
    return simulatedPlan ? calculateSummary(simulatedPlan) : summary;
  }, [simulatedPlan, summary]);

  const treeState = useMemo(
    () => calculateSkillTree(effectivePlan, effectiveSummary, taxSavingsDelta),
    [effectivePlan, effectiveSummary, taxSavingsDelta]
  );

  const realTreeState = useMemo(
    () => calculateSkillTree(plan, summary, taxSavingsDelta),
    [plan, summary, taxSavingsDelta]
  );

  const activeNode = useMemo(() => {
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

  // Simulate unlock action for the active node
  const handleSimulateUnlock = (node: SkillNode) => {
    if (!node.suggestedAction) return;
    const cloned: FinancePlan = JSON.parse(JSON.stringify(plan));
    const [section, field] = node.suggestedAction.field.split('.');

    if (section && field) {
      // e.g. savings.emergencyFundBalance or debt.cardBalance
      // @ts-expect-error dynamic path assignment for simulation
      if (cloned[section]) cloned[section][field] = node.suggestedAction.targetValue;
    }

    setSimulatedPlan(cloned);
    playFanfare();
  };

  const handleResetSimulation = () => {
    setSimulatedPlan(null);
    playChime(350);
  };

  const handleCommitSimulation = () => {
    if (simulatedPlan && onApplySimulatedPlan) {
      onApplySimulatedPlan(simulatedPlan);
      setSimulatedPlan(null);
      playFanfare();
    }
  };

  // Copy RPG Character Sheet Scorecard
  const handleCopyCharacterSheet = () => {
    const text = `=== PSFI SOVEREIGN WEALTH RPG SCORECARD ===
Rank: ${treeState.currentRank} (Milestones: ${treeState.unlockedCount}/${treeState.totalCount} Mastered - ${treeState.overallMasteryPercent}%)
Tier 1 Moat: ${treeState.tier1MasteredCount}/5 | Tier 2 Velocity: ${treeState.tier2MasteredCount}/5 | Tier 3 Sovereign: ${treeState.tier3MasteredCount}/5

[ACTIVE PERKS]
${treeState.currentRankPerks.map((p) => `• ${p}`).join('\n')}

[LORE]
"${RANK_LORE_PERKS[treeState.currentRank]?.lore || 'Sovereign financial architect in training.'}"

Next Rank: ${treeState.nextRank}
Verified via Pseudo-Fi Client-Side Wealth Actuary
==========================================`;
    navigator.clipboard.writeText(text);
    setCopiedSheet(true);
    playFanfare();
    setTimeout(() => setCopiedSheet(false), 2200);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Sovereign Wealth Skill Tree">
      <div className="modal-card skill-tree-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header flex-between items-center">
          <div className="flex-align gap-2.5 min-w-0">
            <div className="skill-tree-trophy-box shrink-0">
              <Crown size={18} className="text-solstice" />
            </div>
            <div className="min-w-0">
              <div className="flex-align gap-2 flex-wrap">
                <h3 className="modal-title font-semibold text-base m-0 text-primary">Sovereign Wealth RPG Skill Tree</h3>
                <span className="skill-rank-badge font-mono text-[11px] px-2.5 py-0.5 rounded-full">
                  {treeState.currentRank}
                </span>
                {simulatedPlan && (
                  <span className="font-mono text-[10px] bg-quasar/20 text-quasar px-2 py-0.5 rounded border border-quasar/40 animate-pulse">
                    🧪 What-If Simulation Active
                  </span>
                )}
              </div>
              <p className="text-xs text-muted m-0 mt-0.5 truncate">
                Actuarial Progression: {treeState.unlockedCount}/{treeState.totalCount} Milestones Mastered ({treeState.overallMasteryPercent}%)
                {simulatedPlan && ` · +${treeState.overallMasteryPercent - realTreeState.overallMasteryPercent}% from What-If`}
              </p>
            </div>
          </div>

          <button type="button" className="icon-pill shrink-0" onClick={onClose} title="Close (Esc)">
            <X size={15} />
          </button>
        </div>

        {/* Global Progression Bar */}
        <div className="w-full bg-surface-overlay rounded-full h-2 my-2.5 overflow-hidden border border-subtle">
          <div
            className="h-full bg-gradient-to-r from-quasar via-pulsar to-nebula transition-all duration-500"
            style={{ width: `${treeState.overallMasteryPercent}%` }}
          />
        </div>

        {/* Mode Switcher Nav */}
        <div className="flex-between items-center gap-2 mb-3 flex-wrap">
          <div className="pill-segmented flex gap-1 text-xs font-mono">
            <button
              type="button"
              className={`px-3 py-1.5 flex-align gap-1.5 ${viewMode === 'constellation' ? 'pill-active' : ''}`}
              onClick={() => {
                setViewMode('constellation');
                playChime(480);
              }}
            >
              <GitBranch size={13} />
              <span>Constellation Tech Tree</span>
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 flex-align gap-1.5 ${viewMode === 'matrix' ? 'pill-active' : ''}`}
              onClick={() => {
                setViewMode('matrix');
                playChime(480);
              }}
            >
              <Grid size={13} />
              <span>Actuarial Matrix</span>
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 flex-align gap-1.5 ${viewMode === 'character_sheet' ? 'pill-active' : ''}`}
              onClick={() => {
                setViewMode('character_sheet');
                playChime(480);
              }}
            >
              <Scroll size={13} />
              <span>RPG Character Perks</span>
            </button>
          </div>

          {/* Quick Simulation Indicator */}
          {simulatedPlan ? (
            <div className="flex-align gap-2">
              <button
                type="button"
                className="action-pill font-mono text-xs flex-align gap-1 text-flare"
                onClick={handleResetSimulation}
                title="Reset simulation back to live plan"
              >
                <RotateCcw size={11} /> Reset What-If
              </button>
              {onApplySimulatedPlan && (
                <button
                  type="button"
                  className="action-pill font-mono text-xs flex-align gap-1 bg-nebula/20 text-nebula border-nebula/40"
                  onClick={handleCommitSimulation}
                  title="Permanently apply this simulated milestone to your live financial plan"
                >
                  <Check size={11} /> Apply to Dashboard
                </button>
              )}
            </div>
          ) : (
            <div className="text-[11px] font-mono text-muted flex-align gap-1.5">
              <span>Select any milestone to test What-If unlocking</span>
            </div>
          )}
        </div>

        {/* VIEW MODE 1 & 2: Constellation Tree or Matrix + Right Actuarial Drawer */}
        {viewMode !== 'character_sheet' ? (
          <div className="skill-tree-layout-grid">
            {/* Left Column: Constellation or Matrix */}
            <div className="skill-nodes-scroll-container">
              {viewMode === 'constellation' ? (
                /* Kinetic Constellation Tech Tree with SVG Energy Conduits */
                <div className="constellation-canvas-wrapper">
                  <div className="constellation-legend flex-between items-center mb-2 px-1 text-[11px] font-mono text-muted">
                    <span className="flex-align gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-nebula inline-block" /> Mastered Conduits
                      <span className="w-2 h-2 rounded-full bg-quasar inline-block ml-2" /> In Flight
                      <span className="w-2 h-2 rounded-full bg-border-subtle inline-block ml-2" /> Locked
                    </span>
                    <span>3 Actuarial Tiers · 15 Milestones</span>
                  </div>

                  {/* Active Energy Conduit Flow Spine */}
                  <div className="conduit-network-flow flex-between items-center px-3 py-1.5 rounded-lg bg-surface-page border border-subtle mb-3 overflow-x-auto text-[10.5px] font-mono gap-1.5">
                    <span className="text-muted shrink-0 flex-align gap-1">
                      <Zap size={11} className="text-solstice" /> Core Spine:
                    </span>
                    <div className="flex-align gap-1.5 flex-wrap">
                      {CONDUIT_PAIRS.slice(0, 6).map((pair, pIdx) => {
                        const fromNode = treeState.nodes.find((n) => n.id === pair.from);
                        const toNode = treeState.nodes.find((n) => n.id === pair.to);
                        const isHot = fromNode?.status === 'mastered' && toNode?.status === 'mastered';
                        const isInFlight = fromNode?.status === 'mastered' && toNode?.status === 'in_progress';
                        return (
                          <div key={pIdx} className="flex-align gap-1 shrink-0">
                            <span className={isHot ? 'text-nebula font-semibold' : isInFlight ? 'text-quasar' : 'text-muted'}>
                              {fromNode?.title.split(' ')[0]}
                            </span>
                            <span className={isHot ? 'text-nebula' : isInFlight ? 'text-quasar' : 'text-muted'}>
                              ➔
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3 Tier Rows */}
                  <div className="constellation-grid-container">
                    {(['tier1_survival', 'tier2_velocity', 'tier3_autonomy'] as SkillTier[]).map((tierKey) => {
                      const tierNodes = treeState.nodes.filter((n) => n.tier === tierKey);
                      const tierName =
                        tierKey === 'tier1_survival'
                          ? 'Tier I: Iron Fortress'
                          : tierKey === 'tier2_velocity'
                          ? 'Tier II: Velocity Engines'
                          : 'Tier III: Sovereign Autonomy';
                      const tierIcon = tierKey === 'tier1_survival' ? '🛡️' : tierKey === 'tier2_velocity' ? '⚡' : '👑';

                      return (
                        <div key={tierKey} className="constellation-tier-band">
                          <div className="constellation-tier-label font-mono text-[11px] text-muted mb-2 flex-between items-center">
                            <span>{tierIcon} {tierName}</span>
                            <span className="text-secondary">
                              {tierNodes.filter((n) => n.status === 'mastered').length}/{tierNodes.length} Unlocked
                            </span>
                          </div>

                          <div className="constellation-nodes-row">
                            {tierNodes.map((node) => {
                              const isSelected = activeNode.id === node.id;
                              const isMastered = node.status === 'mastered';
                              const isInProgress = node.status === 'in_progress';

                              return (
                                <button
                                  key={node.id}
                                  type="button"
                                  className={`constellation-node-token ${isSelected ? 'token-selected' : ''} ${
                                    isMastered ? 'token-mastered' : isInProgress ? 'token-progress' : 'token-locked'
                                  }`}
                                  onClick={() => {
                                    setSelectedNodeId(node.id);
                                    playChime(isMastered ? 660 : 440);
                                  }}
                                  title={`${node.title} (${node.progressPercent}%) - ${node.currentMetricLabel}`}
                                >
                                  <div className="token-icon-orb">
                                    {ICON_MAP[node.iconName] || <Award size={15} />}
                                    {isMastered && (
                                      <span className="token-badge-checkmark">
                                        <CheckCircle2 size={10} />
                                      </span>
                                    )}
                                  </div>
                                  <div className="token-content">
                                    <span className="token-title truncate">{node.title}</span>
                                    <span className="token-progress-label font-mono">{node.progressPercent}%</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Matrix Mode: Filter Tabs + Card Grid */
                <div>
                  <div className="pill-segmented skill-tier-segmented mb-3 w-full flex flex-wrap gap-1" role="tablist">
                    <button
                      type="button"
                      className={`flex-1 py-1 font-mono text-xs ${selectedTier === 'all' ? 'pill-active' : ''}`}
                      onClick={() => setSelectedTier('all')}
                    >
                      All ({treeState.unlockedCount}/15)
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-1 font-mono text-xs ${selectedTier === 'tier1_survival' ? 'pill-active' : ''}`}
                      onClick={() => setSelectedTier('tier1_survival')}
                    >
                      🛡️ Fortress ({treeState.tier1MasteredCount}/5)
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-1 font-mono text-xs ${selectedTier === 'tier2_velocity' ? 'pill-active' : ''}`}
                      onClick={() => setSelectedTier('tier2_velocity')}
                    >
                      ⚡ Velocity ({treeState.tier2MasteredCount}/5)
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-1 font-mono text-xs ${selectedTier === 'tier3_autonomy' ? 'pill-active' : ''}`}
                      onClick={() => setSelectedTier('tier3_autonomy')}
                    >
                      👑 Autonomy ({treeState.tier3MasteredCount}/5)
                    </button>
                  </div>

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
                          <div className="skill-card-top flex-between items-center mb-1.5">
                            <div className="skill-node-icon-box">
                              {ICON_MAP[node.iconName] || <Award size={16} className="text-quasar" />}
                            </div>

                            <div className="flex-align gap-1">
                              <span className="skill-tier-badge font-mono text-[9.5px]">{node.badge}</span>
                              {isMastered ? (
                                <span className="skill-status-tag tag-mastered flex-align gap-1 text-[10px]">
                                  <CheckCircle2 size={10} /> Done
                                </span>
                              ) : isInProgress ? (
                                <span className="skill-status-tag tag-progress flex-align gap-1 text-[10px]">
                                  <Zap size={9} /> In Flight
                                </span>
                              ) : (
                                <span className="skill-status-tag tag-locked flex-align gap-1 text-[10px]">
                                  <Lock size={9} /> Locked
                                </span>
                              )}
                            </div>
                          </div>

                          <h4 className="skill-node-title font-semibold text-xs m-0 text-primary mb-1">
                            {node.title}
                          </h4>

                          <div className="flex-between items-center font-mono text-[10.5px] text-muted mb-1">
                            <span className="truncate pr-1">{node.currentMetricLabel}</span>
                            <span className="font-semibold text-primary">{node.progressPercent}%</span>
                          </div>

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
              )}
            </div>

            {/* Right Column: Node Actuarial Drawer + What-If Unlock Simulator */}
            <div className="skill-actuarial-drawer">
              <div className="drawer-header flex-align gap-2.5 pb-2.5 border-b border-subtle">
                <div className="skill-drawer-icon-box">
                  {ICON_MAP[activeNode.iconName] || <Sparkles size={18} className="text-quasar" />}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="skill-tier-badge font-mono text-[9.5px] uppercase text-muted block">
                    {activeNode.badge} · {activeNode.category.toUpperCase()}
                  </span>
                  <h4 className="font-semibold text-sm m-0 text-primary truncate">{activeNode.title}</h4>
                </div>
              </div>

              <div className="drawer-body py-2.5 flex-column gap-2.5">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-mono text-muted block mb-0.5">
                    Tactile Overview
                  </span>
                  <p className="text-xs text-primary leading-relaxed m-0">{activeNode.description}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-surface-overlay border border-subtle">
                  <div className="flex-align gap-1.5 mb-1 text-solstice font-mono text-xs font-semibold">
                    <Info size={12} />
                    <span>Actuarial Financial Law</span>
                  </div>
                  <p className="text-[11px] text-secondary leading-relaxed m-0 font-sans">
                    {activeNode.actuarialPrinciple}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <div className="p-2 rounded bg-surface-overlay border border-subtle">
                    <span className="text-[9.5px] text-muted block">Current Audit</span>
                    <strong className="text-primary block mt-0.5 truncate">{activeNode.currentMetricLabel}</strong>
                  </div>
                  <div className="p-2 rounded bg-surface-overlay border border-subtle">
                    <span className="text-[9.5px] text-muted block">Actuarial Target</span>
                    <strong className="text-nebula block mt-0.5 truncate">{activeNode.targetMetricLabel}</strong>
                  </div>
                </div>

                {activeNode.gapRupeesOrMonths && (
                  <div className="p-2 rounded-lg bg-corona/10 border border-corona/30 flex-between items-center font-mono text-xs">
                    <span className="text-corona font-semibold">Capital Gap:</span>
                    <span className="text-corona font-bold">{activeNode.gapRupeesOrMonths}</span>
                  </div>
                )}

                <div>
                  <span className="text-[10px] uppercase tracking-wider font-mono text-muted block mb-0.5">
                    Tactical Action Step
                  </span>
                  <div className="flex items-start gap-1.5 text-xs text-secondary leading-relaxed">
                    <ArrowRight size={12} className="text-quasar shrink-0 mt-0.5" />
                    <span>{activeNode.actionableStep}</span>
                  </div>
                </div>

                {/* What-If Simulation Trigger */}
                {activeNode.suggestedAction && (
                  <div className="p-2.5 rounded-lg bg-quasar/10 border border-quasar/30 mt-1">
                    <div className="flex-between items-center mb-1.5 flex-wrap gap-1">
                      <span className="text-[11px] font-mono font-semibold text-quasar flex-align gap-1.5">
                        <Sliders size={12} className="shrink-0" /> Balance Sheet Lever
                      </span>
                      {activeNode.status === 'mastered' ? (
                        <span className="text-[10px] font-mono text-nebula flex-align gap-0.5 shrink-0">
                          <CheckCircle2 size={10} /> Met
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-secondary m-0 mb-1.5 font-sans leading-tight">
                      {activeNode.suggestedAction.description}
                    </p>
                    <div className="flex-between items-center text-[10.5px] font-mono text-muted mb-2">
                      <span>Simulated Value:</span>
                      <strong className="text-solstice">{formatINR(activeNode.suggestedAction.targetValue)}</strong>
                    </div>
                    <button
                      type="button"
                      className="w-full py-1.5 px-2.5 rounded-md bg-quasar/20 hover:bg-quasar/30 border border-quasar/40 text-quasar font-mono text-xs font-semibold flex-center gap-1.5 transition-colors"
                      onClick={() => handleSimulateUnlock(activeNode)}
                    >
                      <Zap size={12} /> Simulate Unlocking Milestone
                    </button>
                  </div>
                )}
              </div>

              <div className="drawer-footer pt-2.5 border-t border-subtle flex-between items-center text-xs font-mono text-muted flex-wrap gap-1">
                <span>Status: <strong className="text-primary uppercase">{activeNode.status}</strong></span>
                <span className="truncate max-w-[170px]" title={treeState.nextRank}>
                  Next: <strong className="text-quasar">{treeState.nextRank}</strong>
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* VIEW MODE 3: RPG Character Sheet & Lore */
          <div className="character-sheet-container p-4 rounded-xl bg-surface-overlay border border-subtle flex-1 overflow-y-auto">
            <div className="flex-between items-start gap-3 border-b border-subtle pb-4 mb-4 flex-wrap">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-solstice">Sovereign Profile</span>
                <h3 className="text-xl font-bold text-primary m-0 mt-0.5 flex-align gap-2">
                  <Crown size={20} className="text-solstice" /> {treeState.currentRank}
                </h3>
                <p className="text-xs text-muted m-0 mt-1">
                  Overall Wealth Mastery: {treeState.overallMasteryPercent}% ({treeState.unlockedCount} of 15 Actuarial Milestones Mastered)
                </p>
              </div>

              <button
                type="button"
                className="action-pill font-mono text-xs flex-align gap-1.5"
                onClick={handleCopyCharacterSheet}
              >
                {copiedSheet ? <Check size={13} className="text-nebula" /> : <Copy size={13} />}
                <span>{copiedSheet ? 'Scorecard Copied!' : 'Copy RPG Scorecard'}</span>
              </button>
            </div>

            {/* Lore narrative */}
            <div className="p-3.5 rounded-xl bg-surface-page border border-subtle mb-4">
              <span className="text-[11px] font-mono text-muted uppercase tracking-wider block mb-1">
                Class Lore & Philosophy
              </span>
              <p className="text-xs text-primary leading-relaxed m-0 italic font-serif">
                "{RANK_LORE_PERKS[treeState.currentRank]?.lore || 'Taking the first conscious steps into sovereign personal finance and cashflow discipline.'}"
              </p>
            </div>

            {/* Active Character Perks */}
            <div className="mb-4">
              <h4 className="text-xs font-mono uppercase text-muted tracking-wider mb-2 flex-align gap-1.5">
                <ShieldCheck size={14} className="text-nebula" /> Unlocked Passive Perks (Active)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {treeState.currentRankPerks.map((perk, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-nebula/10 border border-nebula/20 flex items-start gap-2 text-xs">
                    <CheckCircle2 size={13} className="text-nebula shrink-0 mt-0.5" />
                    <span className="text-primary font-medium">{perk}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Rank Previews */}
            {treeState.nextRank !== treeState.currentRank && (
              <div className="p-3.5 rounded-xl bg-quasar/10 border border-quasar/20">
                <div className="flex-between items-center mb-2">
                  <span className="text-xs font-mono font-semibold text-quasar flex-align gap-1">
                    <Rocket size={13} /> Next Class Upgrade: {treeState.nextRank}
                  </span>
                  <span className="text-[11px] font-mono text-muted">
                    Unlock {treeState.nodes.length - treeState.unlockedCount} more milestones
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {(RANK_LORE_PERKS[treeState.nextRank]?.perks || ['Generational autonomy']).map((perk, idx) => (
                    <div key={idx} className="flex-align gap-2 text-xs text-secondary">
                      <Lock size={12} className="text-muted shrink-0" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

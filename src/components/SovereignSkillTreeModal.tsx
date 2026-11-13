import React, { useState, useMemo } from 'react';
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
  CheckCircle2,
  Info,
  Award,
  GitBranch,
  Grid,
  Scroll,
  RotateCcw,
  Check,
  Copy,
  Filter,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import type { FinancePlan, FinanceSummary } from '../types/finance';
import type { SkillTier, SkillNode } from '../types/skills';
import {
  calculateSkillTree,
  RANK_LORE_PERKS,
  SOVEREIGN_TREE_CONDUITS,
  getPrerequisiteAncestors,
  generateCurvedPath,
} from '../lib/skillTree';
import { calculateSummary } from '../lib/finance';

interface SovereignSkillTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: FinancePlan;
  summary: FinanceSummary;
  taxSavingsDelta?: number;
  onApplySimulatedPlan?: (updated: FinancePlan) => void;
}

type ViewMode = 'visual_tree' | 'matrix' | 'character_sheet';

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

// Retro Web Audio synthesizer chime
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
    // Ignore audio
  }
}

// Multi-tone victory arpeggio for What-If unlock
function playFanfare() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5];
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

export const SovereignSkillTreeModal: React.FC<SovereignSkillTreeModalProps> = ({
  isOpen,
  onClose,
  plan,
  summary,
  taxSavingsDelta = 0,
  onApplySimulatedPlan,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('visual_tree');
  const [selectedTier, setSelectedTier] = useState<SkillTier | 'all'>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('debt_elimination');
  const [simulatedPlan, setSimulatedPlan] = useState<FinancePlan | null>(null);
  const [copiedSheet, setCopiedSheet] = useState<boolean>(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [isDossierCollapsed, setIsDossierCollapsed] = useState<boolean>(false);

  // Active plan under evaluation
  const activePlan = simulatedPlan || plan;
  const activeSummary = useMemo(() => {
    return simulatedPlan ? calculateSummary(simulatedPlan) : summary;
  }, [simulatedPlan, summary]);

  // Skill Tree calculations
  const treeState = useMemo(() => {
    return calculateSkillTree(activePlan, activeSummary, taxSavingsDelta);
  }, [activePlan, activeSummary, taxSavingsDelta]);

  // Baseline real tree state for delta comparison
  const realTreeState = useMemo(() => {
    return calculateSkillTree(plan, summary, taxSavingsDelta);
  }, [plan, summary, taxSavingsDelta]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, SkillNode>();
    treeState.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [treeState.nodes]);

  const activeNode = useMemo(() => {
    return nodeMap.get(selectedNodeId) || treeState.nodes[0];
  }, [nodeMap, selectedNodeId, treeState.nodes]);

  // Prerequisite Ancestor Nodes for active node
  const illuminatedAncestors = useMemo(() => {
    const target = hoveredNodeId || selectedNodeId;
    return getPrerequisiteAncestors(target, SOVEREIGN_TREE_CONDUITS);
  }, [hoveredNodeId, selectedNodeId]);

  const filteredNodes = useMemo(() => {
    if (selectedTier === 'all') return treeState.nodes;
    return treeState.nodes.filter((n) => n.tier === selectedTier);
  }, [treeState.nodes, selectedTier]);

  // Simulate unlock action for the active node
  const handleSimulateUnlock = (node: SkillNode) => {
    if (!node.suggestedAction) return;
    const cloned: FinancePlan = JSON.parse(JSON.stringify(plan));
    const [section, field] = node.suggestedAction.field.split('.');

    if (section && field) {
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
Tier 1 Citadel: ${treeState.tier1MasteredCount}/5 | Tier 2 Velocity: ${treeState.tier2MasteredCount}/5 | Tier 3 Sovereign: ${treeState.tier3MasteredCount}/5

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

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Sovereign Wealth RPG Skill Tree">
      <div
        className={`modal-card skill-tree-modal ${isTheaterMode ? 'skill-tree-theater-mode' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. TOP HEADER & RPG RANK BANNER */}
        <div className="skill-tree-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <div className="skill-tree-crown-box">
              <Crown size={22} />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 className="modal-title" style={{ margin: 0, fontWeight: 700, fontSize: '17px', color: '#f2f3f7' }}>
                  Sovereign Wealth RPG Constellation
                </h3>
                <span className="skill-rank-badge">
                  {treeState.currentRank}
                </span>
                {simulatedPlan && (
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', background: 'rgba(191, 159, 241, 0.2)', color: 'var(--colour-quasar)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(191, 159, 241, 0.4)' }}>
                    🧪 What-If Active (+{treeState.overallMasteryPercent - realTreeState.overallMasteryPercent}%)
                  </span>
                )}
              </div>

              <div className="skill-tree-stats-row">
                <span>Mastered: <strong style={{ color: 'var(--colour-nebula)' }}>{treeState.unlockedCount}</strong> / 15 ({treeState.overallMasteryPercent}%)</span>
                <span>·</span>
                <span>Moat: <strong style={{ color: '#f2f3f7' }}>{treeState.tier1MasteredCount}/5</strong></span>
                <span>·</span>
                <span>Velocity: <strong style={{ color: '#f2f3f7' }}>{treeState.tier2MasteredCount}/5</strong></span>
                <span>·</span>
                <span>Autonomy: <strong style={{ color: '#f2f3f7' }}>{treeState.tier3MasteredCount}/5</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>
            <button
              type="button"
              className={`action-pill font-mono text-xs ${isTheaterMode ? 'pill-active-mode' : ''}`}
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
              title={isTheaterMode ? "Exit Fullscreen Theater Mode" : "Expand Fullscreen Theater Mode"}
            >
              {isTheaterMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isTheaterMode ? 'Restore View' : 'Theater Mode'}</span>
            </button>
            <button
              type="button"
              className="icon-pill"
              style={{ padding: '6px', borderRadius: '8px', color: 'var(--ink-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              onClick={onClose}
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. PROGRESSION & NAVIGATION BAR */}
        <div className="skill-tree-nav-bar">
          {/* Mode Switcher Tabs */}
          <div className="pill-segmented flex gap-1 text-xs font-mono">
            <button
              type="button"
              className={`px-3 py-1 flex items-center gap-1.5 ${viewMode === 'visual_tree' ? 'pill-active' : ''}`}
              onClick={() => {
                setViewMode('visual_tree');
                playChime(480);
              }}
            >
              <GitBranch size={13} />
              <span>Celestial Star-Chart</span>
            </button>
            <button
              type="button"
              className={`px-3 py-1 flex items-center gap-1.5 ${viewMode === 'matrix' ? 'pill-active' : ''}`}
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
              className={`px-3 py-1 flex items-center gap-1.5 ${viewMode === 'character_sheet' ? 'pill-active' : ''}`}
              onClick={() => {
                setViewMode('character_sheet');
                playChime(480);
              }}
            >
              <Scroll size={13} />
              <span>Character Perks</span>
            </button>
          </div>

          {/* Constellation Branch Filters */}
          {viewMode === 'visual_tree' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
                <Filter size={11} /> Filter:
              </span>
              <button
                type="button"
                className={`action-pill text-xs ${selectedTier === 'all' ? 'pill-active' : ''}`}
                style={{ padding: '2px 10px', fontSize: '11px' }}
                onClick={() => setSelectedTier('all')}
              >
                All Constellations (15)
              </button>
              <button
                type="button"
                className={`action-pill text-xs ${selectedTier === 'tier1_survival' ? 'pill-active' : ''}`}
                style={{ padding: '2px 10px', fontSize: '11px' }}
                onClick={() => setSelectedTier('tier1_survival')}
              >
                🛡️ Citadel ({treeState.tier1MasteredCount}/5)
              </button>
              <button
                type="button"
                className={`action-pill text-xs ${selectedTier === 'tier2_velocity' ? 'pill-active' : ''}`}
                style={{ padding: '2px 10px', fontSize: '11px' }}
                onClick={() => setSelectedTier('tier2_velocity')}
              >
                ⚡ Velocity ({treeState.tier2MasteredCount}/5)
              </button>
              <button
                type="button"
                className={`action-pill text-xs ${selectedTier === 'tier3_autonomy' ? 'pill-active' : ''}`}
                style={{ padding: '2px 10px', fontSize: '11px' }}
                onClick={() => setSelectedTier('tier3_autonomy')}
              >
                👑 Autonomy ({treeState.tier3MasteredCount}/5)
              </button>
            </div>
          )}

          {/* Quick Simulation Levers */}
          {simulatedPlan && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <button
                type="button"
                className="action-pill font-mono text-xs"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--colour-flare)', padding: '4px 10px' }}
                onClick={handleResetSimulation}
                title="Reset simulation back to live plan"
              >
                <RotateCcw size={11} /> Reset What-If
              </button>
              {onApplySimulatedPlan && (
                <button
                  type="button"
                  className="action-pill font-mono text-xs"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(94, 196, 145, 0.2)', color: 'var(--colour-nebula)', borderColor: 'rgba(94, 196, 145, 0.4)', padding: '4px 10px' }}
                  onClick={handleCommitSimulation}
                  title="Permanently apply simulated milestone to live plan"
                >
                  <Check size={11} /> Apply to Dashboard
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3. VIEW MODE 1: VISUAL CELESTIAL STAR-CHART */}
        {viewMode === 'visual_tree' && (
          <div className="skill-tree-viewport">
            {/* FLOATING THAUMATURGY GLASS HUD INSPECTOR */}
            <div className={`skill-tree-hud ${isDossierCollapsed ? 'collapsed' : ''}`}>
              {isDossierCollapsed ? (
                <button
                  type="button"
                  onClick={() => setIsDossierCollapsed(false)}
                  style={{ background: 'none', border: 'none', color: '#f2f3f7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'monospace', fontSize: '11.5px', fontWeight: 600, padding: 0 }}
                >
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(247, 141, 44, 0.2)', color: '#f78d2c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronRight size={13} />
                  </div>
                  <span>✦ Inspect: {activeNode.shortLabel || activeNode.title}</span>
                </button>
              ) : (
                <div>
                  {/* Card Header */}
                  <div className="skill-tree-hud-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div className="skill-tree-hud-icon">
                        {ICON_MAP[activeNode.iconName] || <Award size={18} />}
                      </div>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <span style={{ fontSize: '9.5px', fontFamily: 'monospace', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
                          {activeNode.badge} · {activeNode.tier.replace('tier', 'TIER ').replace('_', ' ').toUpperCase()}
                        </span>
                        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f2f3f7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {activeNode.title}
                        </h4>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsDossierCollapsed(true)}
                      className="icon-pill"
                      style={{ padding: '4px', borderRadius: '6px', color: 'var(--ink-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      title="Minimize Inspector"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  {/* Status Banner */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0' }}>
                    <span style={{
                      fontSize: '10px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      textTransform: 'uppercase',
                      background: activeNode.status === 'mastered' ? 'rgba(16, 185, 129, 0.2)' : activeNode.status === 'in_progress' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                      color: activeNode.status === 'mastered' ? '#34d399' : activeNode.status === 'in_progress' ? '#c084fc' : 'var(--ink-muted)',
                      border: `1px solid ${activeNode.status === 'mastered' ? 'rgba(16, 185, 129, 0.4)' : activeNode.status === 'in_progress' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                    }}>
                      {activeNode.status === 'mastered' ? '✓ Mastered' : activeNode.status === 'in_progress' ? `In Flight (${activeNode.progressPercent}%)` : '🔒 Locked'}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 600, color: '#f2f3f7' }}>
                      {activeNode.currentMetricLabel}
                    </span>
                  </div>

                  {/* Tactile Description */}
                  <p style={{ margin: '8px 0', fontSize: '11.5px', color: 'var(--ink-secondary)', lineHeight: 1.5 }}>
                    {activeNode.description}
                  </p>

                  {/* Actuarial Financial Law Quote */}
                  <div className="skill-tree-hud-law">
                    <div className="skill-tree-hud-law-title">
                      <Info size={12} />
                      <span>Actuarial Financial Law</span>
                    </div>
                    &quot;{activeNode.actuarialPrinciple}&quot;
                  </div>

                  {/* Progress Bar & Gap */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '10px', color: 'var(--ink-muted)' }}>
                      <span>Target: <strong style={{ color: '#f2f3f7' }}>{activeNode.targetMetricLabel}</strong></span>
                      <span style={{ fontWeight: 700, color: '#f2f3f7' }}>{activeNode.progressPercent}%</span>
                    </div>
                    <div className="skill-tree-hud-progress-bar">
                      <div
                        className="skill-tree-hud-progress-fill"
                        style={{
                          width: `${activeNode.progressPercent}%`,
                          background: activeNode.status === 'mastered' ? '#10b981' : 'linear-gradient(90deg, #a855f7, #06b6d4)',
                        }}
                      />
                    </div>
                  </div>

                  {activeNode.gapRupeesOrMonths && (
                    <div className="skill-tree-hud-gap">
                      <span style={{ fontWeight: 600 }}>Required:</span>
                      <span style={{ fontWeight: 700 }}>{activeNode.gapRupeesOrMonths}</span>
                    </div>
                  )}

                  {/* Interactive What-If Simulation Button */}
                  {activeNode.suggestedAction && (
                    <div style={{ marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => handleSimulateUnlock(activeNode)}
                        className="skill-tree-hud-sim-btn"
                      >
                        <Sparkles size={13} />
                        <span>Simulate This Milestone</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FULL SVG ASTROLABE STAR-CHART CANVAS */}
            <svg
              viewBox="0 0 1360 760"
              className="skill-tree-svg"
            >
              <defs>
                {/* Blueprint Grid */}
                <pattern id="celestial-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                  <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="1" />
                  <circle cx="48" cy="48" r="1.2" fill="rgba(191, 159, 241, 0.1)" />
                </pattern>

                {/* Laser Glow Filter */}
                <filter id="conduit-laser-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background Grid */}
              <rect width="1360" height="760" fill="url(#celestial-grid)" />

              {/* Concentric Astrolabe Background Rings */}
              <circle cx="620" cy="720" r="180" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="4 8" />
              <circle cx="620" cy="720" r="340" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="4 8" />
              <circle cx="620" cy="720" r="500" fill="none" stroke="rgba(255, 255, 255, 0.035)" strokeDasharray="4 8" />
              <circle cx="620" cy="720" r="660" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeDasharray="4 8" />
              <circle cx="620" cy="720" r="820" fill="none" stroke="rgba(255, 255, 255, 0.025)" strokeDasharray="4 8" />

              {/* Faint Astrolabe Radial Ray Lines */}
              <line x1="620" y1="720" x2="180" y2="80" stroke="rgba(255, 255, 255, 0.02)" strokeDasharray="2 6" />
              <line x1="620" y1="720" x2="380" y2="40" stroke="rgba(255, 255, 255, 0.02)" strokeDasharray="2 6" />
              <line x1="620" y1="720" x2="620" y2="20" stroke="rgba(255, 255, 255, 0.025)" strokeDasharray="2 6" />
              <line x1="620" y1="720" x2="860" y2="40" stroke="rgba(255, 255, 255, 0.02)" strokeDasharray="2 6" />
              <line x1="620" y1="720" x2="1050" y2="80" stroke="rgba(255, 255, 255, 0.02)" strokeDasharray="2 6" />

              {/* Three Wing Constellation Headers */}
              <g transform="translate(170, 50)">
                <rect x="-10" y="-16" width="220" height="30" rx="15" fill="rgba(16, 185, 129, 0.1)" stroke="rgba(16, 185, 129, 0.3)" />
                <text x="100" y="4" textAnchor="middle" fill="#10b981" fontSize="11" fontFamily="monospace" fontWeight="bold" letterSpacing="0.08em">
                  🛡️ DEFENSIVE CITADEL
                </text>
              </g>

              <g transform="translate(570, 50)">
                <rect x="-10" y="-16" width="220" height="30" rx="15" fill="rgba(6, 182, 212, 0.1)" stroke="rgba(6, 182, 212, 0.3)" />
                <text x="100" y="4" textAnchor="middle" fill="#06b6d4" fontSize="11" fontFamily="monospace" fontWeight="bold" letterSpacing="0.08em">
                  ⚡ COMPOUNDING VELOCITY
                </text>
              </g>

              <g transform="translate(880, 50)">
                <rect x="-10" y="-16" width="220" height="30" rx="15" fill="rgba(245, 158, 11, 0.1)" stroke="rgba(245, 158, 11, 0.3)" />
                <text x="100" y="4" textAnchor="middle" fill="#f59e0b" fontSize="11" fontFamily="monospace" fontWeight="bold" letterSpacing="0.08em">
                  👑 SOVEREIGN AUTONOMY
                </text>
              </g>

              {/* 1. RENDER ORGANIC CUBIC BEZIER CONDUITS */}
              <g className="conduits-group">
                {SOVEREIGN_TREE_CONDUITS.map((conduit, idx) => {
                  const parent = nodeMap.get(conduit.from);
                  const child = nodeMap.get(conduit.to);
                  if (!parent || !child || !parent.treeX || !parent.treeY || !child.treeX || !child.treeY) return null;

                  const x1 = parent.treeX;
                  const y1 = parent.treeY;
                  const x2 = child.treeX;
                  const y2 = child.treeY;

                  const pathD = generateCurvedPath(x1, y1, x2, y2);

                  const isBothMastered = parent.status === 'mastered' && child.status === 'mastered';
                  const isInFlight = parent.status === 'mastered' && child.status === 'in_progress';
                  const isIlluminated = illuminatedAncestors.has(conduit.from) && illuminatedAncestors.has(conduit.to);
                  const isDimmed = selectedTier !== 'all' && (parent.tier !== selectedTier && child.tier !== selectedTier);

                  return (
                    <g key={idx} opacity={isDimmed ? 0.2 : 1} className="transition-opacity duration-300">
                      {/* Background blurred glow conduit */}
                      {(isIlluminated || isBothMastered || isInFlight) && (
                        <path
                          d={pathD}
                          fill="none"
                          stroke={isIlluminated ? '#f78d2c' : isBothMastered ? '#10b981' : '#a855f7'}
                          strokeWidth={isIlluminated ? "5" : "3.5"}
                          opacity={isIlluminated ? 0.75 : 0.35}
                          filter="url(#conduit-laser-glow)"
                        />
                      )}
                      {/* Foreground crisp energy line */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={
                          isIlluminated
                            ? '#f78d2c'
                            : isBothMastered
                            ? '#10b981'
                            : isInFlight
                            ? '#c084fc'
                            : 'rgba(255, 255, 255, 0.12)'
                        }
                        strokeWidth={isIlluminated ? 3 : isBothMastered ? 2.5 : isInFlight ? 2 : 1.5}
                        strokeDasharray={isInFlight && !isIlluminated ? '6 6' : undefined}
                      />
                    </g>
                  );
                })}
              </g>

              {/* 2. RENDER INTERACTIVE CELESTIAL NODE GLYPHS */}
              <g className="nodes-group">
                {treeState.nodes.map((node) => {
                  if (!node.treeX || !node.treeY) return null;
                  const x = node.treeX;
                  const y = node.treeY;
                  const isSelected = activeNode.id === node.id;
                  const isHovered = hoveredNodeId === node.id;
                  const isAncestor = illuminatedAncestors.has(node.id);
                  const isMastered = node.status === 'mastered';
                  const isInProgress = node.status === 'in_progress';
                  const isApex = node.id === 'antifragile_dynasty';
                  const isHub = node.id === 'quarter_crore_hub' || node.id === 'full_sovereign_fire';

                  const radius = isApex ? 34 : isHub ? 29 : 25;
                  const circumference = 2 * Math.PI * (radius + 3);
                  const progressOffset = circumference - (node.progressPercent / 100) * circumference;
                  const isDimmed = selectedTier !== 'all' && node.tier !== selectedTier;

                  // Wing category color
                  const wingColor = node.tier === 'tier1_survival' ? '#10b981' : node.tier === 'tier2_velocity' ? '#06b6d4' : '#f59e0b';

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${x}, ${y})`}
                      className="cursor-pointer transition-transform duration-200"
                      opacity={isDimmed ? 0.3 : 1}
                      onClick={() => {
                        setSelectedNodeId(node.id);
                        const freq = node.tier === 'tier1_survival' ? 440 : node.tier === 'tier2_velocity' ? 554 : 659;
                        playChime(freq);
                      }}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                    >
                      {/* Selected Outer Pulsing Halo */}
                      {isSelected && (
                        <circle
                          r={radius + 9}
                          fill="none"
                          stroke="#c084fc"
                          strokeWidth="2"
                          strokeDasharray="5 5"
                          opacity="0.9"
                          className="animate-spin-slow"
                        />
                      )}

                      {/* Hover / Prerequisite Ancestry Highlight Ring */}
                      {(isHovered || isAncestor) && !isSelected && (
                        <circle
                          r={radius + 7}
                          fill="none"
                          stroke={isAncestor ? '#f78d2c' : isMastered ? '#10b981' : '#38bdf8'}
                          strokeWidth={isAncestor ? "2.5" : "1.8"}
                          opacity={isAncestor ? 0.9 : 0.6}
                          strokeDasharray={isAncestor ? '4 4' : undefined}
                        />
                      )}

                      {/* Base Orb Circle */}
                      <circle
                        r={radius}
                        fill={
                          isSelected
                            ? '#1e1b4b'
                            : isMastered
                            ? '#062817'
                            : isInProgress
                            ? '#18122c'
                            : '#090d16'
                        }
                        stroke={
                          isSelected
                            ? '#c084fc'
                            : isAncestor
                            ? '#f78d2c'
                            : isMastered
                            ? '#10b981'
                            : isInProgress
                            ? '#a855f7'
                            : '#1e293b'
                        }
                        strokeWidth={isSelected ? '2.5' : isMastered ? '2' : '1.5'}
                      />

                      {/* Circular Progress Ring */}
                      <circle
                        r={radius + 3}
                        fill="none"
                        stroke={isMastered ? '#10b981' : isAncestor ? '#f78d2c' : wingColor}
                        strokeWidth="2.5"
                        strokeDasharray={circumference}
                        strokeDashoffset={progressOffset}
                        strokeLinecap="round"
                        transform="rotate(-90)"
                        opacity={node.progressPercent > 0 ? 0.95 : 0}
                      />

                      {/* Centered Node Icon */}
                      <foreignObject
                        x="-12"
                        y="-12"
                        width="24"
                        height="24"
                        className="pointer-events-none"
                      >
                        <div className="w-full h-full flex items-center justify-center text-primary">
                          {ICON_MAP[node.iconName] || <Award size={18} />}
                        </div>
                      </foreignObject>

                      {/* Mastered Checkmark Badge (Top-Right) */}
                      {isMastered ? (
                        <g transform={`translate(${radius - 5}, ${-radius + 5})`}>
                          <circle r="7" fill="#10b981" />
                          <path d="M -3.5 0 L -1 2.5 L 4 -2" fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
                        </g>
                      ) : isInProgress ? (
                        <g transform={`translate(${radius - 5}, ${-radius + 5})`}>
                          <circle r="6" fill="#a855f7" className="animate-pulse" />
                        </g>
                      ) : null}

                      {/* Crisp Short Title (Zero Collision) */}
                      <text
                        textAnchor="middle"
                        y={radius + 18}
                        fill={isSelected ? '#ffffff' : isMastered ? '#34d399' : '#f1f5f9'}
                        fontSize="11.5"
                        fontFamily="sans-serif"
                        fontWeight="700"
                      >
                        {node.shortLabel || node.title}
                      </text>

                      {/* Status / Metric Sub-Label */}
                      <text
                        textAnchor="middle"
                        y={radius + 31}
                        fill={isMastered ? '#10b981' : isInProgress ? '#c084fc' : '#64748b'}
                        fontSize="9.5"
                        fontFamily="monospace"
                        fontWeight="600"
                      >
                        {node.status === 'mastered' ? '✓ Mastered' : `${node.progressPercent}% · ${node.badge}`}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        )}

        {/* 4. VIEW MODE 2: TABBED ACTUARIAL MATRIX GRID */}
        {viewMode === 'matrix' && (
          <div className="skill-matrix-container">
            <div className="pill-segmented flex flex-wrap gap-1 w-full" role="tablist">
              <button
                type="button"
                className={`flex-1 py-1 font-mono text-xs ${selectedTier === 'all' ? 'pill-active' : ''}`}
                onClick={() => setSelectedTier('all')}
              >
                All Milestones ({treeState.unlockedCount}/15)
              </button>
              <button
                type="button"
                className={`flex-1 py-1 font-mono text-xs ${selectedTier === 'tier1_survival' ? 'pill-active' : ''}`}
                onClick={() => setSelectedTier('tier1_survival')}
              >
                🛡️ Citadel ({treeState.tier1MasteredCount}/5)
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

            <div className="skill-matrix-grid">
              {filteredNodes.map((node) => {
                const isSelected = activeNode.id === node.id;
                const isMastered = node.status === 'mastered';

                return (
                  <button
                    key={node.id}
                    type="button"
                    className={`skill-matrix-card ${isSelected ? 'selected' : ''} ${isMastered ? 'mastered' : ''}`}
                    onClick={() => {
                      setSelectedNodeId(node.id);
                      playChime(isMastered ? 660 : 440);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {ICON_MAP[node.iconName] || <Award size={16} />}
                      </div>
                      <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--ink-muted)' }}>
                        {node.badge}
                      </span>
                    </div>

                    <h4 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 700, color: '#f2f3f7' }}>{node.title}</h4>
                    <p style={{ margin: '0 0 8px', fontSize: '11px', color: 'var(--ink-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{node.description}</p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '10.5px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--ink-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.currentMetricLabel}</span>
                      <span style={{ fontWeight: 700, color: isMastered ? '#34d399' : '#c084fc' }}>
                        {isMastered ? '✓ Mastered' : `${node.progressPercent}%`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. VIEW MODE 3: RPG CHARACTER PERKS & LORE */}
        {viewMode === 'character_sheet' && (
          <div className="skill-perks-container">
            <div className="skill-perks-hero">
              <div>
                <span style={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#c084fc', display: 'block' }}>
                  Current Sovereign Title
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>{treeState.currentRank}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--ink-secondary)', maxWidth: '600px', lineHeight: 1.5 }}>
                  {RANK_LORE_PERKS[treeState.currentRank]?.lore || 'Sovereign financial architect.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyCharacterSheet}
                className="action-pill font-mono text-xs"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'rgba(255,255,255,0.1)', color: '#f2f3f7' }}
              >
                {copiedSheet ? <Check size={13} style={{ color: 'var(--colour-nebula)' }} /> : <Copy size={13} />}
                <span>{copiedSheet ? 'Scorecard Copied!' : 'Copy RPG Scorecard'}</span>
              </button>
            </div>

            <div style={{ marginTop: '12px' }}>
              <span style={{ fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-muted)', display: 'block', marginBottom: '8px' }}>
                Active Passive Perks Unlocked ({treeState.currentRankPerks.length})
              </span>
              <div className="skill-perks-grid">
                {treeState.currentRankPerks.map((perk, i) => (
                  <div key={i} className="skill-perk-item">
                    <CheckCircle2 size={16} style={{ color: 'var(--colour-nebula)', flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '12px', color: '#f2f3f7', lineHeight: 1.5 }}>{perk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

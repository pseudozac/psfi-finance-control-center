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
  Filter,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { FinancePlan, FinanceSummary } from '../types/finance';
import type { SkillTier, SkillNode } from '../types/skills';
import {
  calculateSkillTree,
  RANK_LORE_PERKS,
  SOVEREIGN_TREE_CONDUITS,
  getPrerequisiteAncestors,
} from '../lib/skillTree';
import { calculateSummary, formatINR } from '../lib/finance';

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
  ShieldAlert: <ShieldAlert size={16} className="text-corona" />,
  ShieldCheck: <ShieldCheck size={16} className="text-nebula" />,
  Umbrella: <Umbrella size={16} className="text-pulsar" />,
  HeartPulse: <HeartPulse size={16} className="text-solstice" />,
  Castle: <Castle size={16} className="text-quasar" />,
  Coins: <Coins size={16} className="text-solstice" />,
  PieChart: <PieChart size={16} className="text-pulsar" />,
  Zap: <Zap size={16} className="text-corona" />,
  Scale: <Scale size={16} className="text-quasar" />,
  TrendingUp: <TrendingUp size={16} className="text-nebula" />,
  Rocket: <Rocket size={16} className="text-quasar" />,
  Flame: <Flame size={16} className="text-corona" />,
  Anchor: <Anchor size={16} className="text-pulsar" />,
  Crown: <Crown size={16} className="text-solstice" />,
  Sparkles: <Sparkles size={16} className="text-quasar" />,
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
    // Ignore audio
  }
}

// Multi-tone victory arpeggio for What-If unlock or copying sheet
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

  const hoveredNode = useMemo(() => {
    return hoveredNodeId ? treeState.nodes.find((n) => n.id === hoveredNodeId) : null;
  }, [hoveredNodeId, treeState.nodes]);

  // Compute active highlighted prerequisite ancestry nodes for the hovered or selected node
  const activeInspectId = hoveredNodeId || selectedNodeId;
  const illuminatedAncestors = useMemo(() => {
    if (!activeInspectId) return new Set<string>();
    const ancestors = getPrerequisiteAncestors(activeInspectId, SOVEREIGN_TREE_CONDUITS);
    ancestors.add(activeInspectId);
    return ancestors;
  }, [activeInspectId]);

  // Map of nodes by ID for fast coordinate lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, SkillNode>();
    treeState.nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [treeState.nodes]);

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
      <div className={`modal-card skill-tree-modal ${isTheaterMode ? 'skill-tree-theater-mode' : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header flex items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="skill-tree-trophy-box shrink-0">
              <Crown size={18} className="text-solstice" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
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

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              className={`icon-pill shrink-0 ${isTheaterMode ? 'pill-active-mode' : ''}`}
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              title={isTheaterMode ? "Exit Fullscreen Theater Mode" : "Expand Fullscreen Theater Mode"}
            >
              {isTheaterMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button type="button" className="icon-pill shrink-0" onClick={onClose} title="Close (Esc)">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Global Progression Bar */}
        <div className="w-full bg-surface-overlay rounded-full h-2 my-2 overflow-hidden border border-subtle">
          <div
            className="h-full bg-gradient-to-r from-quasar via-pulsar to-nebula transition-all duration-500"
            style={{ width: `${treeState.overallMasteryPercent}%` }}
          />
        </div>

        {/* Mode Switcher Nav & Global Lever Status */}
        <div className="flex-between items-center gap-2 mb-2.5 flex-wrap">
          <div className="pill-segmented flex gap-1 text-xs font-mono">
            <button
              type="button"
              className={`px-3 py-1.5 flex-align gap-1.5 ${viewMode === 'visual_tree' ? 'pill-active' : ''}`}
              onClick={() => {
                setViewMode('visual_tree');
                playChime(480);
              }}
            >
              <GitBranch size={13} />
              <span>RPG Tech Tree</span>
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
              <span>Character Perks</span>
            </button>
          </div>

          {/* Quick Simulation Actions */}
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
            <div className="text-[11px] font-mono text-muted flex-align gap-1">
              <span>Interactive branching network · Click any node to inspect or simulate</span>
            </div>
          )}
        </div>

        {/* VIEW MODE 1 & 2: RPG Visual Tree or Matrix + Right Actuarial Drawer */}
        {viewMode !== 'character_sheet' ? (
          <div className="skill-tree-layout-grid">
            {/* Left Column: Interactive Tree Canvas or Matrix Grid */}
            <div className="skill-nodes-scroll-container">
              {viewMode === 'visual_tree' ? (
                /* =========================================================
                   TRUE VISUAL RPG SKILL TREE CANVAS (Star Wars Jedi / Thaumaturgy style)
                   ========================================================= */
                <div className="rpg-tree-canvas-card">
                  {/* Branch Filter Pills */}
                  <div className="flex-between items-center mb-2 px-2 py-1 bg-surface-page rounded-lg border border-subtle flex-wrap gap-1 text-xs font-mono">
                    <span className="flex-align gap-1 text-[11px] text-muted">
                      <Filter size={11} /> Filter Branch:
                    </span>
                    <div className="flex gap-1 flex-wrap">
                      <button
                        type="button"
                        className={`action-pill text-[10.5px] py-0.5 px-2 ${selectedTier === 'all' ? 'pill-active' : ''}`}
                        onClick={() => setSelectedTier('all')}
                      >
                        All Nodes ({treeState.unlockedCount}/15)
                      </button>
                      <button
                        type="button"
                        className={`action-pill text-[10.5px] py-0.5 px-2 ${selectedTier === 'tier1_survival' ? 'pill-active' : ''}`}
                        onClick={() => setSelectedTier('tier1_survival')}
                      >
                        🛡️ Defense Moat ({treeState.tier1MasteredCount}/5)
                      </button>
                      <button
                        type="button"
                        className={`action-pill text-[10.5px] py-0.5 px-2 ${selectedTier === 'tier2_velocity' ? 'pill-active' : ''}`}
                        onClick={() => setSelectedTier('tier2_velocity')}
                      >
                        ⚡ Velocity ({treeState.tier2MasteredCount}/5)
                      </button>
                      <button
                        type="button"
                        className={`action-pill text-[10.5px] py-0.5 px-2 ${selectedTier === 'tier3_autonomy' ? 'pill-active' : ''}`}
                        onClick={() => setSelectedTier('tier3_autonomy')}
                      >
                        👑 Autonomy Apex ({treeState.tier3MasteredCount}/5)
                      </button>
                    </div>
                  </div>

                  {/* SVG Canvas */}
                  <div className="rpg-tree-svg-container relative overflow-hidden rounded-xl border border-subtle bg-[#090d16]">
                    {/* Floating Thaumaturgy-style Glass HUD Inspector Card */}
                    {hoveredNode && hoveredNode.id !== activeNode.id && (
                      <div className="rpg-hud-floating-card pointer-events-none animate-fadeIn">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="rpg-hud-icon-box shrink-0">
                              {ICON_MAP[hoveredNode.iconName] || <Award size={14} />}
                            </div>
                            <div>
                              <span className="font-semibold text-xs text-primary block truncate">{hoveredNode.title}</span>
                              <span className="text-[10px] font-mono text-muted uppercase tracking-wider">{hoveredNode.badge}</span>
                            </div>
                          </div>
                          <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                            hoveredNode.status === 'mastered' ? 'bg-nebula/20 text-nebula border border-nebula/40' :
                            hoveredNode.status === 'in_progress' ? 'bg-quasar/20 text-quasar border border-quasar/40' :
                            'bg-white/5 text-muted border border-white/10'
                          }`}>
                            {hoveredNode.status === 'mastered' ? 'MASTERED' : hoveredNode.status === 'in_progress' ? `${hoveredNode.progressPercent}%` : 'LOCKED'}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted line-clamp-2 m-0 mb-1.5 leading-relaxed">{hoveredNode.description}</p>
                        <div className="flex items-center justify-between font-mono text-[10.5px] pt-1.5 border-t border-subtle">
                          <span className="text-secondary">{hoveredNode.currentMetricLabel}</span>
                          <span className="text-solstice">Target: {hoveredNode.targetMetricLabel}</span>
                        </div>
                      </div>
                    )}

                    <svg
                      viewBox="0 0 940 640"
                      className="w-full h-auto select-none block"
                      style={{ maxHeight: isTheaterMode ? '78vh' : '560px' }}
                    >
                      <defs>
                        {/* Blueprint Grid Pattern */}
                        <pattern id="tree-blueprint-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.025)" strokeWidth="1" />
                          <circle cx="40" cy="40" r="1.2" fill="rgba(191, 159, 241, 0.12)" />
                        </pattern>

                        {/* Mastered Gradient */}
                        <linearGradient id="grad-mastered" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#5ec491" />
                        </linearGradient>

                        {/* In-Flight Gradient */}
                        <linearGradient id="grad-progress" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#bf9ff1" />
                          <stop offset="100%" stopColor="#38bdf8" />
                        </linearGradient>

                        {/* Glow Filter */}
                        <filter id="node-glow" x="-30%" y="-30%" width="160%" height="160%">
                          <feGaussianBlur stdDeviation="4" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>

                      {/* Blueprint Grid Rect */}
                      <rect width="940" height="640" fill="url(#tree-blueprint-grid)" />

                      {/* Concentric Celestial Background Rings (Monster Hunter / Jedi style) */}
                      <circle cx="470" cy="580" r="180" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeDasharray="4 6" />
                      <circle cx="470" cy="580" r="340" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeDasharray="4 6" />
                      <circle cx="470" cy="580" r="500" fill="none" stroke="rgba(255, 255, 255, 0.025)" strokeDasharray="4 6" />

                      {/* Watermark Discipline Quadrants */}
                      <text x="70" y="495" fill="rgba(94, 196, 145, 0.16)" fontSize="11" fontFamily="monospace" fontWeight="700">
                        🛡️ DEFENSIVE MOAT WING
                      </text>
                      <text x="670" y="495" fill="rgba(56, 189, 248, 0.16)" fontSize="11" fontFamily="monospace" fontWeight="700">
                        ⚡ COMPOUNDING VELOCITY WING
                      </text>
                      <text x="360" y="40" fill="rgba(247, 141, 44, 0.22)" fontSize="11" fontFamily="monospace" fontWeight="700">
                        👑 SOVEREIGN AUTONOMY APEX
                      </text>

                      {/* 1. RENDER SVG CONDUITS (Parent to Child Links) */}
                      <g className="conduits-group">
                        {SOVEREIGN_TREE_CONDUITS.map((conduit, idx) => {
                          const parent = nodeMap.get(conduit.from);
                          const child = nodeMap.get(conduit.to);
                          if (!parent || !child || !parent.treeX || !parent.treeY || !child.treeX || !child.treeY) return null;

                          const x1 = parent.treeX;
                          const y1 = parent.treeY;
                          const x2 = child.treeX;
                          const y2 = child.treeY;

                          // Smooth cubic Bezier curve connecting parent to child
                          const dy = y2 - y1;
                          const pathD = `M ${x1} ${y1} C ${x1} ${y1 + dy * 0.45}, ${x2} ${y2 - dy * 0.45}, ${x2} ${y2}`;

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
                                  stroke={isIlluminated ? '#f78d2c' : isBothMastered ? '#5ec491' : '#38bdf8'}
                                  strokeWidth={isIlluminated ? "5" : "4"}
                                  opacity={isIlluminated ? 0.6 : 0.3}
                                  filter="url(#node-glow)"
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
                                    ? '#5ec491'
                                    : isInFlight
                                    ? '#bf9ff1'
                                    : 'rgba(255, 255, 255, 0.12)'
                                }
                                strokeWidth={isIlluminated ? 3 : isBothMastered ? 2.5 : isInFlight ? 2 : 1.5}
                                strokeDasharray={isInFlight && !isIlluminated ? '6 6' : undefined}
                                className={isInFlight && !isIlluminated ? 'animate-pulse' : undefined}
                              />
                            </g>
                          );
                        })}
                      </g>

                      {/* 2. RENDER INTERACTIVE CIRCULAR NODE GLYPHS */}
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
                          const radius = isApex ? 26 : isHub ? 23 : 20;
                          const circumference = 2 * Math.PI * (radius + 2);
                          const progressOffset = circumference - (node.progressPercent / 100) * circumference;

                          const isDimmed = selectedTier !== 'all' && node.tier !== selectedTier;

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
                              {/* Selected Outer Pulsing Aura */}
                              {isSelected && (
                                <circle
                                  r={radius + 8}
                                  fill="none"
                                  stroke="#bf9ff1"
                                  strokeWidth="2"
                                  strokeDasharray="4 4"
                                  opacity="0.85"
                                  className="animate-spin-slow"
                                />
                              )}

                              {/* Hover / Prerequisite Ancestry Highlight Ring */}
                              {(isHovered || isAncestor) && !isSelected && (
                                <circle
                                  r={radius + 6}
                                  fill="none"
                                  stroke={isAncestor ? '#f78d2c' : isMastered ? '#5ec491' : '#38bdf8'}
                                  strokeWidth={isAncestor ? "2" : "1.5"}
                                  opacity={isAncestor ? 0.75 : 0.5}
                                  strokeDasharray={isAncestor ? '3 3' : undefined}
                                />
                              )}

                              {/* Base Dark Orb Circle */}
                              <circle
                                r={radius}
                                fill={
                                  isSelected
                                    ? '#1e1b4b'
                                    : isMastered
                                    ? '#062817'
                                    : isInProgress
                                    ? '#18122c'
                                    : '#0f172a'
                                }
                                stroke={
                                  isSelected
                                    ? '#bf9ff1'
                                    : isAncestor
                                    ? '#f78d2c'
                                    : isMastered
                                    ? '#5ec491'
                                    : isInProgress
                                    ? '#a78bfa'
                                    : '#334155'
                                }
                                strokeWidth={isSelected ? '2.5' : isMastered ? '2' : '1.5'}
                              />

                              {/* Outer Circular Progress Meter */}
                              <circle
                                r={radius + 2}
                                fill="none"
                                stroke={isMastered ? '#10b981' : isAncestor ? '#f78d2c' : '#a855f7'}
                                strokeWidth="2.5"
                                strokeDasharray={circumference}
                                strokeDashoffset={progressOffset}
                                strokeLinecap="round"
                                transform="rotate(-90)"
                                opacity={node.progressPercent > 0 ? 0.9 : 0}
                              />

                              {/* Centered Node Icon */}
                              <foreignObject
                                x="-10"
                                y="-10"
                                width="20"
                                height="20"
                                className="pointer-events-none"
                              >
                                <div className="w-full h-full flex items-center justify-center text-primary">
                                  {ICON_MAP[node.iconName] || <Award size={15} />}
                                </div>
                              </foreignObject>

                              {/* Mini Status Badge Pip (Top-Right) */}
                              {isMastered ? (
                                <g transform={`translate(${radius - 4}, ${-radius + 4})`}>
                                  <circle r="6" fill="#10b981" />
                                  <path d="M -3 0 L -1 2 L 3 -2" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                                </g>
                              ) : isInProgress ? (
                                <g transform={`translate(${radius - 4}, ${-radius + 4})`}>
                                  <circle r="5" fill="#a855f7" className="animate-pulse" />
                                </g>
                              ) : null}

                              {/* Clean Short Label directly below without clunky bounding box */}
                              <text
                                textAnchor="middle"
                                y={radius + 14}
                                fill={isSelected ? '#ffffff' : isMastered ? '#5ec491' : '#94a3b8'}
                                fontSize="10"
                                fontFamily="sans-serif"
                                fontWeight="600"
                              >
                                {node.shortLabel || node.title}
                              </text>

                              {/* Metric Sub-Label */}
                              <text
                                textAnchor="middle"
                                y={radius + 25}
                                fill="#64748b"
                                fontSize="8.5"
                                fontFamily="monospace"
                              >
                                {node.progressPercent}%
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    </svg>
                  </div>
                </div>
              ) : (
                /* MATRIX VIEW: Classic Tabbed Grid */
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

            {/* Right Column: Node Actuarial Drawer + What-If Lever Simulator */}
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

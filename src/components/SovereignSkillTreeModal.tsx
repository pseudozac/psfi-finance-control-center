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
        style={{
          maxWidth: isTheaterMode ? '99vw' : '1420px',
          width: isTheaterMode ? '99vw' : '96vw',
          maxHeight: isTheaterMode ? '98vh' : '94vh',
          padding: '18px 22px',
        }}
      >
        {/* 1. TOP HEADER & RPG RANK BANNER */}
        <div className="flex items-center justify-between gap-3 w-full pb-2 border-b border-subtle">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-solstice/15 border border-solstice/40 flex items-center justify-center shrink-0 text-solstice shadow-lg shadow-solstice/10">
              <Crown size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="modal-title font-bold text-base sm:text-lg m-0 text-primary">
                  Sovereign Wealth RPG Constellation
                </h3>
                <span className="skill-rank-badge font-mono text-[11px] px-3 py-0.5 rounded-full font-bold">
                  {treeState.currentRank}
                </span>
                {simulatedPlan && (
                  <span className="font-mono text-[10px] bg-quasar/20 text-quasar px-2 py-0.5 rounded border border-quasar/40 animate-pulse">
                    🧪 What-If Active (+{treeState.overallMasteryPercent - realTreeState.overallMasteryPercent}%)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted mt-1 font-mono">
                <span>Mastered: <strong className="text-nebula">{treeState.unlockedCount}</strong> / 15 ({treeState.overallMasteryPercent}%)</span>
                <span>·</span>
                <span>Moat: <strong className="text-primary">{treeState.tier1MasteredCount}/5</strong></span>
                <span>·</span>
                <span>Velocity: <strong className="text-primary">{treeState.tier2MasteredCount}/5</strong></span>
                <span>·</span>
                <span>Autonomy: <strong className="text-primary">{treeState.tier3MasteredCount}/5</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              type="button"
              className={`action-pill font-mono text-xs flex items-center gap-1.5 py-1 px-3 ${isTheaterMode ? 'pill-active-mode' : ''}`}
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              title={isTheaterMode ? "Exit Fullscreen Theater Mode" : "Expand Fullscreen Theater Mode"}
            >
              {isTheaterMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span className="hidden sm:inline">{isTheaterMode ? 'Restore View' : 'Theater Mode'}</span>
            </button>
            <button
              type="button"
              className="icon-pill shrink-0 p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-primary transition-colors"
              onClick={onClose}
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. PROGRESSION & NAVIGATION BAR */}
        <div className="flex items-center justify-between gap-3 my-2.5 flex-wrap">
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
            <div className="flex items-center gap-1 text-xs font-mono flex-wrap">
              <span className="text-[11px] text-muted flex items-center gap-1 mr-1">
                <Filter size={11} /> Filter:
              </span>
              <button
                type="button"
                className={`action-pill text-[10.5px] py-0.5 px-2.5 ${selectedTier === 'all' ? 'pill-active' : ''}`}
                onClick={() => setSelectedTier('all')}
              >
                All Constellations (15)
              </button>
              <button
                type="button"
                className={`action-pill text-[10.5px] py-0.5 px-2.5 ${selectedTier === 'tier1_survival' ? 'pill-active' : ''}`}
                onClick={() => setSelectedTier('tier1_survival')}
              >
                🛡️ Citadel ({treeState.tier1MasteredCount}/5)
              </button>
              <button
                type="button"
                className={`action-pill text-[10.5px] py-0.5 px-2.5 ${selectedTier === 'tier2_velocity' ? 'pill-active' : ''}`}
                onClick={() => setSelectedTier('tier2_velocity')}
              >
                ⚡ Velocity ({treeState.tier2MasteredCount}/5)
              </button>
              <button
                type="button"
                className={`action-pill text-[10.5px] py-0.5 px-2.5 ${selectedTier === 'tier3_autonomy' ? 'pill-active' : ''}`}
                onClick={() => setSelectedTier('tier3_autonomy')}
              >
                👑 Autonomy ({treeState.tier3MasteredCount}/5)
              </button>
            </div>
          )}

          {/* Quick Simulation Levers */}
          {simulatedPlan && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                className="action-pill font-mono text-xs flex items-center gap-1 text-flare py-1 px-2.5"
                onClick={handleResetSimulation}
                title="Reset simulation back to live plan"
              >
                <RotateCcw size={11} /> Reset What-If
              </button>
              {onApplySimulatedPlan && (
                <button
                  type="button"
                  className="action-pill font-mono text-xs flex items-center gap-1 bg-nebula/20 text-nebula border-nebula/40 py-1 px-2.5"
                  onClick={handleCommitSimulation}
                  title="Permanently apply simulated milestone to live plan"
                >
                  <Check size={11} /> Apply to Dashboard
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3. VIEW MODE 1: VISUAL CELESTIAL STAR-CHART (100% FULL-WIDTH MAJESTY) */}
        {viewMode === 'visual_tree' && (
          <div className="relative w-full flex-1 min-h-[580px] max-h-[76vh] overflow-hidden rounded-2xl border border-subtle bg-[#060913] flex flex-col justify-center items-center shadow-inner">
            {/* FLOATING THAUMATURGY-STYLE GLASS HUD INSPECTOR CARD */}
            <div
              className={`absolute top-4 right-4 z-40 transition-all duration-300 rounded-2xl border border-subtle bg-[#0b0f1c]/90 backdrop-blur-xl shadow-2xl ${
                isDossierCollapsed ? 'w-auto p-2' : 'w-80 sm:w-96 p-4 max-h-[85%] overflow-y-auto'
              }`}
              style={{
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 20px rgba(191, 159, 241, 0.15)',
              }}
            >
              {isDossierCollapsed ? (
                <button
                  type="button"
                  onClick={() => setIsDossierCollapsed(false)}
                  className="flex items-center gap-2 text-xs font-mono font-semibold text-primary hover:text-white px-2 py-1"
                >
                  <div className="w-5 h-5 rounded-full bg-solstice/20 text-solstice flex items-center justify-center">
                    <ChevronRight size={13} />
                  </div>
                  <span>Inspect: {activeNode.shortLabel || activeNode.title}</span>
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-subtle">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-purple-900/30 border border-purple-500/40 flex items-center justify-center shrink-0">
                        {ICON_MAP[activeNode.iconName] || <Award size={18} />}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9.5px] font-mono text-muted uppercase tracking-wider block">
                          {activeNode.badge} · {activeNode.tier.replace('tier', 'TIER ').replace('_', ' ').toUpperCase()}
                        </span>
                        <h4 className="font-bold text-xs sm:text-sm text-primary m-0 truncate">
                          {activeNode.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => setIsDossierCollapsed(true)}
                        className="p-1 rounded text-muted hover:text-primary hover:bg-white/10"
                        title="Minimize Inspector"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      activeNode.status === 'mastered'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                        : activeNode.status === 'in_progress'
                        ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40'
                        : 'bg-slate-900 text-muted border border-slate-700'
                    }`}>
                      {activeNode.status === 'mastered' ? '✓ Mastered' : activeNode.status === 'in_progress' ? `In Flight (${activeNode.progressPercent}%)` : '🔒 Locked'}
                    </span>

                    <span className="font-mono text-xs font-semibold text-primary">
                      {activeNode.currentMetricLabel}
                    </span>
                  </div>

                  {/* Tactile Description */}
                  <p className="text-xs text-primary leading-relaxed m-0">
                    {activeNode.description}
                  </p>

                  {/* Actuarial Financial Law Quote */}
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-subtle">
                    <div className="flex items-center gap-1.5 mb-1 text-solstice font-mono text-[10.5px] font-semibold">
                      <Info size={12} />
                      <span>Actuarial Financial Law</span>
                    </div>
                    <p className="text-[11px] text-muted leading-relaxed m-0 italic">
                      &quot;{activeNode.actuarialPrinciple}&quot;
                    </p>
                  </div>

                  {/* Progress Bar & Gap */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-mono text-[10px] text-muted">
                      <span>Target: <strong className="text-primary">{activeNode.targetMetricLabel}</strong></span>
                      <span className="font-bold text-primary">{activeNode.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-subtle">
                      <div
                        className={`h-full transition-all duration-500 ${
                          activeNode.status === 'mastered'
                            ? 'bg-emerald-500'
                            : 'bg-gradient-to-r from-purple-500 to-cyan-500'
                        }`}
                        style={{ width: `${activeNode.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {activeNode.gapRupeesOrMonths && (
                    <div className="p-2 rounded-lg bg-corona/10 border border-corona/30 flex items-center justify-between font-mono text-xs">
                      <span className="text-corona font-semibold">Required:</span>
                      <span className="text-corona font-bold">{activeNode.gapRupeesOrMonths}</span>
                    </div>
                  )}

                  {/* Interactive What-If Simulation Button */}
                  {activeNode.suggestedAction && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleSimulateUnlock(activeNode)}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
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
              viewBox="0 0 1280 760"
              className="w-full h-full select-none block"
              style={{ maxHeight: isTheaterMode ? '82vh' : '640px' }}
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
              <rect width="1280" height="760" fill="url(#celestial-grid)" />

              {/* Concentric Astrolabe Background Rings (Jedi Fallen Order / PoE style) */}
              <circle cx="640" cy="720" r="180" fill="none" stroke="rgba(255, 255, 255, 0.035)" strokeDasharray="4 8" />
              <circle cx="640" cy="720" r="340" fill="none" stroke="rgba(255, 255, 255, 0.035)" strokeDasharray="4 8" />
              <circle cx="640" cy="720" r="500" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeDasharray="4 8" />
              <circle cx="640" cy="720" r="660" fill="none" stroke="rgba(255, 255, 255, 0.025)" strokeDasharray="4 8" />
              <circle cx="640" cy="720" r="820" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeDasharray="4 8" />

              {/* Faint Astrolabe Radial Ray Lines */}
              <line x1="640" y1="720" x2="200" y2="100" stroke="rgba(255, 255, 255, 0.015)" strokeDasharray="2 6" />
              <line x1="640" y1="720" x2="400" y2="40" stroke="rgba(255, 255, 255, 0.015)" strokeDasharray="2 6" />
              <line x1="640" y1="720" x2="640" y2="20" stroke="rgba(255, 255, 255, 0.02)" strokeDasharray="2 6" />
              <line x1="640" y1="720" x2="880" y2="40" stroke="rgba(255, 255, 255, 0.015)" strokeDasharray="2 6" />
              <line x1="640" y1="720" x2="1080" y2="100" stroke="rgba(255, 255, 255, 0.015)" strokeDasharray="2 6" />

              {/* Three Wing Constellation Headers */}
              <g transform="translate(180, 50)">
                <rect x="-10" y="-16" width="220" height="30" rx="15" fill="rgba(16, 185, 129, 0.08)" stroke="rgba(16, 185, 129, 0.25)" />
                <text x="100" y="4" textAnchor="middle" fill="#10b981" fontSize="11" fontFamily="monospace" fontWeight="bold" letterSpacing="0.08em">
                  🛡️ DEFENSIVE CITADEL
                </text>
              </g>

              <g transform="translate(530, 50)">
                <rect x="-10" y="-16" width="220" height="30" rx="15" fill="rgba(6, 182, 212, 0.08)" stroke="rgba(6, 182, 212, 0.25)" />
                <text x="100" y="4" textAnchor="middle" fill="#06b6d4" fontSize="11" fontFamily="monospace" fontWeight="bold" letterSpacing="0.08em">
                  ⚡ COMPOUNDING VELOCITY
                </text>
              </g>

              <g transform="translate(930, 50)">
                <rect x="-10" y="-16" width="220" height="30" rx="15" fill="rgba(245, 158, 11, 0.08)" stroke="rgba(245, 158, 11, 0.25)" />
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
          <div className="flex-1 overflow-y-auto pt-2 space-y-3">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredNodes.map((node) => {
                const isSelected = activeNode.id === node.id;
                const isMastered = node.status === 'mastered';
                const isInProgress = node.status === 'in_progress';

                return (
                  <button
                    key={node.id}
                    type="button"
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/80 ring-1 ring-purple-500/50'
                        : isMastered
                        ? 'bg-[#062817]/40 border-emerald-700/40 hover:bg-[#062817]/70'
                        : isInProgress
                        ? 'bg-slate-900/60 border-subtle hover:bg-slate-900/90'
                        : 'bg-slate-950/40 border-subtle/50 opacity-60'
                    }`}
                    onClick={() => {
                      setSelectedNodeId(node.id);
                      playChime(isMastered ? 660 : 440);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        {ICON_MAP[node.iconName] || <Award size={16} />}
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/5 text-muted">
                        {node.badge}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-primary mb-1 block truncate">{node.title}</h4>
                    <p className="text-[11px] text-muted line-clamp-2 leading-relaxed mb-2">{node.description}</p>

                    <div className="flex items-center justify-between font-mono text-[10.5px] pt-2 border-t border-subtle">
                      <span className="text-secondary truncate pr-1">{node.currentMetricLabel}</span>
                      <span className={`font-bold ${isMastered ? 'text-emerald-400' : 'text-purple-400'}`}>
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
          <div className="flex-1 overflow-y-auto pt-3 space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/30 to-indigo-950/30 border border-purple-500/30 flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-purple-300 block">
                  Current Sovereign Title
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5">{treeState.currentRank}</h3>
                <p className="text-xs text-muted mt-1 max-w-xl">
                  {RANK_LORE_PERKS[treeState.currentRank]?.lore || 'Sovereign financial architect.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyCharacterSheet}
                className="action-pill font-mono text-xs flex items-center gap-1.5 py-2 px-3 bg-white/10 text-primary hover:text-white"
              >
                {copiedSheet ? <Check size={13} className="text-nebula" /> : <Copy size={13} />}
                <span>{copiedSheet ? 'Scorecard Copied!' : 'Copy RPG Scorecard'}</span>
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-wider text-muted block">
                Active Passive Perks Unlocked ({treeState.currentRankPerks.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {treeState.currentRankPerks.map((perk, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-900/40 border border-subtle flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-nebula shrink-0 mt-0.5" />
                    <span className="text-xs text-primary leading-relaxed">{perk}</span>
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

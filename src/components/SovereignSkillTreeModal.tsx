import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  RefreshCw,
} from 'lucide-react';
import type { FinancePlan, FinanceSummary } from '../types/finance';
import type { SkillTier, SkillNode, SovereignBadge } from '../types/skills';
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

type ViewMode = 'visual_tree' | 'matrix' | 'badges' | 'character_sheet';

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
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'in_progress' | 'locked'>('all');
  const [selectedTier, setSelectedTier] = useState<SkillTier | 'all'>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('debt_elimination');
  const [simulatedPlan, setSimulatedPlan] = useState<FinancePlan | null>(null);
  const [copiedSheet, setCopiedSheet] = useState<boolean>(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [isDossierCollapsed, setIsDossierCollapsed] = useState<boolean>(false);
  
  // Dynamic Responsive Window State & Astrolabe ViewBox (frames constellation mathematically across any screen)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;

  // ViewBox bounds include the new status tags beneath the lowest node.
  // Optimal full view: Center X = 720, Center Y = 430
  const DEFAULT_VIEWBOX = useMemo(() => {
    if (isMobile) {
      return { x: 180, y: 20, w: 920, h: 800 };
    }
    return { x: 110, y: 0, w: 1220, h: 860 };
  }, [isMobile]);

  const CITADEL_VIEWBOX = useMemo(() => ({ x: 130, y: 180, w: 620, h: 630 }), []);
  const VELOCITY_VIEWBOX = useMemo(() => ({ x: 340, y: 80, w: 660, h: 710 }), []);
  const AUTONOMY_VIEWBOX = useMemo(() => ({ x: 620, y: 40, w: 720, h: 750 }), []);

  // Strict clamp prevents astrolabe from flying off-screen or creating infinite black voids
  const clampViewBox = (vb: { x: number; y: number; w: number; h: number }) => {
    const minW = 380;
    const maxW = 1440;
    const minH = 280;
    const maxH = 920;
    const clampedW = Math.max(minW, Math.min(maxW, vb.w));
    const clampedH = Math.max(minH, Math.min(maxH, vb.h));

    const minX = -40;
    const maxX = 1480 - clampedW;
    const minY = -20;
    const maxY = 860 - clampedH;

    const clampedX = Math.max(minX, Math.min(maxX, vb.x));
    const clampedY = Math.max(minY, Math.min(maxY, vb.y));

    return { x: clampedX, y: clampedY, w: clampedW, h: clampedH };
  };

  const [viewBox, setViewBox] = useState<{ x: number; y: number; w: number; h: number }>(DEFAULT_VIEWBOX);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; vbX: number; vbY: number }>({ clientX: 0, clientY: 0, vbX: 0, vbY: 0 });
  const dragDistanceRef = useRef<number>(0);
  const svgRef = useRef<SVGSVGElement>(null);

  // Auto-center and reset to fit whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setViewBox(DEFAULT_VIEWBOX);
      setSelectedTier('all');
      setIsDossierCollapsed(isMobile);
    }
  }, [isOpen, DEFAULT_VIEWBOX, isMobile]);

  // Mobile Hardware / Browser Back button dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handlePop = () => {
      onClose();
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [isOpen, onClose]);

  // Focus view on wing
  const handleFilterTier = (tier: SkillTier | 'all') => {
    setSelectedTier(tier);
    if (tier === 'tier1_survival') {
      setViewBox(clampViewBox(CITADEL_VIEWBOX));
      playChime(440);
    } else if (tier === 'tier2_velocity') {
      setViewBox(clampViewBox(VELOCITY_VIEWBOX));
      playChime(554);
    } else if (tier === 'tier3_autonomy') {
      setViewBox(clampViewBox(AUTONOMY_VIEWBOX));
      playChime(659);
    } else {
      setViewBox(clampViewBox(DEFAULT_VIEWBOX));
      playChime(520);
    }
  };

  const handleZoomIn = () => {
    setViewBox((prev) => {
      const zoomFactor = 0.8;
      const nextW = prev.w * zoomFactor;
      const nextH = prev.h * zoomFactor;
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      return clampViewBox({ x: cx - nextW / 2, y: cy - nextH / 2, w: nextW, h: nextH });
    });
    playChime(600);
  };

  const handleZoomOut = () => {
    setViewBox((prev) => {
      const zoomFactor = 1.25;
      const nextW = prev.w * zoomFactor;
      const nextH = prev.h * zoomFactor;
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      return clampViewBox({ x: cx - nextW / 2, y: cy - nextH / 2, w: nextW, h: nextH });
    });
    playChime(420);
  };

  const handleResetFit = () => {
    setViewBox(clampViewBox(DEFAULT_VIEWBOX));
    setSelectedTier('all');
    playChime(480);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      vbX: viewBox.x,
      vbY: viewBox.y,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;

    const dx = (e.clientX - dragStartRef.current.clientX) * scaleX;
    const dy = (e.clientY - dragStartRef.current.clientY) * scaleY;

    dragDistanceRef.current += Math.hypot(e.movementX, e.movementY);

    setViewBox((prev) => clampViewBox({
      ...prev,
      x: dragStartRef.current.vbX - dx,
      y: dragStartRef.current.vbY - dy,
    }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
    setViewBox((prev) => {
      const nextW = prev.w * zoomFactor;
      const nextH = prev.h * zoomFactor;
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      return clampViewBox({ x: cx - nextW / 2, y: cy - nextH / 2, w: nextW, h: nextH });
    });
  };

  const handleNodeClick = (node: SkillNode) => {
    if (dragDistanceRef.current > 8) return;
    setSelectedNodeId(node.id);
    setIsDossierCollapsed(false);
    const freq = node.tier === 'tier1_survival' ? 440 : node.tier === 'tier2_velocity' ? 554 : 659;
    playChime(freq);

    if (node.treeX && node.treeY) {
      setViewBox((prev) => {
        const targetW = Math.min(prev.w, 750);
        const targetH = (targetW / prev.w) * prev.h;
        return clampViewBox({
          x: node.treeX! - targetW / 2,
          y: node.treeY! - targetH / 2,
          w: targetW,
          h: targetH,
        });
      });
    }
  };

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

  const filteredBadges = useMemo(() => {
    if (badgeFilter === 'unlocked') return treeState.badges.filter((b) => b.isUnlocked);
    if (badgeFilter === 'in_progress') return treeState.badges.filter((b) => !b.isUnlocked && b.progressPercent > 0);
    if (badgeFilter === 'locked') return treeState.badges.filter((b) => !b.isUnlocked && b.progressPercent === 0);
    return treeState.badges;
  }, [treeState.badges, badgeFilter]);

  // Simulate unlock action for a badge
  const handleSimulateBadge = (badge: SovereignBadge) => {
    if (!badge.suggestedAction) return;
    const cloned: FinancePlan = JSON.parse(JSON.stringify(plan));
    const [section, field] = badge.suggestedAction.field.split('.');

    if (section && field) {
      // @ts-expect-error dynamic path assignment for simulation
      if (cloned[section]) cloned[section][field] = badge.suggestedAction.targetValue;
    }

    setSimulatedPlan(cloned);
    playFanfare();
  };

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
          <div className="skill-tree-header-left">
            <div className="skill-tree-crown-box">
              <Crown size={20} />
            </div>

            <div className="skill-tree-header-info">
              <div className="skill-tree-title-row">
                <h3 className="modal-title skill-tree-title">
                  Sovereign Wealth RPG Constellation
                </h3>
                <span className="skill-rank-badge">
                  {treeState.currentRank}
                </span>
                <span className="skill-level-pill font-mono">
                  ⭐ Lvl {treeState.level} · {treeState.levelTitle}
                </span>
                {simulatedPlan && (
                  <span className="skill-sim-pill font-mono">
                    🧪 What-If Active (+{treeState.overallMasteryPercent - realTreeState.overallMasteryPercent}%)
                  </span>
                )}
              </div>

              <div className="skill-tree-stats-row font-mono">
                <span className="stat-pill">Mastered: <strong className="text-nebula">{treeState.unlockedCount}</strong>/15 ({treeState.overallMasteryPercent}%)</span>
                <span className="stat-pill">🏆 Badges: <strong className="text-solstice">{treeState.unlockedBadgesCount}</strong>/14</span>
                <span className="stat-pill">✨ XP: <strong className="text-solstice">{treeState.totalXP}</strong>/{treeState.nextLevelXP}</span>
                <span className="stat-pill">🛡️ Moat: <strong>{treeState.tier1MasteredCount}/5</strong></span>
                <span className="stat-pill">⚡ Velocity: <strong>{treeState.tier2MasteredCount}/5</strong></span>
                <span className="stat-pill">👑 Autonomy: <strong>{treeState.tier3MasteredCount}/5</strong></span>
              </div>
            </div>
          </div>

          <div className="skill-tree-header-right">
            <button
              type="button"
              className={`action-pill font-mono text-xs skill-tree-theater-btn ${isTheaterMode ? 'pill-active-mode' : ''}`}
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              title={isTheaterMode ? "Exit Fullscreen Theater Mode" : "Expand Fullscreen Theater Mode"}
            >
              {isTheaterMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isTheaterMode ? 'Restore View' : 'Theater Mode'}</span>
            </button>
            <button
              type="button"
              className="icon-pill"
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
          <div className="pill-segmented skill-tree-tabs flex gap-1 text-xs font-mono">
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
              className={`px-3 py-1 flex items-center gap-1.5 ${viewMode === 'badges' ? 'pill-active' : ''}`}
              onClick={() => {
                setViewMode('badges');
                playChime(520);
              }}
            >
              <Award size={13} />
              <span>Trophy Hall ({treeState.unlockedBadgesCount}/{treeState.badges.length})</span>
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
          <div className="skill-tree-split-viewport">
            {/* LEFT DOCKED THAUMATURGY GRIMOIRE / NODE DOSSIER */}
            <aside className={`skill-tree-dossier-dock ${isDossierCollapsed ? 'dossier-collapsed' : ''}`} aria-label="Skill Node Inspector">
              {isDossierCollapsed ? (
                <button
                  type="button"
                  onClick={() => setIsDossierCollapsed(false)}
                  className="dossier-expand-btn"
                  title="Expand Dossier Inspector"
                >
                  {isMobile ? <ChevronUp size={15} className="dossier-chevron-icon" /> : <ChevronRight size={16} className="dossier-chevron-icon" />}
                  <span className={isMobile ? "dossier-horizontal-label" : "dossier-vertical-label"}>✦ DOSSIER: {activeNode.title}</span>
                  {isMobile && <span className="dossier-mobile-open-pill">TAP TO VIEW</span>}
                </button>
              ) : (
                <div className="dossier-content-scroll">
                  {isMobile && (
                    <div className="dossier-mobile-sheet-bar" onClick={() => setIsDossierCollapsed(true)}>
                      <div className="dossier-mobile-pull-handle" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setIsDossierCollapsed(true); }}
                        className="dossier-sheet-close-btn"
                        title="Dismiss Dossier Sheet"
                      >
                        <ChevronDown size={14} /> Close Dossier
                      </button>
                    </div>
                  )}
                  {/* Card Header */}
                  <div className="skill-tree-hud-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <div className="skill-tree-hud-icon">
                        {ICON_MAP[activeNode.iconName] || <Award size={18} />}
                      </div>
                      <div style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
                        <span style={{ fontSize: '9.5px', fontFamily: 'monospace', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
                          {activeNode.badge} · {activeNode.tier.replace('tier', 'TIER ').replace('_', ' ').toUpperCase()}
                        </span>
                        <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#f2f3f7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {activeNode.title}
                        </h4>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsDossierCollapsed(true)}
                      className="icon-pill dossier-collapse-btn"
                      style={{ padding: '6px', borderRadius: '8px', color: 'var(--ink-muted)', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                      title="Collapse Dossier"
                    >
                      <ChevronDown size={15} className="dossier-collapse-icon" />
                    </button>
                  </div>

                  {/* Status & Evidence Banner */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: '9999px',
                        textTransform: 'uppercase',
                        background: activeNode.status === 'mastered' ? 'rgba(16, 185, 129, 0.2)' : activeNode.status === 'in_progress' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                        color: activeNode.status === 'mastered' ? '#34d399' : activeNode.status === 'in_progress' ? '#c084fc' : 'var(--ink-muted)',
                        border: `1px solid ${activeNode.status === 'mastered' ? 'rgba(16, 185, 129, 0.4)' : activeNode.status === 'in_progress' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                      }}>
                        {activeNode.status === 'mastered' ? '✓ Mastered' : activeNode.status === 'in_progress' ? `In Flight (${activeNode.progressPercent}%)` : '🔒 Locked'}
                      </span>

                      {/* Evidence Integrity Badge */}
                      <span style={{
                        fontSize: '9px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        background: activeNode.evidenceType === 'verified'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : activeNode.evidenceType === 'budgeted'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(6, 182, 212, 0.15)',
                        color: activeNode.evidenceType === 'verified'
                          ? '#34d399'
                          : activeNode.evidenceType === 'budgeted'
                          ? '#fbbf24'
                          : '#22d3ee',
                        border: `1px solid ${activeNode.evidenceType === 'verified'
                          ? 'rgba(16, 185, 129, 0.35)'
                          : activeNode.evidenceType === 'budgeted'
                          ? 'rgba(245, 158, 11, 0.35)'
                          : 'rgba(6, 182, 212, 0.35)'}`,
                      }}>
                        [{activeNode.evidenceType.toUpperCase()}]
                      </span>
                    </div>

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
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '10px', color: 'var(--ink-muted)', marginBottom: '4px' }}>
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

                  {/* Strategic Action Step */}
                  <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', margin: '10px 0', fontSize: '11px', color: 'var(--ink-secondary)', lineHeight: 1.4 }}>
                    <strong style={{ color: '#f2f3f7', display: 'block', marginBottom: '2px' }}>Strategic Playbook:</strong>
                    {activeNode.actionableStep}
                  </div>

                  {/* Evidence & Verification Audit */}
                  <div style={{ padding: '9px 11px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', margin: '8px 0', fontSize: '11px', color: 'var(--ink-secondary)', lineHeight: 1.4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 700, color: '#f2f3f7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Evidence &amp; Audit Trail
                      </span>
                      <span style={{
                        fontSize: '9px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        background: activeNode.evidenceType === 'verified'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : activeNode.evidenceType === 'budgeted'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(6, 182, 212, 0.15)',
                        color: activeNode.evidenceType === 'verified'
                          ? '#34d399'
                          : activeNode.evidenceType === 'budgeted'
                          ? '#fbbf24'
                          : '#22d3ee',
                        border: `1px solid ${activeNode.evidenceType === 'verified'
                          ? 'rgba(16, 185, 129, 0.35)'
                          : activeNode.evidenceType === 'budgeted'
                          ? 'rgba(245, 158, 11, 0.35)'
                          : 'rgba(6, 182, 212, 0.35)'}`,
                      }}>
                        [{activeNode.evidenceType.toUpperCase()}]
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '10.5px', color: 'var(--ink-muted)' }}>
                      {activeNode.evidenceDescription}
                    </p>
                  </div>

                  {/* Insurance Policy Coverage Details (when present) */}
                  {activeNode.policyDetails && (
                    <div style={{ padding: '9px 11px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(168, 85, 247, 0.25)', margin: '8px 0', fontSize: '11px', lineHeight: 1.4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ color: '#c084fc', fontSize: '10.5px', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                          Policy Coverage Specifications
                        </strong>
                        <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', padding: '1px 5px', borderRadius: '3px' }}>
                          UNVERIFIED POLICY SCHEDULE
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3px', fontSize: '10.5px', color: 'var(--ink-secondary)', fontFamily: 'monospace' }}>
                        <div><span style={{ color: 'var(--ink-muted)' }}>Required Type: </span><span style={{ color: '#f2f3f7' }}>{activeNode.policyDetails.policyType}</span></div>
                        <div><span style={{ color: 'var(--ink-muted)' }}>Target Coverage: </span><span style={{ color: '#34d399', fontWeight: 700 }}>{activeNode.policyDetails.targetCoverage}</span></div>
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: '10px', color: 'var(--ink-muted)', lineHeight: 1.3 }}>
                        <strong>Integrity Verification: </strong>{activeNode.policyDetails.verificationRequirements}
                      </p>
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
            </aside>

            {/* RIGHT PANE: 100% UNOBSTRUCTED SVG ASTROLABE STAR-CHART */}
            <main
              className="skill-tree-canvas-panel"
              aria-label="Constellation Astrolabe Star-Chart"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onWheel={handleWheel}
            >
              {/* Floating Tactical Astrolabe HUD */}
              <div
                className="astrolabe-floating-hud"
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'rgba(10, 14, 26, 0.94)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  borderRadius: '999px',
                }}
              >
                <div className="hud-wings-cluster">
                  <button
                    type="button"
                    className={`hud-pill ${selectedTier === 'all' ? 'active' : ''}`}
                    onClick={() => handleFilterTier('all')}
                    style={{
                      background: selectedTier === 'all' ? 'rgba(124, 79, 217, 0.35)' : 'rgba(255, 255, 255, 0.06)',
                      border: selectedTier === 'all' ? '1px solid rgba(191, 159, 241, 0.75)' : '1px solid rgba(255, 255, 255, 0.12)',
                      color: selectedTier === 'all' ? '#ffffff' : '#cbd5e1',
                    }}
                    title="Full Constellation (15 Nodes)"
                  >
                    <span>🌌 All</span>
                  </button>
                  <button
                    type="button"
                    className={`hud-pill hud-pill-citadel ${selectedTier === 'tier1_survival' ? 'active' : ''}`}
                    onClick={() => handleFilterTier('tier1_survival')}
                    style={{
                      background: selectedTier === 'tier1_survival' ? 'rgba(16, 185, 129, 0.28)' : 'rgba(255, 255, 255, 0.06)',
                      border: selectedTier === 'tier1_survival' ? '1px solid rgba(16, 185, 129, 0.75)' : '1px solid rgba(255, 255, 255, 0.12)',
                      color: selectedTier === 'tier1_survival' ? '#6ee7b7' : '#cbd5e1',
                    }}
                    title="Focus Defensive Citadel (5 Nodes)"
                  >
                    <span>🛡️ Citadel</span>
                    <span className="hud-pill-badge font-mono text-[9.5px] opacity-80">({treeState.tier1MasteredCount}/5)</span>
                  </button>
                  <button
                    type="button"
                    className={`hud-pill hud-pill-velocity ${selectedTier === 'tier2_velocity' ? 'active' : ''}`}
                    onClick={() => handleFilterTier('tier2_velocity')}
                    style={{
                      background: selectedTier === 'tier2_velocity' ? 'rgba(6, 182, 212, 0.28)' : 'rgba(255, 255, 255, 0.06)',
                      border: selectedTier === 'tier2_velocity' ? '1px solid rgba(6, 182, 212, 0.75)' : '1px solid rgba(255, 255, 255, 0.12)',
                      color: selectedTier === 'tier2_velocity' ? '#67e8f9' : '#cbd5e1',
                    }}
                    title="Focus Compounding Velocity (5 Nodes)"
                  >
                    <span>⚡ Velocity</span>
                    <span className="hud-pill-badge font-mono text-[9.5px] opacity-80">({treeState.tier2MasteredCount}/5)</span>
                  </button>
                  <button
                    type="button"
                    className={`hud-pill hud-pill-autonomy ${selectedTier === 'tier3_autonomy' ? 'active' : ''}`}
                    onClick={() => handleFilterTier('tier3_autonomy')}
                    style={{
                      background: selectedTier === 'tier3_autonomy' ? 'rgba(245, 158, 11, 0.28)' : 'rgba(255, 255, 255, 0.06)',
                      border: selectedTier === 'tier3_autonomy' ? '1px solid rgba(245, 158, 11, 0.75)' : '1px solid rgba(255, 255, 255, 0.12)',
                      color: selectedTier === 'tier3_autonomy' ? '#fcd34d' : '#cbd5e1',
                    }}
                    title="Focus Sovereign Autonomy (5 Nodes)"
                  >
                    <span>👑 Autonomy</span>
                    <span className="hud-pill-badge font-mono text-[9.5px] opacity-80">({treeState.tier3MasteredCount}/5)</span>
                  </button>
                </div>

                <div className="hud-zoom-cluster">
                  <button
                    type="button"
                    className="hud-icon-btn"
                    onClick={handleZoomIn}
                    style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.14)', color: '#ffffff' }}
                    title="Zoom In (+)"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    type="button"
                    className="hud-icon-btn"
                    onClick={handleZoomOut}
                    style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.14)', color: '#ffffff' }}
                    title="Zoom Out (-)"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <button
                    type="button"
                    className="hud-icon-btn"
                    onClick={handleResetFit}
                    style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.14)', color: '#ffffff' }}
                    title="Reset to Fit (⛶)"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
              </div>

              <svg
                ref={svgRef}
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                className="skill-tree-svg"
                preserveAspectRatio="xMidYMid meet"
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
                <rect width="1440" height="820" fill="url(#celestial-grid)" />

                {/* Concentric Astrolabe Background Rings (Centered at Root x=680, y=740) */}
                <circle cx="680" cy="740" r="180" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="4 8" />
                <circle cx="680" cy="740" r="340" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="4 8" />
                <circle cx="680" cy="740" r="500" fill="none" stroke="rgba(255, 255, 255, 0.035)" strokeDasharray="4 8" />
                <circle cx="680" cy="740" r="660" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeDasharray="4 8" />
                <circle cx="680" cy="740" r="820" fill="none" stroke="rgba(255, 255, 255, 0.025)" strokeDasharray="4 8" />

                {/* Faint Astrolabe Radial Ray Lines from Root (680, 740) */}
                <line x1="680" y1="740" x2="220" y2="60" stroke="rgba(255, 255, 255, 0.02)" strokeDasharray="2 6" />
                <line x1="680" y1="740" x2="440" y2="40" stroke="rgba(255, 255, 255, 0.02)" strokeDasharray="2 6" />
                <line x1="680" y1="740" x2="680" y2="20" stroke="rgba(255, 255, 255, 0.025)" strokeDasharray="2 6" />
                <line x1="680" y1="740" x2="940" y2="40" stroke="rgba(255, 255, 255, 0.02)" strokeDasharray="2 6" />
                <line x1="680" y1="740" x2="1200" y2="60" stroke="rgba(255, 255, 255, 0.02)" strokeDasharray="2 6" />

                {/* Three Wing Constellation Headers */}
                <g transform="translate(190, 42)">
                  <rect x="-10" y="-16" width="220" height="30" rx="15" fill="rgba(16, 185, 129, 0.1)" stroke="rgba(16, 185, 129, 0.3)" />
                  <text x="100" y="4" textAnchor="middle" fill="#10b981" fontSize="11" fontFamily="monospace" fontWeight="bold" letterSpacing="0.08em">
                    🛡️ DEFENSIVE CITADEL
                  </text>
                </g>

                <g transform="translate(570, 42)">
                  <rect x="-10" y="-16" width="220" height="30" rx="15" fill="rgba(6, 182, 212, 0.1)" stroke="rgba(6, 182, 212, 0.3)" />
                  <text x="100" y="4" textAnchor="middle" fill="#06b6d4" fontSize="11" fontFamily="monospace" fontWeight="bold" letterSpacing="0.08em">
                    ⚡ COMPOUNDING VELOCITY
                  </text>
                </g>

                <g transform="translate(980, 42)">
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
                    const isHub = node.id === 'quarter_crore_hub' || node.id === 'debt_elimination';

                    const radius = isApex ? 38 : isHub ? 34 : 30;
                    const circumference = 2 * Math.PI * (radius + 3);
                    const progressOffset = circumference - (node.progressPercent / 100) * circumference;
                    const isDimmed = selectedTier !== 'all' && node.tier !== selectedTier;
                    const nodeLabel = node.shortLabel || node.title;
                    const labelWidth = Math.min(176, Math.max(112, nodeLabel.length * 8.6 + 24));
                    const statusLabel = isMastered
                      ? 'MASTERED · 100%'
                      : isInProgress
                      ? `IN PROGRESS · ${node.progressPercent}%`
                      : `LOCKED · ${node.progressPercent}%`;

                    // Wing category color
                    const wingColor = node.tier === 'tier1_survival' ? '#10b981' : node.tier === 'tier2_velocity' ? '#06b6d4' : '#f59e0b';

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${x}, ${y})`}
                        className={`skill-constellation-node cursor-pointer transition-transform duration-200 ${isSelected ? 'is-selected' : ''} ${isMastered ? 'is-mastered' : ''} ${isInProgress ? 'is-in-progress' : ''}`}
                        opacity={isDimmed ? 0.3 : 1}
                        role="button"
                        tabIndex={0}
                        aria-label={`${node.title}. ${statusLabel}. ${node.currentMetricLabel}; target ${node.targetMetricLabel}.`}
                        onClick={() => handleNodeClick(node)}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        onFocus={() => setHoveredNodeId(node.id)}
                        onBlur={() => setHoveredNodeId(null)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleNodeClick(node);
                          }
                        }}
                      >
                        <title>{`${node.title} — ${statusLabel}. ${node.currentMetricLabel}; target ${node.targetMetricLabel}.`}</title>

                        {/* Soft tier-colored bloom makes node state visible without muddying the chart. */}
                        <circle
                          r={radius + 8}
                          fill={isMastered ? '#10b981' : isInProgress ? '#a855f7' : wingColor}
                          opacity={isMastered ? 0.12 : isInProgress ? 0.1 : 0.055}
                        />

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
                          opacity={isMastered ? 0.95 : node.progressPercent > 0 ? 0.88 : 0.42}
                        />

                        {/* Centered Node Icon */}
                        <foreignObject
                          x="-14"
                          y="-14"
                          width="28"
                          height="28"
                          className="pointer-events-none"
                        >
                          <div className="w-full h-full flex items-center justify-center text-primary">
                            {ICON_MAP[node.iconName] || <Award size={20} />}
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

                        {/* Contrast-backed labels stay readable against the star field. */}
                        <rect
                          x={-labelWidth / 2}
                          y={radius + 10}
                          width={labelWidth}
                          height="42"
                          rx="10"
                          fill="rgba(7, 11, 22, 0.94)"
                          stroke={isSelected ? '#c084fc' : wingColor}
                          strokeOpacity={isSelected ? 0.82 : 0.42}
                          strokeWidth={isSelected ? 1.5 : 1}
                        />

                        <text
                          textAnchor="middle"
                          y={radius + 28}
                          fill={isSelected ? '#ffffff' : '#f8fafc'}
                          fontSize="15"
                          fontFamily="sans-serif"
                          fontWeight="700"
                        >
                          {nodeLabel}
                        </text>

                        <text
                          textAnchor="middle"
                          y={radius + 44}
                          fill={isMastered ? '#6ee7b7' : isInProgress ? '#d8b4fe' : '#cbd5e1'}
                          fontSize="10.5"
                          fontFamily="monospace"
                          fontWeight="700"
                        >
                          {statusLabel}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </main>
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
                const wingColor = node.tier === 'tier1_survival' ? '#10b981' : node.tier === 'tier2_velocity' ? '#06b6d4' : '#f59e0b';

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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: wingColor }}>
                          {ICON_MAP[node.iconName] || <Award size={16} />}
                        </div>
                        <div>
                          <span style={{ fontSize: '9.5px', fontFamily: 'monospace', fontWeight: 700, color: wingColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {node.badge}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{
                          fontSize: '8.5px',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          background: node.evidenceType === 'verified'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : node.evidenceType === 'budgeted'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(6, 182, 212, 0.15)',
                          color: node.evidenceType === 'verified'
                            ? '#34d399'
                            : node.evidenceType === 'budgeted'
                            ? '#fbbf24'
                            : '#22d3ee',
                          border: `1px solid ${node.evidenceType === 'verified'
                            ? 'rgba(16, 185, 129, 0.35)'
                            : node.evidenceType === 'budgeted'
                            ? 'rgba(245, 158, 11, 0.35)'
                            : 'rgba(6, 182, 212, 0.35)'}`,
                        }}>
                          [{node.evidenceType.toUpperCase()}]
                        </span>
                        <span style={{
                          fontSize: '9.5px',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          textTransform: 'uppercase',
                          background: isMastered ? 'rgba(16, 185, 129, 0.2)' : node.status === 'in_progress' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          color: isMastered ? '#34d399' : node.status === 'in_progress' ? '#c084fc' : 'var(--ink-muted)',
                          border: `1px solid ${isMastered ? 'rgba(16, 185, 129, 0.4)' : node.status === 'in_progress' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                        }}>
                          {isMastered ? '✓ Mastered' : `${node.progressPercent}%`}
                        </span>
                      </div>
                    </div>

                    <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>{node.title}</h4>
                    <p style={{ margin: '0 0 10px', fontSize: '11.5px', color: 'var(--ink-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{node.description}</p>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'monospace', color: 'var(--ink-muted)', marginBottom: '4px' }}>
                        <span>Target: <strong style={{ color: '#f8fafc' }}>{node.targetMetricLabel}</strong></span>
                        <span style={{ color: isMastered ? '#34d399' : '#c084fc', fontWeight: 700 }}>{node.currentMetricLabel}</span>
                      </div>
                      <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${node.progressPercent}%`, height: '100%', background: isMastered ? '#10b981' : 'linear-gradient(90deg, #a855f7, #06b6d4)' }} />
                      </div>
                    </div>

                    <div style={{ fontSize: '10.5px', fontStyle: 'italic', color: 'var(--ink-muted)', lineHeight: 1.4 }}>
                      &quot;{node.actuarialPrinciple}&quot;
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. VIEW MODE: TROPHY HALL & MILESTONE BADGES */}
        {viewMode === 'badges' && (
          <div className="trophy-hall-container">
            {/* Level & XP Hero Header */}
            <div className="trophy-hero-banner">
              <div className="trophy-hero-left">
                <div className="trophy-level-avatar">
                  <Award size={26} className="text-solstice" />
                  <span className="trophy-level-number font-mono">{treeState.level}</span>
                </div>
                <div>
                  <div className="trophy-rank-line">
                    <span className="trophy-tier-tag font-mono">SOVEREIGN ARCHETYPE</span>
                    <span className="trophy-title-text font-bold text-base text-white">{treeState.levelTitle}</span>
                  </div>
                  <div className="trophy-xp-line font-mono text-xs text-muted">
                    Total XP: <strong className="text-white">{treeState.totalXP}</strong> / {treeState.nextLevelXP} XP
                    <span className="trophy-sep">·</span>
                    Unlocked: <strong className="text-nebula">{treeState.unlockedBadgesCount}</strong> / {treeState.badges.length} Badges
                  </div>
                </div>
              </div>

              <div className="trophy-hero-right">
                <div className="trophy-xp-gauge">
                  <div className="trophy-xp-gauge-header font-mono text-xs">
                    <span>Rank Progression (Lvl {treeState.level})</span>
                    <span className="text-solstice font-bold">{treeState.currentLevelProgressPercent}%</span>
                  </div>
                  <div className="trophy-xp-gauge-bar">
                    <div
                      className="trophy-xp-gauge-fill"
                      style={{ width: `${treeState.currentLevelProgressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Chips Bar */}
            <div className="trophy-filter-bar">
              <div className="pill-segmented flex flex-wrap gap-1" role="tablist">
                <button
                  type="button"
                  className={`py-1 px-3 font-mono text-xs ${badgeFilter === 'all' ? 'pill-active' : ''}`}
                  onClick={() => {
                    setBadgeFilter('all');
                    playChime(480);
                  }}
                >
                  All Milestones ({treeState.badges.length})
                </button>
                <button
                  type="button"
                  className={`py-1 px-3 font-mono text-xs ${badgeFilter === 'unlocked' ? 'pill-active' : ''}`}
                  onClick={() => {
                    setBadgeFilter('unlocked');
                    playChime(520);
                  }}
                >
                  🏆 Unlocked ({treeState.unlockedBadgesCount})
                </button>
                <button
                  type="button"
                  className={`py-1 px-3 font-mono text-xs ${badgeFilter === 'in_progress' ? 'pill-active' : ''}`}
                  onClick={() => {
                    setBadgeFilter('in_progress');
                    playChime(440);
                  }}
                >
                  ⏳ In Progress ({treeState.badges.filter((b) => !b.isUnlocked && b.progressPercent > 0).length})
                </button>
                <button
                  type="button"
                  className={`py-1 px-3 font-mono text-xs ${badgeFilter === 'locked' ? 'pill-active' : ''}`}
                  onClick={() => {
                    setBadgeFilter('locked');
                    playChime(380);
                  }}
                >
                  🔒 Locked ({treeState.badges.filter((b) => !b.isUnlocked && b.progressPercent === 0).length})
                </button>
              </div>
            </div>

            {/* Trophy Hall Grid */}
            <div className="trophy-hall-grid">
              {filteredBadges.map((badge) => {
                const isUnlocked = badge.isUnlocked;
                const isInProgress = !isUnlocked && badge.progressPercent > 0;
                const categoryColor = badge.category === 'defense'
                  ? 'var(--colour-nebula)'
                  : badge.category === 'velocity'
                  ? 'var(--colour-quasar)'
                  : badge.category === 'autonomy'
                  ? 'var(--colour-solstice)'
                  : 'var(--colour-pulsar)';

                return (
                  <div
                    key={badge.id}
                    className={`trophy-badge-card ${isUnlocked ? 'badge-unlocked' : isInProgress ? 'badge-in-progress' : 'badge-locked'}`}
                  >
                    <div className="trophy-card-header">
                      <div
                        className="trophy-badge-icon"
                        style={{
                          color: isUnlocked ? categoryColor : isInProgress ? 'var(--colour-pulsar)' : 'var(--ink-muted)',
                        }}
                      >
                        {ICON_MAP[badge.icon] || <Award size={18} />}
                      </div>

                      <div className="trophy-card-header-meta">
                        <span className="trophy-category-tag font-mono" style={{ color: categoryColor }}>
                          {badge.category.toUpperCase()} · TIER {badge.tier}
                        </span>
                        <span className="trophy-xp-tag font-mono">
                          +{badge.xpReward} XP
                        </span>
                      </div>
                    </div>

                    <h4 className="trophy-card-title text-white font-bold">{badge.title}</h4>
                    <div className="trophy-card-tagline text-xs font-mono">{badge.tagline}</div>
                    <p className="trophy-card-req text-xs text-muted">{badge.requirement}</p>

                    <div className="trophy-progress-section">
                      <div className="trophy-progress-metrics font-mono text-xs">
                        <span>{badge.currentValueLabel}</span>
                        <span className="text-muted">Target: {badge.targetValueLabel}</span>
                      </div>
                      <div className="trophy-progress-track">
                        <div
                          className="trophy-progress-fill"
                          style={{
                            width: `${badge.progressPercent}%`,
                            background: isUnlocked
                              ? 'var(--colour-nebula)'
                              : 'linear-gradient(90deg, var(--colour-pulsar), var(--colour-quasar))',
                          }}
                        />
                      </div>
                    </div>

                    <div className="trophy-card-footer">
                      <span
                        className={`trophy-status-pill font-mono text-xs ${isUnlocked ? 'status-unlocked' : isInProgress ? 'status-progress' : 'status-locked'}`}
                      >
                        {isUnlocked ? '✓ Unlocked' : `${badge.progressPercent}% Completed`}
                      </span>

                      {!isUnlocked && badge.suggestedAction && (
                        <button
                          type="button"
                          className="action-pill font-mono text-xs trophy-simulate-btn"
                          onClick={() => handleSimulateBadge(badge)}
                          title={badge.suggestedAction.description}
                        >
                          <Sparkles size={11} className="text-solstice" />
                          <span>Simulate</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. VIEW MODE 4: RPG CHARACTER PERKS & LORE */}
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


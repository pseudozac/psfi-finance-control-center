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

// Fixed low-discrepancy points keep the star field consistent across renders and devices.
const CONSTELLATION_STARS = Array.from({ length: 88 }, (_, index) => ({
  x: (index * 197 + 43) % 1400,
  y: (index * 113 + 29) % 820,
  radius: index % 13 === 0 ? 1.8 : index % 4 === 0 ? 1.1 : 0.65,
  opacity: index % 13 === 0 ? 0.72 : index % 3 === 0 ? 0.38 : 0.2,
}));

function generateAngularPath(x1: number, y1: number, x2: number, y2: number, inset = 34): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const offset = Math.min(inset, length * 0.22);
  const startX = x1 + (dx / length) * offset;
  const startY = y1 + (dy / length) * offset;
  const endX = x2 - (dx / length) * offset;
  const endY = y2 - (dy / length) * offset;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const elbowX = (startX + endX) / 2;
    return `M ${startX} ${startY} L ${elbowX} ${startY} L ${elbowX} ${endY} L ${endX} ${endY}`;
  }
  const elbowY = (startY + endY) / 2;
  return `M ${startX} ${startY} L ${startX} ${elbowY} L ${endX} ${elbowY} L ${endX} ${endY}`;
}

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
  const [canvasAspectRatio, setCanvasAspectRatio] = useState(1.5);
  const canvasRef = useRef<HTMLElement | null>(null);
  
  // Dynamic Responsive Window State & Astrolabe ViewBox (frames constellation mathematically across any screen)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;

  useEffect(() => {
    if (!isOpen || !isTheaterMode) return;
    document.body.classList.add('skill-tree-theater-active');
    return () => document.body.classList.remove('skill-tree-theater-active');
  }, [isOpen, isTheaterMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateAspectRatio = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (width > 0 && height > 0) setCanvasAspectRatio(width / height);
    };

    updateAspectRatio();
    const observer = new ResizeObserver(updateAspectRatio);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [isOpen, viewMode, isTheaterMode]);

  // ViewBox bounds include the new status tags beneath the lowest node.
  // Optimal full view: Center X = 720, Center Y = 430
  const DEFAULT_VIEWBOX = useMemo(() => ({ x: 110, y: 0, w: 1220, h: 860 }), []);

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
  const viewBoxRef = useRef(viewBox);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; vbX: number; vbY: number }>({ clientX: 0, clientY: 0, vbX: 0, vbY: 0 });
  const dragDistanceRef = useRef<number>(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const applyViewBox = (next: { x: number; y: number; w: number; h: number }, updateReact = true) => {
    viewBoxRef.current = next;
    svgRef.current?.setAttribute('viewBox', `${next.x} ${next.y} ${next.w} ${next.h}`);
    if (updateReact) setViewBox(next);
  };

  // Auto-center and reset to fit whenever modal opens
  useEffect(() => {
    if (isOpen) {
      applyViewBox(DEFAULT_VIEWBOX);
      setSelectedTier('all');
      setIsDossierCollapsed(isMobile);
      setIsTheaterMode(false);
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
      applyViewBox(clampViewBox(CITADEL_VIEWBOX));
      playChime(440);
    } else if (tier === 'tier2_velocity') {
      applyViewBox(clampViewBox(VELOCITY_VIEWBOX));
      playChime(554);
    } else if (tier === 'tier3_autonomy') {
      applyViewBox(clampViewBox(AUTONOMY_VIEWBOX));
      playChime(659);
    } else {
      applyViewBox(clampViewBox(DEFAULT_VIEWBOX));
      playChime(520);
    }
  };

  const handleZoomIn = () => {
    const prev = viewBoxRef.current;
    const zoomFactor = 0.8;
    const nextW = prev.w * zoomFactor;
    const nextH = prev.h * zoomFactor;
    const cx = prev.x + prev.w / 2;
    const cy = prev.y + prev.h / 2;
    applyViewBox(clampViewBox({ x: cx - nextW / 2, y: cy - nextH / 2, w: nextW, h: nextH }), false);
    playChime(600);
  };

  const handleZoomOut = () => {
    const prev = viewBoxRef.current;
    const zoomFactor = 1.25;
    const nextW = prev.w * zoomFactor;
    const nextH = prev.h * zoomFactor;
    const cx = prev.x + prev.w / 2;
    const cy = prev.y + prev.h / 2;
    applyViewBox(clampViewBox({ x: cx - nextW / 2, y: cy - nextH / 2, w: nextW, h: nextH }), false);
    playChime(420);
  };

  const handleResetFit = () => {
    applyViewBox(clampViewBox(DEFAULT_VIEWBOX));
    setSelectedTier('all');
    playChime(480);
  };

  const toggleTheaterMode = () => {
    if (!isTheaterMode) {
      setViewMode('visual_tree');
      setSelectedTier('all');
      applyViewBox(clampViewBox(DEFAULT_VIEWBOX));
    }
    setIsTheaterMode((current) => !current);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target instanceof Element && e.target.closest('[role="button"]')) return;
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      vbX: viewBoxRef.current.x,
      vbY: viewBoxRef.current.y,
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

    const currentViewBox = viewBoxRef.current;
    const scaleX = currentViewBox.w / rect.width;
    const scaleY = currentViewBox.h / rect.height;

    const dx = (e.clientX - dragStartRef.current.clientX) * scaleX;
    const dy = (e.clientY - dragStartRef.current.clientY) * scaleY;

    dragDistanceRef.current += Math.hypot(e.movementX, e.movementY);

    applyViewBox(clampViewBox({
      ...currentViewBox,
      x: dragStartRef.current.vbX - dx,
      y: dragStartRef.current.vbY - dy,
    }), false);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setViewBox(viewBoxRef.current);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
    const prev = viewBoxRef.current;
    const nextW = prev.w * zoomFactor;
    const nextH = prev.h * zoomFactor;
    const cx = prev.x + prev.w / 2;
    const cy = prev.y + prev.h / 2;
    applyViewBox(clampViewBox({ x: cx - nextW / 2, y: cy - nextH / 2, w: nextW, h: nextH }), false);
  };

  const handleNodeClick = (node: SkillNode) => {
    if (dragDistanceRef.current > 8) return;
    setSelectedNodeId(node.id);
    setIsDossierCollapsed(false);
    const freq = node.tier === 'tier1_survival' ? 440 : node.tier === 'tier2_velocity' ? 554 : 659;
    playChime(freq);

    if (node.treeX && node.treeY) {
      const prev = viewBoxRef.current;
      const targetW = Math.min(prev.w, 750);
      const targetH = (targetW / prev.w) * prev.h;
      applyViewBox(clampViewBox({
        x: node.treeX! - targetW / 2,
        y: node.treeY! - targetH / 2,
        w: targetW,
        h: targetH,
      }));
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
    <div className={`modal-backdrop ${isTheaterMode ? 'skill-tree-theater-backdrop' : ''}`} onClick={onClose} role="dialog" aria-modal="true" aria-label="Sovereign Wealth RPG Skill Tree">
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
              onClick={toggleTheaterMode}
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
              ref={canvasRef}
              className="skill-tree-canvas-panel"
              aria-label="Constellation Astrolabe Star-Chart"
              onWheel={handleWheel}
            >
              {/* Floating Tactical Astrolabe HUD */}
              <div
                className="astrolabe-floating-hud"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="hud-wings-cluster">
                  <button
                    type="button"
                    className={`hud-pill ${selectedTier === 'all' ? 'active' : ''}`}
                    onClick={() => handleFilterTier('all')}
                    title="Full Constellation (15 Nodes)"
                  >
                    <span>🌌 All</span>
                  </button>
                  <button
                    type="button"
                    className={`hud-pill hud-pill-citadel ${selectedTier === 'tier1_survival' ? 'active' : ''}`}
                    onClick={() => handleFilterTier('tier1_survival')}
                    title="Focus Defensive Citadel (5 Nodes)"
                  >
                    <span>🛡️ Citadel</span>
                    <span className="hud-pill-badge font-mono text-[9.5px] opacity-80">({treeState.tier1MasteredCount}/5)</span>
                  </button>
                  <button
                    type="button"
                    className={`hud-pill hud-pill-velocity ${selectedTier === 'tier2_velocity' ? 'active' : ''}`}
                    onClick={() => handleFilterTier('tier2_velocity')}
                    title="Focus Compounding Velocity (5 Nodes)"
                  >
                    <span>⚡ Velocity</span>
                    <span className="hud-pill-badge font-mono text-[9.5px] opacity-80">({treeState.tier2MasteredCount}/5)</span>
                  </button>
                  <button
                    type="button"
                    className={`hud-pill hud-pill-autonomy ${selectedTier === 'tier3_autonomy' ? 'active' : ''}`}
                    onClick={() => handleFilterTier('tier3_autonomy')}
                    title="Focus Sovereign Autonomy (5 Nodes)"
                  >
                    <span>👑 Autonomy</span>
                    <span className="hud-pill-badge font-mono text-[9.5px] opacity-80">({treeState.tier3MasteredCount}/5)</span>
                  </button>
                </div>

                <div className="hud-zoom-cluster">
                  {!isTheaterMode && (
                    <button
                      type="button"
                      className="hud-icon-btn theater-enter-btn"
                      onClick={toggleTheaterMode}
                      aria-label="Enter theater mode"
                      title="Show only the star chart"
                    >
                      <Maximize2 size={14} />
                    </button>
                  )}
                  {isTheaterMode && (
                    <>
                      <button
                        type="button"
                        className="hud-icon-btn theater-exit-btn"
                        onClick={toggleTheaterMode}
                        aria-label="Exit theater mode"
                        title="Restore chart details"
                      >
                        <Minimize2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="hud-icon-btn theater-close-btn"
                        onClick={onClose}
                        aria-label="Close star chart"
                        title="Close star chart"
                      >
                        <X size={14} />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="hud-icon-btn constellation-zoom-btn"
                    onClick={handleZoomIn}
                    title="Zoom In (+)"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    type="button"
                    className="hud-icon-btn constellation-zoom-btn"
                    onClick={handleZoomOut}
                    title="Zoom Out (-)"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <button
                    type="button"
                    className="hud-icon-btn constellation-zoom-btn"
                    onClick={handleResetFit}
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
                preserveAspectRatio="none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <defs>
                  <linearGradient id="constellation-space" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#050914" />
                    <stop offset="52%" stopColor="#091222" />
                    <stop offset="100%" stopColor="#100b20" />
                  </linearGradient>
                  <radialGradient id="citadel-nebula">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="velocity-nebula">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="autonomy-nebula">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.13" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                  </radialGradient>
                  {/* Blueprint Grid */}
                  <pattern id="celestial-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                    <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255, 255, 255, 0.02)" strokeWidth="1" />
                    <circle cx="48" cy="48" r="1.2" fill="rgba(191, 159, 241, 0.1)" />
                  </pattern>

                </defs>

                {/* Layered starfield with tier-colored nebulae. */}
                <rect width="1440" height="860" fill="url(#constellation-space)" />
                <rect width="1440" height="820" fill="url(#celestial-grid)" />
                <ellipse cx="420" cy="490" rx="330" ry="340" fill="url(#citadel-nebula)" />
                <ellipse cx="680" cy="370" rx="360" ry="330" fill="url(#velocity-nebula)" />
                <ellipse cx="1080" cy="320" rx="300" ry="300" fill="url(#autonomy-nebula)" />
                <g className="constellation-starfield" aria-hidden="true">
                  {CONSTELLATION_STARS.map((star, index) => (
                    <circle key={index} cx={star.x} cy={star.y} r={star.radius} fill="#dbeafe" opacity={star.opacity} />
                  ))}
                </g>

                {/* Fine astrolabe rings pull the eye toward the compounding hub. */}
                <circle cx="680" cy="570" r="72" fill="none" stroke="rgba(103, 232, 249, 0.12)" strokeDasharray="2 8" />
                <circle cx="680" cy="570" r="148" fill="none" stroke="rgba(103, 232, 249, 0.07)" strokeDasharray="3 11" />
                <circle cx="680" cy="570" r="280" fill="none" stroke="rgba(191, 159, 241, 0.045)" strokeDasharray="2 12" />

                {/* Faint Astrolabe Radial Ray Lines from Root (680, 740) */}
                <line x1="680" y1="740" x2="220" y2="60" stroke="rgba(255, 255, 255, 0.02)" strokeDasharray="2 6" />
                <line x1="680" y1="740" x2="440" y2="40" stroke="rgba(255, 255, 255, 0.02)" strokeDasharray="2 6" />
                <line x1="680" y1="740" x2="680" y2="20" stroke="rgba(255, 255, 255, 0.025)" strokeDasharray="2 6" />
                <line x1="680" y1="740" x2="940" y2="40" stroke="rgba(255, 255, 255, 0.02)" strokeDasharray="2 6" />
                <line x1="680" y1="740" x2="1200" y2="60" stroke="rgba(255, 255, 255, 0.02)" strokeDasharray="2 6" />

                {/* Three living tier beacons echo the selector chips above. */}
                <g className="constellation-tier-beacon" transform="translate(420, 100)">
                  <rect x="-110" y="-19" width="220" height="38" rx="19" fill="rgba(4, 19, 20, 0.82)" stroke="rgba(52, 211, 153, 0.42)" />
                  <circle cx="-84" cy="0" r="4" fill="#34d399" />
                  <text x="4" y="-2" textAnchor="middle" fill="#a7f3d0" fontSize="13" fontFamily="monospace" fontWeight="bold" letterSpacing="0.06em">CITADEL</text>
                  <text x="4" y="12" textAnchor="middle" fill="#6b8b89" fontSize="9" fontFamily="monospace">{treeState.tier1MasteredCount}/5 MASTERED</text>
                </g>

                <g className="constellation-tier-beacon" transform="translate(700, 100)">
                  <rect x="-110" y="-19" width="220" height="38" rx="19" fill="rgba(5, 18, 27, 0.84)" stroke="rgba(34, 211, 238, 0.42)" />
                  <circle cx="-84" cy="0" r="4" fill="#22d3ee" />
                  <text x="4" y="-2" textAnchor="middle" fill="#a5f3fc" fontSize="13" fontFamily="monospace" fontWeight="bold" letterSpacing="0.06em">VELOCITY</text>
                  <text x="4" y="12" textAnchor="middle" fill="#638b99" fontSize="9" fontFamily="monospace">{treeState.tier2MasteredCount}/5 MASTERED</text>
                </g>

                <g className="constellation-tier-beacon" transform="translate(1000, 100)">
                  <rect x="-110" y="-19" width="220" height="38" rx="19" fill="rgba(25, 18, 7, 0.84)" stroke="rgba(251, 191, 36, 0.42)" />
                  <circle cx="-84" cy="0" r="4" fill="#fbbf24" />
                  <text x="4" y="-2" textAnchor="middle" fill="#fde68a" fontSize="13" fontFamily="monospace" fontWeight="bold" letterSpacing="0.06em">AUTONOMY</text>
                  <text x="4" y="12" textAnchor="middle" fill="#a58a52" fontSize="9" fontFamily="monospace">{treeState.tier3MasteredCount}/5 MASTERED</text>
                </g>

                {/* 1. Render crisp orthogonal milestone routes. */}
                <g className="conduits-group">
                  {SOVEREIGN_TREE_CONDUITS.map((conduit, idx) => {
                    const parent = nodeMap.get(conduit.from);
                    const child = nodeMap.get(conduit.to);
                    if (!parent || !child || !parent.treeX || !parent.treeY || !child.treeX || !child.treeY) return null;

                    const x1 = parent.treeX;
                    const y1 = parent.treeY;
                    const x2 = child.treeX;
                    const y2 = child.treeY;

                    const pathD = generateAngularPath(x1, y1, x2, y2);

                    const isBothMastered = parent.status === 'mastered' && child.status === 'mastered';
                    const isInFlight = parent.status === 'mastered' && child.status === 'in_progress';
                    const isIlluminated = illuminatedAncestors.has(conduit.from) && illuminatedAncestors.has(conduit.to);
                    const isDimmed = selectedTier !== 'all' && (parent.tier !== selectedTier && child.tier !== selectedTier);
                    const routeColor = isIlluminated
                      ? '#fb923c'
                      : child.tier === 'tier1_survival'
                      ? '#34d399'
                      : child.tier === 'tier2_velocity'
                      ? '#22d3ee'
                      : '#fbbf24';
                    const routeIsActive = isIlluminated || isBothMastered || isInFlight;

                    return (
                      <g key={idx} opacity={isDimmed ? 0.12 : 1} className={`constellation-conduit ${isInFlight && !isIlluminated ? 'constellation-conduit-live' : ''}`} aria-hidden="true">
                        {routeIsActive && (
                          <path
                            d={pathD}
                            fill="none"
                            stroke={routeColor}
                            strokeWidth={isIlluminated ? 5 : 4}
                            opacity={isIlluminated ? 0.16 : isBothMastered ? 0.1 : 0.12}
                          />
                        )}
                        <path
                          d={pathD}
                          fill="none"
                          stroke={routeIsActive ? routeColor : '#91a0ba'}
                          strokeWidth={isIlluminated ? 3 : isBothMastered ? 2.6 : isInFlight ? 2.2 : 1.5}
                          strokeOpacity={isIlluminated ? 0.96 : isBothMastered ? 0.72 : isInFlight ? 0.86 : 0.2}
                          strokeDasharray={isInFlight && !isIlluminated ? '8 8' : undefined}
                          className={isInFlight && !isIlluminated ? 'constellation-route-dash' : ''}
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
                    const isMastered = node.status === 'mastered';
                    const isInProgress = node.status === 'in_progress';
                    const isApex = node.id === 'antifragile_dynasty';
                    const isHub = node.id === 'quarter_crore_hub' || node.id === 'debt_elimination';

                    const radius = isApex ? 38 : isHub ? 34 : 30;
                    const circumference = 2 * Math.PI * (radius + 2);
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
                        transform={`translate(${x}, ${y}) scale(${Math.max(0.25, Math.min(3, (viewBox.w / viewBox.h) / canvasAspectRatio))}, 1)`}
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

                        {/* A quiet track and one progress arc read as a single clean ring. */}
                        <circle
                          r={radius + 2}
                          fill="none"
                          stroke={isSelected ? 'rgba(226, 232, 240, 0.42)' : 'rgba(148, 163, 184, 0.22)'}
                          strokeWidth="2"
                        />
                        <circle
                          r={radius + 2}
                          fill="none"
                          stroke={isSelected ? '#f8fafc' : isMastered ? '#34d399' : isInProgress ? '#c084fc' : wingColor}
                          strokeWidth={isSelected ? '3.5' : '3'}
                          strokeDasharray={circumference}
                          strokeDashoffset={progressOffset}
                          strokeLinecap="round"
                          transform="rotate(-90)"
                          opacity={isMastered || node.progressPercent > 0 ? 0.95 : 0.45}
                        />

                        {/* Native SVG glyph avoids foreignObject font and scaling artifacts. */}
                        {React.cloneElement(
                          (ICON_MAP[node.iconName] || <Award size={18} />) as React.ReactElement,
                          {
                            x: -10,
                            y: -10,
                            width: 20,
                            height: 20,
                            className: undefined,
                            color: isMastered ? '#6ee7b7' : isInProgress ? '#e9d5ff' : wingColor,
                            strokeWidth: 2.1,
                            style: { pointerEvents: 'none' },
                          } as React.SVGProps<SVGSVGElement>
                        )}

                        {/* Mastered Checkmark Badge (Top-Right) */}
                        {isMastered && (
                          <path
                            d={`M ${radius * 0.58} ${-radius * 0.72} l 5 5 l 9 -10`}
                            fill="none"
                            stroke="#6ee7b7"
                            strokeWidth="2.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

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
                <h3 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 700, color: 'var(--ink-primary)' }}>{treeState.currentRank}</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--ink-secondary)', maxWidth: '600px', lineHeight: 1.5 }}>
                  {RANK_LORE_PERKS[treeState.currentRank]?.lore || 'Sovereign financial architect.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyCharacterSheet}
                className="action-pill font-mono text-xs character-sheet-copy-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px' }}
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


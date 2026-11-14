import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Lightbulb,
  Sliders,
  Clock,
  Layers,
  FileSpreadsheet,
  Volume2,
  VolumeX,
  Crown,
  ShieldAlert,
  Terminal,
  Sparkles,
} from 'lucide-react';
import { VirtualMouseInstructor } from './VirtualMouseInstructor';

export interface MasterTourStep {
  targetId: string;
  targetView: 'control' | 'terminal';
  badge: string;
  badgeColor: 'nebula' | 'quasar' | 'solstice' | 'corona' | 'pulsar';
  title: string;
  description: string;
  tip: string;
  icon: React.ReactNode;
  missionPrompt?: string;
  missionActionLabel?: string;
}

export const MASTER_TOUR_STEPS: MasterTourStep[] = [
  {
    targetId: 'tour-vitals',
    targetView: 'control',
    badge: '1. REAL-TIME VITALS',
    badgeColor: 'nebula',
    title: 'Financial Health & Monthly Surplus',
    description:
      'Monitor your monthly cash surplus, net inflows, living outflows, and compounding savings rate. These telemetry cards react instantaneously to every change you make.',
    tip: 'A savings rate above 20% turns green as the golden benchmark for wealth building.',
    icon: <TrendingUp size={15} className="text-nebula" />,
  },
  {
    targetId: 'tour-cashflows',
    targetView: 'control',
    badge: '2. TACTILE CASHFLOW',
    badgeColor: 'quasar',
    title: 'Income, Expenses & Custom Outflow Lines',
    description:
      'Tune your primary salary, consulting gigs, and living expenses with tactile sliders. You can also add arbitrary custom categories (e.g. Parent Support, Pet Care, Fitness) with dedicated rupee allocations.',
    tip: 'Drag any slider or type exact numbers directly in the input boxes to customize your ledger.',
    icon: <Sliders size={15} className="text-quasar" />,
  },
  {
    targetId: 'tour-survival',
    targetView: 'control',
    badge: '3. SURVIVAL & FIRE',
    badgeColor: 'solstice',
    title: '3-Tier Survival Stress Test & FIRE Countdown',
    description:
      'Stress-test your emergency fund across 3 real-world shocks: Tier 1 Barebones, Tier 2 Lean Living, and Tier 3 Full Lifestyle. Track live ETA countdowns to ₹10L, ₹50L, ₹1 Crore, and your 25× annual expense FIRE milestone.',
    tip: 'Maintaining 6+ months of Tier 2 survival runway builds a fortress against sudden market downturns or career shifts.',
    icon: <ShieldCheck size={15} className="text-solstice" />,
  },
  {
    targetId: 'tour-tax',
    targetView: 'control',
    badge: '4. INDIAN TAX ENGINE',
    badgeColor: 'corona',
    title: 'FY 2024–25 Old vs. New Regime Verdict',
    description:
      'Automated side-by-side tax calculation incorporating the ₹75,000 standard deduction, Section 87A rebate (zero tax up to ₹7.75L under New Regime), Section 80CCD(1B) NPS ₹50k deduction, and Metro vs. Non-Metro HRA exemptions.',
    tip: 'PsFi automatically compares both regimes and highlights the OPTIMAL choice with your exact net annual rupee savings.',
    icon: <Receipt size={15} className="text-corona" />,
  },
  {
    targetId: 'tour-impulse-shield',
    targetView: 'control',
    badge: '5. MICRO SPENDING ARMOR',
    badgeColor: 'corona',
    title: 'Local Impulse Shield & Daily Burn Pocket',
    description:
      'Stop unconscious rupee leaks before they wreck your compounding curve. Calculate instant daily afford verdicts, track lifetime impulse capital rescued, and park speculative purchases in the 72-hour cooling-off chamber.',
    tip: 'Waiting 72 hours dissipates over 80% of spontaneous dopamine shopping urges.',
    icon: <ShieldAlert size={15} className="text-corona" />,
    missionPrompt: '⚡ Try testing "Can I Afford This Today?" or log ₹150 Chai',
    missionActionLabel: 'Inspect Shield',
  },
  {
    targetId: 'tour-skills',
    targetView: 'control',
    badge: '6. MACRO PROGRESSION',
    badgeColor: 'solstice',
    title: 'Sovereign Wealth RPG Skill Tree',
    description:
      'Transform financial independence into an immersive RPG skill constellation. 15 actuarial nodes across 3 tiers (Survival Fortress, Velocity Engine, Sovereign Autonomy) with live What-If simulation and dynamic prerequisite ancestry illumination.',
    tip: 'Hover or tap any skill node to illuminate the dependency chain leading up to it.',
    icon: <Crown size={15} className="text-solstice" />,
    missionPrompt: '👑 Open the full RPG Skill Tree to inspect your masteries',
    missionActionLabel: 'Open Skill Tree',
  },
  {
    targetId: 'tour-cmdk',
    targetView: 'control',
    badge: '7. COMMAND OMNIBAR',
    badgeColor: 'quasar',
    title: 'Instant Power-User Command Omnibar (⌘K)',
    description:
      'Lightning-fast fuzzy dispatch terminal. Adjust income, toggle privacy mode, run scenario presets, or jump between modules using keyboard shortcuts without touching your mouse.',
    tip: 'Press ⌘K or "/" anywhere on the keyboard to summon the command omnibar instantly.',
    icon: <Terminal size={15} className="text-quasar" />,
    missionPrompt: '⌨️ Press Cmd+K / Ctrl+K or tap to summon the omnibar',
    missionActionLabel: 'Summon ⌘K',
  },
  {
    targetId: 'terminal-ticker',
    targetView: 'terminal',
    badge: '8. WEALTH TERMINAL',
    badgeColor: 'pulsar',
    title: 'Corporate P&L & Net Burn Velocity',
    description:
      'View your household finances with the precision of a public corporation. This high-density ticker shows your Monthly Net Cashflow P&L, Operating Margin, Annualized P&L, Daily Burn Rate, and Reserve Valuation.',
    tip: 'A positive operating margin above 25% signifies top-tier institutional financial health.',
    icon: <TrendingUp size={15} className="text-pulsar" />,
  },
  {
    targetId: 'terminal-timeframes',
    targetView: 'terminal',
    badge: '9. TIMEFRAME VELOCITY',
    badgeColor: 'solstice',
    title: '1D Daily Burn to 12M Compounding',
    description:
      'Switch between 1D (daily living cash burn & payday spikes), 1W (weekly pace), 1M (monthly compounding), 3M (quarterly earnings), and 12M (annual wealth valuation). Catch micro-drains before they become structural deficits.',
    tip: 'Use 1D to track salary day liquidity buffers vs mid-month rent and EMI deductions.',
    icon: <Clock size={15} className="text-solstice" />,
  },
  {
    targetId: 'terminal-chart-controls',
    targetView: 'terminal',
    badge: '10. TRAJECTORY MODES',
    badgeColor: 'quasar',
    title: 'Net P&L Curve, Inflow vs Outflow & Valuation',
    description:
      'Toggle the interactive chart between Net Free Cashflow P&L, Inflow vs Outflow comparisons, and Cumulative Reserve & Asset Valuation. Watch step-up compounding accelerate over time.',
    tip: 'Switch to Cumulative Valuation to inspect your projected balance sheet reserve curve.',
    icon: <Layers size={15} className="text-quasar" />,
  },
  {
    targetId: 'terminal-financial-statement',
    targetView: 'terminal',
    badge: '11. AUDITED LEDGER',
    badgeColor: 'nebula',
    title: 'GAAP / IFRS Personal Income Statement',
    description:
      'A formal corporate-style audited statement detailing Operating Revenue, Cost of Living (COGS), Debt Servicing, Risk Shields (Insurance), and Bottom-Line Net Operating Surplus.',
    tip: 'Every single rupee from your sliders is accounted for with % of revenue distribution.',
    icon: <FileSpreadsheet size={15} className="text-nebula" />,
  },
];

// Lightweight zero-dependency Web Audio synthesizers for high-tech tactile feedback
function playBlipSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // Ignore audio failures if browser blocks autoplay
  }
}

function playCompletionChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + idx * 0.08;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.05, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.28);
    });
  } catch {
    // Ignore audio failures
  }
}

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  initialStepIndex?: number;
  activeView?: 'control' | 'terminal';
  onViewChange?: (view: 'control' | 'terminal') => void;
  onOpenSkillTree?: () => void;
  onOpenCmdK?: () => void;
}

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialStepIndex = 0,
  activeView = 'control',
  onViewChange,
  onOpenSkillTree,
  onOpenCmdK,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('psfi_tour_sound') !== 'false';
  });

  const cardRef = useRef<HTMLDivElement>(null);

  // Sync initial step index when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(initialStepIndex);
    }
  }, [isOpen, initialStepIndex]);

  const step = MASTER_TOUR_STEPS[currentStepIndex];

  // Auto-switch view when step requires it
  useEffect(() => {
    if (isOpen && step && onViewChange && step.targetView !== activeView) {
      onViewChange(step.targetView);
    }
  }, [isOpen, currentStepIndex, step, activeView, onViewChange]);

  // Synchronous precision layout measurement
  const updateTargetMeasurements = useCallback(() => {
    if (!isOpen || !step) {
      setTargetRect(null);
      return;
    }

    const el = document.getElementById(step.targetId);
    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect(rect);
  }, [isOpen, step]);

  // Measure target and auto-scroll smoothly into view
  useEffect(() => {
    if (!isOpen) return;

    // Small delay to allow potential view-switch renders
    const timer = setTimeout(() => {
      const el = document.getElementById(step.targetId);
      if (el) {
        const navOffset = 90;
        const cardReservedHeight = 220;
        const rect = el.getBoundingClientRect();
        const currentScrollY = window.scrollY || window.pageYOffset;
        const elementAbsoluteTop = currentScrollY + rect.top;
        const viewportHeight = window.innerHeight;
        const availableHeight = viewportHeight - navOffset - cardReservedHeight;

        let targetScroll = elementAbsoluteTop - navOffset - Math.max(0, (availableHeight - rect.height) / 2);
        targetScroll = Math.max(0, targetScroll);

        window.scrollTo({
          top: targetScroll,
          behavior: 'smooth',
        });
      }
      updateTargetMeasurements();
    }, 80);

    return () => clearTimeout(timer);
  }, [isOpen, currentStepIndex, step.targetId, updateTargetMeasurements]);

  // Track scroll and resize
  useEffect(() => {
    if (!isOpen) return;
    const handleSync = () => {
      requestAnimationFrame(updateTargetMeasurements);
    };
    window.addEventListener('scroll', handleSync, { passive: true });
    window.addEventListener('resize', handleSync, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleSync);
      window.removeEventListener('resize', handleSync);
    };
  }, [isOpen, updateTargetMeasurements]);

  // Sound toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('psfi_tour_sound', String(next));
  };

  const handleNext = () => {
    if (soundEnabled) playBlipSound();
    if (currentStepIndex < MASTER_TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      if (soundEnabled) playCompletionChime();
      onClose();
      onComplete?.();
    }
  };

  const handlePrev = () => {
    if (soundEnabled) playBlipSound();
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const jumpToStep = (index: number) => {
    if (soundEnabled) playBlipSound();
    setCurrentStepIndex(index);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key.toLowerCase() === 'm') {
        toggleSound();
      } else if (e.key >= '1' && e.key <= '8') {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < MASTER_TOUR_STEPS.length) {
          jumpToStep(idx);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, soundEnabled]);

  if (!isOpen) return null;

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === MASTER_TOUR_STEPS.length - 1;

  // Compute smart collision-free positioning for the popup card
  const getPopupStyle = (): React.CSSProperties => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = Math.min(540, viewportWidth - 32);
    const popupHeight = 220;

    if (!targetRect) {
      return {
        bottom: '96px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: `${popupWidth}px`,
      };
    }

    // If spotlighted element leaves room below, place below
    if (viewportHeight - targetRect.bottom > popupHeight + 110) {
      return {
        top: `${Math.round(targetRect.bottom + 16)}px`,
        left: '50%',
        transform: 'translateX(-50%)',
        width: `${popupWidth}px`,
      };
    }

    // Otherwise place above
    if (targetRect.top - popupHeight > 90) {
      return {
        bottom: `${Math.round(viewportHeight - targetRect.top + 16)}px`,
        left: '50%',
        transform: 'translateX(-50%)',
        width: `${popupWidth}px`,
      };
    }

    // Default safe bottom position
    return {
      bottom: '96px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: `${popupWidth}px`,
    };
  };

  return (
    <div className="tour-backdrop" role="dialog" aria-modal="true" aria-label="PsFi Master Interactive Tour">
      {/* 1. Target Element Spotlight Cutout with Precision Holographic Brackets */}
      {targetRect && (
        <div
          className="tour-spotlight-box"
          style={{
            top: `${Math.round(targetRect.top - 8)}px`,
            left: `${Math.round(targetRect.left - 8)}px`,
            width: `${Math.round(targetRect.width + 16)}px`,
            height: `${Math.round(targetRect.height + 16)}px`,
          }}
        >
          {/* Holographic HUD Corner Accents */}
          <span className="tour-corner tour-corner-tl" />
          <span className="tour-corner tour-corner-tr" />
          <span className="tour-corner tour-corner-bl" />
          <span className="tour-corner tour-corner-br" />
        </div>
      )}

      {/* 2. Advanced Multi-Point Virtual Mouse Instructor */}
      <VirtualMouseInstructor
        targetRect={targetRect}
        stepIndex={currentStepIndex}
        targetId={step.targetId}
      />

      {/* 3. Modern Anchored Message Popup (Zero redundant X button) */}
      <div className="tour-contextual-popup" style={getPopupStyle()} ref={cardRef}>
        <div className="tour-popup-header">
          <div className="flex-align gap-2">
            <span className={`tag-pill tag-${step.badgeColor} font-mono font-bold text-xs`}>
              {step.badge}
            </span>
            <span className="tour-step-counter font-mono text-xs text-muted">
              {currentStepIndex + 1} of {MASTER_TOUR_STEPS.length}
            </span>
          </div>

          <div className="flex-align gap-2">
            <div className="flex-align gap-1 text-muted text-[11px] font-mono">
              <span>View: </span>
              <strong className={step.targetView === 'terminal' ? 'text-pulsar' : 'text-quasar'}>
                {step.targetView === 'terminal' ? 'Wealth Terminal' : 'Control Center'}
              </strong>
            </div>

            <button
              type="button"
              className="tour-card-close-btn"
              onClick={onClose}
              title="Cancel tour (Esc)"
              aria-label="Cancel tour"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        <div className="tour-popup-body">
          <div className="tour-title-row">
            <div className="tour-step-icon">{step.icon}</div>
            <h3 className="tour-title">{step.title}</h3>
          </div>
          <p className="tour-desc">{step.description}</p>

          <div className="tour-tip-box font-mono">
            <Lightbulb size={12} className="text-solstice shrink-0" />
            <span>
              <strong>Tactical Insight:</strong> {step.tip}
            </span>
          </div>

          {step.missionPrompt && (
            <div className="tour-mission-box font-mono mt-2.5 p-2 rounded-lg bg-surface-raised border border-quasar/30 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] text-primary flex items-center gap-1.5 min-w-0">
                <Sparkles size={11} className="text-solstice shrink-0" />
                <span>{step.missionPrompt}</span>
              </span>
              {step.targetId === 'tour-skills' && onOpenSkillTree ? (
                <button
                  type="button"
                  className="action-pill text-[10px] py-1 px-2.5 bg-solstice/20 text-solstice border-solstice/40 shrink-0 cursor-pointer"
                  onClick={() => {
                    onClose();
                    onOpenSkillTree();
                  }}
                >
                  {step.missionActionLabel || 'Try Live'}
                </button>
              ) : step.targetId === 'tour-cmdk' && onOpenCmdK ? (
                <button
                  type="button"
                  className="action-pill text-[10px] py-1 px-2.5 bg-quasar/20 text-quasar border-quasar/40 shrink-0 cursor-pointer"
                  onClick={() => {
                    onClose();
                    onOpenCmdK();
                  }}
                >
                  {step.missionActionLabel || 'Try Live'}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* 4. Master Control Dock (Left: Prev, Center: Cancel & Interactive Stepper, Right: Next) */}
      <div className="tour-bottom-control-dock">
        {/* Left Side: Previous Button */}
        <div className="tour-dock-side tour-dock-left">
          <button
            type="button"
            className={`tour-dock-btn tour-btn-prev font-mono ${isFirst ? 'disabled-btn' : ''}`}
            onClick={handlePrev}
            disabled={isFirst}
            title={isFirst ? 'On first step' : 'Return to previous step (←)'}
          >
            <ArrowLeft size={14} />
            <span className="tour-btn-text">Prev</span>
          </button>
        </div>

        {/* Center: Cancel Button + Interactive Minimap Stepper + Audio Toggle */}
        <div className="tour-dock-center">
          <button
            type="button"
            className="tour-dock-cancel-btn font-mono"
            onClick={onClose}
            title="Cancel tour anytime (Esc)"
          >
            <X size={13} />
            <span>Cancel</span>
          </button>

          {/* Interactive Step Stepper with Direct Jump */}
          <div className="tour-dots" role="tablist">
            {MASTER_TOUR_STEPS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                className={`tour-dot ${idx === currentStepIndex ? 'tour-dot-active' : ''}`}
                onClick={() => jumpToStep(idx)}
                aria-label={`Jump to step ${idx + 1}: ${s.title}`}
                title={`Step ${idx + 1}: ${s.title}`}
              />
            ))}
          </div>

          <span className="tour-dock-step-label font-mono text-xs text-muted">
            {currentStepIndex + 1}/{MASTER_TOUR_STEPS.length}
          </span>

          {/* Audio Synthesizer Toggle */}
          <button
            type="button"
            className={`tour-audio-toggle ${soundEnabled ? 'audio-active' : 'audio-muted'}`}
            onClick={toggleSound}
            title={soundEnabled ? 'Mute sound effects (M)' : 'Enable sound effects (M)'}
          >
            {soundEnabled ? <Volume2 size={13} className="text-quasar" /> : <VolumeX size={13} className="text-muted" />}
          </button>
        </div>

        {/* Right Side: Next / Complete Button */}
        <div className="tour-dock-side tour-dock-right">
          <button
            type="button"
            className={`tour-dock-btn font-mono ${isLast ? 'tour-btn-complete' : 'tour-btn-next'}`}
            onClick={handleNext}
            title={isLast ? 'Finish tour' : 'Advance to next step (→ or Enter)'}
          >
            <span className="tour-btn-text">{isLast ? 'Finish' : 'Next'}</span>
            {isLast ? <CheckCircle2 size={14} /> : <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};

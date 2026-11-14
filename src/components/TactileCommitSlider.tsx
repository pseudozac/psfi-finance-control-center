import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';

interface TactileCommitSliderProps {
  isDirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

// Gentle Web Audio Feedback Synthesizer
function playAudioFeedback(type: 'tick' | 'commit' | 'revert') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'tick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'commit') {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 chord
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);
        gain.gain.setValueAtTime(0.06, ctx.currentTime + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.06);
        osc.stop(ctx.currentTime + i * 0.06 + 0.26);
      });
    } else if (type === 'revert') {
      const notes = [659.25, 523.25]; // E5 -> C5 descent
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.05, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.22);
      });
    }
  } catch {
    // Audio context may be blocked before interaction; fail silently
  }
}

export function TactileCommitSlider({
  isDirty,
  onSave,
  onDiscard,
}: TactileCommitSliderProps) {
  const [dragX, setDragX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'discarding'>('idle');
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [hasCrossedThreshold, setHasCrossedThreshold] = useState<boolean>(false);

  const startXRef = useRef<number>(0);
  const dragXRef = useRef<number>(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Maximum drag distance in px
  const MAX_DRAG = 72;
  const TRIGGER_THRESHOLD = 44;

  // Reset dismissal if dirtiness resets
  useEffect(() => {
    if (!isDirty) {
      setIsDismissed(false);
    }
  }, [isDirty]);

  // Reset status after action completes
  useEffect(() => {
    if (status !== 'idle') {
      const timer = setTimeout(() => {
        setStatus('idle');
        setDragX(0);
        dragXRef.current = 0;
        setHasCrossedThreshold(false);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const triggerCommit = useCallback(() => {
    if (status !== 'idle') return;
    setStatus('saving');
    playAudioFeedback('commit');
    try {
      navigator.vibrate?.([15, 40, 20]);
    } catch {
      // ignore
    }
    onSave();
  }, [status, onSave]);

  const triggerRevert = useCallback(() => {
    if (status !== 'idle') return;
    setStatus('discarding');
    playAudioFeedback('revert');
    try {
      navigator.vibrate?.([25]);
    } catch {
      // ignore
    }
    onDiscard();
  }, [status, onDiscard]);

  // Global window pointer listeners while dragging to guarantee cursor never gets stuck on desktop or mobile
  useEffect(() => {
    if (!isDragging || status !== 'idle') return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      const rawDelta = e.clientX - startXRef.current;

      // Fluid Logarithmic Elastic Dampening beyond TRIGGER_THRESHOLD
      let clamped: number;
      if (Math.abs(rawDelta) > TRIGGER_THRESHOLD) {
        const excess = Math.abs(rawDelta) - TRIGGER_THRESHOLD;
        const dampedExcess = excess * 0.45; // Smooth spring resistance
        const dampedTotal = Math.min(MAX_DRAG, TRIGGER_THRESHOLD + dampedExcess);
        clamped = rawDelta > 0 ? dampedTotal : -dampedTotal;
      } else {
        clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, rawDelta));
      }

      dragXRef.current = clamped;
      setDragX(clamped);

      // Trigger subtle haptic and tick sound on threshold crossing
      const isNowPastThreshold = Math.abs(clamped) >= TRIGGER_THRESHOLD;
      setHasCrossedThreshold((prev) => {
        if (isNowPastThreshold && !prev) {
          playAudioFeedback('tick');
          try {
            navigator.vibrate?.([8]);
          } catch {
            // ignore
          }
          return true;
        }
        if (!isNowPastThreshold && prev) {
          return false;
        }
        return prev;
      });
    };

    const handleWindowPointerUp = () => {
      setIsDragging(false);
      const finalX = dragXRef.current;

      if (finalX >= TRIGGER_THRESHOLD) {
        triggerCommit();
      } else if (finalX <= -TRIGGER_THRESHOLD) {
        triggerRevert();
      } else {
        // Fluid snap back to center
        setDragX(0);
        dragXRef.current = 0;
        setHasCrossedThreshold(false);
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [isDragging, status, triggerCommit, triggerRevert]);

  // Keyboard Navigation: ArrowLeft to Revert, ArrowRight/Enter to Commit, Esc to Dismiss
  useEffect(() => {
    if (!isDirty || isDismissed || status !== 'idle') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in form inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowRight' || (e.ctrlKey && e.key === 's') || (e.metaKey && e.key === 's')) {
        e.preventDefault();
        triggerCommit();
      } else if (e.key === 'ArrowLeft' && (e.altKey || e.ctrlKey)) {
        e.preventDefault();
        triggerRevert();
      } else if (e.key === 'Escape') {
        setIsDismissed(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, isDismissed, status, triggerCommit, triggerRevert]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (status !== 'idle') return;
    setIsDragging(true);
    startXRef.current = e.clientX;
    dragXRef.current = 0;
    setHasCrossedThreshold(false);
  };

  if ((!isDirty && status === 'idle') || isDismissed) {
    return null;
  }

  const isLeftActive = dragX <= -16;
  const isRightActive = dragX >= 16;
  const isTriggerReady = hasCrossedThreshold || Math.abs(dragX) >= TRIGGER_THRESHOLD;

  // Calculate track fill width percentages from center (50%)
  const fillWidthPct = Math.min(50, Math.round((Math.abs(dragX) / TRIGGER_THRESHOLD) * 44));

  return (
    <div
      className={`tactile-commit-slider-wrapper ${
        (isDirty && !isDismissed) || status !== 'idle'
          ? 'slider-visible'
          : 'slider-hidden'
      }`}
      role="region"
      aria-label="Pending Modifications Commit Slider"
    >
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        className={`tactile-commit-track status-${status} ${
          isDragging ? 'track-dragging' : ''
        } ${
          isTriggerReady
            ? dragX > 0
              ? 'track-save-primed'
              : 'track-revert-primed'
            : ''
        }`}
        title="Slide right to Save, slide left to Revert, or click Save / Revert directly"
      >
        {/* Dynamic Fluid Fill Indicators following Drag Direction */}
        {dragX > 0 && status === 'idle' && (
          <div
            className="commit-track-fill fill-right"
            style={{ width: `${fillWidthPct}%` }}
          />
        )}
        {dragX < 0 && status === 'idle' && (
          <div
            className="commit-track-fill fill-left"
            style={{ width: `${fillWidthPct}%` }}
          />
        )}

        {/* Left Action Area: Discard / Revert */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerRevert();
          }}
          className={`commit-action-zone commit-zone-left ${
            isLeftActive ? 'zone-active' : ''
          } ${dragX <= -TRIGGER_THRESHOLD ? 'zone-primed' : ''}`}
          title="Discard modifications and revert back to vault baseline"
        >
          <RotateCcw size={11} className={isLeftActive ? 'revert-spin' : ''} />
          <span>Revert</span>
        </button>

        {/* Dynamic Center Prompt or Status Banner */}
        <div className="commit-track-center select-none pointer-events-none">
          {status === 'saving' ? (
            <span className="commit-status-text text-saved">
              <Check size={11} />
              <span>Snapshot Committed!</span>
            </span>
          ) : status === 'discarding' ? (
            <span className="commit-status-text text-reverted">
              <RotateCcw size={11} />
              <span>Reverted to Baseline</span>
            </span>
          ) : dragX >= TRIGGER_THRESHOLD ? (
            <span className="commit-status-text text-saving-preview font-bold">
              Release to Commit Snapshot ➔
            </span>
          ) : dragX <= -TRIGGER_THRESHOLD ? (
            <span className="commit-status-text text-discard-preview font-bold">
              ⬅ Release to Revert Vault
            </span>
          ) : dragX > 12 ? (
            <span className="commit-status-text text-saving-preview">
              Slide Right to Save ➔
            </span>
          ) : dragX < -12 ? (
            <span className="commit-status-text text-discard-preview">
              ⬅ Slide Left to Revert
            </span>
          ) : (
            <span className="commit-status-text text-idle">
              <span className="commit-indicator-dot" />
              <span>Draft modified</span>
            </span>
          )}
        </div>

        {/* Right Action Area: Save & Dismiss */}
        <div className="commit-right-group">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerCommit();
            }}
            className={`commit-action-zone commit-zone-right ${
              isRightActive ? 'zone-active' : ''
            } ${dragX >= TRIGGER_THRESHOLD ? 'zone-primed' : ''}`}
            title="Commit modifications as new snapshot"
          >
            <span>Save</span>
            <Check size={12} />
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDismissed(true);
            }}
            className="commit-dismiss-btn"
            title="Dismiss slider until next modification"
            aria-label="Dismiss commit banner"
          >
            <X size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}

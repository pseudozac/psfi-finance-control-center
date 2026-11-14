import { useState, useRef, useEffect } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';

interface TactileCommitSliderProps {
  isDirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
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

  const startXRef = useRef<number>(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Maximum drag distance in px
  const MAX_DRAG = 60;
  const TRIGGER_THRESHOLD = 38;

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
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (status !== 'idle') return;
    setIsDragging(true);
    startXRef.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || status !== 'idle') return;
    const delta = e.clientX - startXRef.current;
    const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, delta));
    setDragX(clamped);
  };

  const handlePointerUp = () => {
    if (!isDragging || status !== 'idle') return;
    setIsDragging(false);

    if (dragX >= TRIGGER_THRESHOLD) {
      setStatus('saving');
      onSave();
    } else if (dragX <= -TRIGGER_THRESHOLD) {
      setStatus('discarding');
      onDiscard();
    } else {
      setDragX(0);
    }
  };

  const handlePointerCancel = () => {
    setIsDragging(false);
    setDragX(0);
  };

  const triggerDirectSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status !== 'idle') return;
    setStatus('saving');
    onSave();
  };

  const triggerDirectDiscard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status !== 'idle') return;
    setStatus('discarding');
    onDiscard();
  };

  if ((!isDirty && status === 'idle') || isDismissed) {
    return null;
  }

  const isLeftActive = dragX < -15;
  const isRightActive = dragX > 15;

  return (
    <div
      className={`tactile-commit-slider-wrapper ${
        (isDirty && !isDismissed) || status !== 'idle'
          ? 'slider-visible'
          : 'slider-hidden'
      }`}
    >
      <div
        ref={trackRef}
        className={`tactile-commit-track status-${status}`}
      >
        {/* Left Action Area: Discard */}
        <button
          type="button"
          onClick={triggerDirectDiscard}
          className={`commit-action-zone commit-zone-left ${isLeftActive ? 'zone-active' : ''}`}
          title="Discard recent modifications (revert to vault baseline)"
        >
          <RotateCcw size={11} className={isLeftActive ? 'revert-spin' : ''} />
          <span>Revert</span>
        </button>

        {/* Dynamic Center Prompt or Status Banner */}
        <div className="commit-track-center">
          {status === 'saving' ? (
            <span className="commit-status-text text-saved">
              <Check size={11} /> Saved
            </span>
          ) : status === 'discarding' ? (
            <span className="commit-status-text text-reverted">
              <RotateCcw size={11} /> Reverted
            </span>
          ) : dragX > 20 ? (
            <span className="commit-status-text text-saving-preview">
              Release: Save ➔
            </span>
          ) : dragX < -20 ? (
            <span className="commit-status-text text-discard-preview">
              ⬅ Release: Revert
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
            onClick={triggerDirectSave}
            className={`commit-action-zone commit-zone-right ${isRightActive ? 'zone-active' : ''}`}
            title="Commit modifications to vault snapshot"
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
            title="Dismiss commit slider until next edit"
            aria-label="Dismiss commit banner"
          >
            <X size={10} />
          </button>
        </div>

        {/* Interactive Center Puck (Slider Thumb) */}
        {status === 'idle' && (
          <div
            className={`tactile-commit-puck ${isDragging ? 'puck-dragging' : ''}`}
            style={{
              left: `calc(50% + ${dragX}px)`,
              transform: 'translate(-50%, -50%)',
              transition: isDragging ? 'none' : 'left 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            title="Slide left to Revert, right to Save"
          >
            <div className="tactile-commit-puck-inner">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

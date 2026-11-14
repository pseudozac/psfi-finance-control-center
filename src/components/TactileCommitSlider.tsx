import { useState, useRef, useEffect } from 'react';
import { Check, RotateCcw } from 'lucide-react';

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

  const startXRef = useRef<number>(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Maximum drag distance in px
  const MAX_DRAG = 65;
  const TRIGGER_THRESHOLD = 42;

  // Reset status after action
  useEffect(() => {
    if (status !== 'idle') {
      const timer = setTimeout(() => {
        setStatus('idle');
        setDragX(0);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (status !== 'idle') return;
    setIsDragging(true);
    startXRef.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || status !== 'idle') return;
    const delta = e.clientX - startXRef.current;
    // Clamp within bounds
    const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, delta));
    setDragX(clamped);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragX >= TRIGGER_THRESHOLD) {
      // Trigger SAVE (Right)
      setStatus('saving');
      onSave();
    } else if (dragX <= -TRIGGER_THRESHOLD) {
      // Trigger DISCARD (Left)
      setStatus('discarding');
      onDiscard();
    } else {
      // Snap back to center
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

  if (!isDirty && status === 'idle') {
    return null;
  }

  const isLeftActive = dragX < -15;
  const isRightActive = dragX > 15;

  return (
    <div
      className={`tactile-commit-slider-wrapper fixed z-[95] transition-all duration-300 pointer-events-auto select-none ${
        isDirty || status !== 'idle' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
      }`}
      style={{
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      <div
        ref={trackRef}
        className={`tactile-commit-track relative flex items-center justify-between overflow-hidden shadow-2xl transition-colors duration-200 ${
          status === 'saving'
            ? 'border-emerald-500 bg-emerald-950/80 shadow-emerald-500/20'
            : status === 'discarding'
            ? 'border-amber-500 bg-amber-950/80 shadow-amber-500/20'
            : 'border-solstice/50 bg-[#0d111c]/95'
        }`}
      >
        {/* Left Action Area: Discard */}
        <button
          type="button"
          onClick={triggerDirectDiscard}
          className={`commit-action-zone commit-zone-left flex items-center gap-1.5 transition-all ${
            isLeftActive ? 'opacity-100 scale-105 text-amber-400' : 'opacity-70 text-muted hover:opacity-100'
          }`}
          title="Slide or click to discard changes"
        >
          <RotateCcw size={12} className={isLeftActive ? 'animate-spin-once' : ''} />
          <span className="text-[11px] font-mono font-semibold">Discard</span>
        </button>

        {/* Dynamic Center Prompt or Status Banner */}
        <div className="commit-track-center pointer-events-none text-center">
          {status === 'saving' ? (
            <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 animate-pulse">
              <Check size={12} /> Vault Saved
            </span>
          ) : status === 'discarding' ? (
            <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400 animate-pulse">
              <RotateCcw size={12} /> Reverted
            </span>
          ) : dragX > 25 ? (
            <span className="text-[10px] font-mono font-bold text-emerald-400 animate-pulse">
              Release to Save ➔
            </span>
          ) : dragX < -25 ? (
            <span className="text-[10px] font-mono font-bold text-amber-400 animate-pulse">
              ⬅ Release to Discard
            </span>
          ) : (
            <span className="text-[10px] font-mono text-muted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-solstice animate-ping" />
              <span>Unsaved changes</span>
            </span>
          )}
        </div>

        {/* Right Action Area: Save */}
        <button
          type="button"
          onClick={triggerDirectSave}
          className={`commit-action-zone commit-zone-right flex items-center gap-1.5 transition-all ${
            isRightActive ? 'opacity-100 scale-105 text-emerald-400' : 'opacity-70 text-muted hover:opacity-100'
          }`}
          title="Slide or click to save changes to vault"
        >
          <span className="text-[11px] font-mono font-semibold">Save</span>
          <Check size={13} className={isRightActive ? 'scale-110' : ''} />
        </button>

        {/* Interactive Center Puck (Slider Thumb) */}
        {status === 'idle' && (
          <div
            className={`tactile-commit-puck absolute top-1/2 -translate-y-1/2 flex items-center justify-center cursor-grab active:cursor-grabbing ${
              isDragging ? 'shadow-lg ring-2 ring-solstice/40' : ''
            }`}
            style={{
              left: `calc(50% + ${dragX}px)`,
              transform: 'translate(-50%, -50%)',
              transition: isDragging ? 'none' : 'left 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            title="Drag left to Discard, drag right to Save"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-b from-surface-raised to-surface-base border border-subtle flex items-center justify-center shadow-md">
              <div className="flex gap-0.5">
                <span className="w-0.5 h-2.5 rounded-full bg-muted/60" />
                <span className="w-0.5 h-2.5 rounded-full bg-muted/90" />
                <span className="w-0.5 h-2.5 rounded-full bg-muted/60" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

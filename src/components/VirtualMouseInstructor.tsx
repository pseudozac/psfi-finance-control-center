import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface VirtualMouseInstructorProps {
  targetRect: DOMRect | null;
  stepIndex: number;
  targetId: string;
}

export const VirtualMouseInstructor: React.FC<VirtualMouseInstructorProps> = ({
  targetRect,
  stepIndex,
  targetId,
}) => {
  const [phase, setPhase] = useState<0 | 1>(0);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isClicking, setIsClicking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Cycle sub-phases for each step to demonstrate multi-point interactions
  useEffect(() => {
    setPhase(0);
    const interval = setInterval(() => {
      setPhase((prev) => (prev === 0 ? 1 : 0));
    }, 2800);
    return () => clearInterval(interval);
  }, [stepIndex]);

  // Compute live moving anchor coordinates based on phase
  useEffect(() => {
    if (!targetRect) {
      setCursorPos(null);
      return;
    }

    let x = targetRect.left + 160;
    let y = targetRect.top + 80;
    let dragging = false;

    if (stepIndex === 0) {
      // Step 1: Vitals
      if (phase === 0) {
        x = targetRect.left + Math.min(180, targetRect.width * 0.22);
        y = targetRect.top + 72;
      } else {
        x = targetRect.left + Math.min(420, targetRect.width * 0.48);
        y = targetRect.top + 72;
      }
    } else if (stepIndex === 1) {
      // Step 2: Cashflows (Interactive Slider Drag Demonstration)
      if (phase === 0) {
        dragging = true;
        x = targetRect.left + Math.min(260, targetRect.width * 0.35);
        y = targetRect.top + 175;
      } else {
        x = targetRect.left + Math.min(320, targetRect.width * 0.45);
        y = targetRect.top + 320;
      }
    } else if (stepIndex === 2) {
      // Step 3: Survival & FIRE
      if (phase === 0) {
        x = targetRect.left + Math.min(220, targetRect.width * 0.28);
        y = targetRect.top + 135;
      } else {
        x = targetRect.left + Math.min(460, targetRect.width * 0.55);
        y = targetRect.top + 135;
      }
    } else if (stepIndex === 3) {
      // Step 4: Tax Engine
      if (phase === 0) {
        x = targetRect.left + Math.min(280, targetRect.width * 0.38);
        y = targetRect.top + 120;
      } else {
        x = targetRect.left + Math.min(280, targetRect.width * 0.38);
        y = targetRect.top + 240;
      }
    } else if (stepIndex === 4) {
      // Step 5: Superpowers Dock
      if (phase === 0) {
        x = targetRect.left + Math.min(260, targetRect.width * 0.32);
        y = targetRect.top + 24;
      } else {
        x = targetRect.left + Math.min(480, targetRect.width * 0.65);
        y = targetRect.top + 24;
      }
    }

    setCursorPos({ x, y });
    setIsDragging(dragging);

    // Click effect trigger
    setIsClicking(true);
    const clickTimeout = setTimeout(() => setIsClicking(false), 420);

    return () => clearTimeout(clickTimeout);
  }, [targetRect, stepIndex, targetId, phase]);

  if (!cursorPos) return null;

  // Rich multi-phase contextual callout badges
  const actionBadges: Record<number, [string, string]> = {
    0: [
      'Inspecting Monthly Surplus: Inflows − Outflows',
      'Auditing Compounding Savings Rate: 20%+ Target',
    ],
    1: [
      'Dragging Primary Salary slider to tune cashflow',
      'Configuring custom expense allocation lines',
    ],
    2: [
      'Auditing Tier 1 & Tier 2 Emergency Survival Runway',
      'Simulating FIRE Countdown to 25× Annual Expenses',
    ],
    3: [
      'FY 2024–25 Old vs New Regime optimal verdict',
      'Tuning Section 80CCD(1B) NPS ₹50,000 deduction',
    ],
    4: [
      'Toggling Wealth Terminal for stock-style cashflow',
      'Engaging Privacy Mask to blur figures in public',
    ],
  };

  const currentLabel = actionBadges[stepIndex]?.[phase] || 'Interactive Parameter';

  return (
    <div
      className={`virtual-mouse-instructor ${isDragging ? 'mouse-dragging-active' : ''}`}
      style={{
        transform: `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0)`,
      }}
      aria-hidden="true"
    >
      {/* Click Shockwave Ripple */}
      {isClicking && <div className="virtual-cursor-ripple" />}

      {/* Virtual Cursor Icon with Active States */}
      <div className={`virtual-cursor-pointer ${isClicking ? 'pointer-clicked' : ''} ${isDragging ? 'cursor-drag-hand' : ''}`}>
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="virtual-cursor-svg"
        >
          <path
            d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
            fill={isDragging ? '#ffb454' : '#bf9ff1'}
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>

        {/* Pulse Dot on Pointer Tip */}
        <span className={`cursor-tip-glow ${isDragging ? 'glow-amber' : ''}`} />
      </div>

      {/* Floating Action Callout Tag attached to cursor */}
      <div className="virtual-cursor-callout font-mono">
        <Sparkles size={11} className={isDragging ? 'text-solstice' : 'text-quasar'} />
        <span>{currentLabel}</span>
      </div>
    </div>
  );
};

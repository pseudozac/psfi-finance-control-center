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
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isClicking, setIsClicking] = useState(false);

  // Compute realistic target anchor coordinates inside the highlighted element
  useEffect(() => {
    if (!targetRect) {
      setCursorPos(null);
      return;
    }

    let x = targetRect.left + Math.min(220, targetRect.width * 0.4);
    let y = targetRect.top + Math.min(140, targetRect.height * 0.35);

    // Contextual customization per step
    if (stepIndex === 0) {
      // Step 1: Vitals - point directly to first KPI metric
      x = targetRect.left + Math.min(180, targetRect.width * 0.28);
      y = targetRect.top + 70;
    } else if (stepIndex === 1) {
      // Step 2: Cashflows - point to the slider track
      x = targetRect.left + Math.min(240, targetRect.width * 0.32);
      y = targetRect.top + 175;
    } else if (stepIndex === 2) {
      // Step 3: Survival - point to the Tier gauges
      x = targetRect.left + Math.min(200, targetRect.width * 0.3);
      y = targetRect.top + 130;
    } else if (stepIndex === 3) {
      // Step 4: Tax - point to the optimal verdict tag
      x = targetRect.left + Math.min(250, targetRect.width * 0.35);
      y = targetRect.top + 120;
    } else if (stepIndex === 4) {
      // Step 5: Dock - point to privacy eye / controls
      x = targetRect.left + Math.min(320, targetRect.width * 0.5);
      y = targetRect.top + 26;
    }

    setCursorPos({ x, y });

    // Rhythmic pulse click cycle
    const interval = setInterval(() => {
      setIsClicking(true);
      setTimeout(() => setIsClicking(false), 380);
    }, 2400);

    return () => clearInterval(interval);
  }, [targetRect, stepIndex, targetId]);

  if (!cursorPos) return null;

  // Instructional label per step
  const actionLabels = [
    'Auditing Monthly Surplus: Inflows - Outflows',
    'Drag sliders or type exact rupee amounts',
    'Simulating 3-Tier Survival Runway & FIRE ETA',
    'Comparing Old vs New Regime & Section 87A',
    'Toggle Privacy Mask, View Density & Market P&L',
  ];

  return (
    <div
      className={`virtual-mouse-instructor ${stepIndex === 1 ? 'drag-demonstrator' : ''}`}
      style={{
        transform: `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0)`,
      }}
      aria-hidden="true"
    >
      {/* Expanding Click Wave */}
      {isClicking && <div className="virtual-cursor-ripple" />}

      {/* Virtual Cursor Icon */}
      <div className={`virtual-cursor-pointer ${isClicking ? 'pointer-clicked' : ''}`}>
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="virtual-cursor-svg"
        >
          <path
            d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
            fill="#bf9ff1"
            stroke="#ffffff"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>

        {/* Pulse Dot on Pointer Tip */}
        <span className="cursor-tip-glow" />
      </div>

      {/* Floating Action Callout Tag attached to cursor */}
      <div className="virtual-cursor-callout font-mono">
        <Sparkles size={11} className="text-quasar shrink-0" />
        <span>{actionLabels[stepIndex] || 'Interactive Parameter'}</span>
      </div>
    </div>
  );
};

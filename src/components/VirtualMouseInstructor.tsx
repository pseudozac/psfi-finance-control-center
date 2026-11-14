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
    }, 2600);
    return () => clearInterval(interval);
  }, [stepIndex]);

  // Compute live moving anchor coordinates based on phase
  useEffect(() => {
    if (!targetRect) {
      setCursorPos(null);
      return;
    }

    let x = targetRect.left + 140;
    let y = targetRect.top + 70;
    let dragging = false;

    switch (stepIndex) {
      case 0: // 1. Vitals
        if (phase === 0) {
          x = targetRect.left + Math.min(180, targetRect.width * 0.22);
          y = targetRect.top + 72;
        } else {
          x = targetRect.left + Math.min(420, targetRect.width * 0.48);
          y = targetRect.top + 72;
        }
        break;

      case 1: // 2. Cashflows (Interactive Slider Drag Simulation)
        if (phase === 0) {
          dragging = true;
          x = targetRect.left + Math.min(260, targetRect.width * 0.35);
          y = targetRect.top + 175;
        } else {
          x = targetRect.left + Math.min(320, targetRect.width * 0.45);
          y = targetRect.top + 320;
        }
        break;

      case 2: // 3. Survival & FIRE
        if (phase === 0) {
          x = targetRect.left + Math.min(220, targetRect.width * 0.28);
          y = targetRect.top + 135;
        } else {
          x = targetRect.left + Math.min(460, targetRect.width * 0.55);
          y = targetRect.top + 135;
        }
        break;

      case 3: // 4. Indian Tax Engine
        if (phase === 0) {
          x = targetRect.left + Math.min(280, targetRect.width * 0.38);
          y = targetRect.top + 120;
        } else {
          x = targetRect.left + Math.min(280, targetRect.width * 0.38);
          y = targetRect.top + 240;
        }
        break;

      case 4: // 5. Wealth Terminal Ticker & P&L
        if (phase === 0) {
          x = targetRect.left + Math.min(160, targetRect.width * 0.2);
          y = targetRect.top + 50;
        } else {
          x = targetRect.left + Math.min(520, targetRect.width * 0.65);
          y = targetRect.top + 50;
        }
        break;

      case 5: // 6. Timeframe Velocity (1D to 12M)
        if (phase === 0) {
          x = targetRect.left + 45; // '1D' button
          y = targetRect.top + 22;
        } else {
          x = targetRect.left + 195; // '12M' button
          y = targetRect.top + 22;
        }
        break;

      case 6: // 7. Trajectory Curves
        if (phase === 0) {
          x = targetRect.left + Math.min(320, targetRect.width * 0.4);
          y = targetRect.top + 24;
        } else {
          x = targetRect.left + Math.min(560, targetRect.width * 0.75);
          y = targetRect.top + 24;
        }
        break;

      case 7: // 8. GAAP Statement Table
        if (phase === 0) {
          x = targetRect.left + Math.min(200, targetRect.width * 0.25);
          y = targetRect.top + 90;
        } else {
          x = targetRect.left + Math.min(500, targetRect.width * 0.65);
          y = targetRect.top + 220;
        }
        break;

      default:
        x = targetRect.left + targetRect.width / 2;
        y = targetRect.top + 40;
    }

    setCursorPos({ x, y });
    setIsDragging(dragging);

    // Click effect trigger on phase change
    setIsClicking(true);
    const clickTimeout = setTimeout(() => setIsClicking(false), 380);

    return () => clearTimeout(clickTimeout);
  }, [targetRect, stepIndex, targetId, phase]);

  if (!cursorPos) return null;

  // Contextual callout badges across all 8 steps
  const actionBadges: Record<number, [string, string]> = {
    0: [
      'Auditing Monthly Surplus: Inflows − Outflows',
      'Verifying Compounding Savings Rate: 20%+ Target',
    ],
    1: [
      'Dragging Primary Salary slider to tune cashflow',
      'Auditing discretionary lifestyle & custom outlays',
    ],
    2: [
      'Stress-testing 6-Month Tier 2 Emergency Fortress',
      'Tracking ETA Countdown to 25× Annual Expense FIRE',
    ],
    3: [
      'Evaluating FY 2025–26 & FY 2024–25 Tax Regime Verdict',
      'Optimizing Sec 80CCD(1B) NPS ₹50,000 tax deduction',
    ],
    4: [
      'Inspecting Corporate-Style Operating Cashflow P&L',
      'Calculating Daily Burn Velocity vs Cash Reserves',
    ],
    5: [
      'Switching timeframe to 1D Daily Burn Rate',
      'Switching timeframe to 12M Annual Compounding',
    ],
    6: [
      'Auditing Net Free Cashflow P&L Curve',
      'Simulating Cumulative Reserve & Asset Valuation',
    ],
    7: [
      'Auditing Operating Revenues & Inflow Streams',
      'Reviewing GAAP/IFRS Personal Income Statement',
    ],
  };

  const currentLabel = actionBadges[stepIndex]?.[phase] || 'Interactive Parameter';

  return (
    <div
      className={`virtual-mouse-instructor ${isDragging ? 'mouse-dragging-active' : ''}`}
      style={{
        transform: `translate3d(${Math.round(cursorPos.x)}px, ${Math.round(cursorPos.y)}px, 0)`,
      }}
      aria-hidden="true"
    >
      {/* Click Shockwave Ripple */}
      {isClicking && <div className="virtual-cursor-ripple" />}

      {/* Virtual Cursor Icon with Physical Drag & Pointer States */}
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

        {/* Dynamic Glow Dot on Pointer Tip */}
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

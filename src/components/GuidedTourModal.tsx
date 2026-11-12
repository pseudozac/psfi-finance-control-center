import React, { useEffect, useState, useCallback } from 'react';
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Lightbulb,
} from 'lucide-react';

export interface TourStep {
  targetId: string;
  badge: string;
  badgeColor: 'nebula' | 'quasar' | 'solstice' | 'corona' | 'pulsar';
  title: string;
  description: string;
  tip: string;
  icon: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-vitals',
    badge: '1. REAL-TIME VITALS',
    badgeColor: 'nebula',
    title: 'Financial Health & Monthly Surplus',
    description:
      'Monitor your monthly cash surplus, net inflows, living outflows, and compounding savings rate. These telemetry cards react instantaneously to every change you make.',
    tip: 'A savings rate above 20% turns green as the golden benchmark for wealth building.',
    icon: <TrendingUp size={18} className="text-nebula" />,
  },
  {
    targetId: 'tour-cashflows',
    badge: '2. TACTILE CASHFLOW',
    badgeColor: 'quasar',
    title: 'Income, Expenses & Custom Outflow Lines',
    description:
      'Tune your primary salary, consulting gigs, and living expenses with tactile sliders. You can also add arbitrary custom categories (e.g. Parent Support, Pet Care, Fitness) with dedicated rupee allocations.',
    tip: 'Drag any slider or type exact numbers directly in the input boxes to customize your ledger.',
    icon: <Sparkles size={18} className="text-quasar" />,
  },
  {
    targetId: 'tour-survival',
    badge: '3. SURVIVAL & FIRE',
    badgeColor: 'solstice',
    title: '3-Tier Survival Stress Test & FIRE Countdown',
    description:
      'Stress-test your emergency fund across 3 real-world shocks: Tier 1 Barebones, Tier 2 Lean Living, and Tier 3 Full Lifestyle. Track live ETA countdowns to ₹10L, ₹50L, ₹1 Crore, and your 25× annual expense FIRE milestone.',
    tip: 'Maintaining 6+ months of Tier 2 survival runway builds a fortress against sudden market downturns or career shifts.',
    icon: <ShieldCheck size={18} className="text-solstice" />,
  },
  {
    targetId: 'tour-tax',
    badge: '4. INDIAN TAX ENGINE',
    badgeColor: 'corona',
    title: 'FY 2024–25 Old vs. New Regime Verdict',
    description:
      'Automated side-by-side tax calculation incorporating the ₹75,000 standard deduction, Section 87A rebate (zero tax up to ₹7.75L under New Regime), Section 80CCD(1B) NPS ₹50k deduction, and Metro vs. Non-Metro HRA exemptions.',
    tip: 'PsFi automatically compares both regimes and highlights the OPTIMAL choice with your exact net annual rupee savings.',
    icon: <Receipt size={18} className="text-corona" />,
  },
  {
    targetId: 'tour-dock',
    badge: '5. SUPERPOWERS',
    badgeColor: 'pulsar',
    title: 'Top Dock Controls & Privacy Enclave',
    description:
      'Switch vaults, toggle Privacy Blur Mode (Eye icon) to conceal sensitive figures in public, simulate salary hikes in the What-If Sandbox, toggle Mobile vs Desktop views, or print a 1-page executive statement.',
    tip: 'Tap the Smartphone / Monitor icon anytime to switch between Mobile Touch View and Desktop Power View!',
    icon: <Compass size={18} className="text-pulsar" />,
  },
];

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({ isOpen, onClose, onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[currentStepIndex];

  // Update target spotlight bounding box and scroll into view
  const updateSpotlight = useCallback(() => {
    if (!isOpen) return;
    const el = document.getElementById(step.targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Short delay to allow smooth scroll to finish before calculating final rect
      const timeout = setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
      }, 350);
      return () => clearTimeout(timeout);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, step.targetId]);

  useEffect(() => {
    updateSpotlight();
    window.addEventListener('resize', updateSpotlight);
    return () => window.removeEventListener('resize', updateSpotlight);
  }, [updateSpotlight]);

  // Keyboard navigation: ArrowLeft, ArrowRight, Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStepIndex < TOUR_STEPS.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          onClose();
          onComplete?.();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, onClose, onComplete]);

  if (!isOpen) return null;

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (!isLast) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onClose();
      onComplete?.();
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="tour-backdrop" role="dialog" aria-modal="true" aria-label="PsFi Interactive Guided Tour">
      {/* Target Element Spotlight Cutout */}
      {targetRect && (
        <div
          className="tour-spotlight-box"
          style={{
            top: `${Math.max(0, targetRect.top - 8)}px`,
            left: `${Math.max(0, targetRect.left - 8)}px`,
            width: `${targetRect.width + 16}px`,
            height: `${targetRect.height + 16}px`,
          }}
        />
      )}

      {/* Floating Tour Navigation Card */}
      <div className="tour-floating-card">
        {/* Card Header */}
        <div className="tour-card-header">
          <div className="flex-align gap-2">
            <span className={`tag-pill tag-${step.badgeColor} font-mono font-bold text-xs`}>
              {step.badge}
            </span>
            <span className="tour-step-counter font-mono text-xs text-muted">
              {currentStepIndex + 1} of {TOUR_STEPS.length}
            </span>
          </div>

          <button
            type="button"
            className="tour-close-btn"
            onClick={onClose}
            title="Skip tour (Esc)"
            aria-label="Close tour"
          >
            <X size={15} />
          </button>
        </div>

        {/* Card Body */}
        <div className="tour-card-body">
          <div className="tour-title-row">
            <div className="tour-step-icon">{step.icon}</div>
            <h3 className="tour-title">{step.title}</h3>
          </div>
          <p className="tour-desc">{step.description}</p>

          <div className="tour-tip-box font-mono">
            <Lightbulb size={13} className="text-solstice shrink-0" />
            <span>
              <strong>Pro Tip:</strong> {step.tip}
            </span>
          </div>
        </div>

        {/* Card Footer with Steps & Actions */}
        <div className="tour-card-footer">
          {/* Step Dots */}
          <div className="tour-dots">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`tour-dot ${idx === currentStepIndex ? 'tour-dot-active' : ''}`}
                onClick={() => setCurrentStepIndex(idx)}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="tour-actions">
            {!isFirst && (
              <button
                type="button"
                className="tour-btn btn-secondary font-mono"
                onClick={handlePrev}
              >
                <ArrowLeft size={13} />
                <span>Prev</span>
              </button>
            )}

            <button
              type="button"
              className="tour-btn btn-primary font-mono"
              onClick={handleNext}
            >
              <span>{isLast ? 'Complete Tour' : 'Next Step'}</span>
              {isLast ? <CheckCircle2 size={14} /> : <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Coffee,
  Utensils,
  ShoppingBag,
  RotateCcw,
  Calendar,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import type { FinancePlan, FinanceSummary } from '../types/finance';
import { calculateDailyBurn } from '../lib/impulseShield';
import { formatINR } from '../lib/finance';
import { InfoTooltip } from './InfoTooltip';

interface ImpulseShieldWidgetProps {
  plan: FinancePlan;
  summary: FinanceSummary;
}

export const ImpulseShieldWidget: React.FC<ImpulseShieldWidgetProps> = ({ plan, summary }) => {
  const [spentToday, setSpentToday] = useState<number>(0);
  const [weekendMode, setWeekendMode] = useState<boolean>(() => {
    return localStorage.getItem('psfi_weekend_mode') === 'true';
  });

  const burnState = useMemo(() => {
    return calculateDailyBurn(plan, summary, {
      spentToday,
      weekendModeActive: weekendMode,
    });
  }, [plan, summary, spentToday, weekendMode]);

  const toggleWeekendMode = () => {
    const next = !weekendMode;
    setWeekendMode(next);
    localStorage.setItem('psfi_weekend_mode', String(next));
  };

  const handleQuickAdd = (amount: number) => {
    setSpentToday((prev) => prev + amount);
  };

  const handleReset = () => {
    setSpentToday(0);
  };

  const percentUsedToday = Math.min(
    100,
    Math.round((spentToday / Math.max(1, burnState.effectiveDailyBurnToday)) * 100)
  );

  return (
    <section className="hipuku-card impulse-shield-card flex-col justify-between" id="tour-impulse-shield">
      <div>
        {/* Header */}
        <div className="card-header-row mb-3">
          <div className="flex-align gap-2 flex-wrap min-w-0">
            <span className="tag-pill tag-corona shrink-0 flex-align gap-1">
              <Zap size={11} /> Impulse Shield
            </span>
            <span className="card-title whitespace-nowrap">Daily Discretionary Pocket</span>
            <InfoTooltip
              title="Tactile Daily Burn & SIP Shield"
              explanation="Calculates your mathematically safe discretionary spending allowance per day after subtracting fixed living expenses and committed mutual fund SIPs. If you overspend on dining or gadgets today, it automatically recalibrates future days to guarantee your SIP is never broken."
              benchmark="Rule of thumb: Maintain a daily discretionary burn that preserves at least a 20%+ compounding savings rate."
            />
          </div>

          <div className="flex-align gap-2 shrink-0">
            {burnState.isSipShieldActive ? (
              <span className="tag-pill tag-flare flex-align gap-1 animate-pulse font-mono text-[11px]">
                <ShieldAlert size={12} /> SIP Shield Engaged
              </span>
            ) : burnState.isOverspentToday > 0 ? (
              <span className="tag-pill tag-solstice flex-align gap-1 font-mono text-[11px]">
                <AlertTriangle size={12} /> Auto-Recalibrated
              </span>
            ) : (
              <span className="tag-pill tag-nebula flex-align gap-1 font-mono text-[11px]">
                <ShieldCheck size={12} /> Safe Burn Active
              </span>
            )}
          </div>
        </div>

        {/* Big Key Indicator Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 my-3">
          {/* Box 1: Safe Burn Allowance */}
          <div className="p-3 rounded-xl bg-surface-overlay border border-subtle flex-col justify-between">
            <span className="font-mono text-[11px] text-muted block">Safe Burn / Day</span>
            <strong className="font-mono text-lg text-primary block mt-0.5">
              {formatINR(burnState.effectiveDailyBurnToday)}
            </strong>
            <span className="text-[10px] text-muted block mt-1">
              {burnState.weekendModeActive ? 'Weekend Weighted' : 'Flat 30-Day Spread'}
            </span>
          </div>

          {/* Box 2: Remaining Today */}
          <div className="p-3 rounded-xl bg-surface-overlay border border-subtle flex-col justify-between">
            <span className="font-mono text-[11px] text-muted block">Remaining Today</span>
            <strong
              className={`font-mono text-lg block mt-0.5 ${
                burnState.isOverspentToday > 0 ? 'text-flare' : 'text-nebula'
              }`}
            >
              {burnState.isOverspentToday > 0
                ? `-${formatINR(burnState.isOverspentToday)}`
                : formatINR(burnState.remainingBurnToday)}
            </strong>
            <span className="text-[10px] text-muted block mt-1">
              {burnState.isOverspentToday > 0 ? 'Exceeded Allowance' : 'Safe to Spend'}
            </span>
          </div>

          {/* Box 3: Recalibrated Future Days */}
          <div className="p-3 rounded-xl bg-surface-overlay border border-subtle flex-col justify-between">
            <span className="font-mono text-[11px] text-muted block">Future Daily Cap</span>
            <strong className="font-mono text-lg text-solstice block mt-0.5">
              {formatINR(burnState.recalibratedRemainingDailyBurn)}
            </strong>
            <span className="text-[10px] text-muted block mt-1 font-mono">
              Next {burnState.remainingDaysInMonth - 1} Days
            </span>
          </div>

          {/* Box 4: SIP Untouchable Fortress */}
          <div className="p-3 rounded-xl bg-surface-overlay border border-subtle flex-col justify-between">
            <span className="font-mono text-[11px] text-muted block flex-align gap-1">
              <Lock size={10} className="text-quasar" /> SIP Protected Core
            </span>
            <strong className="font-mono text-lg text-quasar block mt-0.5">
              {formatINR(burnState.sipProtectedAmount)}
            </strong>
            <span className="text-[10px] text-muted block mt-1">100% Ring-Fenced</span>
          </div>
        </div>

        {/* Progress Bar of Today's Burn */}
        <div className="my-3">
          <div className="flex-between items-center text-xs font-mono mb-1.5">
            <span className="text-muted">Today's Consumption Gauge</span>
            <span className={burnState.isOverspentToday > 0 ? 'text-flare font-bold' : 'text-primary'}>
              {spentToday > 0 ? `${formatINR(spentToday)} logged (${percentUsedToday}%)` : '₹0 logged today'}
            </span>
          </div>
          <div className="w-full bg-surface-page rounded-full h-2 overflow-hidden border border-subtle">
            <div
              className={`h-full transition-all duration-300 ${
                burnState.isOverspentToday > 0
                  ? 'bg-flare'
                  : percentUsedToday > 80
                  ? 'bg-solstice'
                  : 'bg-gradient-to-r from-nebula to-quasar'
              }`}
              style={{ width: `${Math.min(100, percentUsedToday)}%` }}
            />
          </div>
        </div>

        {/* Dynamic Overspend Alert / Explanation Banner */}
        {burnState.isOverspentToday > 0 && (
          <div className="p-3 rounded-xl bg-flare/10 border border-flare/30 my-2.5 flex items-start gap-2.5 text-xs">
            <AlertTriangle size={15} className="text-flare shrink-0 mt-0.5" />
            <div className="leading-relaxed text-secondary font-sans">
              <strong className="text-flare block font-mono font-semibold mb-0.5">
                Overspend Absorbed by Impulse Shield
              </strong>
              You logged {formatINR(spentToday)} today (exceeded target allowance by {formatINR(burnState.isOverspentToday)}).
              PsFi automatically rebalanced your remaining {burnState.remainingDaysInMonth - 1} days to{' '}
              <strong className="text-primary font-mono">{formatINR(burnState.recalibratedRemainingDailyBurn)}/day</strong> so
              your <strong className="text-quasar font-mono">{formatINR(burnState.sipProtectedAmount)}</strong> monthly SIP
              remains completely untouched!
            </div>
          </div>
        )}

        {/* Quick Spend Logger Strip */}
        <div className="p-3 rounded-xl bg-surface-overlay border border-subtle mt-3 flex-between items-center gap-3 flex-wrap">
          <div className="flex-align gap-2">
            <span className="font-mono text-xs text-muted">Test Today's Spend:</span>
            <div className="flex-align gap-1.5 flex-wrap">
              <button
                type="button"
                className="action-pill font-mono text-xs flex-align gap-1"
                onClick={() => handleQuickAdd(150)}
                title="Log ₹150 (Chai / Quick Snack)"
              >
                <Coffee size={11} className="text-solstice" /> +₹150
              </button>
              <button
                type="button"
                className="action-pill font-mono text-xs flex-align gap-1"
                onClick={() => handleQuickAdd(600)}
                title="Log ₹600 (Lunch / Cafe)"
              >
                <Utensils size={11} className="text-quasar" /> +₹600
              </button>
              <button
                type="button"
                className="action-pill font-mono text-xs flex-align gap-1"
                onClick={() => handleQuickAdd(1800)}
                title="Log ₹1,800 (Dinner / Shopping)"
              >
                <ShoppingBag size={11} className="text-corona" /> +₹1,800
              </button>
              {spentToday > 0 && (
                <button
                  type="button"
                  className="icon-pill shrink-0"
                  onClick={handleReset}
                  title="Reset today's test spend"
                >
                  <RotateCcw size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Weekend Mode Toggle */}
          <button
            type="button"
            className={`action-pill font-mono text-xs flex-align gap-1.5 ${
              weekendMode ? 'pill-active-mode' : ''
            }`}
            onClick={toggleWeekendMode}
            title={weekendMode ? 'Weekend Splurge Active (Fri-Sun weighted 1.35x)' : 'Flat Daily Spread'}
          >
            <Calendar size={12} className={weekendMode ? 'text-solstice' : 'text-muted'} />
            <span>Weekend Boost: {weekendMode ? 'ON (1.35x)' : 'OFF'}</span>
          </button>
        </div>
      </div>
    </section>
  );
};

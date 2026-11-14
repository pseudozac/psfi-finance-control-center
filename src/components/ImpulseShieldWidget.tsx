import React, { useState, useMemo, useEffect } from 'react';
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
  Hourglass,
  Clock,
  Trash2,
  Plus,
  Flame,
  Award,
  ChevronRight,
  TrendingUp,
  Calculator,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import type { FinancePlan, FinanceSummary } from '../types/finance';
import type { SpendCategory, SpendLogEntry, CoolingOffItem } from '../types/skills';
import { calculateDailyBurn, createCoolingOffItem } from '../lib/impulseShield';
import { formatINR } from '../lib/finance';
import { InfoTooltip } from './InfoTooltip';

interface ImpulseShieldWidgetProps {
  plan: FinancePlan;
  summary: FinanceSummary;
  onPlanChange?: (nextPlan: FinancePlan) => void;
}

type WidgetTab = 'burn_pocket' | 'cooling_chamber';

// Audio feedback helper
function playSynthesizerChime(freq = 580) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.4, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch {
    // Ignore audio errors
  }
}

function playVictoryFanfare() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0.04, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.3);
    });
  } catch {
    // Ignore audio
  }
}

export const ImpulseShieldWidget: React.FC<ImpulseShieldWidgetProps> = ({ plan, summary, onPlanChange }) => {
  const [activeTab, setActiveTab] = useState<WidgetTab>('burn_pocket');

  // Multi-day streak & surplus state persisted in localStorage
  const [streakDays, setStreakDays] = useState<number>(() => {
    const val = localStorage.getItem('psfi_discipline_streak');
    return val ? parseInt(val, 10) : 4;
  });

  const [surplusDestination, setSurplusDestination] = useState<'weekend_pot' | 'bonus_sip'>(() => {
    return (localStorage.getItem('psfi_surplus_dest') as 'weekend_pot' | 'bonus_sip') || 'weekend_pot';
  });

  const [bankedSurplus, setBankedSurplus] = useState<number>(() => {
    const val = localStorage.getItem('psfi_banked_surplus');
    return val ? parseInt(val, 10) : 1850;
  });

  const [weekendMode, setWeekendMode] = useState<boolean>(() => {
    return localStorage.getItem('psfi_weekend_mode') === 'true';
  });

  // Today's itemized spend log
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const [todaySpendLog, setTodaySpendLog] = useState<SpendLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(`psfi_spend_log_${todayDateStr}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 72-Hour Cooling-Off Chamber items
  const [coolingItems, setCoolingItems] = useState<CoolingOffItem[]>(() => {
    try {
      const saved = localStorage.getItem('psfi_cooling_off_items');
      return saved
        ? JSON.parse(saved)
        : [
            createCoolingOffItem('Sony WH-1000XM5 Headphones', 26990, summary.monthlyIncome, 1850),
          ];
    } catch {
      return [];
    }
  });

  // Inputs for adding a cooling-off item
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemUrge, setNewItemUrge] = useState<1 | 2 | 3 | 4>(3);

  // Lifetime impulse capital rescued
  const [lifetimeRescued, setLifetimeRescued] = useState<number>(() => {
    const val = localStorage.getItem('psfi_rescued_capital');
    return val ? parseInt(val, 10) : 42500;
  });

  // "Can I Afford This Today?" Instant Actuarial Calculator State
  const [showAffordCalculator, setShowAffordCalculator] = useState<boolean>(false);
  const [affordQueryName, setAffordQueryName] = useState<string>('');
  const [affordQueryAmount, setAffordQueryAmount] = useState<string>('');

  // Custom spend amount input
  const [customSpendVal, setCustomSpendVal] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Derive total spent today from log
  const spentToday = useMemo(() => {
    return todaySpendLog.reduce((acc, item) => acc + item.amount, 0);
  }, [todaySpendLog]);

  // Persist spend log
  useEffect(() => {
    try {
      localStorage.setItem(`psfi_spend_log_${todayDateStr}`, JSON.stringify(todaySpendLog));
    } catch {
      // Ignore
    }
  }, [todaySpendLog, todayDateStr]);

  // Persist cooling items
  useEffect(() => {
    try {
      localStorage.setItem('psfi_cooling_off_items', JSON.stringify(coolingItems));
    } catch {
      // Ignore
    }
  }, [coolingItems]);

  // Persist lifetime rescued capital
  useEffect(() => {
    try {
      localStorage.setItem('psfi_rescued_capital', String(lifetimeRescued));
    } catch {
      // Ignore
    }
  }, [lifetimeRescued]);

  const burnState = useMemo(() => {
    return calculateDailyBurn(plan, summary, {
      spentToday,
      weekendModeActive: weekendMode,
      disciplineStreakDays: streakDays,
      bankedSurplusRupees: bankedSurplus,
      surplusDestination,
    });
  }, [plan, summary, spentToday, weekendMode, streakDays, bankedSurplus, surplusDestination]);

  const toggleWeekendMode = () => {
    const next = !weekendMode;
    setWeekendMode(next);
    localStorage.setItem('psfi_weekend_mode', String(next));
    playSynthesizerChime(500);
  };

  const handleToggleSurplusDest = () => {
    const next = surplusDestination === 'weekend_pot' ? 'bonus_sip' : 'weekend_pot';
    setSurplusDestination(next);
    localStorage.setItem('psfi_surplus_dest', next);
    playSynthesizerChime(550);
  };

  const handleLogSpend = (category: SpendCategory, title: string, amount: number) => {
    if (amount <= 0) return;
    const entry: SpendLogEntry = {
      id: `spend_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category,
      title,
      amount,
      timestamp: Date.now(),
    };
    setTodaySpendLog((prev) => [entry, ...prev]);
    playSynthesizerChime(420);
  };

  const handleDeleteSpendEntry = (id: string) => {
    setTodaySpendLog((prev) => prev.filter((item) => item.id !== id));
    playSynthesizerChime(320);
  };

  const handleResetToday = () => {
    setTodaySpendLog([]);
    playSynthesizerChime(350);
  };

  const handleAddCoolingItem = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newItemAmount);
    if (!newItemTitle.trim() || isNaN(amount) || amount <= 0) return;

    const item = createCoolingOffItem(
      `${'🔥'.repeat(newItemUrge)} ${newItemTitle.trim()}`,
      amount,
      summary.monthlyIncome,
      burnState.effectiveDailyBurnToday
    );
    setCoolingItems((prev) => [item, ...prev]);
    setNewItemTitle('');
    setNewItemAmount('');
    setNewItemUrge(3);
    playSynthesizerChime(620);
  };

  const handleAbandonCoolingItem = (item: CoolingOffItem) => {
    // Abandoning an impulse purchase is a victory: banks money and increments streak!
    setCoolingItems((prev) => prev.filter((i) => i.id !== item.id));
    const nextStreak = streakDays + 1;
    const nextSurplus = bankedSurplus + Math.round(item.amount * 0.2); // bank 20% of avoided impulse
    const nextRescued = lifetimeRescued + item.amount;
    setStreakDays(nextStreak);
    setBankedSurplus(nextSurplus);
    setLifetimeRescued(nextRescued);
    localStorage.setItem('psfi_discipline_streak', String(nextStreak));
    localStorage.setItem('psfi_banked_surplus', String(nextSurplus));
    localStorage.setItem('psfi_rescued_capital', String(nextRescued));
    playVictoryFanfare();
  };

  // Actuarial calculation for "Can I Afford This Today?"
  const affordQueryParsedAmt = parseFloat(affordQueryAmount) || 0;
  const affordAssessment = useMemo(() => {
    if (affordQueryParsedAmt <= 0) return null;
    const remaining = burnState.remainingBurnToday;
    const safeDaily = burnState.effectiveDailyBurnToday;
    const threeDayPocket = safeDaily * 3;
    const daysConsumed = (affordQueryParsedAmt / Math.max(1, safeDaily)).toFixed(1);
    const tenYearValue = Math.round(affordQueryParsedAmt * 3.106); // 12% CAGR over 10 yrs

    if (affordQueryParsedAmt <= remaining) {
      return {
        verdict: 'safe',
        badge: '🟢 SAFE TO PURCHASE TODAY',
        colorClass: 'text-nebula border-nebula/40 bg-nebula/10',
        summary: `Directly covered by your unspent daily pocket (${formatINR(remaining)}). Zero rupee drag on your committed ${formatINR(burnState.sipProtectedAmount)} monthly SIP.`,
        daysConsumed,
        tenYearValue,
      };
    } else if (affordQueryParsedAmt <= threeDayPocket) {
      return {
        verdict: 'caution',
        badge: '🟡 CAUTION / REBALANCING REQUIRED',
        colorClass: 'text-solstice border-solstice/40 bg-solstice/10',
        summary: `Exceeds today's pocket and borrows ${daysConsumed} days of future discretionary allowance. PsFi will automatically recalibrate your future days down to preserve your SIP.`,
        daysConsumed,
        tenYearValue,
      };
    } else {
      return {
        verdict: 'danger',
        badge: '🔴 SHIELD ENGAGED (HIGH IMPULSE DANGER)',
        colorClass: 'text-flare border-flare/40 bg-flare/10',
        summary: `Consumes ${daysConsumed} days of discretionary cash! Severe risk of breaching your ${formatINR(burnState.sipProtectedAmount)} monthly SIP. Park this purchase in the 72h chamber!`,
        daysConsumed,
        tenYearValue,
      };
    }
  }, [affordQueryParsedAmt, burnState]);

  // 30-Day Liquidity Calendar Mini-Strip dates
  const now = new Date();
  const currentDayOfMonth = now.getDate();
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const handleBuyCoolingItem = (item: CoolingOffItem) => {
    // User decided to purchase: deduct from today's burn pocket and remove from chamber
    handleLogSpend('retail_impulse', item.title, item.amount);
    setCoolingItems((prev) => prev.filter((i) => i.id !== item.id));
    setActiveTab('burn_pocket');
  };

  const handleDeleteCoolingItem = (id: string) => {
    setCoolingItems((prev) => prev.filter((i) => i.id !== id));
    playSynthesizerChime(300);
  };

  const percentUsedToday = Math.min(
    100,
    Math.round((spentToday / Math.max(1, burnState.effectiveDailyBurnToday)) * 100)
  );

  return (
    <section className="hipuku-card impulse-shield-card flex-col justify-between" id="tour-impulse-shield">
      <div>
        {/* Header with Mode Switcher */}
        <div className="card-header-row mb-2.5 flex-between items-center flex-wrap gap-2">
          <div className="flex-align gap-2 flex-wrap min-w-0">
            <span className="tag-pill tag-corona shrink-0 flex-align gap-1 font-mono text-[11px]">
              <Zap size={11} /> Impulse Shield
            </span>
            <span className="card-title whitespace-nowrap">Daily Discretionary Pocket</span>
            <InfoTooltip
              title="Tactile Daily Burn & SIP Shield"
              explanation="Calculates your mathematically safe discretionary spending allowance per day after subtracting fixed living expenses and committed mutual fund SIPs. If you overspend on dining or gadgets today, it automatically recalibrates future days to guarantee your SIP is never broken."
              benchmark="Rule of thumb: Maintain a daily discretionary burn that preserves at least a 20%+ compounding savings rate."
            />
          </div>

          <div className="flex-align gap-1.5 shrink-0 flex-wrap">
            <div className="pill-segmented flex gap-0.5 text-xs font-mono">
              <button
                type="button"
                className={`py-1 px-2.5 flex-align gap-1 text-[11px] ${activeTab === 'burn_pocket' ? 'pill-active' : ''}`}
                onClick={() => {
                  setActiveTab('burn_pocket');
                  playSynthesizerChime(480);
                }}
              >
                <Zap size={11} /> Daily Pocket
              </button>
              <button
                type="button"
                className={`py-1 px-2.5 flex-align gap-1 text-[11px] ${activeTab === 'cooling_chamber' ? 'pill-active' : ''}`}
                onClick={() => {
                  setActiveTab('cooling_chamber');
                  playSynthesizerChime(480);
                }}
              >
                <Hourglass size={11} /> Cooling Chamber ({coolingItems.length})
              </button>
            </div>

            {/* Shield Status Badge */}
            {burnState.isSipShieldActive ? (
              <span className="tag-pill tag-flare flex-align gap-1 animate-pulse font-mono text-[11px]">
                <ShieldAlert size={12} /> SIP Fortress Engaged
              </span>
            ) : burnState.isOverspentToday > 0 ? (
              <span className="tag-pill tag-solstice flex-align gap-1 font-mono text-[11px]">
                <AlertTriangle size={12} /> Recalibrated
              </span>
            ) : (
              <span className="tag-pill tag-nebula flex-align gap-1 font-mono text-[11px]">
                <ShieldCheck size={12} /> Safe Burn Active
              </span>
            )}
          </div>
        </div>

        {/* Lifetime Rescued Wealth Counter Strip */}
        <div className="p-2 px-3 rounded-lg bg-surface-page border border-subtle mb-2.5 flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <span className="tag-pill tag-nebula flex items-center gap-1 font-mono text-[11px] font-semibold">
              <Award size={12} /> ₹{lifetimeRescued.toLocaleString('en-IN')} Capital Rescued
            </span>
            <span className="text-[11px] text-muted hidden sm:inline">
              Shielded from impulsive desires
            </span>
          </div>
          <span className="font-mono text-[11px] text-secondary">
            Protecting <strong className="text-solstice">₹{Math.round(lifetimeRescued * 3.106).toLocaleString('en-IN')}</strong> in 10-Yr Compounded Wealth
          </span>
        </div>

        {/* 1-Click "Can I Afford This Today?" Calculator Toggle & Drawer */}
        <div className="mb-2.5">
          <button
            type="button"
            className={`w-full py-2 px-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 transition-all cursor-pointer ${
              showAffordCalculator
                ? 'bg-quasar/10 border-quasar/40 text-primary shadow-sm'
                : 'bg-surface-overlay border-subtle text-muted hover:text-primary'
            }`}
            onClick={() => {
              setShowAffordCalculator(!showAffordCalculator);
              playSynthesizerChime(520);
            }}
          >
            <span className="flex items-center gap-1.5 font-semibold text-primary">
              <Calculator size={13} className="text-quasar shrink-0" />
              <span>Can I Afford This Today?</span>
              <span className="text-[10px] text-muted font-normal hidden sm:inline">(Actuarial Check)</span>
            </span>
            <span className="text-[10.5px] font-mono text-quasar flex items-center gap-1 bg-quasar/10 px-2 py-0.5 rounded border border-quasar/25 shrink-0">
              <span>{showAffordCalculator ? 'Close Calculator ▲' : 'Open 1-Click Verdict ▼'}</span>
            </span>
          </button>

          {showAffordCalculator && (
            <div className="mt-2 p-3 rounded-xl bg-surface-raised border border-quasar/30 flex flex-col gap-2.5 animate-slideDown">
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <input
                  type="text"
                  placeholder="Item Name (e.g. Swiggy Splurge, Smart Watch, Weekend Trip)"
                  className="hipuku-input text-xs flex-1 min-w-[180px] py-1.5 px-2.5"
                  value={affordQueryName}
                  onChange={(e) => setAffordQueryName(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Price (₹)"
                  className="hipuku-input text-xs font-mono w-32 py-1.5 px-2.5"
                  value={affordQueryAmount}
                  onChange={(e) => setAffordQueryAmount(e.target.value)}
                />
              </div>

              {affordAssessment && (
                <div className={`p-2.5 rounded-lg border flex flex-col gap-2 ${affordAssessment.colorClass}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold tracking-wider">{affordAssessment.badge}</span>
                    <span className="font-mono text-[11px]">
                      Consumes <strong>{affordAssessment.daysConsumed} days</strong> of discretionary allowance
                    </span>
                  </div>
                  <p className="text-xs m-0 leading-relaxed text-secondary">{affordAssessment.summary}</p>
                  <div className="flex items-center justify-between font-mono text-[11px] pt-1.5 border-t border-subtle">
                    <span className="text-muted">10-Yr Compounded Opportunity Cost (12% CAGR):</span>
                    <strong className="text-solstice">₹{affordAssessment.tenYearValue.toLocaleString('en-IN')}</strong>
                  </div>

                  {/* 1-Click Action Buttons */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      className="action-pill text-xs py-1 px-3 bg-nebula/20 text-nebula border-nebula/40 flex items-center gap-1 cursor-pointer"
                      onClick={() => {
                        handleLogSpend('other', affordQueryName.trim() || 'Discretionary Purchase', affordQueryParsedAmt);
                        setAffordQueryAmount('');
                        setAffordQueryName('');
                        setShowAffordCalculator(false);
                      }}
                    >
                      <Zap size={11} /> Deduct from Today's Pocket
                    </button>
                    <button
                      type="button"
                      className="action-pill text-xs py-1 px-3 bg-solstice/20 text-solstice border-solstice/40 flex items-center gap-1 cursor-pointer"
                      onClick={() => {
                        const item = createCoolingOffItem(
                          affordQueryName.trim() || 'Impulse Wishlist Item',
                          affordQueryParsedAmt,
                          summary.monthlyIncome,
                          burnState.effectiveDailyBurnToday
                        );
                        setCoolingItems((prev) => [item, ...prev]);
                        setAffordQueryAmount('');
                        setAffordQueryName('');
                        setShowAffordCalculator(false);
                        setActiveTab('cooling_chamber');
                      }}
                    >
                      <Hourglass size={11} /> Park in 72h Chamber
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 30-Day Liquidity Calendar Mini-Strip */}
        <div className="p-2.5 px-3 rounded-xl bg-surface-overlay border border-subtle mb-3">
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] font-mono text-muted mb-2">
            <div className="flex items-center gap-1.5 text-primary font-medium min-w-0 flex-wrap">
              <CalendarDays size={12} className="text-quasar shrink-0" />
              <span>Day {currentDayOfMonth} of {daysInCurrentMonth}</span>
              <span className="text-muted/40">·</span>
              <span className="text-secondary text-[10px]">30-Day Liquidity Track</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-solstice font-semibold bg-solstice/10 px-2 py-0.5 rounded border border-solstice/20 text-[10px]">
                {daysInCurrentMonth - currentDayOfMonth} Days to Salary Cycle
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 w-full overflow-x-auto pb-1 no-scrollbar select-none">
            {Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1).map((dayNum) => {
              const isPast = dayNum < currentDayOfMonth;
              const isCurrent = dayNum === currentDayOfMonth;
              const isPayday = dayNum === 1;

              return (
                <div
                  key={dayNum}
                  title={`Day ${dayNum}${isPayday ? ' · Salary Replenishment' : ''}${isCurrent ? ' · Today (Active)' : isPast ? ' · Shield Maintained' : ''}`}
                  className={`flex-1 min-w-[8px] h-3.5 rounded-sm flex items-center justify-center font-mono text-[8px] transition-all relative ${
                    isCurrent
                      ? 'bg-solstice text-black font-bold ring-2 ring-solstice/60 shadow-sm shadow-solstice/40 scale-110 z-10'
                      : isPayday
                      ? 'bg-amber-400/80 text-black font-bold'
                      : isPast
                      ? 'bg-nebula/60 text-white/80'
                      : 'bg-white/5 border border-white/10 text-muted/40'
                  }`}
                >
                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-black block" />}
                  {isPayday && !isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-amber-900 block" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* TAB 1: DAILY BURN POCKET */}
        {activeTab === 'burn_pocket' ? (
          <div>
            {/* 4 Big Key Indicator Boxes */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 my-2.5">
              {/* Box 1: Safe Burn Allowance */}
              <div className="p-2.5 rounded-xl bg-surface-overlay border border-subtle/80 hover:border-quasar/30 transition-all flex flex-col justify-between">
                <span className="font-mono text-[10.5px] text-muted block">Safe Burn / Day</span>
                <strong className="font-mono text-lg text-primary block mt-0.5">
                  {formatINR(burnState.effectiveDailyBurnToday)}
                </strong>
                <span className="text-[9.5px] text-muted block mt-1">
                  {burnState.weekendModeActive ? 'Weekend Weighted' : 'Flat 30-Day Spread'}
                </span>
              </div>

              {/* Box 2: Remaining Today */}
              <div className="p-2.5 rounded-xl bg-surface-overlay border border-subtle/80 hover:border-nebula/30 transition-all flex flex-col justify-between">
                <span className="font-mono text-[10.5px] text-muted block">Remaining Today</span>
                <strong
                  className={`font-mono text-lg block mt-0.5 ${
                    burnState.isOverspentToday > 0 ? 'text-flare' : 'text-nebula'
                  }`}
                >
                  {burnState.isOverspentToday > 0
                    ? `-${formatINR(burnState.isOverspentToday)}`
                    : formatINR(burnState.remainingBurnToday)}
                </strong>
                <span className="text-[9.5px] text-muted block mt-1">
                  {burnState.isOverspentToday > 0 ? 'Exceeded Allowance' : 'Safe to Spend'}
                </span>
              </div>

              {/* Box 3: Recalibrated Future Days */}
              <div className="p-2.5 rounded-xl bg-surface-overlay border border-subtle/80 hover:border-solstice/30 transition-all flex flex-col justify-between">
                <span className="font-mono text-[10.5px] text-muted block">Future Daily Cap</span>
                <strong className="font-mono text-lg text-solstice block mt-0.5">
                  {formatINR(burnState.recalibratedRemainingDailyBurn)}
                </strong>
                <span className="text-[9.5px] text-muted block mt-1 font-mono">
                  Next {burnState.remainingDaysInMonth - 1} Days
                </span>
              </div>

              {/* Box 4: SIP Untouchable Fortress */}
              <div className="p-2.5 rounded-xl bg-surface-overlay border border-subtle/80 hover:border-quasar/30 transition-all flex flex-col justify-between">
                <span className="font-mono text-[10.5px] text-muted block flex items-center gap-1">
                  <Lock size={10} className="text-quasar" /> SIP Protected Core
                </span>
                <strong className="font-mono text-lg text-quasar block mt-0.5">
                  {formatINR(burnState.sipProtectedAmount)}
                </strong>
                <span className="text-[9.5px] text-muted block mt-1">100% Ring-Fenced</span>
              </div>
            </div>

            {/* Sub-Bar: Discipline Streak & Surplus Rollover */}
            <div className="p-2.5 rounded-xl bg-surface-page border border-subtle mb-3 flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="tag-pill tag-corona flex items-center gap-1 font-mono text-[11px] font-semibold">
                  <Flame size={12} className="text-corona" /> {streakDays}-Day Discipline Streak
                </span>
                <span className="text-muted text-[11px] hidden sm:inline">
                  Every day under burn protects your wealth
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] text-muted">Surplus Rollover:</span>
                <button
                  type="button"
                  className="action-pill font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                  onClick={handleToggleSurplusDest}
                  title="Switch unspent surplus destination between Weekend Pot and Auto-Compound Bonus SIP"
                >
                  {surplusDestination === 'weekend_pot' ? (
                    <>🏖️ Weekend Pot ({formatINR(bankedSurplus)})</>
                  ) : (
                    <>📈 Bonus SIP ({formatINR(bankedSurplus)})</>
                  )}
                </button>

                {onPlanChange && bankedSurplus > 0 && surplusDestination === 'bonus_sip' && (
                  <button
                    type="button"
                    className="action-pill font-mono text-[10.5px] py-1 px-2.5 bg-nebula/20 text-nebula border-nebula/40 flex items-center gap-1 cursor-pointer hover:bg-nebula/30"
                    onClick={() => {
                      onPlanChange({
                        ...plan,
                        savings: {
                          ...plan.savings,
                          monthlySip: (plan.savings.monthlySip || 0) + bankedSurplus,
                        },
                      });
                      playVictoryFanfare();
                      setBankedSurplus(0);
                      localStorage.setItem('psfi_banked_surplus', '0');
                    }}
                    title={`Boost monthly SIP permanently by ₹${bankedSurplus.toLocaleString('en-IN')}`}
                  >
                    <Sparkles size={11} /> Boost SIP (+{formatINR(bankedSurplus)})
                  </button>
                )}
              </div>
            </div>

            {/* Consumption Gauge */}
            <div className="mb-3">
              <div className="flex-between items-center text-xs font-mono mb-1">
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

            {/* Dynamic Overspend Alert */}
            {burnState.isOverspentToday > 0 && (
              <div className="p-2.5 rounded-xl bg-flare/10 border border-flare/30 my-2.5 flex items-start gap-2 text-xs">
                <AlertTriangle size={14} className="text-flare shrink-0 mt-0.5" />
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

            {/* Category-Aware Micro-Envelopes */}
            <div className="p-3 rounded-xl bg-surface-overlay border border-subtle mt-2.5">
              <div className="flex-between items-center mb-2.5">
                <span className="font-mono text-xs text-muted flex-align gap-1">
                  <Zap size={12} className="text-corona" /> 1-Tap Category Micro-Envelopes:
                </span>
                <button
                  type="button"
                  className={`action-pill font-mono text-[11px] flex-align gap-1 ${weekendMode ? 'pill-active-mode' : ''}`}
                  onClick={toggleWeekendMode}
                  title={weekendMode ? 'Weekend Splurge Active (Fri-Sun weighted 1.35x)' : 'Flat Daily Spread'}
                >
                  <Calendar size={11} className={weekendMode ? 'text-solstice' : 'text-muted'} />
                  <span>Weekend Mode: {weekendMode ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Envelope 1: Chai & Quick Delivery */}
                <div className="p-2 rounded-lg bg-surface-page border border-subtle">
                  <div className="flex-align gap-1 text-[11px] font-mono text-solstice mb-1.5 font-semibold">
                    <Coffee size={12} /> Chai & Quick Snack
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <button
                      type="button"
                      className="action-pill font-mono text-[10.5px] py-1 px-2 flex-1 text-center"
                      onClick={() => handleLogSpend('chai_quick', 'Cutting Chai / Samosa', 50)}
                    >
                      +₹50
                    </button>
                    <button
                      type="button"
                      className="action-pill font-mono text-[10.5px] py-1 px-2 flex-1 text-center"
                      onClick={() => handleLogSpend('chai_quick', 'Blinkit / Zepto Snack', 150)}
                    >
                      +₹150
                    </button>
                    <button
                      type="button"
                      className="action-pill font-mono text-[10.5px] py-1 px-2 flex-1 text-center"
                      onClick={() => handleLogSpend('chai_quick', 'Artisan Coffee', 300)}
                    >
                      +₹300
                    </button>
                  </div>
                </div>

                {/* Envelope 2: Dining Out & Cafes */}
                <div className="p-2 rounded-lg bg-surface-page border border-subtle">
                  <div className="flex-align gap-1 text-[11px] font-mono text-quasar mb-1.5 font-semibold">
                    <Utensils size={12} /> Dining Out & Social
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <button
                      type="button"
                      className="action-pill font-mono text-[10.5px] py-1 px-2 flex-1 text-center"
                      onClick={() => handleLogSpend('dining_night', 'Work Lunch', 500)}
                    >
                      +₹500
                    </button>
                    <button
                      type="button"
                      className="action-pill font-mono text-[10.5px] py-1 px-2 flex-1 text-center"
                      onClick={() => handleLogSpend('dining_night', 'Dinner with Friends', 1200)}
                    >
                      +₹1,200
                    </button>
                    <button
                      type="button"
                      className="action-pill font-mono text-[10.5px] py-1 px-2 flex-1 text-center"
                      onClick={() => handleLogSpend('dining_night', 'Weekend Splurge Dinner', 2500)}
                    >
                      +₹2,500
                    </button>
                  </div>
                </div>

                {/* Envelope 3: Retail & Online Shopping */}
                <div className="p-2 rounded-lg bg-surface-page border border-subtle">
                  <div className="flex-align gap-1 text-[11px] font-mono text-corona mb-1.5 font-semibold">
                    <ShoppingBag size={12} /> Retail & Shopping
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <button
                      type="button"
                      className="action-pill font-mono text-[10.5px] py-1 px-2 flex-1 text-center"
                      onClick={() => handleLogSpend('retail_impulse', 'Impulse Amazon / Myntra', 1000)}
                    >
                      +₹1k
                    </button>
                    <button
                      type="button"
                      className="action-pill font-mono text-[10.5px] py-1 px-2 flex-1 text-center"
                      onClick={() => handleLogSpend('retail_impulse', 'Apparel Purchase', 2500)}
                    >
                      +₹2.5k
                    </button>
                    <button
                      type="button"
                      className="action-pill font-mono text-[10.5px] py-1 px-2 flex-1 text-center"
                      onClick={() => handleLogSpend('retail_impulse', 'Electronics / Gadget', 5000)}
                    >
                      +₹5k
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Spend Input Toggle */}
              <div className="mt-2.5 pt-2 border-t border-subtle flex-between items-center gap-2 flex-wrap">
                {showCustomInput ? (
                  <form
                    className="flex-align gap-2 flex-1 min-w-[200px]"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const amt = parseFloat(customSpendVal);
                      if (!isNaN(amt) && amt > 0) {
                        handleLogSpend('other', 'Custom Discretionary', amt);
                        setCustomSpendVal('');
                        setShowCustomInput(false);
                      }
                    }}
                  >
                    <input
                      type="number"
                      placeholder="Amount in ₹"
                      className="hipuku-input text-xs font-mono py-1 px-2 flex-1"
                      value={customSpendVal}
                      onChange={(e) => setCustomSpendVal(e.target.value)}
                      autoFocus
                    />
                    <button type="submit" className="action-pill font-mono text-xs py-1 px-2.5">
                      Log
                    </button>
                    <button
                      type="button"
                      className="icon-pill"
                      onClick={() => setShowCustomInput(false)}
                    >
                      <RotateCcw size={11} />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="text-xs font-mono text-muted hover:text-primary flex-align gap-1"
                    onClick={() => setShowCustomInput(true)}
                  >
                    <Plus size={11} /> Log custom amount
                  </button>
                )}

                {todaySpendLog.length > 0 && (
                  <button
                    type="button"
                    className="text-xs font-mono text-flare/80 hover:text-flare flex-align gap-1"
                    onClick={handleResetToday}
                    title="Reset today's logged spending"
                  >
                    <RotateCcw size={11} /> Reset Today ({todaySpendLog.length} items)
                  </button>
                )}
              </div>
            </div>

            {/* Today's Itemized Log List (if any) */}
            {todaySpendLog.length > 0 && (
              <div className="mt-2.5 max-h-36 overflow-y-auto pr-1 flex flex-col gap-1.5">
                {todaySpendLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-1.5 px-2.5 rounded-lg bg-surface-page border border-subtle flex-between items-center text-xs"
                  >
                    <div className="flex-align gap-2">
                      {entry.category === 'chai_quick' ? (
                        <Coffee size={12} className="text-solstice" />
                      ) : entry.category === 'dining_night' ? (
                        <Utensils size={12} className="text-quasar" />
                      ) : (
                        <ShoppingBag size={12} className="text-corona" />
                      )}
                      <span className="text-primary truncate font-medium">{entry.title}</span>
                    </div>

                    <div className="flex-align gap-2">
                      <span className="font-mono font-semibold text-primary">{formatINR(entry.amount)}</span>
                      <button
                        type="button"
                        className="text-muted hover:text-flare"
                        onClick={() => handleDeleteSpendEntry(entry.id)}
                        title="Remove entry"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: 72-HOUR IMPULSE COOLING-OFF CHAMBER */
          <div className="cooling-off-chamber-container mt-2">
            <div className="p-3 rounded-xl bg-surface-page border border-subtle mb-3">
              <div className="flex-between items-start gap-2 mb-2">
                <div>
                  <h4 className="font-semibold text-xs text-primary m-0 flex-align gap-1.5">
                    <Hourglass size={13} className="text-solstice" /> 72-Hour Impulse Wishlist Shield
                  </h4>
                  <p className="text-[11px] text-muted m-0 mt-0.5">
                    Park desired impulse purchases here. Actuarial studies show 84% of purchase desires dissolve after 72 hours of cooling off.
                  </p>
                </div>
                <span className="tag-pill tag-quasar font-mono text-[10px]">
                  {coolingItems.length} in Chamber
                </span>
              </div>

              {/* Add Item Form with Urge Intensity Meter */}
              <form onSubmit={handleAddCoolingItem} className="flex flex-col gap-2 mt-2">
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <input
                    type="text"
                    placeholder="e.g. AirPods Pro 2, Mechanical Keyboard, Leather Jacket"
                    className="hipuku-input text-xs flex-1 min-w-[180px] py-1.5 px-2.5"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    className="hipuku-input text-xs font-mono w-28 py-1.5 px-2.5"
                    value={newItemAmount}
                    onChange={(e) => setNewItemAmount(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="action-pill font-mono text-xs py-1.5 px-3 flex items-center gap-1 bg-solstice/20 text-solstice border-solstice/40 shrink-0 cursor-pointer"
                  >
                    <Plus size={12} /> Lock in Chamber
                  </button>
                </div>

                {/* Urge Intensity Selector */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="font-mono text-[10.5px] text-muted flex items-center gap-1">
                    Urge Intensity:
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {([1, 2, 3, 4] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        className={`action-pill text-[10px] py-0.5 px-2 font-mono ${newItemUrge === level ? 'pill-active-mode' : ''}`}
                        onClick={() => setNewItemUrge(level)}
                      >
                        {'🔥'.repeat(level)} {level === 1 ? 'Mild' : level === 2 ? 'Moderate' : level === 3 ? 'Acute' : 'Retail Fever'}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            {/* List of Active Cooling Items */}
            {coolingItems.length === 0 ? (
              <div className="p-6 rounded-xl bg-surface-overlay border border-dashed border-subtle text-center text-xs text-muted">
                <ShieldCheck size={24} className="text-nebula mx-auto mb-1.5 opacity-80" />
                <p className="m-0 font-medium text-secondary">The Cooling Chamber is empty.</p>
                <p className="m-0 mt-0.5 text-[11px]">
                  No impulsive items parked. Any gadget or splurge you're tempted to buy can be tested here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
                {coolingItems.map((item) => {
                  const msLeft = Math.max(0, item.expiresAt - Date.now());
                  const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
                  const minsLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
                  const isCool = msLeft === 0;

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-surface-overlay border border-subtle flex flex-col gap-2"
                    >
                      <div className="flex-between items-start gap-2">
                        <div>
                          <h5 className="font-semibold text-xs text-primary m-0">{item.title}</h5>
                          <span className="font-mono text-sm font-bold text-solstice block mt-0.5">
                            {formatINR(item.amount)}
                          </span>
                        </div>

                        <div className="flex-align gap-1.5">
                          <span
                            className={`tag-pill font-mono text-[10px] flex-align gap-1 ${
                              isCool ? 'tag-nebula' : 'tag-corona'
                            }`}
                          >
                            <Clock size={10} />
                            {isCool ? 'Cooling Complete' : `${hoursLeft}h ${minsLeft}m Left`}
                          </span>
                          <button
                            type="button"
                            className="icon-pill text-muted hover:text-flare"
                            onClick={() => handleDeleteCoolingItem(item.id)}
                            title="Remove without logging"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Opportunity Cost & Labor Equivalents */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 font-mono text-[11px] p-2 rounded-lg bg-surface-page border border-subtle">
                        <div>
                          <span className="text-[10px] text-muted block">Discretionary Days:</span>
                          <strong className="text-secondary">{item.burnEquivalentDays} Days of Living</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted block">Work Hours Cost:</span>
                          <strong className="text-secondary">{item.workHoursEquivalent} Hours Hard Labor</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted block flex-align gap-0.5">
                            <TrendingUp size={10} className="text-nebula" /> 10-Yr Nifty 50 Value:
                          </span>
                          <strong className="text-nebula font-bold">{formatINR(item.tenYearOpportunityCost)}</strong>
                        </div>
                      </div>

                      {/* Decisions */}
                      <div className="flex-between items-center gap-2 pt-1 border-t border-subtle flex-wrap">
                        <button
                          type="button"
                          className="action-pill font-mono text-xs py-1 px-2.5 flex-align gap-1 bg-nebula/15 text-nebula border-nebula/30"
                          onClick={() => handleAbandonCoolingItem(item)}
                          title="Abandon this purchase! Bank the money and protect future wealth"
                        >
                          <Award size={12} /> Abandon & Bank as Compound Wealth
                        </button>

                        <button
                          type="button"
                          className="text-xs font-mono text-muted hover:text-primary flex-align gap-1"
                          onClick={() => handleBuyCoolingItem(item)}
                          title="Proceed to purchase and deduct from today's allowance"
                        >
                          <span>Buy Anyway</span>
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

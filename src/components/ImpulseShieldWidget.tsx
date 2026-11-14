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
  Car,
  Undo2,
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

  // Last logged entry for 1-tap Undo
  const [lastLoggedEntry, setLastLoggedEntry] = useState<SpendLogEntry | null>(null);

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
    setLastLoggedEntry(entry);
    playSynthesizerChime(420);
  };

  const handleUndoLastSpend = () => {
    if (!lastLoggedEntry) return;
    setTodaySpendLog((prev) => prev.filter((item) => item.id !== lastLoggedEntry.id));
    setLastLoggedEntry(null);
    playSynthesizerChime(320);
  };

  const handleDeleteSpendEntry = (id: string) => {
    setTodaySpendLog((prev) => prev.filter((item) => item.id !== id));
    if (lastLoggedEntry?.id === id) setLastLoggedEntry(null);
    playSynthesizerChime(320);
  };

  const handleResetToday = () => {
    setTodaySpendLog([]);
    setLastLoggedEntry(null);
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
    playSynthesizerChime(640);
  };

  const handleAbandonCoolingItem = (item: CoolingOffItem) => {
    setCoolingItems((prev) => prev.filter((x) => x.id !== item.id));
    setLifetimeRescued((prev) => prev + item.amount);
    setStreakDays((prev) => {
      const next = prev + 1;
      localStorage.setItem('psfi_discipline_streak', String(next));
      return next;
    });
    playVictoryFanfare();
  };

  const handleBuyCoolingItem = (item: CoolingOffItem) => {
    setCoolingItems((prev) => prev.filter((x) => x.id !== item.id));
    handleLogSpend('other', `Cooling Bought: ${item.title.replace(/[🔥\s]/g, '')}`, item.amount);
  };

  const handleDeleteCoolingItem = (id: string) => {
    setCoolingItems((prev) => prev.filter((x) => x.id !== id));
    playSynthesizerChime(300);
  };

  const percentUsedToday = useMemo(() => {
    if (burnState.effectiveDailyBurnToday <= 0) return 0;
    return Math.min(200, Math.round((spentToday / burnState.effectiveDailyBurnToday) * 100));
  }, [spentToday, burnState.effectiveDailyBurnToday]);

  // Calendar dates
  const now = new Date();
  const currentDayOfMonth = now.getDate();
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // Instant Afford Assessment
  const affordQueryParsedAmt = parseFloat(affordQueryAmount) || 0;
  const affordAssessment = useMemo(() => {
    if (affordQueryParsedAmt <= 0) return null;
    const dailyTarget = burnState.effectiveDailyBurnToday;
    const remaining = burnState.remainingBurnToday;
    const daysConsumed = dailyTarget > 0 ? (affordQueryParsedAmt / dailyTarget).toFixed(1) : '99+';

    // 10-Yr opportunity cost in Nifty 50 at 12% CAGR: FV = PV * (1 + 0.12)^10 ≈ 3.106
    const tenYearValue = Math.round(affordQueryParsedAmt * 3.1058);

    if (affordQueryParsedAmt <= remaining) {
      return {
        verdict: 'safe',
        badge: '✅ 100% AFFORDABLE TODAY',
        colorClass: 'border-nebula/40 bg-nebula/10 text-nebula',
        summary: `You have ${formatINR(remaining)} safe buffer left today. Spending ${formatINR(affordQueryParsedAmt)} leaves ${formatINR(remaining - affordQueryParsedAmt)} for remaining hours with zero impact on monthly savings.`,
        daysConsumed,
        tenYearValue,
      };
    } else if (affordQueryParsedAmt <= remaining + (burnState.recalibratedRemainingDailyBurn * 2)) {
      return {
        verdict: 'caution',
        badge: '⚠️ STRETCH PURCHASE',
        colorClass: 'border-solstice/40 bg-solstice/10 text-solstice',
        summary: `Exceeds today's remaining pocket by ${formatINR(affordQueryParsedAmt - remaining)}. If purchased, your daily allowance will decrease from ${formatINR(burnState.effectiveDailyBurnToday)}/day to ${formatINR(burnState.recalibratedRemainingDailyBurn)}/day to protect your SIP.`,
        daysConsumed,
        tenYearValue,
      };
    } else {
      return {
        verdict: 'hazard',
        badge: '🚨 IMPULSE HAZARD',
        colorClass: 'border-flare/40 bg-flare/10 text-flare',
        summary: `Consumes ${daysConsumed} full days of living allowance! Would wipe out today's pocket and severely reduce future spending power. Recommend parking in 72-Hour Cooling Chamber.`,
        daysConsumed,
        tenYearValue,
      };
    }
  }, [affordQueryParsedAmt, burnState]);

  // Radial Speedometer Circumference Math
  const RADIUS = 44;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = useMemo(() => {
    const fraction = Math.min(1, Math.max(0, spentToday / (burnState.effectiveDailyBurnToday || 1)));
    return CIRCUMFERENCE * (1 - fraction);
  }, [spentToday, burnState.effectiveDailyBurnToday, CIRCUMFERENCE]);

  return (
    <section className="hipuku-card impulse-shield-card flex-col justify-between" id="tour-impulse-shield">
      <div>
        {/* Header with Mode Switcher */}
        <div className="card-header-row mb-3 flex-between items-center flex-wrap gap-2">
          <div className="flex-align gap-2 flex-wrap min-w-0">
            <span className="tag-pill tag-corona shrink-0 flex-align gap-1 font-mono text-[11px]">
              <Zap size={11} /> Impulse Shield
            </span>
            <span className="card-title whitespace-nowrap">Daily Discretionary Pocket</span>
            <InfoTooltip
              title="Tactile Daily Burn & SIP Shield"
              explanation="Calculates your mathematically safe discretionary spending allowance per day after subtracting fixed living expenses and committed mutual fund SIPs. If you overspend today, it automatically recalibrates future days to guarantee your SIP is never broken."
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
        <div className="p-2 px-3 rounded-xl bg-surface-page border border-subtle mb-3 flex items-center justify-between gap-2 flex-wrap text-xs">
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
        <div className="mb-3">
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
            <span className="flex items-center gap-2 font-semibold text-primary">
              <Calculator size={14} className="text-quasar shrink-0" />
              <span>Can I Afford This Today?</span>
              <span className="text-[10.5px] text-muted font-normal hidden sm:inline">· Actuarial Check</span>
            </span>
            <span className="text-[11px] font-mono text-quasar flex items-center gap-1 bg-quasar/15 px-2.5 py-0.5 rounded-full border border-quasar/30 shrink-0">
              <span>{showAffordCalculator ? 'Close Scanner ▲' : 'Open 1-Click Scanner ▼'}</span>
            </span>
          </button>

          {showAffordCalculator && (
            <div className="mt-2 p-3.5 rounded-xl bg-surface-raised border border-quasar/30 flex flex-col gap-3 animate-slideDown">
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

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
                <span className="text-muted text-[10px]">Quick Presets:</span>
                {[250, 600, 1500, 4500, 12000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="action-pill text-[10.5px] py-0.5 px-2 font-mono hover:text-quasar"
                    onClick={() => {
                      setAffordQueryAmount(String(preset));
                      if (!affordQueryName) {
                        setAffordQueryName(
                          preset === 250
                            ? 'Coffee & Snack'
                            : preset === 600
                            ? 'Food Delivery'
                            : preset === 1500
                            ? 'Casual Dinner'
                            : preset === 4500
                            ? 'Retail Apparel'
                            : 'Weekend Getaway'
                        );
                      }
                      playSynthesizerChime(480);
                    }}
                  >
                    ₹{preset.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>

              {affordAssessment && (
                <div className={`p-3 rounded-lg border flex flex-col gap-2 ${affordAssessment.colorClass}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold tracking-wider">{affordAssessment.badge}</span>
                    <span className="font-mono text-[11px]">
                      Consumes <strong>{affordAssessment.daysConsumed} days</strong> of daily pocket
                    </span>
                  </div>
                  <p className="text-xs m-0 leading-relaxed text-secondary font-sans">{affordAssessment.summary}</p>
                  <div className="flex items-center justify-between font-mono text-[11px] pt-1.5 border-t border-subtle">
                    <span className="text-muted">10-Yr Compounded Cost in Nifty 50 (12% CAGR):</span>
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
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-muted mb-2">
            <div className="flex items-center gap-2 text-primary font-medium min-w-0 flex-wrap">
              <CalendarDays size={13} className="text-quasar shrink-0" />
              <span className="bg-white/5 px-2 py-0.5 rounded border border-white/10 text-white font-semibold whitespace-nowrap">
                Day {currentDayOfMonth} of {daysInCurrentMonth}
              </span>
              <span className="text-secondary text-[10px] hidden xs:inline whitespace-nowrap">
                30-Day Liquidity Track
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-solstice font-semibold bg-solstice/10 px-2.5 py-0.5 rounded-full border border-solstice/25 text-[10.5px] whitespace-nowrap">
                {daysInCurrentMonth - currentDayOfMonth} Days Remaining
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
            {/* Visual Radial Burn Gauge & Core Metrics Grid */}
            <div className="p-3.5 rounded-2xl bg-surface-overlay border border-subtle mb-3 flex flex-col md:flex-row items-center gap-4">
              {/* Radial Donut Gauge */}
              <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    className="stroke-subtle/30"
                    strokeWidth="8"
                    fill="none"
                  />
                  {/* Dynamic Value Arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r={RADIUS}
                    className={`transition-all duration-500 ${
                      burnState.isOverspentToday > 0
                        ? 'stroke-flare'
                        : percentUsedToday > 75
                        ? 'stroke-solstice'
                        : 'stroke-nebula'
                    }`}
                    strokeWidth="8"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none p-1">
                  <span className="text-[10px] font-mono text-muted uppercase tracking-wider leading-tight">Left</span>
                  <span
                    className={`font-mono text-sm sm:text-base font-bold leading-tight whitespace-nowrap ${
                      burnState.isOverspentToday > 0 ? 'text-flare' : 'text-primary'
                    }`}
                  >
                    {burnState.isOverspentToday > 0
                      ? `-${formatINR(burnState.isOverspentToday)}`
                      : formatINR(burnState.remainingBurnToday)}
                  </span>
                  <span className="text-[9.5px] font-mono text-muted/80 whitespace-nowrap mt-0.5">{percentUsedToday}% burned</span>
                </div>
              </div>

              {/* 4 Pillars Stat Row */}
              <div className="grid grid-cols-2 gap-2 w-full">
                {/* Box 1: Safe Burn Allowance */}
                <div className="p-2.5 rounded-xl bg-surface-page border border-subtle/70">
                  <span className="font-mono text-[10px] text-muted block">Safe Burn / Day</span>
                  <strong className="font-mono text-base text-primary block mt-0.5 whitespace-nowrap">
                    {formatINR(burnState.effectiveDailyBurnToday)}
                  </strong>
                  <span className="text-[9.5px] text-muted block mt-0.5">
                    {burnState.weekendModeActive ? 'Weekend Weighted' : 'Flat 30-Day Spread'}
                  </span>
                </div>

                {/* Box 2: Logged Today */}
                <div className="p-2.5 rounded-xl bg-surface-page border border-subtle/70">
                  <span className="font-mono text-[10px] text-muted block">Spent Today</span>
                  <strong className="font-mono text-base text-secondary block mt-0.5 whitespace-nowrap">
                    {formatINR(spentToday)}
                  </strong>
                  <span className="text-[9.5px] text-muted block mt-0.5">
                    {todaySpendLog.length} transaction{todaySpendLog.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Box 3: Recalibrated Future Cap */}
                <div className="p-2.5 rounded-xl bg-surface-page border border-subtle/70">
                  <span className="font-mono text-[10px] text-muted block">Future Daily Cap</span>
                  <strong className="font-mono text-base text-solstice block mt-0.5 whitespace-nowrap">
                    {formatINR(burnState.recalibratedRemainingDailyBurn)}
                  </strong>
                  <span className="text-[9.5px] text-muted block mt-0.5 font-mono">
                    Next {burnState.remainingDaysInMonth - 1} Days
                  </span>
                </div>

                {/* Box 4: SIP Untouchable Fortress */}
                <div className="p-2.5 rounded-xl bg-surface-page border border-subtle/70">
                  <span className="font-mono text-[10px] text-muted block flex items-center gap-1">
                    <Lock size={10} className="text-quasar" /> SIP Protected
                  </span>
                  <strong className="font-mono text-base text-quasar block mt-0.5 whitespace-nowrap">
                    {formatINR(burnState.sipProtectedAmount)}
                  </strong>
                  <span className="text-[9.5px] text-muted block mt-0.5">100% Ring-Fenced</span>
                </div>
              </div>
            </div>

            {/* Sub-Bar: Discipline Streak & Surplus Rollover */}
            <div className="p-2.5 px-3 rounded-xl bg-surface-page border border-subtle mb-3 flex items-center justify-between gap-2 flex-wrap text-xs">
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
                <div className="flex items-center gap-1.5">
                  {lastLoggedEntry && (
                    <button
                      type="button"
                      className="action-pill font-mono text-[10.5px] py-0.5 px-2 text-flare border-flare/30 flex items-center gap-1 hover:bg-flare/10"
                      onClick={handleUndoLastSpend}
                      title={`Undo last logged spend: ${lastLoggedEntry.title} (${formatINR(lastLoggedEntry.amount)})`}
                    >
                      <Undo2 size={10} /> Undo {formatINR(lastLoggedEntry.amount)}
                    </button>
                  )}
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {/* Envelope 1: Chai & Quick Delivery */}
                <div className="p-2.5 rounded-lg bg-surface-page border border-subtle">
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
                <div className="p-2.5 rounded-lg bg-surface-page border border-subtle">
                  <div className="flex-align gap-1 text-[11px] font-mono text-quasar mb-1.5 font-semibold">
                    <Utensils size={12} /> Dining & Social
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <button
                      type="button"
                      className="action-pill font-mono text-[10.5px] py-1 px-2 flex-1 text-center"
                      onClick={() => handleLogSpend('dining_night', 'Work Lunch', 400)}
                    >
                      +₹400
                    </button>
                    <button
                      type="button"
                      className="action-pill font-mono text-[10.5px] py-1 px-2 flex-1 text-center"
                      onClick={() => handleLogSpend('dining_night', 'Dinner with Friends', 850)}
                    >
                      +₹850
                    </button>
                    <button
                      type="button"
                      className="action-pill font-mono text-[10.5px] py-1 px-2 flex-1 text-center"
                      onClick={() => handleLogSpend('dining_night', 'Weekend Splurge Dinner', 1800)}
                    >
                      +₹1,800
                    </button>
                  </div>
                </div>

                {/* Envelope 3: Retail & Online Shopping */}
                <div className="p-2.5 rounded-lg bg-surface-page border border-subtle">
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

                {/* Envelope 4: Commute, Metro & Cabs */}
                <div className="p-2.5 rounded-lg bg-surface-page border border-subtle">
                  <div className="flex-align gap-1 text-[11px] font-mono text-nebula mb-1.5 font-semibold">
                    <Car size={12} /> Commute & Cabs
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <button
                      type="button"
                      className="action-pill font-mono text-[10.5px] py-1 px-2 flex-1 text-center"
                      onClick={() => handleLogSpend('other', 'Auto / Metro Card Recharge', 150)}
                    >
                      +₹150
                    </button>
                    <button
                      type="button"
                      className="action-pill font-mono text-[10.5px] py-1 px-2 flex-1 text-center"
                      onClick={() => handleLogSpend('other', 'Uber / Ola Daily Cab', 350)}
                    >
                      +₹350
                    </button>
                    <button
                      type="button"
                      className="action-pill font-mono text-[10.5px] py-1 px-2 flex-1 text-center"
                      onClick={() => handleLogSpend('other', 'Airport / Intercity Cab', 750)}
                    >
                      +₹750
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Spend Input Toggle */}
              <div className="mt-2.5 pt-2 border-t border-subtle flex-between items-center gap-2 flex-wrap">
                {!showCustomInput ? (
                  <button
                    type="button"
                    className="text-xs font-mono text-muted hover:text-primary flex-align gap-1"
                    onClick={() => setShowCustomInput(true)}
                  >
                    <Plus size={12} /> Log Custom Amount
                  </button>
                ) : (
                  <div className="flex-align gap-2 flex-wrap w-full">
                    <input
                      type="number"
                      placeholder="Amount (₹)"
                      className="hipuku-input text-xs font-mono w-28 py-1 px-2"
                      value={customSpendVal}
                      onChange={(e) => setCustomSpendVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const amt = parseFloat(customSpendVal);
                          if (!isNaN(amt) && amt > 0) {
                            handleLogSpend('other', 'Custom Spend', amt);
                            setCustomSpendVal('');
                            setShowCustomInput(false);
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="action-pill font-mono text-xs py-1 px-2.5 bg-solstice/20 text-solstice border-solstice/40 cursor-pointer"
                      onClick={() => {
                        const amt = parseFloat(customSpendVal);
                        if (!isNaN(amt) && amt > 0) {
                          handleLogSpend('other', 'Custom Spend', amt);
                          setCustomSpendVal('');
                          setShowCustomInput(false);
                        }
                      }}
                    >
                      Log Spend
                    </button>
                    <button
                      type="button"
                      className="action-pill font-mono text-xs py-1 px-2 text-muted"
                      onClick={() => setShowCustomInput(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {todaySpendLog.length > 0 && (
                  <button
                    type="button"
                    className="action-pill font-mono text-[10.5px] py-0.5 px-2 text-muted hover:text-flare flex-align gap-1"
                    onClick={handleResetToday}
                    title="Clear today's spend log"
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
                      ) : entry.category === 'retail_impulse' ? (
                        <ShoppingBag size={12} className="text-corona" />
                      ) : (
                        <Zap size={12} className="text-nebula" />
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

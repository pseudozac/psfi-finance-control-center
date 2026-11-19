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
  Car,
  Undo2,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import type { FinancePlan, FinanceSummary } from '../types/finance';
import type { SpendCategory, SpendLogEntry, CoolingOffItem } from '../types/skills';
import { calculateDailyBurn, createCoolingOffItem } from '../lib/impulseShield';
import { formatINR } from '../lib/finance';
import { parseIndianAmount } from '../lib/cmdKParser';
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
    osc.frequency.exponentialRampToValueAtTime(freq * 1.35, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch {
    // Audio fail silent
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
    // Audio fail silent
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
  const [customCategory, setCustomCategory] = useState<SpendCategory>('other');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Smart Quick-Spend Omnibar state
  const [quickSpendText, setQuickSpendText] = useState('');

  // Last logged entry for 1-tap Undo with countdown
  const [lastLoggedEntry, setLastLoggedEntry] = useState<SpendLogEntry | null>(null);

  // Persist spend log
  useEffect(() => {
    try {
      localStorage.setItem(`psfi_spend_log_${todayDateStr}`, JSON.stringify(todaySpendLog));
    } catch {
      // ignore
    }
  }, [todaySpendLog, todayDateStr]);

  // Persist cooling items
  useEffect(() => {
    try {
      localStorage.setItem('psfi_cooling_off_items', JSON.stringify(coolingItems));
    } catch {
      // ignore
    }
  }, [coolingItems]);

  // Persist rescued capital
  useEffect(() => {
    try {
      localStorage.setItem('psfi_rescued_capital', String(lifetimeRescued));
    } catch {
      // ignore
    }
  }, [lifetimeRescued]);

  // Aggregate today's spent amount
  const spentToday = useMemo(() => {
    return todaySpendLog.reduce((acc, curr) => acc + curr.amount, 0);
  }, [todaySpendLog]);

  // Compute live actuarial daily burn state
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
    playSynthesizerChime(540);
  };

  const handleLogSpend = (category: SpendCategory, title: string, amount: number) => {
    const newEntry: SpendLogEntry = {
      id: `spend_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      amount,
      category,
      title,
    };
    setTodaySpendLog((prev) => [newEntry, ...prev]);
    setLastLoggedEntry(newEntry);
    playSynthesizerChime(620);
    try {
      navigator.vibrate?.([15]);
    } catch {
      // ignore
    }
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

  // End-of-Day unspent allowance
  const unspentToday = Math.max(0, burnState.effectiveDailyBurnToday - spentToday);

  // Sweep unspent daily allowance into banked surplus & advance discipline streak
  const handleSweepUnspentSurplus = () => {
    if (unspentToday <= 0) return;
    const newBanked = bankedSurplus + unspentToday;
    setBankedSurplus(newBanked);
    localStorage.setItem('psfi_banked_surplus', String(newBanked));

    const newStreak = streakDays + 1;
    setStreakDays(newStreak);
    localStorage.setItem('psfi_discipline_streak', String(newStreak));

    const sweepEntry: SpendLogEntry = {
      id: `sweep_${Date.now()}`,
      timestamp: Date.now(),
      amount: unspentToday,
      category: 'other',
      title: `🏦 Banked Daily Surplus (Discipline Streak: ${newStreak}d)`,
    };
    setTodaySpendLog((prev) => [sweepEntry, ...prev]);
    setLastLoggedEntry(sweepEntry);
    playVictoryFanfare();
  };

  // Smart quick-spend parser from text input
  const handleSmartQuickSpend = () => {
    const raw = quickSpendText.trim();
    if (!raw) return;

    let title = 'Quick Expense';
    let amount = 0;
    let category: SpendCategory = 'other';

    const numOnly = parseIndianAmount(raw);
    if (numOnly !== null && numOnly > 0) {
      amount = numOnly;
      title = 'Quick Expense';
    } else {
      const endNumMatch = raw.match(/^(.*?)\s+([0-9.a-z₹,]+)$/i);
      const startNumMatch = raw.match(/^([0-9.a-z₹,]+)\s+(.*?)$/i);

      if (endNumMatch) {
        const parsedAmt = parseIndianAmount(endNumMatch[2]);
        if (parsedAmt && parsedAmt > 0) {
          amount = parsedAmt;
          title = endNumMatch[1].trim() || 'Expense';
        }
      } else if (startNumMatch) {
        const parsedAmt = parseIndianAmount(startNumMatch[1]);
        if (parsedAmt && parsedAmt > 0) {
          amount = parsedAmt;
          title = startNumMatch[2].trim() || 'Expense';
        }
      }
    }

    if (amount <= 0) return;

    const lowerTitle = title.toLowerCase();
    if (/chai|tea|coffee|snack|biscuit|zepto|blinkit|samosa|bakery/i.test(lowerTitle)) {
      category = 'chai_quick';
    } else if (/swiggy|zomato|food|lunch|dinner|meal|burger|pizza|restaurant|cafe/i.test(lowerTitle)) {
      category = 'dining_night';
    } else if (/amazon|flipkart|myntra|clothes|shirt|shoes|shopping|gadget|retail/i.test(lowerTitle)) {
      category = 'retail_impulse';
    } else if (/uber|ola|rapido|cab|metro|auto|transit|petrol|fuel|commute/i.test(lowerTitle)) {
      category = 'other';
    }

    handleLogSpend(category, title, amount);
    setQuickSpendText('');
  };

  // Live Category Spend Breakdown
  const categoryBreakdown = useMemo(() => {
    if (spentToday <= 0) return null;
    const totals: Record<SpendCategory, number> = { chai_quick: 0, dining_night: 0, retail_impulse: 0, other: 0 };
    todaySpendLog.forEach((item) => {
      totals[item.category] = (totals[item.category] || 0) + item.amount;
    });
    return {
      chai: { amount: totals.chai_quick, pct: Math.round((totals.chai_quick / spentToday) * 100) },
      dining: { amount: totals.dining_night, pct: Math.round((totals.dining_night / spentToday) * 100) },
      retail: { amount: totals.retail_impulse, pct: Math.round((totals.retail_impulse / spentToday) * 100) },
      other: { amount: totals.other, pct: Math.round((totals.other / spentToday) * 100) },
    };
  }, [todaySpendLog, spentToday]);

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
  const daysRemainingInMonth = Math.max(0, daysInCurrentMonth - currentDayOfMonth);

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
        colorClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
        summary: `Safe buffer: spending ${formatINR(affordQueryParsedAmt)} leaves ${formatINR(remaining - affordQueryParsedAmt)} unspent today with zero impact on monthly SIPs.`,
        daysConsumed,
        tenYearValue,
      };
    } else if (affordQueryParsedAmt <= remaining + (burnState.recalibratedRemainingDailyBurn * 2)) {
      return {
        verdict: 'caution',
        badge: '⚠️ STRETCH PURCHASE',
        colorClass: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
        summary: `Exceeds today by ${formatINR(affordQueryParsedAmt - remaining)}. Future days recalibrate to ${formatINR(burnState.recalibratedRemainingDailyBurn)}/day to protect committed SIPs.`,
        daysConsumed,
        tenYearValue,
      };
    } else {
      return {
        verdict: 'hazard',
        badge: '🚨 IMPULSE HAZARD',
        colorClass: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
        summary: `Consumes ${daysConsumed} full days of living allowance! Severely cuts future spending power. Strongly recommend parking in the 72-Hour Cooling Chamber.`,
        daysConsumed,
        tenYearValue,
      };
    }
  }, [affordQueryParsedAmt, burnState]);

  return (
    <section className="hipuku-card impulse-shield-card flex-col justify-between" id="tour-impulse-shield">
      <div>
        {/* Modern Unified Header */}
        <div className="card-header-row mb-5 flex items-start sm:items-center justify-between flex-wrap gap-3.5">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="tag-pill tag-corona font-mono text-[10.5px] font-bold tracking-wider inline-flex items-center gap-1.5 py-0.5 px-2.5">
                <Zap size={11} className="text-corona" /> Impulse Shield
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <h3 className="card-title text-base sm:text-lg font-bold text-primary m-0 tracking-tight">
                Daily Discretionary Pocket
              </h3>
              <InfoTooltip
                title="Tactile Daily Burn & SIP Shield"
                explanation="Calculates your mathematically safe discretionary spending allowance per day after subtracting fixed living expenses and committed mutual fund SIPs. Overspending today dynamically recalibrates future days to guarantee your SIP is never broken."
                benchmark="Rule of thumb: Maintain a daily discretionary burn that preserves at least a 20%+ compounding savings rate."
              />
            </div>
          </div>

          <div className="pill-segmented flex gap-0.5 text-xs font-mono shrink-0 self-start sm:self-center">
            <button
              type="button"
              className={`py-1.5 px-3 flex items-center gap-1.5 text-[11px] font-semibold transition-all ${activeTab === 'burn_pocket' ? 'pill-active' : ''}`}
              onClick={() => {
                setActiveTab('burn_pocket');
                playSynthesizerChime(480);
              }}
            >
              <Zap size={12} className={activeTab === 'burn_pocket' ? 'text-solstice' : ''} />
              <span>Today's Pocket</span>
            </button>
            <button
              type="button"
              className={`py-1.5 px-3 flex items-center gap-1.5 text-[11px] font-semibold transition-all ${activeTab === 'cooling_chamber' ? 'pill-active' : ''}`}
              onClick={() => {
                setActiveTab('cooling_chamber');
                playSynthesizerChime(480);
              }}
            >
              <Hourglass size={12} className={activeTab === 'cooling_chamber' ? 'text-quasar' : ''} />
              <span>Cooling Chamber ({coolingItems.length})</span>
            </button>
          </div>
        </div>

        {activeTab === 'burn_pocket' ? (
          <div className="flex flex-col gap-4">
            {/* HERO COCKPIT: CLEAN ALLOWANCE & TELEMETRY CLUSTER */}
            <div className="daily-burn-hero">
              <div className="daily-burn-stat-row">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[11px] font-mono text-muted uppercase tracking-wider">
                      Safe Daily Allowance
                    </span>
                    {burnState.isSipShieldActive ? (
                      <span className="tag-pill tag-flare flex items-center gap-1 animate-pulse font-mono text-[10px] font-bold py-0.5 px-2">
                        <ShieldAlert size={11} /> SIP Fortress Engaged
                      </span>
                    ) : burnState.isOverspentToday > 0 ? (
                      <span className="tag-pill tag-solstice flex items-center gap-1 font-mono text-[10px] font-bold py-0.5 px-2">
                        <AlertTriangle size={11} /> Recalibrated: -{formatINR(burnState.isOverspentToday)}
                      </span>
                    ) : (
                      <span className="tag-pill tag-nebula flex items-center gap-1 font-mono text-[10px] font-bold py-0.5 px-2">
                        <ShieldCheck size={11} /> Safe Burn Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2.5">
                    <span
                      className={`font-mono text-3xl font-extrabold tracking-tight ${
                        burnState.isOverspentToday > 0 ? 'text-flare' : 'text-nebula'
                      }`}
                    >
                      {burnState.isOverspentToday > 0
                        ? `-${formatINR(burnState.isOverspentToday)}`
                        : formatINR(burnState.remainingBurnToday)}
                    </span>
                    <span className="text-xs font-mono text-muted">
                      remaining of {formatINR(burnState.effectiveDailyBurnToday)} cap
                    </span>
                  </div>
                  <p className="text-[11px] text-muted m-0 mt-1.5 font-sans leading-normal">
                    {burnState.isOverspentToday > 0 ? (
                      <span className="text-flare font-medium">
                        ⚠️ Over limit by {formatINR(burnState.isOverspentToday)}. Future days adapt to protect committed SIPs.
                      </span>
                    ) : (
                      <span>
                        Next {daysRemainingInMonth} days recalibrate to{' '}
                        <strong className="text-primary font-mono">{formatINR(burnState.recalibratedRemainingDailyBurn)}/day</strong> to guarantee SIP.
                      </span>
                    )}
                  </p>
                </div>

                {/* 3 Hipuku Telemetry Metric Pills */}
                <div className="pocket-telemetry-cluster">
                  {/* Pill 1: Ring-Fenced SIP */}
                  <div className="hipuku-metric-pill py-2 px-3" title="Core wealth compounding is 100% ring-fenced">
                    <span className="metric-label text-[10.5px] flex items-center gap-1 text-quasar font-semibold">
                      <Lock size={10} /> SIP Fortress
                    </span>
                    <span className="metric-val text-sm font-mono text-primary font-bold">
                      {formatINR(burnState.sipProtectedAmount)}
                      <span className="text-[10px] font-sans font-normal text-muted">/mo</span>
                    </span>
                  </div>

                  {/* Pill 2: Streak */}
                  <div className="hipuku-metric-pill py-2 px-3" title="Days staying within safe daily cap">
                    <span className="metric-label text-[10.5px] flex items-center gap-1 text-corona font-semibold">
                      <Flame size={11} className="text-corona animate-pulse" /> Discipline
                    </span>
                    <span className="metric-val text-sm font-mono text-solstice font-bold">
                      {streakDays} Days
                    </span>
                  </div>

                  {/* Pill 3: Surplus / Weekend Pot */}
                  <div className="hipuku-metric-pill py-2 px-3">
                    <button
                      type="button"
                      onClick={handleToggleSurplusDest}
                      className="metric-label text-[10.5px] flex items-center gap-1 text-muted hover:text-primary cursor-pointer transition-colors"
                      title="Click to toggle unspent surplus destination"
                    >
                      <span>{surplusDestination === 'weekend_pot' ? '🏖️ Weekend Pot' : '📈 Bonus SIP'}</span>
                      <ArrowUpRight size={10} />
                    </button>
                    <span className="metric-val text-sm font-mono text-nebula font-bold">
                      {formatINR(bankedSurplus)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Linear Burn Meter */}
              <div className="burn-progress-track">
                <div className="flex justify-between items-center text-[10.5px] font-mono text-muted mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        burnState.isOverspentToday > 0 ? 'bg-rose-500' : 'bg-emerald-400'
                      }`}
                    />
                    <span>Daily Burn Rate: {Math.min(100, Math.round(percentUsedToday))}%</span>
                  </span>
                  <span>Spent Today: {formatINR(spentToday)}</span>
                </div>
                <div className="burn-progress-bar-bg">
                  <div
                    className={`burn-progress-bar-fill ${
                      burnState.isOverspentToday > 0
                        ? 'bg-flare'
                        : percentUsedToday > 75
                        ? 'bg-solstice'
                        : 'bg-nebula'
                    }`}
                    style={{ width: `${Math.min(100, percentUsedToday)}%` }}
                  />
                </div>
              </div>

              {/* Bonus SIP or Weekend Mode Controller */}
              <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-subtle text-[11px] font-mono">
                <button
                  type="button"
                  className={`py-1 px-2.5 rounded-lg text-[10.5px] flex items-center gap-1.5 cursor-pointer transition-colors ${
                    weekendMode
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-surface-card text-muted hover:text-primary border border-subtle'
                  }`}
                  onClick={toggleWeekendMode}
                  title="Toggle Weekend Weighted Allowance (Fri-Sun 1.35x multiplier)"
                >
                  <Calendar size={11} />
                  <span>Weekend Mode: <strong>{weekendMode ? '1.35x ON' : 'FLAT OFF'}</strong></span>
                </button>

                {onPlanChange && bankedSurplus > 0 && surplusDestination === 'bonus_sip' && (
                  <button
                    type="button"
                    className="py-1 px-2.5 rounded-lg font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 hover:bg-emerald-500/30 cursor-pointer"
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
                    <Sparkles size={11} />
                    <span>Boost SIP by {formatINR(bankedSurplus)}</span>
                  </button>
                )}
              </div>
            </div>

            {/* END-OF-DAY SURPLUS SWEEP BANNER */}
            {unspentToday > 0 && (
              <div className="pocket-sweep-banner">
                <div className="pocket-sweep-left">
                  <div className="pocket-sweep-icon-box">
                    <Sparkles size={18} className="text-emerald-400" />
                  </div>
                  <div className="pocket-sweep-content">
                    <div className="pocket-sweep-headline">
                      <span className="pocket-sweep-amount">
                        {formatINR(unspentToday)} Unspent Allowance
                      </span>
                      <span className="pocket-sweep-tag">
                        ✦ Surplus Sweep Ready
                      </span>
                    </div>
                    <span className="pocket-sweep-desc">
                      Discipline rewarded: Transfer remaining allowance to your {surplusDestination === 'weekend_pot' ? 'Weekend Pot' : 'Bonus SIP'} and advance your streak!
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="pocket-sweep-btn"
                  onClick={handleSweepUnspentSurplus}
                  title="Sweep unspent daily allowance into banked surplus pot"
                >
                  <Sparkles size={13} className="text-emerald-300" />
                  <span>Bank Surplus (+1 🔥)</span>
                </button>
              </div>
            )}

            {/* 1-TAP TACTILE MICRO-ENVELOPES (PHYSICAL FINTECH PAD) */}
            <div className="hipuku-card" style={{ padding: '16px 18px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-xl)', border: 'var(--hair) solid var(--border-subtle)' }}>
              <div className="flex-between mb-3 flex-wrap" style={{ gap: '8px' }}>
                <span className="font-mono text-xs font-bold text-primary flex-align" style={{ gap: '6px' }}>
                  <Zap size={14} className="text-solstice" /> 1-Tap Fast Expense Envelopes
                </span>

                <div className="flex-align" style={{ gap: '8px' }}>
                  {lastLoggedEntry && (
                    <button
                      type="button"
                      className="action-pill font-mono text-[11px] py-1 px-2.5 text-rose-300 border-rose-500/40 bg-rose-500/10 flex-align cursor-pointer animate-pulse"
                      style={{ gap: '4px' }}
                      onClick={handleUndoLastSpend}
                      title={`Undo last logged transaction: ${lastLoggedEntry.title} (${formatINR(lastLoggedEntry.amount)})`}
                    >
                      <Undo2 size={11} /> Undo {formatINR(lastLoggedEntry.amount)}
                    </button>
                  )}
                  {todaySpendLog.length > 0 && (
                    <button
                      type="button"
                      className="text-[11px] font-mono text-muted hover:text-rose-400 flex-align cursor-pointer"
                      style={{ gap: '4px' }}
                      onClick={handleResetToday}
                      title="Clear all today's transactions"
                    >
                      <RotateCcw size={11} /> Reset Day
                    </button>
                  )}
                </div>
              </div>

              {/* SMART QUICK-LOGGER INPUT */}
              <div className="pocket-smart-logger">
                <div className="pocket-smart-input-box">
                  <span className="pocket-smart-icon">
                    <Zap size={14} />
                  </span>
                  <input
                    type="text"
                    className="pocket-smart-field"
                    placeholder="Quick spend: 'Swiggy 350', 'Chai 40', 'Uber 180', 'Metro 50', '250'..."
                    value={quickSpendText}
                    onChange={(e) => setQuickSpendText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSmartQuickSpend();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="pocket-smart-submit"
                    onClick={handleSmartQuickSpend}
                  >
                    <Plus size={11} /> Log Spend ↵
                  </button>
                </div>
              </div>

              {/* 4 Envelopes */}
              <div className="pocket-envelopes-grid">
                {/* Envelope 1: Chai & Quick Snack */}
                <div className="pocket-envelope-card pocket-envelope-amber">
                  <div className="pocket-envelope-header">
                    <span className="pocket-envelope-title">
                      <Coffee size={13} /> Chai & Snacks
                    </span>
                    <span className="pocket-envelope-tag">Daily Fuel</span>
                  </div>
                  <div className="pocket-chips-row">
                    <button
                      type="button"
                      className="pocket-spend-chip"
                      onClick={() => handleLogSpend('chai_quick', 'Cutting Chai / Quick Bite', 50)}
                      title="Log ₹50 for tea or quick street bite"
                    >
                      +₹50
                    </button>
                    <button
                      type="button"
                      className="pocket-spend-chip"
                      onClick={() => handleLogSpend('chai_quick', 'Quick Grocery Snack / Zepto', 150)}
                      title="Log ₹150 for quick snack or quick commerce delivery"
                    >
                      +₹150
                    </button>
                    <button
                      type="button"
                      className="pocket-spend-chip"
                      onClick={() => handleLogSpend('chai_quick', 'Artisan Coffee / Bakery', 300)}
                      title="Log ₹300 for premium specialty coffee"
                    >
                      +₹300
                    </button>
                  </div>
                </div>

                {/* Envelope 2: Dining & Social */}
                <div className="pocket-envelope-card pocket-envelope-purple">
                  <div className="pocket-envelope-header">
                    <span className="pocket-envelope-title">
                      <Utensils size={13} /> Dining & Social
                    </span>
                    <span className="pocket-envelope-tag">Outings</span>
                  </div>
                  <div className="pocket-chips-row">
                    <button
                      type="button"
                      className="pocket-spend-chip"
                      onClick={() => handleLogSpend('dining_night', 'Work Lunch / Cafe', 400)}
                      title="Log ₹400 for lunch or casual cafe meal"
                    >
                      +₹400
                    </button>
                    <button
                      type="button"
                      className="pocket-spend-chip"
                      onClick={() => handleLogSpend('dining_night', 'Dinner with Friends', 850)}
                      title="Log ₹850 for social dinner with friends"
                    >
                      +₹850
                    </button>
                    <button
                      type="button"
                      className="pocket-spend-chip"
                      onClick={() => handleLogSpend('dining_night', 'Weekend Splurge Dinner', 1800)}
                      title="Log ₹1,800 for weekend luxury dining"
                    >
                      +₹1.8k
                    </button>
                  </div>
                </div>

                {/* Envelope 3: Retail & Shopping */}
                <div className="pocket-envelope-card pocket-envelope-rose">
                  <div className="pocket-envelope-header">
                    <span className="pocket-envelope-title">
                      <ShoppingBag size={13} /> Retail & Shopping
                    </span>
                    <span className="pocket-envelope-tag">Discretionary</span>
                  </div>
                  <div className="pocket-chips-row">
                    <button
                      type="button"
                      className="pocket-spend-chip"
                      onClick={() => handleLogSpend('retail_impulse', 'Online E-commerce Cart', 1000)}
                      title="Log ₹1,000 for retail cart purchase"
                    >
                      +₹1k
                    </button>
                    <button
                      type="button"
                      className="pocket-spend-chip"
                      onClick={() => handleLogSpend('retail_impulse', 'Apparel & Footwear', 2500)}
                      title="Log ₹2,500 for clothing or accessories"
                    >
                      +₹2.5k
                    </button>
                    <button
                      type="button"
                      className="pocket-spend-chip"
                      onClick={() => handleLogSpend('retail_impulse', 'Electronics / Gadget Purchase', 5000)}
                      title="Log ₹5,000 for tech or gadget splurge"
                    >
                      +₹5k
                    </button>
                  </div>
                </div>

                {/* Envelope 4: Commute & Transit */}
                <div className="pocket-envelope-card pocket-envelope-emerald">
                  <div className="pocket-envelope-header">
                    <span className="pocket-envelope-title">
                      <Car size={13} /> Commute & Cabs
                    </span>
                    <span className="pocket-envelope-tag">Transit</span>
                  </div>
                  <div className="pocket-chips-row">
                    <button
                      type="button"
                      className="pocket-spend-chip"
                      onClick={() => handleLogSpend('other', 'Auto / Metro Smart Card', 150)}
                      title="Log ₹150 for auto or metro transit"
                    >
                      +₹150
                    </button>
                    <button
                      type="button"
                      className="pocket-spend-chip"
                      onClick={() => handleLogSpend('other', 'City Cab / Uber Ride', 350)}
                      title="Log ₹350 for standard city cab ride"
                    >
                      +₹350
                    </button>
                    <button
                      type="button"
                      className="pocket-spend-chip"
                      onClick={() => handleLogSpend('other', 'Airport / Intercity Cab', 750)}
                      title="Log ₹750 for long distance or airport ride"
                    >
                      +₹750
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Spend Bar */}
              <div className="flex-between mt-3 pt-2.5 flex-wrap" style={{ borderTop: '1px solid var(--border-subtle)', gap: '8px' }}>
                {!showCustomInput ? (
                  <button
                    type="button"
                    className="text-xs font-mono text-muted hover:text-primary flex-align cursor-pointer py-1"
                    style={{ gap: '6px' }}
                    onClick={() => setShowCustomInput(true)}
                  >
                    <Plus size={12} className="text-solstice" />
                    <span>Log Custom Amount</span>
                  </button>
                ) : (
                  <div className="flex-align flex-wrap w-full p-2 rounded-xl" style={{ gap: '8px', background: 'var(--surface-overlay)', border: '1px solid var(--border-subtle)' }}>
                    <input
                      type="number"
                      placeholder="Amount (₹)"
                      className="hipuku-input text-xs font-mono py-1 px-2.5"
                      style={{ width: '110px' }}
                      value={customSpendVal}
                      onChange={(e) => setCustomSpendVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const amt = parseFloat(customSpendVal);
                          if (!isNaN(amt) && amt > 0) {
                            handleLogSpend(customCategory, 'Custom Spend', amt);
                            setCustomSpendVal('');
                            setShowCustomInput(false);
                          }
                        }
                      }}
                    />
                    <select
                      className="hipuku-input text-xs font-mono py-1 px-2"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value as SpendCategory)}
                    >
                      <option value="chai_quick">☕ Chai & Snack</option>
                      <option value="dining_night">🍽️ Dining</option>
                      <option value="retail_impulse">🛍️ Retail</option>
                      <option value="other">🚗 Commute / Other</option>
                    </select>
                    <button
                      type="button"
                      className="action-pill font-mono text-xs py-1 px-3 bg-solstice/20 text-solstice border-solstice/40 cursor-pointer font-bold"
                      onClick={() => {
                        const amt = parseFloat(customSpendVal);
                        if (!isNaN(amt) && amt > 0) {
                          handleLogSpend(customCategory, 'Custom Spend', amt);
                          setCustomSpendVal('');
                          setShowCustomInput(false);
                        }
                      }}
                    >
                      Log Spend
                    </button>
                    <button
                      type="button"
                      className="action-pill font-mono text-xs py-1 px-2 text-muted cursor-pointer"
                      onClick={() => setShowCustomInput(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {todaySpendLog.length > 0 && (
                  <span className="font-mono text-[11px] text-muted">
                    {todaySpendLog.length} transaction{todaySpendLog.length !== 1 ? 's' : ''} logged today
                  </span>
                )}
              </div>

              {/* CATEGORY SPEND ALLOCATION METER */}
              {categoryBreakdown && spentToday > 0 && (
                <div className="pocket-category-meter">
                  <div className="pocket-category-header">
                    <span className="text-primary font-bold">Today's Category Spend Allocation:</span>
                    <span className="text-muted">Total: {formatINR(spentToday)}</span>
                  </div>
                  <div className="pocket-category-track">
                    {categoryBreakdown.chai.amount > 0 && (
                      <div
                        style={{ width: `${categoryBreakdown.chai.pct}%`, background: '#f59e0b' }}
                        className="pocket-category-segment"
                        title={`Chai & Snacks: ${formatINR(categoryBreakdown.chai.amount)} (${categoryBreakdown.chai.pct}%)`}
                      />
                    )}
                    {categoryBreakdown.dining.amount > 0 && (
                      <div
                        style={{ width: `${categoryBreakdown.dining.pct}%`, background: '#a855f7' }}
                        className="pocket-category-segment"
                        title={`Dining & Social: ${formatINR(categoryBreakdown.dining.amount)} (${categoryBreakdown.dining.pct}%)`}
                      />
                    )}
                    {categoryBreakdown.retail.amount > 0 && (
                      <div
                        style={{ width: `${categoryBreakdown.retail.pct}%`, background: '#f43f5e' }}
                        className="pocket-category-segment"
                        title={`Retail & Shopping: ${formatINR(categoryBreakdown.retail.amount)} (${categoryBreakdown.retail.pct}%)`}
                      />
                    )}
                    {categoryBreakdown.other.amount > 0 && (
                      <div
                        style={{ width: `${categoryBreakdown.other.pct}%`, background: '#10b981' }}
                        className="pocket-category-segment"
                        title={`Transit & Other: ${formatINR(categoryBreakdown.other.amount)} (${categoryBreakdown.other.pct}%)`}
                      />
                    )}
                  </div>
                  <div className="pocket-category-legend">
                    {categoryBreakdown.chai.amount > 0 && (
                      <span className="pocket-category-chip" style={{ color: '#fbbf24' }}>
                        <span className="pocket-category-dot" style={{ background: '#f59e0b' }} />
                        <span>Chai {formatINR(categoryBreakdown.chai.amount)} ({categoryBreakdown.chai.pct}%)</span>
                      </span>
                    )}
                    {categoryBreakdown.dining.amount > 0 && (
                      <span className="pocket-category-chip" style={{ color: '#c084fc' }}>
                        <span className="pocket-category-dot" style={{ background: '#a855f7' }} />
                        <span>Dining {formatINR(categoryBreakdown.dining.amount)} ({categoryBreakdown.dining.pct}%)</span>
                      </span>
                    )}
                    {categoryBreakdown.retail.amount > 0 && (
                      <span className="pocket-category-chip" style={{ color: '#fb7185' }}>
                        <span className="pocket-category-dot" style={{ background: '#f43f5e' }} />
                        <span>Retail {formatINR(categoryBreakdown.retail.amount)} ({categoryBreakdown.retail.pct}%)</span>
                      </span>
                    )}
                    {categoryBreakdown.other.amount > 0 && (
                      <span className="pocket-category-chip" style={{ color: '#34d399' }}>
                        <span className="pocket-category-dot" style={{ background: '#10b981' }} />
                        <span>Transit {formatINR(categoryBreakdown.other.amount)} ({categoryBreakdown.other.pct}%)</span>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Itemized Transactions Log */}
              {todaySpendLog.length > 0 && (
                <div className="mt-2.5 pt-2 flex-col" style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--border-subtle)', maxHeight: '150px', overflowY: 'auto' }}>
                  {todaySpendLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex-between p-2 rounded-lg"
                      style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-subtle)', fontSize: '12px' }}
                    >
                      <div className="flex-align truncate" style={{ gap: '8px' }}>
                        {entry.category === 'chai_quick' ? (
                          <Coffee size={13} className="text-amber-400 shrink-0" />
                        ) : entry.category === 'dining_night' ? (
                          <Utensils size={13} className="text-purple-400 shrink-0" />
                        ) : entry.category === 'retail_impulse' ? (
                          <ShoppingBag size={13} className="text-rose-400 shrink-0" />
                        ) : (
                          <Car size={13} className="text-emerald-400 shrink-0" />
                        )}
                        <span className="text-primary truncate font-medium">{entry.title}</span>
                      </div>
                      <div className="flex-align shrink-0" style={{ gap: '8px' }}>
                        <span className="font-mono font-bold text-primary">{formatINR(entry.amount)}</span>
                        <button
                          type="button"
                          className="text-muted hover:text-rose-400 p-0.5 cursor-pointer"
                          onClick={() => handleDeleteSpendEntry(entry.id)}
                          title="Delete transaction"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 30-DAY PAYDAY HORIZON RUNWAY */}
            <div className="pocket-runway-deck">
              <div className="pocket-runway-header">
                <div className="flex-align" style={{ gap: '8px' }}>
                  <CalendarDays size={14} className="text-quasar shrink-0" />
                  <span className="text-primary font-bold">Day {currentDayOfMonth} of {daysInCurrentMonth}</span>
                  <span className="text-muted font-normal">·</span>
                  <span className="text-solstice font-semibold">
                    {daysRemainingInMonth} days to next salary credit
                  </span>
                </div>
                <span className="text-[11px] text-muted">
                  Unspent daily balance compounds into surplus pot
                </span>
              </div>

              {/* Sleek Continuous Payday Horizon Progress Bar */}
              <div className="space-y-1.5 my-2">
                <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden relative border border-white/5 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(3, (currentDayOfMonth / daysInCurrentMonth) * 100))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Day 1 (Salary Credit)</span>
                  </span>
                  <span className="text-white font-bold px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-500/30">
                    Day {currentDayOfMonth} of {daysInCurrentMonth} (Today)
                  </span>
                  <span className="flex items-center gap-1">
                    <span>Day {daysInCurrentMonth} (Month End)</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </span>
                </div>
              </div>
            </div>

            {/* "CAN I AFFORD THIS TODAY?" ACTUARIAL WEALTH SCANNER */}
            <div className="afford-radar-card" style={{ width: '100%' }}>
              <button
                type="button"
                className="afford-radar-toggle"
                onClick={() => {
                  setShowAffordCalculator(!showAffordCalculator);
                  playSynthesizerChime(520);
                }}
              >
                <div className="flex-align" style={{ gap: '12px' }}>
                  <div className="pocket-sweep-icon-box" style={{ background: 'rgba(191, 159, 241, 0.15)', borderColor: 'rgba(191, 159, 241, 0.35)' }}>
                    <Calculator size={17} className="text-quasar" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                    <span className="font-bold text-primary" style={{ fontSize: '13.5px', letterSpacing: '-0.01em' }}>
                      Can I Afford This Today?
                    </span>
                    <span className="font-mono text-muted" style={{ fontSize: '10.5px' }}>
                      Instant Actuarial Impulse Radar
                    </span>
                  </div>
                </div>

                <span className="action-pill font-mono" style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)', background: 'rgba(191, 159, 241, 0.15)', borderColor: 'rgba(191, 159, 241, 0.35)', color: 'var(--colour-quasar)', fontWeight: 700, fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span>{showAffordCalculator ? 'Close Radar' : 'Open 1-Click Radar'}</span>
                  <span>{showAffordCalculator ? '▲' : '▼'}</span>
                </span>
              </button>

              {showAffordCalculator && (
                <div className="afford-radar-body">
                  {/* Two Inputs in Clean Grid */}
                  <div className="afford-inputs-row">
                    <div className="afford-input-box">
                      <span className="afford-input-prefix">
                        <ShoppingBag size={14} className="text-muted" />
                      </span>
                      <input
                        type="text"
                        placeholder="Item description (e.g. Swiggy, Shoes, Gadget)"
                        className="afford-input-control"
                        value={affordQueryName}
                        onChange={(e) => setAffordQueryName(e.target.value)}
                      />
                    </div>
                    <div className="afford-input-box">
                      <span className="afford-input-prefix">₹</span>
                      <input
                        type="number"
                        placeholder="Price"
                        className="afford-input-control"
                        value={affordQueryAmount}
                        onChange={(e) => setAffordQueryAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Tactile Quick-Test Presets */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="afford-preset-header">
                      <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                        Quick-Test Presets (1-Click Fill)
                      </span>
                    </div>
                    <div className="afford-preset-grid">
                      {[
                        { amt: 250, label: 'Coffee / Snack' },
                        { amt: 600, label: 'Food Delivery' },
                        { amt: 1500, label: 'Casual Dinner' },
                        { amt: 4500, label: 'Retail Apparel' },
                        { amt: 12000, label: 'Tech Splurge' },
                      ].map((preset) => {
                        const isSelected = affordQueryAmount === String(preset.amt);
                        return (
                          <button
                            key={preset.amt}
                            type="button"
                            className={`afford-preset-chip ${isSelected ? 'active' : ''}`}
                            onClick={() => {
                              setAffordQueryAmount(String(preset.amt));
                              setAffordQueryName(preset.label);
                              playSynthesizerChime(480);
                            }}
                          >
                            <span className="afford-preset-amount">₹{preset.amt.toLocaleString('en-IN')}</span>
                            <span className="afford-preset-label">{preset.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {affordAssessment && (
                    <div className={`afford-verdict-box verdict-${affordAssessment.verdict}`}>
                      <div className="flex-between flex-wrap" style={{ gap: '8px' }}>
                        <span className="font-mono text-xs font-extrabold flex-align" style={{ gap: '6px' }}>
                          {affordAssessment.badge}
                        </span>
                        <span className="tag-pill font-mono text-[10.5px] font-semibold">
                          Consumes <strong>{affordAssessment.daysConsumed} days</strong> of pocket
                        </span>
                      </div>
                      <p className="text-xs m-0 leading-relaxed text-secondary font-sans">
                        {affordAssessment.summary}
                      </p>
                      <div className="afford-verdict-stats">
                        <div className="afford-verdict-stat-pill">
                          <span className="afford-verdict-stat-label">Today's Remaining:</span>
                          <span className="afford-verdict-stat-val">{formatINR(burnState.remainingBurnToday)}</span>
                        </div>
                        <div className="afford-verdict-stat-pill">
                          <span className="afford-verdict-stat-label">Daily Allowance Cap:</span>
                          <span className="afford-verdict-stat-val">{formatINR(burnState.effectiveDailyBurnToday)}</span>
                        </div>
                        <div className="afford-verdict-stat-pill">
                          <span className="afford-verdict-stat-label">10-Yr Compounded Cost:</span>
                          <span className="afford-verdict-stat-val" style={{ color: 'var(--colour-solstice)' }}>
                            ₹{affordAssessment.tenYearValue.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="afford-actions-row">
                        <button
                          type="button"
                          className="action-pill text-xs py-2 px-4 bg-nebula/20 text-nebula border-nebula/40 hover:bg-nebula/30 flex-align cursor-pointer font-bold rounded-xl"
                          style={{ gap: '6px' }}
                          onClick={() => {
                            handleLogSpend('other', affordQueryName.trim() || 'Discretionary Purchase', affordQueryParsedAmt);
                            setAffordQueryAmount('');
                            setAffordQueryName('');
                            setShowAffordCalculator(false);
                          }}
                        >
                          <Zap size={13} /> Deduct from Today's Pocket
                        </button>
                        <button
                          type="button"
                          className="action-pill text-xs py-2 px-4 bg-solstice/20 text-solstice border-solstice/40 hover:bg-solstice/30 flex-align cursor-pointer font-bold rounded-xl"
                          style={{ gap: '6px' }}
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
                          <Hourglass size={13} /> Park in 72h Chamber
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RESCUED WEALTH FOOTER TALLY */}
            <div className="rescued-capital-deck">
              <div className="rescued-capital-left">
                <div className="rescued-capital-icon-box">
                  <Award size={20} className="text-emerald-400" />
                </div>
                <div className="rescued-capital-content">
                  <div className="rescued-capital-title-row">
                    <span className="rescued-capital-val">
                      ₹{lifetimeRescued.toLocaleString('en-IN')}
                    </span>
                    <span className="rescued-capital-badge">
                      Capital Rescued
                    </span>
                  </div>
                  <span className="rescued-capital-sub">
                    Shielded from impulsive desires & unneeded splurges
                  </span>
                </div>
              </div>

              <div className="rescued-capital-right">
                <span className="rescued-capital-compounded-label">
                  10-Yr Wealth Compounded (12% CAGR):
                </span>
                <span className="rescued-capital-compounded-val">
                  <TrendingUp size={14} className="text-solstice" />
                  ₹{Math.round(lifetimeRescued * 3.106).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: 72-HOUR COOLING-OFF CHAMBER */
          <div className="flex flex-col" style={{ gap: '14px' }}>
            <div className="hipuku-card" style={{ padding: '16px 18px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-xl)' }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="font-bold text-xs text-primary m-0 flex items-center gap-1.5">
                    <Hourglass size={14} className="text-solstice" /> 72-Hour Impulse Wishlist Shield
                  </h4>
                  <p className="text-[11px] text-muted m-0 mt-0.5 font-sans">
                    Park tempting purchases here. Actuarial studies show 84% of impulse desires dissolve after 72 hours of cooling off.
                  </p>
                </div>
                <span className="tag-pill tag-quasar font-mono text-[10.5px] py-0.5 px-2 font-bold">
                  {coolingItems.length} Parked
                </span>
              </div>

              {/* Add Item Form with Urge Intensity Meter */}
              <form onSubmit={handleAddCoolingItem} className="flex flex-col gap-2.5 mt-3 pt-3 border-t border-subtle">
                <div className="chamber-form-grid">
                  <input
                    type="text"
                    placeholder="e.g. Sony XM5, Mechanical Keyboard, Designer Jacket"
                    className="hipuku-input text-xs py-2 px-3"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Price (₹)"
                    className="hipuku-input text-xs font-mono py-2 px-3"
                    value={newItemAmount}
                    onChange={(e) => setNewItemAmount(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="action-pill font-mono text-xs py-2 px-3.5 flex items-center justify-center gap-1.5 bg-solstice/20 text-solstice border-solstice/40 shrink-0 cursor-pointer font-bold rounded-xl"
                  >
                    <Plus size={12} /> Lock in Chamber
                  </button>
                </div>

                {/* Urge Selector */}
                <div className="flex items-center gap-2.5 pt-1.5 flex-wrap">
                  <span className="font-mono text-[11px] text-muted shrink-0">Urge Intensity:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {([1, 2, 3, 4] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        className={`action-pill text-[10.5px] py-1 px-2.5 font-mono cursor-pointer rounded-lg ${newItemUrge === level ? 'pill-active-mode' : ''}`}
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
              <div className="p-8 rounded-2xl bg-surface-raised border border-dashed border-subtle text-center text-xs text-muted" style={{ padding: '28px 16px', borderRadius: 'var(--radius-xl)' }}>
                <ShieldCheck size={28} className="text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="m-0 font-medium text-secondary">The Cooling Chamber is empty.</p>
                <p className="m-0 mt-0.5 text-[11px]">
                  No impulsive items parked. Any gadget or splurge you're tempted to buy can be tested here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-1">
                {coolingItems.map((item) => {
                  const msLeft = Math.max(0, item.expiresAt - Date.now());
                  const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
                  const minsLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
                  const isCool = msLeft === 0;

                  return (
                    <div
                      key={item.id}
                      className="hipuku-card flex flex-col gap-2.5"
                      style={{ padding: '14px 16px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-xl)' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="font-bold text-xs text-primary m-0">{item.title}</h5>
                          <span className="font-mono text-sm font-bold text-solstice block mt-0.5">
                            {formatINR(item.amount)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`tag-pill font-mono text-[10px] flex items-center gap-1 ${
                              isCool ? 'tag-nebula' : 'tag-corona'
                            }`}
                          >
                            <Clock size={10} />
                            {isCool ? 'Cooling Complete' : `${hoursLeft}h ${minsLeft}m Left`}
                          </span>
                          <button
                            type="button"
                            className="icon-pill text-muted hover:text-rose-400 cursor-pointer"
                            onClick={() => handleDeleteCoolingItem(item.id)}
                            title="Remove without logging"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Opportunity Cost Grid */}
                      <div className="chamber-stats-grid">
                        <div>
                          <span className="text-[10px] text-muted block">Discretionary Days:</span>
                          <strong className="text-secondary">{item.burnEquivalentDays} Days of Living</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted block">Work Hours:</span>
                          <strong className="text-secondary">{item.workHoursEquivalent} Hours Labor</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted block flex items-center gap-0.5">
                            <TrendingUp size={10} className="text-emerald-400" /> 10-Yr Nifty 50 Value:
                          </span>
                          <strong className="text-emerald-400 font-bold">{formatINR(item.tenYearOpportunityCost)}</strong>
                        </div>
                      </div>

                      {/* Decisions */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-subtle flex-wrap">
                        <button
                          type="button"
                          className="action-pill font-mono text-xs py-1.5 px-3 flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25 cursor-pointer font-bold rounded-xl"
                          onClick={() => handleAbandonCoolingItem(item)}
                          title="Abandon this purchase! Bank the money and protect future wealth"
                        >
                          <Award size={13} /> I Resisted! (+{formatINR(item.amount)} Rescued)
                        </button>

                        <button
                          type="button"
                          className="text-xs font-mono text-muted hover:text-primary flex items-center gap-1 cursor-pointer"
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

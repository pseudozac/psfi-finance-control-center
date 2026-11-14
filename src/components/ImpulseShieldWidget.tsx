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

  // SVG Radial Gauge Geometry: radius 64, circumference ~402.12
  const radialRadius = 64;
  const radialCircumference = 2 * Math.PI * radialRadius;
  const radialOffset = radialCircumference * (1 - Math.min(1, percentUsedToday / 100));

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
        <div className="card-header-row mb-3.5 flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="tag-pill tag-corona shrink-0 flex items-center gap-1 font-mono text-[11px] font-bold">
              <Zap size={11} className="text-corona" /> Impulse Shield
            </span>
            <span className="card-title whitespace-nowrap text-base sm:text-lg font-bold">
              Daily Discretionary Pocket
            </span>
            <InfoTooltip
              title="Tactile Daily Burn & SIP Shield"
              explanation="Calculates your mathematically safe discretionary spending allowance per day after subtracting fixed living expenses and committed mutual fund SIPs. Overspending today dynamically recalibrates future days to guarantee your SIP is never broken."
              benchmark="Rule of thumb: Maintain a daily discretionary burn that preserves at least a 20%+ compounding savings rate."
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="pill-segmented flex gap-0.5 text-xs font-mono">
              <button
                type="button"
                className={`py-1 px-3 flex items-center gap-1.5 text-[11px] font-semibold ${activeTab === 'burn_pocket' ? 'pill-active' : ''}`}
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
                className={`py-1 px-3 flex items-center gap-1.5 text-[11px] font-semibold ${activeTab === 'cooling_chamber' ? 'pill-active' : ''}`}
                onClick={() => {
                  setActiveTab('cooling_chamber');
                  playSynthesizerChime(480);
                }}
              >
                <Hourglass size={12} className={activeTab === 'cooling_chamber' ? 'text-quasar' : ''} />
                <span>Cooling Chamber ({coolingItems.length})</span>
              </button>
            </div>

            {/* Live Shield Status Badge */}
            {burnState.isSipShieldActive ? (
              <span className="tag-pill tag-flare flex items-center gap-1 animate-pulse font-mono text-[11px] font-bold">
                <ShieldAlert size={12} /> SIP Fortress Engaged
              </span>
            ) : burnState.isOverspentToday > 0 ? (
              <span className="tag-pill tag-solstice flex items-center gap-1 font-mono text-[11px] font-bold">
                <AlertTriangle size={12} /> Recalibrated: -{formatINR(burnState.isOverspentToday)}
              </span>
            ) : (
              <span className="tag-pill tag-nebula flex items-center gap-1 font-mono text-[11px] font-bold">
                <ShieldCheck size={12} /> Safe Burn Active
              </span>
            )}
          </div>
        </div>

        {activeTab === 'burn_pocket' ? (
          <div className="flex flex-col gap-3.5">
            {/* HERO COCKPIT: RADIAL GAUGE & TELEMETRY CLUSTER */}
            <div className="pocket-hud-cockpit">
              {/* Left: SVG Radial Burn Meter */}
              <div className="pocket-radial-box">
                <svg width="170" height="170" viewBox="0 0 170 170" className="pocket-radial-svg">
                  <defs>
                    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                    <linearGradient id="roseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#fb7185" />
                    </linearGradient>
                  </defs>

                  {/* Track Circle */}
                  <circle
                    cx="85"
                    cy="85"
                    r={radialRadius}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="11"
                  />

                  {/* Dynamic Progress Arc */}
                  <circle
                    cx="85"
                    cy="85"
                    r={radialRadius}
                    fill="none"
                    stroke={
                      burnState.isOverspentToday > 0
                        ? 'url(#roseGrad)'
                        : percentUsedToday > 75
                        ? 'url(#amberGrad)'
                        : 'url(#emeraldGrad)'
                    }
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeDasharray={radialCircumference}
                    strokeDashoffset={radialOffset}
                    style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
                  />
                </svg>

                {/* Centered Readout Content */}
                <div className="pocket-radial-content select-none">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted font-bold flex items-center gap-1">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        burnState.isOverspentToday > 0 ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'
                      }`}
                    />
                    {burnState.isOverspentToday > 0 ? 'Over Limit' : 'Safe Remaining'}
                  </span>

                  <span
                    className={`font-mono text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5 whitespace-nowrap ${
                      burnState.isOverspentToday > 0 ? 'text-rose-400' : 'text-primary'
                    }`}
                  >
                    {burnState.isOverspentToday > 0
                      ? `-${formatINR(burnState.isOverspentToday)}`
                      : formatINR(burnState.remainingBurnToday)}
                  </span>

                  <span className="text-[10px] font-mono text-secondary mt-0.5">
                    of {formatINR(burnState.effectiveDailyBurnToday)} target
                  </span>
                </div>
              </div>

              {/* Right: Telemetric Command Cards */}
              <div className="flex flex-col justify-between gap-2.5">
                <div className="pocket-telemetry-grid">
                  {/* Card 1: Committed SIP Fortress */}
                  <div className="pocket-telemetry-card">
                    <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                      <span className="flex items-center gap-1 text-quasar font-semibold">
                        <Lock size={11} /> SIP Fortress
                      </span>
                      <span className="text-emerald-400 font-bold">100% Locked</span>
                    </div>
                    <div>
                      <span className="font-mono text-base font-extrabold text-primary block">
                        {formatINR(burnState.sipProtectedAmount)}
                        <span className="text-[10.5px] font-sans font-normal text-muted">/mo</span>
                      </span>
                      <span className="text-[10.5px] text-muted leading-tight block mt-0.5 font-sans">
                        Zero risk to committed mutual fund compounding.
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Streak & Weekend Multiplier */}
                  <div className="pocket-telemetry-card">
                    <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                      <span className="flex items-center gap-1 text-corona font-semibold">
                        <Flame size={12} className="text-corona animate-pulse" /> Discipline
                      </span>
                      <span className="text-solstice font-bold">{streakDays} Days</span>
                    </div>
                    <div>
                      <button
                        type="button"
                        className={`w-full text-left py-1 px-2 rounded-md font-mono text-[10.5px] flex items-center justify-between gap-1 cursor-pointer transition-colors ${
                          weekendMode
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-white/5 text-muted hover:text-primary border border-white/10'
                        }`}
                        onClick={toggleWeekendMode}
                        title="Toggle Weekend Weighted Allowance (Fri-Sun 1.35x multiplier)"
                      >
                        <span className="flex items-center gap-1">
                          <Calendar size={10} /> Weekend Mode:
                        </span>
                        <strong className="text-xs">{weekendMode ? '1.35x' : 'OFF'}</strong>
                      </button>
                      <span className="text-[10px] text-muted block mt-1 font-sans">
                        {weekendMode ? 'Weighted allowance active for weekend splurges' : 'Flat 30-day identical distribution'}
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Unspent Surplus Pot */}
                  <div className="pocket-telemetry-card">
                    <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                      <button
                        type="button"
                        onClick={handleToggleSurplusDest}
                        className="flex items-center gap-1 text-solstice font-semibold hover:underline cursor-pointer"
                        title="Click to toggle unspent surplus between Weekend Pot and Bonus SIP"
                      >
                        {surplusDestination === 'weekend_pot' ? '🏖️ Weekend Pot' : '📈 Bonus SIP'}
                        <ArrowUpRight size={10} />
                      </button>
                      <span className="text-solstice font-bold font-mono">{formatINR(bankedSurplus)}</span>
                    </div>
                    <div>
                      {onPlanChange && bankedSurplus > 0 && surplusDestination === 'bonus_sip' ? (
                        <button
                          type="button"
                          className="w-full py-1 px-2 rounded-md font-mono text-[10.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center gap-1 hover:bg-emerald-500/30 cursor-pointer"
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
                          <Sparkles size={10} /> Boost SIP by {formatINR(bankedSurplus)}
                        </button>
                      ) : (
                        <span className="text-[10.5px] text-muted block font-sans">
                          {surplusDestination === 'weekend_pot'
                            ? 'Saved burn rolls into weekend allowance.'
                            : 'Saved burn auto-compounds into monthly SIP.'}
                        </span>
                      )}
                      <span className="text-[10px] text-secondary block mt-1 font-mono">
                        Next {burnState.remainingDaysInMonth} days recalibrate to{' '}
                        <strong className="text-solstice">{formatINR(burnState.recalibratedRemainingDailyBurn)}/day</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Progress Bar */}
                <div className="flex flex-col gap-1 pt-1.5 border-t border-subtle/50">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-secondary">
                      Spent Today: <strong className="text-primary">{formatINR(spentToday)}</strong> ({percentUsedToday}% of cap)
                    </span>
                    <span className="text-muted">
                      {burnState.remainingBurnToday > 0
                        ? `${formatINR(burnState.remainingBurnToday)} available`
                        : `Over target by ${formatINR(burnState.isOverspentToday)}`}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-overlay overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        burnState.isOverspentToday > 0
                          ? 'bg-rose-500'
                          : percentUsedToday > 75
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, percentUsedToday)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 1-TAP TACTILE MICRO-ENVELOPES (PHYSICAL FINTECH PAD) */}
            <div className="p-3.5 rounded-2xl bg-surface-raised border border-subtle">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <span className="font-mono text-xs font-bold text-primary flex items-center gap-1.5">
                  <Zap size={13} className="text-solstice" /> 1-Tap Fast Expense Envelopes
                </span>

                <div className="flex items-center gap-2">
                  {lastLoggedEntry && (
                    <button
                      type="button"
                      className="action-pill font-mono text-[11px] py-1 px-2.5 text-rose-300 border-rose-500/40 bg-rose-500/10 flex items-center gap-1 hover:bg-rose-500/20 cursor-pointer animate-pulse"
                      onClick={handleUndoLastSpend}
                      title={`Undo last logged transaction: ${lastLoggedEntry.title} (${formatINR(lastLoggedEntry.amount)})`}
                    >
                      <Undo2 size={11} /> Undo {formatINR(lastLoggedEntry.amount)}
                    </button>
                  )}
                  {todaySpendLog.length > 0 && (
                    <button
                      type="button"
                      className="text-[11px] font-mono text-muted hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                      onClick={handleResetToday}
                      title="Clear all today's transactions"
                    >
                      <RotateCcw size={11} /> Reset Day
                    </button>
                  )}
                </div>
              </div>

              {/* 4 Envelopes */}
              <div className="pocket-envelopes-grid">
                {/* Envelope 1: Chai & Quick Snack */}
                <div className="pocket-envelope-card">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300">
                      <Coffee size={13} /> Chai & Snacks
                    </span>
                    <span className="text-[10px] font-mono text-muted">Daily Fuel</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="pocket-spend-chip hover:text-amber-300"
                      onClick={() => handleLogSpend('chai_quick', 'Cutting Chai / Quick Bite', 50)}
                      title="Log ₹50 for tea or quick street bite"
                    >
                      +₹50
                    </button>
                    <button
                      type="button"
                      className="pocket-spend-chip hover:text-amber-300"
                      onClick={() => handleLogSpend('chai_quick', 'Quick Grocery Snack / Zepto', 150)}
                      title="Log ₹150 for quick snack or quick commerce delivery"
                    >
                      +₹150
                    </button>
                    <button
                      type="button"
                      className="pocket-spend-chip hover:text-amber-300"
                      onClick={() => handleLogSpend('chai_quick', 'Artisan Coffee / Bakery', 300)}
                      title="Log ₹300 for premium specialty coffee"
                    >
                      +₹300
                    </button>
                  </div>
                </div>

                {/* Envelope 2: Dining & Social */}
                <div className="pocket-envelope-card">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-purple-300">
                      <Utensils size={13} /> Dining & Social
                    </span>
                    <span className="text-[10px] font-mono text-muted">Outings</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="pocket-spend-chip hover:text-purple-300"
                      onClick={() => handleLogSpend('dining_night', 'Work Lunch / Cafe', 400)}
                      title="Log ₹400 for lunch or casual cafe meal"
                    >
                      +₹400
                    </button>
                    <button
                      type="button"
                      className="pocket-spend-chip hover:text-purple-300"
                      onClick={() => handleLogSpend('dining_night', 'Dinner with Friends', 850)}
                      title="Log ₹850 for social dinner with friends"
                    >
                      +₹850
                    </button>
                    <button
                      type="button"
                      className="pocket-spend-chip hover:text-purple-300"
                      onClick={() => handleLogSpend('dining_night', 'Weekend Splurge Dinner', 1800)}
                      title="Log ₹1,800 for weekend luxury dining"
                    >
                      +₹1.8k
                    </button>
                  </div>
                </div>

                {/* Envelope 3: Retail & Shopping */}
                <div className="pocket-envelope-card">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-300">
                      <ShoppingBag size={13} /> Retail & Shopping
                    </span>
                    <span className="text-[10px] font-mono text-muted">Discretionary</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="pocket-spend-chip hover:text-rose-300"
                      onClick={() => handleLogSpend('retail_impulse', 'Online E-commerce Cart', 1000)}
                      title="Log ₹1,000 for retail cart purchase"
                    >
                      +₹1k
                    </button>
                    <button
                      type="button"
                      className="pocket-spend-chip hover:text-rose-300"
                      onClick={() => handleLogSpend('retail_impulse', 'Apparel & Footwear', 2500)}
                      title="Log ₹2,500 for clothing or accessories"
                    >
                      +₹2.5k
                    </button>
                    <button
                      type="button"
                      className="pocket-spend-chip hover:text-rose-300"
                      onClick={() => handleLogSpend('retail_impulse', 'Electronics / Gadget Purchase', 5000)}
                      title="Log ₹5,000 for tech or gadget splurge"
                    >
                      +₹5k
                    </button>
                  </div>
                </div>

                {/* Envelope 4: Commute & Transit */}
                <div className="pocket-envelope-card">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-300">
                      <Car size={13} /> Commute & Cabs
                    </span>
                    <span className="text-[10px] font-mono text-muted">Transit</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="pocket-spend-chip hover:text-emerald-300"
                      onClick={() => handleLogSpend('other', 'Auto / Metro Smart Card', 150)}
                      title="Log ₹150 for auto or metro transit"
                    >
                      +₹150
                    </button>
                    <button
                      type="button"
                      className="pocket-spend-chip hover:text-emerald-300"
                      onClick={() => handleLogSpend('other', 'City Cab / Uber Ride', 350)}
                      title="Log ₹350 for standard city cab ride"
                    >
                      +₹350
                    </button>
                    <button
                      type="button"
                      className="pocket-spend-chip hover:text-emerald-300"
                      onClick={() => handleLogSpend('other', 'Airport / Intercity Cab', 750)}
                      title="Log ₹750 for long distance or airport ride"
                    >
                      +₹750
                    </button>
                  </div>
                </div>
              </div>

              {/* Custom Spend Bar */}
              <div className="mt-3 pt-2.5 border-t border-subtle/50 flex items-center justify-between gap-2 flex-wrap text-xs">
                {!showCustomInput ? (
                  <button
                    type="button"
                    className="text-xs font-mono text-muted hover:text-primary flex items-center gap-1.5 cursor-pointer py-1"
                    onClick={() => setShowCustomInput(true)}
                  >
                    <Plus size={12} className="text-solstice" />
                    <span>Log Custom Amount</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap w-full bg-surface-overlay p-2 rounded-xl border border-subtle">
                    <input
                      type="number"
                      placeholder="Amount (₹)"
                      className="hipuku-input text-xs font-mono w-28 py-1 px-2.5"
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

              {/* Itemized Transactions Log */}
              {todaySpendLog.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-subtle/40 flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {todaySpendLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-1.5 px-2.5 rounded-lg bg-surface-overlay border border-subtle flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {entry.category === 'chai_quick' ? (
                          <Coffee size={12} className="text-amber-400 shrink-0" />
                        ) : entry.category === 'dining_night' ? (
                          <Utensils size={12} className="text-purple-400 shrink-0" />
                        ) : entry.category === 'retail_impulse' ? (
                          <ShoppingBag size={12} className="text-rose-400 shrink-0" />
                        ) : (
                          <Car size={12} className="text-emerald-400 shrink-0" />
                        )}
                        <span className="text-primary truncate font-medium">{entry.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-semibold text-primary">{formatINR(entry.amount)}</span>
                        <button
                          type="button"
                          className="text-muted hover:text-rose-400 p-0.5 cursor-pointer"
                          onClick={() => handleDeleteSpendEntry(entry.id)}
                          title="Delete transaction"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 30-DAY PAYDAY HORIZON RUNWAY */}
            <div className="p-3.5 rounded-2xl bg-surface-raised border border-subtle">
              <div className="flex items-center justify-between text-xs font-mono text-muted mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <CalendarDays size={13} className="text-quasar shrink-0" />
                  <span className="whitespace-nowrap">Day {currentDayOfMonth} of {daysInCurrentMonth}</span>
                  <span className="text-muted font-normal">·</span>
                  <span className="text-solstice font-normal whitespace-nowrap">
                    {daysRemainingInMonth} Days to Next Salary Credit (Day 1)
                  </span>
                </div>
                <span className="text-[10.5px] text-muted">
                  Unspent daily balance automatically compounds into surplus pot
                </span>
              </div>

              {/* Day-by-Day Segmented Strip */}
              <div className="pocket-payday-strip select-none">
                {Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1).map((dayNum) => {
                  const isPast = dayNum < currentDayOfMonth;
                  const isCurrent = dayNum === currentDayOfMonth;
                  const isPayday = dayNum === 1;

                  return (
                    <div
                      key={dayNum}
                      title={`Day ${dayNum}${isPayday ? ' · Salary Credit Day 💰' : ''}${isCurrent ? ' · Today (Active Pocket)' : isPast ? ' · Shield Maintained' : ''}`}
                      className={`pocket-day-node ${
                        isCurrent
                          ? 'bg-amber-400 text-black font-extrabold ring-2 ring-amber-400/70 shadow-sm shadow-amber-400/50 scale-110 z-10'
                          : isPayday
                          ? 'bg-emerald-400 text-black font-extrabold'
                          : isPast
                          ? 'bg-purple-500/40 text-white/70'
                          : 'bg-white/5 border border-white/10 text-muted/30'
                      }`}
                    >
                      {isCurrent ? '●' : isPayday ? '₹' : dayNum}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* "CAN I AFFORD THIS TODAY?" ACTUARIAL WEALTH SCANNER */}
            <div className="rounded-2xl bg-surface-raised border border-subtle overflow-hidden">
              <button
                type="button"
                className={`w-full py-2.5 px-3.5 text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  showAffordCalculator
                    ? 'bg-quasar/15 text-primary border-b border-quasar/30'
                    : 'bg-surface-raised text-muted hover:text-primary'
                }`}
                onClick={() => {
                  setShowAffordCalculator(!showAffordCalculator);
                  playSynthesizerChime(520);
                }}
              >
                <span className="flex items-center gap-2 font-semibold text-primary">
                  <Calculator size={14} className="text-quasar shrink-0" />
                  <span>Can I Afford This Today? (Actuarial Impulse Scanner)</span>
                </span>
                <span className="text-[11px] font-mono text-quasar flex items-center gap-1 bg-quasar/15 px-2.5 py-0.5 rounded-full border border-quasar/30 shrink-0 font-semibold">
                  <span>{showAffordCalculator ? 'Close Radar ▲' : 'Open 1-Click Radar ▼'}</span>
                </span>
              </button>

              {showAffordCalculator && (
                <div className="p-3.5 flex flex-col gap-3 bg-surface-overlay">
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <input
                      type="text"
                      placeholder="Item Name (e.g. Swiggy Splurge, Watch, Weekend Trip)"
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
                    <span className="text-muted text-[10px]">Presets:</span>
                    {[250, 600, 1500, 4500, 12000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className="action-pill text-[10.5px] py-0.5 px-2 font-mono hover:text-quasar cursor-pointer"
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
                    <div className={`p-3 rounded-xl border flex flex-col gap-2 ${affordAssessment.colorClass}`}>
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

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button
                          type="button"
                          className="action-pill text-xs py-1 px-3 bg-nebula/20 text-nebula border-nebula/40 flex items-center gap-1 cursor-pointer font-bold"
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
                          className="action-pill text-xs py-1 px-3 bg-solstice/20 text-solstice border-solstice/40 flex items-center gap-1 cursor-pointer font-bold"
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

            {/* RESCUED WEALTH FOOTER TALLY */}
            <div className="p-3 rounded-2xl bg-surface-raised border border-subtle flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-2">
                <span className="tag-pill tag-nebula flex items-center gap-1.5 font-mono text-[11px] font-bold py-1 px-2.5">
                  <Award size={13} /> ₹{lifetimeRescued.toLocaleString('en-IN')} Capital Rescued
                </span>
                <span className="text-[11px] text-muted hidden sm:inline font-sans">
                  Shielded from impulsive desire
                </span>
              </div>
              <span className="font-mono text-[11px] text-secondary">
                Protecting <strong className="text-solstice font-bold">₹{Math.round(lifetimeRescued * 3.106).toLocaleString('en-IN')}</strong> in 10-Yr Compounded Wealth
              </span>
            </div>
          </div>
        ) : (
          /* TAB 2: 72-HOUR COOLING-OFF CHAMBER */
          <div className="flex flex-col gap-3">
            <div className="p-3.5 rounded-2xl bg-surface-raised border border-subtle">
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
              <form onSubmit={handleAddCoolingItem} className="flex flex-col gap-2 mt-2 pt-2 border-t border-subtle/50">
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <input
                    type="text"
                    placeholder="e.g. Sony XM5, Mechanical Keyboard, Designer Jacket"
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
                    className="action-pill font-mono text-xs py-1.5 px-3 flex items-center gap-1 bg-solstice/20 text-solstice border-solstice/40 shrink-0 cursor-pointer font-bold"
                  >
                    <Plus size={12} /> Lock in Chamber
                  </button>
                </div>

                {/* Urge Selector */}
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="font-mono text-[10.5px] text-muted">Urge Intensity:</span>
                  <div className="flex gap-1 flex-wrap">
                    {([1, 2, 3, 4] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        className={`action-pill text-[10px] py-0.5 px-2 font-mono cursor-pointer ${newItemUrge === level ? 'pill-active-mode' : ''}`}
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
              <div className="p-8 rounded-2xl bg-surface-raised border border-dashed border-subtle text-center text-xs text-muted">
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
                      className="p-3.5 rounded-2xl bg-surface-raised border border-subtle flex flex-col gap-2.5"
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] p-2 rounded-xl bg-surface-overlay border border-subtle">
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
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-subtle/50 flex-wrap">
                        <button
                          type="button"
                          className="action-pill font-mono text-xs py-1.5 px-3 flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25 cursor-pointer font-bold"
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

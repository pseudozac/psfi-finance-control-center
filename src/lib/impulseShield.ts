import type { FinancePlan, FinanceSummary } from '../types/finance';
import type { DailyBurnState, CoolingOffItem } from '../types/skills';

export interface CalculateDailyBurnOptions {
  currentDayOfMonth?: number;
  totalDaysInMonth?: number;
  spentToday?: number;
  weekendModeActive?: boolean;
  disciplineStreakDays?: number;
  bankedSurplusRupees?: number;
  surplusDestination?: 'weekend_pot' | 'bonus_sip';
}

export function calculateDailyBurn(
  plan: FinancePlan,
  summary: FinanceSummary,
  options: CalculateDailyBurnOptions = {}
): DailyBurnState {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const actualDaysInMonth = new Date(year, month + 1, 0).getDate();
  const actualToday = now.getDate();

  const currentDayOfMonth = options.currentDayOfMonth ?? Math.min(actualToday, actualDaysInMonth);
  const totalDaysInMonth = options.totalDaysInMonth ?? actualDaysInMonth;
  const spentToday = options.spentToday ?? 0;
  const weekendModeActive = options.weekendModeActive ?? false;
  const disciplineStreakDays = options.disciplineStreakDays ?? 3;
  const bankedSurplusRupees = options.bankedSurplusRupees ?? 0;
  const surplusDestination = options.surplusDestination ?? 'weekend_pot';

  const monthlyInflow = summary.monthlyIncome;
  const monthlyCommittedExpenses = summary.monthlyExpenses;
  const committedSip = plan.savings.monthlySip;

  // Discretionary pool available after paying living expenses and committed SIP
  const monthlyDiscretionaryPool = Math.max(0, monthlyInflow - monthlyCommittedExpenses - committedSip);

  // Remaining days in month including today
  const remainingDaysInMonth = Math.max(1, totalDaysInMonth - currentDayOfMonth + 1);

  // Baseline flat daily burn
  const baseDailyBurn = Math.round(monthlyDiscretionaryPool / Math.max(1, totalDaysInMonth));

  // Check if today is a weekend (Fri/Sat/Sun)
  const dayOfWeek = now.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

  // Effective daily burn for today factoring weekend multiplier
  let effectiveDailyBurnToday = baseDailyBurn;
  if (weekendModeActive) {
    if (isWeekend) {
      effectiveDailyBurnToday = Math.round(baseDailyBurn * 1.35);
    } else {
      effectiveDailyBurnToday = Math.round(baseDailyBurn * 0.85);
    }
  }

  // Did the user overspend today's safe allowance?
  const isOverspentToday = Math.max(0, spentToday - effectiveDailyBurnToday);
  const remainingBurnToday = Math.max(0, effectiveDailyBurnToday - spentToday);

  // Recalibrate future daily allowance for remaining days in the month
  let recalibratedRemainingDailyBurn = baseDailyBurn;
  let isSipShieldActive = false;

  if (remainingDaysInMonth > 1) {
    const remainingDaysAfterToday = remainingDaysInMonth - 1;
    const futurePool = Math.max(0, monthlyDiscretionaryPool - (baseDailyBurn * (currentDayOfMonth - 1)) - spentToday);
    recalibratedRemainingDailyBurn = Math.round(futurePool / remainingDaysAfterToday);
  } else {
    recalibratedRemainingDailyBurn = remainingBurnToday;
  }

  // If overspending threatens the SIP allocation
  if (spentToday > monthlyDiscretionaryPool || (recalibratedRemainingDailyBurn === 0 && isOverspentToday > 0)) {
    isSipShieldActive = true;
  }

  const hourlyEarningRate = Math.max(1, Math.round(monthlyInflow / 160)); // ~160 hours/month standard work

  return {
    currentDayOfMonth,
    totalDaysInMonth,
    remainingDaysInMonth,
    monthlyDiscretionaryPool,
    baseDailyBurn,
    effectiveDailyBurnToday,
    spentToday,
    remainingBurnToday,
    isOverspentToday,
    recalibratedRemainingDailyBurn,
    isSipShieldActive,
    sipProtectedAmount: committedSip,
    weekendModeActive,
    disciplineStreakDays,
    bankedSurplusRupees,
    surplusDestination,
    hourlyEarningRate,
  };
}

// Calculate the 72-Hour Impulse Cooling-Off metrics
export function createCoolingOffItem(
  title: string,
  amount: number,
  monthlyInflow: number,
  dailyBurn: number
): CoolingOffItem {
  const hourlyRate = Math.max(1, Math.round(monthlyInflow / 160));
  const burnDays = Number((amount / Math.max(1, dailyBurn)).toFixed(1));
  const workHours = Number((amount / hourlyRate).toFixed(1));
  // 10 years @ 12% CAGR = (1.12)^10 = ~3.106
  const tenYearOpportunityCost = Math.round(amount * Math.pow(1.12, 10));

  const now = Date.now();
  return {
    id: `cool_${now}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    amount,
    createdAt: now,
    expiresAt: now + 72 * 60 * 60 * 1000, // 72 hours from now
    burnEquivalentDays: burnDays,
    workHoursEquivalent: workHours,
    tenYearOpportunityCost,
  };
}

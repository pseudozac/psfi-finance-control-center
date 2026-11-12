import { describe, it, expect } from 'vitest';
import { calculateDailyBurn } from './impulseShield';
import { calculateSummary, DEFAULT_PLAN } from './finance';
import type { FinancePlan } from '../types/finance';

describe('Impulse Shield & Daily Burn Engine', () => {
  it('calculates baseline daily burn correctly from monthly discretionary pool', () => {
    const summary = calculateSummary(DEFAULT_PLAN);
    // Inflow: 135,000, Expenses: ~50,000, SIP: 40,000 => Discretionary: ~45,000
    const burn = calculateDailyBurn(DEFAULT_PLAN, summary, {
      currentDayOfMonth: 10,
      totalDaysInMonth: 30,
      spentToday: 0,
      weekendModeActive: false,
    });

    expect(burn.monthlyDiscretionaryPool).toBeGreaterThan(0);
    expect(burn.baseDailyBurn).toBe(Math.round(burn.monthlyDiscretionaryPool / 30));
    expect(burn.remainingDaysInMonth).toBe(21); // 30 - 10 + 1
    expect(burn.remainingBurnToday).toBe(burn.effectiveDailyBurnToday);
    expect(burn.isOverspentToday).toBe(0);
    expect(burn.isSipShieldActive).toBe(false);
  });

  it('recalibrates future daily allowance when user overspends today', () => {
    const summary = calculateSummary(DEFAULT_PLAN);
    const normalBurn = calculateDailyBurn(DEFAULT_PLAN, summary, {
      currentDayOfMonth: 10,
      totalDaysInMonth: 30,
      spentToday: 0,
    });

    // Spend 3x of daily allowance today
    const overspentBurn = calculateDailyBurn(DEFAULT_PLAN, summary, {
      currentDayOfMonth: 10,
      totalDaysInMonth: 30,
      spentToday: normalBurn.baseDailyBurn * 3,
    });

    expect(overspentBurn.isOverspentToday).toBeGreaterThan(0);
    expect(overspentBurn.recalibratedRemainingDailyBurn).toBeLessThan(normalBurn.baseDailyBurn);
  });

  it('activates SIP shield when spending threatens committed investments', () => {
    const tightPlan: FinancePlan = {
      ...DEFAULT_PLAN,
      income: { salary: 60000, freelance: 0, other: 0 },
      savings: { ...DEFAULT_PLAN.savings, monthlySip: 25000 },
      expenses: { ...DEFAULT_PLAN.expenses, housing: 25000, groceries: 10000 },
    };
    const summary = calculateSummary(tightPlan);

    // Discretionary pool is 0 or negative
    const burn = calculateDailyBurn(tightPlan, summary, {
      currentDayOfMonth: 15,
      totalDaysInMonth: 30,
      spentToday: 5000,
    });

    expect(burn.isSipShieldActive).toBe(true);
    expect(burn.sipProtectedAmount).toBe(25000);
  });
});

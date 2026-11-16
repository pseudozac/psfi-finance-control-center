import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PLAN,
  PLAN_PRESETS,
  calculateBudgetRule,
  calculateCashflowWaterfall,
  calculateCrossoverPoint,
  calculateDebtPayoff,
  calculateMultiDebtPayoff,
  calculateProjections,
  calculateStepUpComparison,
  calculateSummary,
  estimateIndianIncomeTax,
  formatCompactINR,
  formatINR,
  planToCSV,
  validateImportedPlan,
} from './finance';

describe('finance calculations', () => {
  it('formats INR using en-IN grouping', () => {
    expect(formatINR(125000)).toBe('₹1,25,000');
    expect(formatINR(Number.NaN)).toBe('₹0');
  });

  it('formats compact INR into Crores and Lakhs', () => {
    expect(formatCompactINR(15_000_000)).toBe('₹1.50 Cr');
    expect(formatCompactINR(2_500_000)).toBe('₹25.00 L');
    expect(formatCompactINR(45_000)).toBe('₹45.0k');
    expect(formatCompactINR(500)).toBe('₹500');
  });

  it('computes monthly surplus, savings rate, and emergency runway', () => {
    const summary = calculateSummary(DEFAULT_PLAN);
    expect(summary.monthlyIncome).toBe(140_000);
    expect(summary.monthlyExpenses).toBe(66_000);
    expect(summary.monthlySurplus).toBe(74_000);
    expect(summary.emergencyRunwayMonths).toBeCloseTo(240_000 / 66_000, 4);
  });

  it('projects step-up SIP, multi-decade compounding, and crossover metrics', () => {
    const pts = calculateProjections(DEFAULT_PLAN, 360, DEFAULT_PLAN);
    expect(pts).toHaveLength(360);
    expect(pts[23].nominalCorpus).toBeGreaterThan(pts[23].realCorpus);
    expect(pts[23].nominalCorpus).toBeGreaterThan(pts[23].totalContributed);
    expect(pts[23].baselineCorpus).toBe(pts[23].nominalCorpus);
    expect(pts[23].compoundGrowth).toBe(pts[23].nominalCorpus - pts[23].totalContributed);
    expect(pts[359].year).toBe(30);

    // Later years should exhibit crossover where monthly gain >= monthly expenses
    const latePoint = pts[pts.length - 1];
    expect(latePoint.isCrossover).toBe(true);
  });

  it('computes financial independence crossover point correctly', () => {
    const crossover = calculateCrossoverPoint(DEFAULT_PLAN, 360);
    expect(crossover.achieved).toBe(true);
    expect(crossover.month).toBeGreaterThan(0);
    expect(crossover.monthlyPassiveGain).toBeGreaterThanOrEqual(crossover.monthlyExpenses);
  });

  it('calculates the step-up advantage over flat SIP', () => {
    const comparison = calculateStepUpComparison(DEFAULT_PLAN, 120);
    expect(comparison.currentCorpus).toBeGreaterThan(comparison.flatCorpus);
    expect(comparison.difference).toBeGreaterThan(0);
    expect(comparison.differencePercent).toBeGreaterThan(0);
  });

  it('computes cashflow waterfall stages and daily burn rates', () => {
    const waterfall = calculateCashflowWaterfall(DEFAULT_PLAN);
    expect(waterfall.totalIncome).toBe(140_000);
    expect(waterfall.essentialNeeds).toBe(56_000);
    expect(waterfall.debtObligations).toBe(8_000);
    expect(waterfall.discretionaryWants).toBe(10_000);
    expect(waterfall.investmentsAndSavings).toBe(40_000);
    expect(waterfall.unallocatedSurplus).toBe(26_000);
    expect(waterfall.dailyLivingBurn).toBeGreaterThan(0);
    expect(waterfall.dailyDiscretionaryPocket).toBeGreaterThan(0);
    expect(waterfall.fixedObligationsDay).toBe(14); // ceil(((56k + 8k) / 140k) * 30) = ceil(13.71) = 14
    expect(waterfall.steps.length).toBeGreaterThanOrEqual(4);
  });

  it('handles debt payoff edge cases cleanly', () => {
    const zeroDebt = calculateDebtPayoff(0, 18, 5000);
    expect(zeroDebt.months).toBe(0);
    expect(zeroDebt.warning).toBeNull();

    const zeroApr = calculateDebtPayoff(12_000, 0, 3_000);
    expect(zeroApr.months).toBe(4);
    expect(zeroApr.totalInterest).toBe(0);

    const underwater = calculateDebtPayoff(100_000, 36, 2_000); // monthly interest = 3,000
    expect(underwater.months).toBeNull();
    expect(underwater.warning).toContain('does not exceed');
  });

  it('compares Indian Old vs New tax regimes', () => {
    const lowIncome = estimateIndianIncomeTax(700_000, 0, 0);
    expect(lowIncome.newRegimeTax).toBe(0);
    expect(lowIncome.oldRegimeTax).toBeGreaterThan(0);
    expect(lowIncome.recommended).toBe('new');

    const tieIncome = estimateIndianIncomeTax(700_000, 150_000, 25_000);
    expect(tieIncome.newRegimeTax).toBe(0);
    expect(tieIncome.oldRegimeTax).toBe(0);
    expect(tieIncome.recommended).toBe('tie');

    const highIncomeWithDeductions = estimateIndianIncomeTax(1_800_000, 150_000, 50_000);
    expect(highIncomeWithDeductions.newRegimeTax).toBeGreaterThan(0);
    expect(highIncomeWithDeductions.oldRegimeTax).toBeGreaterThan(0);
  });

  it('simulates multi-debt avalanche vs snowball strategies', () => {
    const debts = [
      { id: 'card1', name: 'Premium Card', balance: 50_000, aprPercent: 42, minMonthlyPayment: 2_500 },
      { id: 'card2', name: 'Store Card', balance: 15_000, aprPercent: 18, minMonthlyPayment: 1_000 },
      { id: 'loan1', name: 'Personal Loan', balance: 100_000, aprPercent: 14, minMonthlyPayment: 4_000 },
    ];
    const result = calculateMultiDebtPayoff(debts, 15_000);
    expect(result.hasMultipleLiabilities).toBe(true);
    expect(result.totalBalance).toBe(165_000);
    expect(result.avalanche.monthsToDebtFree).not.toBeNull();
    expect(result.snowball.monthsToDebtFree).not.toBeNull();
    // Avalanche pays off highest APR (Premium Card 42%) first
    expect(result.avalanche.payoffOrder[0]).toBe('Premium Card');
    // Snowball pays off lowest balance (Store Card 15k) first
    expect(result.snowball.payoffOrder[0]).toBe('Store Card');
    // Avalanche saves more or equal interest compared to snowball
    expect(result.avalanche.totalInterestPaid).toBeLessThanOrEqual(result.snowball.totalInterestPaid);
  });

  it('provides detailed tax slab breakdowns and capital gains details', () => {
    const res = estimateIndianIncomeTax(1_500_000, 150_000, 50_000);
    expect(res.newRegimeSlabs?.length).toBe(6);
    expect(res.oldRegimeSlabs?.length).toBe(4);
    expect(res.effectiveRateNew).toBeGreaterThan(0);
    expect(res.effectiveRateOld).toBeGreaterThan(0);
    expect(res.ltcgExemptionLimit).toBe(125_000);
    expect(res.ltcgRatePercent).toBe(12.5);
    expect(res.stcgRatePercent).toBe(20.0);
  });

  it('validates imported JSON plans and rejects malformed payloads', () => {
    const valid = validateImportedPlan({
      plan: {
        income: { salary: 90_000 },
        expenses: { housing: 20_000 },
      },
    });
    expect(valid.income.salary).toBe(90_000);
    expect(valid.expenses.housing).toBe(20_000);

    expect(() => validateImportedPlan('corrupt')).toThrow();
    expect(() => validateImportedPlan({ foo: 'bar' })).toThrow();
  });

  it('exports summary and projections as CSV', () => {
    const pts = calculateProjections(DEFAULT_PLAN, 12);
    const csv = planToCSV(DEFAULT_PLAN, pts);
    expect(csv).toContain('"Summary","Monthly Income","140000"');
    expect(csv).toContain('"Projection","M12"');
  });

  it('evaluates 50/30/20 budget rules and presets', () => {
    const analysis = calculateBudgetRule(DEFAULT_PLAN);
    expect(analysis.needsAmount).toBeGreaterThan(0);
    expect(analysis.wantsAmount).toBeGreaterThan(0);
    expect(analysis.savingsAmount).toBeGreaterThan(0);
    expect(analysis.score).toBeGreaterThanOrEqual(10);
    expect(analysis.score).toBeLessThanOrEqual(100);
    expect(PLAN_PRESETS.length).toBe(4);
  });
});

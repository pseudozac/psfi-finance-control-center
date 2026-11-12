import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PLAN,
  calculateDebtPayoff,
  calculateProjections,
  calculateSummary,
  estimateIndianIncomeTax,
  formatINR,
  planToCSV,
  validateImportedPlan,
} from './finance';

describe('finance calculations', () => {
  it('formats INR using en-IN grouping', () => {
    expect(formatINR(125000)).toBe('₹1,25,000');
    expect(formatINR(Number.NaN)).toBe('₹0');
  });

  it('computes monthly surplus, savings rate, and emergency runway', () => {
    const summary = calculateSummary(DEFAULT_PLAN);
    expect(summary.monthlyIncome).toBe(140_000);
    expect(summary.monthlyExpenses).toBe(66_000);
    expect(summary.monthlySurplus).toBe(74_000);
    expect(summary.emergencyRunwayMonths).toBeCloseTo(240_000 / 66_000, 4);
  });

  it('projects step-up SIP and inflation-adjusted real corpus', () => {
    const pts = calculateProjections(DEFAULT_PLAN, 24, DEFAULT_PLAN);
    expect(pts).toHaveLength(24);
    expect(pts[23].nominalCorpus).toBeGreaterThan(pts[23].realCorpus);
    expect(pts[23].nominalCorpus).toBeGreaterThan(pts[23].totalContributed);
    expect(pts[23].baselineCorpus).toBe(pts[23].nominalCorpus);
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
});

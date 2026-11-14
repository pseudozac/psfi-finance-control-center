import { describe, expect, it } from 'vitest';
import { calculateLoanEmi, calculateLoanArbitrage } from './loanArbitrage';

describe('Loan Prepayment Arbitrage Engine', () => {
  it('correctly calculates baseline EMI for standard Indian home loan', () => {
    // 50 Lakhs at 8.5% for 20 years (240 months)
    const emi = calculateLoanEmi(5000000, 8.5, 240);
    // Standard EMI formula: ~43,391
    expect(emi).toBeGreaterThan(43000);
    expect(emi).toBeLessThan(44000);
  });

  it('correctly computes tenure reduction and interest saved with extra monthly prepayment', () => {
    const result = calculateLoanArbitrage({
      loanAmount: 5000000,
      annualInterestRate: 8.5,
      tenureYears: 20,
      extraMonthlyPrepayment: 10000,
      lumpSumPrepayment: 0,
      sipExpectedCagr: 12,
    });

    // Prepaying 10k/mo should shave off several years (at least 60 months)
    expect(result.monthsSaved).toBeGreaterThan(60);
    expect(result.interestSaved).toBeGreaterThan(1500000); // Saves > 15L interest
    expect(result.newTenureMonths).toBeLessThan(result.baselineTenureMonths);
  });

  it('proves that Equity SIP compounding creates substantial arbitrage alpha over prepayment', () => {
    const result = calculateLoanArbitrage({
      loanAmount: 5000000,
      annualInterestRate: 8.5,
      tenureYears: 20,
      extraMonthlyPrepayment: 10000,
      lumpSumPrepayment: 0,
      sipExpectedCagr: 12, // 12% equity return vs 8.5% debt interest
    });

    // 12% equity growth creates more net wealth than 8.5% interest saved
    expect(result.sipNetWealthGain).toBeGreaterThan(result.interestSaved);
    expect(result.netArbitrageAdvantage).toBeGreaterThan(0);
    expect(result.recommendedStrategy).toBe('invest_sip');
  });

  it('recommends debt prepayment if equity return is conservative or lower than debt rate', () => {
    const result = calculateLoanArbitrage({
      loanAmount: 3000000,
      annualInterestRate: 9.5,
      tenureYears: 15,
      extraMonthlyPrepayment: 5000,
      lumpSumPrepayment: 0,
      sipExpectedCagr: 8.0, // Expected return is below debt cost
    });

    expect(result.recommendedStrategy).toBe('prepay_debt');
  });
});

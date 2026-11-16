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

  it('reconciles gross vs post-tax equity corpus and arbitrage delta with 12.5% LTCG tax', () => {
    // 50 Lakhs loan at 8.5% for 20 years with 10k/month extra allocation and 12% equity CAGR
    const result = calculateLoanArbitrage({
      loanAmount: 5000000,
      annualInterestRate: 8.5,
      tenureYears: 20,
      extraMonthlyPrepayment: 10000,
      lumpSumPrepayment: 0,
      sipExpectedCagr: 12,
    });

    // 20-year gross compounding of 10k/month at 12% is ~99.91 Lakhs
    expect(result.grossSipFutureValue).toBeGreaterThan(9900000);
    expect(result.grossSipFutureValue).toBeLessThan(10100000);

    // Invested principal is 10k * 240 = 24.0 Lakhs
    expect(result.sipInvestedPrincipal).toBe(2400000);

    // Gross gain is ~75.91 Lakhs
    expect(result.grossSipNetGain).toBeGreaterThan(7500000);

    // Section 112A LTCG tax (12.5% on gains exceeding 1.25L)
    expect(result.estimatedLtcgTax).toBeGreaterThan(900000); // ~9.33L
    expect(result.postTaxSipFutureValue).toBe(result.grossSipFutureValue - result.estimatedLtcgTax);

    // Gross arbitrage advantage is ~54.13 Lakhs (Gross Gain - Interest Saved)
    expect(result.grossArbitrageAdvantage).toBeGreaterThan(5300000);
    expect(result.grossArbitrageAdvantage).toBeLessThan(5500000);

    // Net post-tax arbitrage advantage is ~44.80 Lakhs (Post-Tax Gain - Interest Saved)
    expect(result.netArbitrageAdvantage).toBeGreaterThan(4400000);
    expect(result.netArbitrageAdvantage).toBeLessThan(4600000);
    expect(result.netArbitrageAdvantage).toBeLessThan(result.grossArbitrageAdvantage);

    // Yearly schedule contains both gross and net post-tax values
    const finalYear = result.yearlySchedule[result.yearlySchedule.length - 1];
    expect(finalYear.sipPortfolioValueGross).toBe(result.grossSipFutureValue);
    expect(finalYear.sipPortfolioValueNet).toBe(result.postTaxSipFutureValue);
  });
});

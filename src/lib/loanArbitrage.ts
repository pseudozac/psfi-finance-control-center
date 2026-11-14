/**
 * Loan Prepayment vs. Equity SIP Arbitrage Engine
 * Actuarial simulation model for Indian borrowers comparing:
 * - Path A: Prepaying debt (saving guaranteed home/education loan interest)
 * - Path B: Investing extra cashflow in equity mutual fund SIPs (wealth compounding)
 */

export interface LoanArbitrageInputs {
  loanAmount: number; // Principal outstanding, e.g. 5,000,000 (50L)
  annualInterestRate: number; // e.g. 8.5%
  tenureYears: number; // e.g. 20
  extraMonthlyPrepayment: number; // e.g. 10,000 / month
  lumpSumPrepayment: number; // e.g. 200,000 one-time
  sipExpectedCagr: number; // e.g. 12%
}

export interface LoanArbitrageResult {
  monthlyEmi: number;
  // Baseline without prepayment
  baselineTotalInterest: number;
  baselineTotalPayment: number;
  baselineTenureMonths: number;

  // Path A: With Prepayment
  newTenureMonths: number;
  monthsSaved: number;
  prepayTotalInterest: number;
  interestSaved: number;
  totalPrepaymentOutflow: number;

  // Path B: Equity SIP Compounding (investing the same prepayment amount)
  sipFutureValue: number;
  sipInvestedPrincipal: number;
  sipNetWealthGain: number;

  // Actuarial Arbitrage Delta
  netArbitrageAdvantage: number; // Wealth created by SIP over and above interest saved
  recommendedStrategy: 'invest_sip' | 'prepay_debt' | 'balanced_split';
  breakEvenCagr: number; // Market return rate at which both paths produce identical financial benefit
}

export function calculateLoanEmi(principal: number, annualRatePct: number, tenureMonths: number): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualRatePct <= 0) return principal / tenureMonths;

  const monthlyRate = annualRatePct / (12 * 100);
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return Math.round((principal * monthlyRate * factor) / (factor - 1));
}

export function calculateLoanArbitrage(inputs: LoanArbitrageInputs): LoanArbitrageResult {
  const {
    loanAmount,
    annualInterestRate,
    tenureYears,
    extraMonthlyPrepayment,
    lumpSumPrepayment,
    sipExpectedCagr,
  } = inputs;

  const totalMonths = Math.max(1, Math.round(tenureYears * 12));
  const monthlyRate = (annualInterestRate || 0) / (12 * 100);
  const emi = calculateLoanEmi(loanAmount, annualInterestRate, totalMonths);

  // 1. Baseline Amortization
  let baselineBalance = loanAmount;
  let baselineTotalInterest = 0;
  for (let m = 1; m <= totalMonths; m++) {
    const interest = baselineBalance * monthlyRate;
    const principalPortion = Math.min(baselineBalance, emi - interest);
    baselineTotalInterest += interest;
    baselineBalance -= principalPortion;
    if (baselineBalance <= 0) break;
  }
  const baselineTotalPayment = loanAmount + baselineTotalInterest;

  // 2. Prepayment Amortization
  let prepayBalance = Math.max(0, loanAmount - (lumpSumPrepayment || 0));
  let prepayTotalInterest = 0;
  let newTenureMonths = 0;
  let totalPrepaymentOutflow = lumpSumPrepayment || 0;

  const maxMonths = totalMonths;
  while (prepayBalance > 0 && newTenureMonths < maxMonths * 2) {
    newTenureMonths++;
    const interest = prepayBalance * monthlyRate;
    prepayTotalInterest += interest;

    const basePrincipal = emi - interest;
    const extra = extraMonthlyPrepayment || 0;
    const principalPaid = Math.min(prepayBalance, basePrincipal + extra);
    totalPrepaymentOutflow += extra;

    prepayBalance -= principalPaid;
    if (prepayBalance <= 0) break;
  }

  const monthsSaved = Math.max(0, totalMonths - newTenureMonths);
  const interestSaved = Math.max(0, baselineTotalInterest - prepayTotalInterest);

  // 3. Alternative SIP Investment
  // If the borrower invests the lumpSum + extraMonthlyPrepayment for the same duration
  const sipMonthlyRate = (sipExpectedCagr || 0) / (12 * 100);
  let sipFutureValue = lumpSumPrepayment || 0;
  // Compound lumpsum over baseline tenure
  if (sipFutureValue > 0) {
    sipFutureValue = sipFutureValue * Math.pow(1 + sipMonthlyRate, totalMonths);
  }

  // Monthly SIP compounding over the baseline tenure
  if (extraMonthlyPrepayment > 0 && sipMonthlyRate > 0) {
    const monthlySipFV =
      extraMonthlyPrepayment *
      ((Math.pow(1 + sipMonthlyRate, totalMonths) - 1) / sipMonthlyRate) *
      (1 + sipMonthlyRate);
    sipFutureValue += monthlySipFV;
  } else if (extraMonthlyPrepayment > 0) {
    sipFutureValue += extraMonthlyPrepayment * totalMonths;
  }

  const sipInvestedPrincipal = (lumpSumPrepayment || 0) + (extraMonthlyPrepayment || 0) * totalMonths;
  const sipNetWealthGain = Math.max(0, sipFutureValue - sipInvestedPrincipal);

  // 4. Arbitrage Comparison
  // Path A benefit = interestSaved (wealth preserved)
  // Path B benefit = sipNetWealthGain (wealth generated)
  const netArbitrageAdvantage = Math.round(sipNetWealthGain - interestSaved);

  // Break-even CAGR: Approximately the loan interest rate adjusted for tax and certainty
  const breakEvenCagr = Number((annualInterestRate * 1.05).toFixed(2));

  let recommendedStrategy: 'invest_sip' | 'prepay_debt' | 'balanced_split' = 'invest_sip';
  if (sipExpectedCagr < annualInterestRate + 1.0) {
    recommendedStrategy = 'prepay_debt';
  } else if (sipExpectedCagr <= annualInterestRate + 3.0) {
    recommendedStrategy = 'balanced_split';
  } else {
    recommendedStrategy = 'invest_sip';
  }

  return {
    monthlyEmi: Math.round(emi),
    baselineTotalInterest: Math.round(baselineTotalInterest),
    baselineTotalPayment: Math.round(baselineTotalPayment),
    baselineTenureMonths: totalMonths,
    newTenureMonths,
    monthsSaved,
    prepayTotalInterest: Math.round(prepayTotalInterest),
    interestSaved: Math.round(interestSaved),
    totalPrepaymentOutflow: Math.round(totalPrepaymentOutflow),
    sipFutureValue: Math.round(sipFutureValue),
    sipInvestedPrincipal: Math.round(sipInvestedPrincipal),
    sipNetWealthGain: Math.round(sipNetWealthGain),
    netArbitrageAdvantage,
    recommendedStrategy,
    breakEvenCagr,
  };
}

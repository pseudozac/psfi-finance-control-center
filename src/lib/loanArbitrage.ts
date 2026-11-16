/**
 * Loan Prepayment vs. Equity SIP Arbitrage Engine
 * Actuarial simulation model for Indian borrowers comparing:
 * - Path A: Prepaying debt (saving guaranteed home/education loan interest)
 * - Path B: Investing extra cashflow in equity mutual fund SIPs (wealth compounding)
 * - Path C: Smart 50/50 Hybrid (halving debt risk while building compounding liquidity)
 */

export interface LoanArbitrageInputs {
  loanAmount: number; // Principal outstanding, e.g. 5,000,000 (50L)
  annualInterestRate: number; // e.g. 8.5%
  tenureYears: number; // e.g. 20
  extraMonthlyPrepayment: number; // e.g. 10,000 / month
  lumpSumPrepayment: number; // e.g. 200,000 one-time
  sipExpectedCagr: number; // e.g. 12%
  taxRegime?: 'new_regime' | 'old_regime'; // Section 24(b) home loan tax deduction
  taxSlabPercent?: number; // e.g. 30% slab (+ 4% cess = 31.2%)
}

export interface YearlyMilestone {
  year: number;
  loanBalanceStandard: number;
  loanBalancePrepay: number;
  sipPortfolioValue: number; // Gross SIP portfolio value
  sipPortfolioValueGross: number; // Gross compounding at expected CAGR
  sipPortfolioValueNet: number; // Post-12.5% LTCG tax on cumulative gains
  estimatedLtcgTax: number; // Cumulative estimated LTCG tax
  interestSavedCumulative: number;
  isVirtualDebtFree: boolean; // True when SIP Portfolio >= Standard Outstanding Balance
}

export interface HybridArbitrageResult {
  newTenureMonths: number;
  monthsSaved: number;
  interestSaved: number;
  sipFutureValue: number;
  sipNetWealthGain: number;
  totalCombinedBenefit: number;
}

export interface TaxAdjustmentDetails {
  effectiveLoanRate: number; // Post-tax cost of debt
  annualTaxSavingsSec24b: number; // Maximum ₹2 Lakh deduction in Old Regime
  postTaxEquityCagr: number; // Post-12.5% LTCG tax return equivalent
  ltcgTaxRatePercent: number; // 12.5% under Finance Act 2024 / Section 112A
  annualLtcgExemption: number; // ₹1,25,000 exemption limit
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
  sipFutureValue: number; // Gross SIP portfolio value (pre-tax)
  grossSipFutureValue: number; // Explicit gross pre-tax terminal corpus
  sipInvestedPrincipal: number;
  sipNetWealthGain: number; // Gross wealth created before tax
  grossSipNetGain: number; // Gross wealth created before tax
  estimatedLtcgTax: number; // Statutory 12.5% LTCG tax on gains exceeding ₹1.25L
  postTaxSipFutureValue: number; // Net terminal corpus after 12.5% LTCG tax
  postTaxSipNetGain: number; // Net wealth gain after tax and principal

  // Path C: Smart 50/50 Hybrid Strategy
  hybrid: HybridArbitrageResult;

  // Actuarial Arbitrage Delta & Crossover
  grossArbitrageAdvantage: number; // Gross wealth created by SIP over and above interest saved (Pre-Tax)
  netArbitrageAdvantage: number; // Post-tax wealth created by SIP over and above interest saved (Net Post-Tax)
  recommendedStrategy: 'invest_sip' | 'prepay_debt' | 'balanced_split';
  breakEvenCagr: number; // Market return rate at which both paths produce identical financial benefit
  virtualDebtFreeYear: number | null; // Exact year where SIP corpus overtakes remaining loan principal

  // Tax adjustments under Indian Law
  taxDetails: TaxAdjustmentDetails;

  // Year-by-Year Schedule for Visualization
  yearlySchedule: YearlyMilestone[];
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
    taxRegime = 'new_regime',
    taxSlabPercent = 30,
  } = inputs;

  const totalMonths = Math.max(1, Math.round(tenureYears * 12));
  const monthlyRate = (annualInterestRate || 0) / (12 * 100);
  const emi = calculateLoanEmi(loanAmount, annualInterestRate, totalMonths);

  // 1. Tax Adjustments (Section 24b vs Section 115BAC + 12.5% Equity LTCG)
  let effectiveLoanRate = annualInterestRate;
  let annualTaxSavingsSec24b = 0;

  if (taxRegime === 'old_regime') {
    // Under Old Regime, home loan interest up to ₹2,00,000 per year is tax deductible under Sec 24(b)
    const effectiveSlabWithCess = (taxSlabPercent || 30) * 1.04; // including 4% Health & Education Cess
    annualTaxSavingsSec24b = Math.min(200000, loanAmount * (annualInterestRate / 100)) * (effectiveSlabWithCess / 100);
    // Effective rate is discounted by the tax shield
    const rateDiscount = (annualTaxSavingsSec24b / loanAmount) * 100;
    effectiveLoanRate = Math.max(0.1, Number((annualInterestRate - rateDiscount).toFixed(2)));
  }

  // Equity LTCG tax under Budget 2024 is 12.5% on gains over ₹1.25L.
  // Effective post-tax CAGR discount factor is approximately 0.90x
  const postTaxEquityCagr = Number((sipExpectedCagr * 0.90).toFixed(2));
  const ltcgTaxRatePercent = 12.5;
  const annualLtcgExemption = 125000;

  // 2. Baseline Amortization (Monthly)
  let baselineBalance = loanAmount;
  let baselineTotalInterest = 0;
  const baselineBalancesByMonth: number[] = [loanAmount];

  for (let m = 1; m <= totalMonths; m++) {
    const interest = baselineBalance * monthlyRate;
    const principalPortion = Math.min(baselineBalance, emi - interest);
    baselineTotalInterest += interest;
    baselineBalance -= principalPortion;
    baselineBalancesByMonth.push(Math.max(0, baselineBalance));
    if (baselineBalance <= 0) break;
  }
  const baselineTotalPayment = loanAmount + baselineTotalInterest;

  // 3. Path A: 100% Prepayment Amortization
  let prepayBalance = Math.max(0, loanAmount - (lumpSumPrepayment || 0));
  let prepayTotalInterest = 0;
  let newTenureMonths = 0;
  let totalPrepaymentOutflow = lumpSumPrepayment || 0;
  const prepayBalancesByMonth: number[] = [prepayBalance];

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
    prepayBalancesByMonth.push(Math.max(0, prepayBalance));
    if (prepayBalance <= 0) break;
  }

  const monthsSaved = Math.max(0, totalMonths - newTenureMonths);
  const interestSaved = Math.max(0, baselineTotalInterest - prepayTotalInterest);

  // 4. Path B: Alternative Equity SIP Investment
  const sipMonthlyRate = (sipExpectedCagr || 0) / (12 * 100);
  let sipFutureValue = lumpSumPrepayment || 0;
  if (sipFutureValue > 0) {
    sipFutureValue = sipFutureValue * Math.pow(1 + sipMonthlyRate, totalMonths);
  }

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
  const grossSipFutureValue = sipFutureValue;
  const grossSipNetGain = Math.max(0, grossSipFutureValue - sipInvestedPrincipal);

  // Section 112A LTCG Tax: 12.5% on capital gains exceeding ₹1.25 Lakhs
  const taxableGains = Math.max(0, grossSipNetGain - annualLtcgExemption);
  const estimatedLtcgTax = Math.round(taxableGains * (ltcgTaxRatePercent / 100));
  const postTaxSipFutureValue = Math.round(grossSipFutureValue - estimatedLtcgTax);
  const postTaxSipNetGain = Math.max(0, postTaxSipFutureValue - sipInvestedPrincipal);

  // 5. Path C: Smart 50/50 Hybrid Strategy
  // 50% prepays debt, 50% invests in SIP
  const hybridExtraPrepay = (extraMonthlyPrepayment || 0) * 0.5;
  const hybridLumpSum = (lumpSumPrepayment || 0) * 0.5;
  let hybridBalance = Math.max(0, loanAmount - hybridLumpSum);
  let hybridTotalInterest = 0;
  let hybridTenureMonths = 0;

  while (hybridBalance > 0 && hybridTenureMonths < maxMonths * 2) {
    hybridTenureMonths++;
    const interest = hybridBalance * monthlyRate;
    hybridTotalInterest += interest;
    const basePrincipal = emi - interest;
    const principalPaid = Math.min(hybridBalance, basePrincipal + hybridExtraPrepay);
    hybridBalance -= principalPaid;
    if (hybridBalance <= 0) break;
  }

  const hybridMonthsSaved = Math.max(0, totalMonths - hybridTenureMonths);
  const hybridInterestSaved = Math.max(0, baselineTotalInterest - hybridTotalInterest);

  // Hybrid SIP Compounding (50% of capital)
  let hybridSipFV = hybridLumpSum;
  if (hybridSipFV > 0) {
    hybridSipFV = hybridSipFV * Math.pow(1 + sipMonthlyRate, totalMonths);
  }
  if (hybridExtraPrepay > 0 && sipMonthlyRate > 0) {
    hybridSipFV +=
      hybridExtraPrepay *
      ((Math.pow(1 + sipMonthlyRate, totalMonths) - 1) / sipMonthlyRate) *
      (1 + sipMonthlyRate);
  }
  const hybridInvestedPrincipal = hybridLumpSum + hybridExtraPrepay * totalMonths;
  const hybridSipNetGain = Math.max(0, hybridSipFV - hybridInvestedPrincipal);

  // 6. Year-by-Year Milestone Schedule & Virtual Debt-Free Crossover Detection
  const yearlySchedule: YearlyMilestone[] = [];
  let virtualDebtFreeYear: number | null = null;

  for (let yr = 1; yr <= tenureYears; yr++) {
    const monthIdx = Math.min(totalMonths, yr * 12);
    const standardBal = baselineBalancesByMonth[monthIdx] ?? 0;
    const prepayBal = prepayBalancesByMonth[monthIdx] ?? 0;

    // SIP corpus accumulated at this year
    let yrSipValue = lumpSumPrepayment || 0;
    if (yrSipValue > 0) {
      yrSipValue = yrSipValue * Math.pow(1 + sipMonthlyRate, monthIdx);
    }
    if (extraMonthlyPrepayment > 0 && sipMonthlyRate > 0) {
      yrSipValue +=
        extraMonthlyPrepayment *
        ((Math.pow(1 + sipMonthlyRate, monthIdx) - 1) / sipMonthlyRate) *
        (1 + sipMonthlyRate);
    } else if (extraMonthlyPrepayment > 0) {
      yrSipValue += extraMonthlyPrepayment * monthIdx;
    }

    // Cumulative interest saved by this year
    const yrIntSaved = Math.max(0, (loanAmount - prepayBal) - (loanAmount - standardBal));

    // Post-tax portfolio valuation at this milestone
    const yrInvestedPrincipal = (lumpSumPrepayment || 0) + (extraMonthlyPrepayment || 0) * monthIdx;
    const yrGrossGain = Math.max(0, yrSipValue - yrInvestedPrincipal);
    const yrTaxableGain = Math.max(0, yrGrossGain - annualLtcgExemption);
    const yrEstTax = Math.round(yrTaxableGain * (ltcgTaxRatePercent / 100));
    const yrNetSipValue = Math.round(yrSipValue - yrEstTax);

    const isVirtualDebtFree = yrNetSipValue >= standardBal && standardBal > 0;
    if (isVirtualDebtFree && virtualDebtFreeYear === null) {
      virtualDebtFreeYear = yr;
    }

    yearlySchedule.push({
      year: yr,
      loanBalanceStandard: Math.round(standardBal),
      loanBalancePrepay: Math.round(prepayBal),
      sipPortfolioValue: Math.round(yrSipValue),
      sipPortfolioValueGross: Math.round(yrSipValue),
      sipPortfolioValueNet: yrNetSipValue,
      estimatedLtcgTax: yrEstTax,
      interestSavedCumulative: Math.round(yrIntSaved),
      isVirtualDebtFree,
    });
  }

  // 7. Arbitrage Decision Verdict
  // Gross Advantage: Gross wealth created over interest saved
  const grossArbitrageAdvantage = Math.round(grossSipNetGain - interestSaved);
  // Net Advantage: Post-tax wealth created over interest saved
  const netArbitrageAdvantage = Math.round(postTaxSipNetGain - interestSaved);
  const breakEvenCagr = Number((effectiveLoanRate * 1.05).toFixed(2));

  let recommendedStrategy: 'invest_sip' | 'prepay_debt' | 'balanced_split' = 'invest_sip';
  if (postTaxEquityCagr < effectiveLoanRate || netArbitrageAdvantage <= 0) {
    recommendedStrategy = 'prepay_debt';
  } else if (postTaxEquityCagr <= effectiveLoanRate + 2.0) {
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
    sipFutureValue: Math.round(grossSipFutureValue),
    grossSipFutureValue: Math.round(grossSipFutureValue),
    sipInvestedPrincipal: Math.round(sipInvestedPrincipal),
    sipNetWealthGain: Math.round(grossSipNetGain),
    grossSipNetGain: Math.round(grossSipNetGain),
    estimatedLtcgTax,
    postTaxSipFutureValue,
    postTaxSipNetGain,
    hybrid: {
      newTenureMonths: hybridTenureMonths,
      monthsSaved: hybridMonthsSaved,
      interestSaved: Math.round(hybridInterestSaved),
      sipFutureValue: Math.round(hybridSipFV),
      sipNetWealthGain: Math.round(hybridSipNetGain),
      totalCombinedBenefit: Math.round(hybridInterestSaved + hybridSipNetGain),
    },
    grossArbitrageAdvantage,
    netArbitrageAdvantage,
    recommendedStrategy,
    breakEvenCagr,
    virtualDebtFreeYear,
    taxDetails: {
      effectiveLoanRate,
      annualTaxSavingsSec24b: Math.round(annualTaxSavingsSec24b),
      postTaxEquityCagr,
      ltcgTaxRatePercent,
      annualLtcgExemption,
    },
    yearlySchedule,
  };
}

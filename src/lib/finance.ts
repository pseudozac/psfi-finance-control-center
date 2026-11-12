import type {
  BudgetRuleAnalysis,
  DebtPayoffResult,
  FinancePlan,
  FinanceSummary,
  MonthlyProjectionPoint,
  PlanPreset,
  TaxComparisonResult,
} from '../types/finance';

export const DEFAULT_PLAN: FinancePlan = {
  schemaVersion: 2,
  income: {
    salary: 120_000,
    freelance: 15_000,
    other: 5_000,
  },
  expenses: {
    housing: 28_000,
    groceries: 12_000,
    utilities: 5_500,
    transport: 6_500,
    lifestyle: 10_000,
    insurance: 4_000,
  },
  savings: {
    emergencyFundBalance: 240_000,
    monthlySavings: 15_000,
    monthlySip: 25_000,
    stepUpSipPercent: 10,
    expectedReturnPercent: 12,
    inflationPercent: 6,
  },
  debt: {
    cardBalance: 45_000,
    aprPercent: 18,
    monthlyPayment: 8_000,
  },
  tax: {
    deductions80C: 150_000,
    deductions80D: 25_000,
  },
};

export const SCRATCH_PLAN: FinancePlan = {
  schemaVersion: 2,
  income: {
    salary: 0,
    freelance: 0,
    other: 0,
  },
  expenses: {
    housing: 0,
    groceries: 0,
    utilities: 0,
    transport: 0,
    lifestyle: 0,
    insurance: 0,
  },
  savings: {
    emergencyFundBalance: 0,
    monthlySavings: 0,
    monthlySip: 0,
    stepUpSipPercent: 10,
    expectedReturnPercent: 12,
    inflationPercent: 6,
  },
  debt: {
    cardBalance: 0,
    aprPercent: 18,
    monthlyPayment: 0,
  },
  tax: {
    deductions80C: 0,
    deductions80D: 0,
  },
};

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0';
  return inrFormatter.format(Math.round(amount));
}

export function sumValues(record: Record<string, number>): number {
  return Object.values(record).reduce((acc, val) => acc + (Number.isFinite(val) ? val : 0), 0);
}

export function calculateSummary(plan: FinancePlan): FinanceSummary {
  const monthlyIncome = sumValues(plan.income as unknown as Record<string, number>);
  const monthlyExpenses = sumValues(plan.expenses as unknown as Record<string, number>);
  const monthlySurplus = monthlyIncome - monthlyExpenses;
  const savingsRatePercent =
    monthlyIncome > 0
      ? Math.max(0, ((plan.savings.monthlySavings + plan.savings.monthlySip) / monthlyIncome) * 100)
      : 0;
  const emergencyRunwayMonths =
    monthlyExpenses > 0 ? plan.savings.emergencyFundBalance / monthlyExpenses : 0;

  return {
    monthlyIncome,
    monthlyExpenses,
    monthlySurplus,
    savingsRatePercent,
    emergencyRunwayMonths,
  };
}

export function calculateProjections(
  plan: FinancePlan,
  months = 24,
  baselinePlan?: FinancePlan | null
): MonthlyProjectionPoint[] {
  const safeMonths = Math.max(1, Math.min(120, Math.round(months)));
  const monthlyRate = plan.savings.expectedReturnPercent / 100 / 12;
  const monthlyInflation = plan.savings.inflationPercent / 100 / 12;
  const stepUpFactor = 1 + plan.savings.stepUpSipPercent / 100;

  const baseMonthlyRate = baselinePlan ? baselinePlan.savings.expectedReturnPercent / 100 / 12 : 0;
  const baseStepUpFactor = baselinePlan ? 1 + baselinePlan.savings.stepUpSipPercent / 100 : 1;

  let corpus = plan.savings.emergencyFundBalance;
  let contributed = plan.savings.emergencyFundBalance;
  let currentSip = plan.savings.monthlySip;

  let baseCorpus = baselinePlan ? baselinePlan.savings.emergencyFundBalance : 0;
  let baseSip = baselinePlan ? baselinePlan.savings.monthlySip : 0;

  const points: MonthlyProjectionPoint[] = [];

  for (let m = 1; m <= safeMonths; m++) {
    if (m > 1 && (m - 1) % 12 === 0) {
      currentSip *= stepUpFactor;
      if (baselinePlan) baseSip *= baseStepUpFactor;
    }

    const monthlyContribution = plan.savings.monthlySavings + currentSip;
    corpus = corpus * (1 + monthlyRate) + monthlyContribution;
    contributed += monthlyContribution;

    const realCorpus = corpus / Math.pow(1 + monthlyInflation, m);

    const point: MonthlyProjectionPoint = {
      month: m,
      label: `M${m}`,
      nominalCorpus: Math.round(corpus),
      realCorpus: Math.round(realCorpus),
      totalContributed: Math.round(contributed),
    };

    if (baselinePlan) {
      const baseContribution = baselinePlan.savings.monthlySavings + baseSip;
      baseCorpus = baseCorpus * (1 + baseMonthlyRate) + baseContribution;
      point.baselineCorpus = Math.round(baseCorpus);
    }

    points.push(point);
  }

  return points;
}

export function calculateDebtPayoff(
  balance: number,
  aprPercent: number,
  monthlyPayment: number
): DebtPayoffResult {
  if (balance <= 0) {
    return {
      months: 0,
      totalInterest: 0,
      totalPaid: 0,
      monthlyInterestAtStart: 0,
      warning: null,
    };
  }

  const monthlyRate = Math.max(0, aprPercent) / 100 / 12;
  const monthlyInterestAtStart = balance * monthlyRate;

  if (monthlyPayment <= 0 || (monthlyRate > 0 && monthlyPayment <= monthlyInterestAtStart)) {
    return {
      months: null,
      totalInterest: null,
      totalPaid: null,
      monthlyInterestAtStart: Math.round(monthlyInterestAtStart),
      warning: `Payment (${formatINR(monthlyPayment)}) does not exceed first-month interest (${formatINR(monthlyInterestAtStart)}).`,
    };
  }

  let remaining = balance;
  let totalInterest = 0;
  let totalPaid = 0;
  let months = 0;

  while (remaining > 0.01 && months < 600) {
    const interest = remaining * monthlyRate;
    const principalAndInterest = remaining + interest;
    const payment = Math.min(monthlyPayment, principalAndInterest);
    remaining = principalAndInterest - payment;
    totalInterest += interest;
    totalPaid += payment;
    months += 1;
  }

  return {
    months,
    totalInterest: Math.round(totalInterest),
    totalPaid: Math.round(totalPaid),
    monthlyInterestAtStart: Math.round(monthlyInterestAtStart),
    warning: null,
  };
}

function computeSlabs(taxable: number, slabs: Array<[number, number]>): number {
  let tax = 0;
  let prevLimit = 0;
  for (const [limit, rate] of slabs) {
    if (taxable <= prevLimit) break;
    const chunk = Math.min(taxable, limit) - prevLimit;
    tax += chunk * rate;
    prevLimit = limit;
  }
  return tax;
}

/**
 * Estimates Indian personal income tax under New vs Old regimes (FY 2024-25 / AY 2025-26 baseline).
 */
export function estimateIndianIncomeTax(
  annualGrossIncome: number,
  deductions80C = 0,
  deductions80D = 0
): TaxComparisonResult {
  const gross = Math.max(0, annualGrossIncome);

  // New Regime: Rs 75,000 standard deduction; rebate u/s 87A if taxable <= Rs 7,00,000
  const newTaxable = Math.max(0, gross - 75_000);
  let newBaseTax =
    newTaxable <= 700_000
      ? 0
      : computeSlabs(newTaxable, [
          [300_000, 0],
          [700_000, 0.05],
          [1_000_000, 0.1],
          [1_200_000, 0.15],
          [1_500_000, 0.2],
          [Infinity, 0.3],
        ]);
  const newRegimeTax = Math.round(newBaseTax * 1.04); // 4% Health & Education Cess

  // Old Regime: Rs 50,000 standard deduction + capped 80C (1.5L) + 80D (75k)
  const capped80C = Math.min(150_000, Math.max(0, deductions80C));
  const capped80D = Math.min(75_000, Math.max(0, deductions80D));
  const oldTaxable = Math.max(0, gross - 50_000 - capped80C - capped80D);
  let oldBaseTax =
    oldTaxable <= 500_000
      ? 0
      : computeSlabs(oldTaxable, [
          [250_000, 0],
          [500_000, 0.05],
          [1_000_000, 0.2],
          [Infinity, 0.3],
        ]);
  const oldRegimeTax = Math.round(oldBaseTax * 1.04);

  const diff = Math.abs(oldRegimeTax - newRegimeTax);
  const recommended = newRegimeTax < oldRegimeTax ? 'new' : oldRegimeTax < newRegimeTax ? 'old' : 'tie';

  return {
    annualGrossIncome: Math.round(gross),
    oldRegimeTax,
    newRegimeTax,
    recommended,
    savings: diff,
  };
}

function finiteNonNeg(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function validateImportedPlan(raw: unknown): FinancePlan {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid JSON structure: expected an object.');
  }

  const candidate =
    'plan' in raw && raw.plan && typeof raw.plan === 'object'
      ? (raw.plan as Record<string, unknown>)
      : (raw as Record<string, unknown>);

  const inc = (candidate.income ?? {}) as Record<string, unknown>;
  const exp = (candidate.expenses ?? {}) as Record<string, unknown>;
  const sav = (candidate.savings ?? {}) as Record<string, unknown>;
  const debt = (candidate.debt ?? {}) as Record<string, unknown>;
  const tax = (candidate.tax ?? {}) as Record<string, unknown>;

  if (typeof candidate.income !== 'object' || typeof candidate.expenses !== 'object') {
    throw new Error('Missing required "income" or "expenses" sections.');
  }

  return {
    schemaVersion: 2,
    income: {
      salary: finiteNonNeg(inc.salary, DEFAULT_PLAN.income.salary),
      freelance: finiteNonNeg(inc.freelance, DEFAULT_PLAN.income.freelance),
      other: finiteNonNeg(inc.other, DEFAULT_PLAN.income.other),
    },
    expenses: {
      housing: finiteNonNeg(exp.housing, DEFAULT_PLAN.expenses.housing),
      groceries: finiteNonNeg(exp.groceries, DEFAULT_PLAN.expenses.groceries),
      utilities: finiteNonNeg(exp.utilities, DEFAULT_PLAN.expenses.utilities),
      transport: finiteNonNeg(exp.transport, DEFAULT_PLAN.expenses.transport),
      lifestyle: finiteNonNeg(exp.lifestyle, DEFAULT_PLAN.expenses.lifestyle),
      insurance: finiteNonNeg(exp.insurance, DEFAULT_PLAN.expenses.insurance),
    },
    savings: {
      emergencyFundBalance: finiteNonNeg(sav.emergencyFundBalance, DEFAULT_PLAN.savings.emergencyFundBalance),
      monthlySavings: finiteNonNeg(sav.monthlySavings, DEFAULT_PLAN.savings.monthlySavings),
      monthlySip: finiteNonNeg(sav.monthlySip, DEFAULT_PLAN.savings.monthlySip),
      stepUpSipPercent: finiteNonNeg(sav.stepUpSipPercent, DEFAULT_PLAN.savings.stepUpSipPercent),
      expectedReturnPercent: finiteNonNeg(sav.expectedReturnPercent, DEFAULT_PLAN.savings.expectedReturnPercent),
      inflationPercent: finiteNonNeg(sav.inflationPercent, DEFAULT_PLAN.savings.inflationPercent),
    },
    debt: {
      cardBalance: finiteNonNeg(debt.cardBalance, DEFAULT_PLAN.debt.cardBalance),
      aprPercent: finiteNonNeg(debt.aprPercent, DEFAULT_PLAN.debt.aprPercent),
      monthlyPayment: finiteNonNeg(debt.monthlyPayment, DEFAULT_PLAN.debt.monthlyPayment),
    },
    tax: {
      deductions80C: finiteNonNeg(tax.deductions80C, DEFAULT_PLAN.tax.deductions80C),
      deductions80D: finiteNonNeg(tax.deductions80D, DEFAULT_PLAN.tax.deductions80D),
    },
  };
}

export function planToCSV(plan: FinancePlan, projections: MonthlyProjectionPoint[]): string {
  const summary = calculateSummary(plan);
  const rows = [
    ['Section', 'Metric', 'Value (INR / %)'],
    ['Summary', 'Monthly Income', String(summary.monthlyIncome)],
    ['Summary', 'Monthly Expenses', String(summary.monthlyExpenses)],
    ['Summary', 'Monthly Surplus', String(summary.monthlySurplus)],
    ['Summary', 'Savings Rate (%)', summary.savingsRatePercent.toFixed(1)],
    ['Summary', 'Emergency Runway (Months)', summary.emergencyRunwayMonths.toFixed(1)],
    ['Projection', 'Month', 'Nominal Corpus,Real Corpus,Contributed'],
    ...projections.map((p) => [
      'Projection',
      p.label,
      `${p.nominalCorpus},${p.realCorpus},${p.totalContributed}`,
    ]),
  ];
  return rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function calculateBudgetRule(plan: FinancePlan): BudgetRuleAnalysis {
  const totalIncome = plan.income.salary + plan.income.freelance + plan.income.other;
  const safeIncome = Math.max(1, totalIncome);

  const needsAmount =
    plan.expenses.housing +
    plan.expenses.groceries +
    plan.expenses.utilities +
    plan.expenses.transport +
    plan.expenses.insurance;
  const wantsAmount = plan.expenses.lifestyle;
  const savingsAmount = plan.savings.monthlySavings + plan.savings.monthlySip;

  const needsPercent = Math.round((needsAmount / safeIncome) * 100);
  const wantsPercent = Math.round((wantsAmount / safeIncome) * 100);
  const savingsPercent = Math.round((savingsAmount / safeIncome) * 100);

  let score = 100;
  if (needsPercent > 50) score -= (needsPercent - 50) * 1.5;
  if (wantsPercent > 30) score -= (wantsPercent - 30) * 1.5;
  if (savingsPercent < 20) score -= (20 - savingsPercent) * 2;
  score = Math.max(10, Math.min(100, Math.round(score)));

  const rating = score >= 80 ? 'Optimal' : score >= 60 ? 'Healthy' : 'Attention Needed';

  return {
    needsAmount,
    needsPercent,
    wantsAmount,
    wantsPercent,
    savingsAmount,
    savingsPercent,
    score,
    rating,
  };
}

export const PLAN_PRESETS: PlanPreset[] = [
  {
    id: 'starter',
    name: 'Early Career',
    tagline: 'Building emergency runway & starting disciplined monthly SIP',
    badge: 'Foundation',
    plan: {
      schemaVersion: 2,
      income: { salary: 65_000, freelance: 8_000, other: 0 },
      expenses: { housing: 18_000, groceries: 8_000, utilities: 3_500, transport: 4_500, lifestyle: 9_000, insurance: 2_000 },
      savings: { emergencyFundBalance: 120_000, monthlySavings: 10_000, monthlySip: 15_000, stepUpSipPercent: 12, expectedReturnPercent: 13, inflationPercent: 6 },
      debt: { cardBalance: 15_000, aprPercent: 18, monthlyPayment: 5_000 },
      tax: { deductions80C: 50_000, deductions80D: 15_000 },
    },
  },
  {
    id: 'family',
    name: 'Family Growth',
    tagline: 'Home EMI, children school, family term health cover & 80C optimization',
    badge: 'Balanced',
    plan: {
      schemaVersion: 2,
      income: { salary: 180_000, freelance: 20_000, other: 5_000 },
      expenses: { housing: 48_000, groceries: 20_000, utilities: 8_000, transport: 9_500, lifestyle: 18_000, insurance: 7_500 },
      savings: { emergencyFundBalance: 450_000, monthlySavings: 25_000, monthlySip: 40_000, stepUpSipPercent: 10, expectedReturnPercent: 12, inflationPercent: 6 },
      debt: { cardBalance: 0, aprPercent: 0, monthlyPayment: 0 },
      tax: { deductions80C: 150_000, deductions80D: 50_000 },
    },
  },
  {
    id: 'fire',
    name: 'Aggressive FIRE',
    tagline: 'High savings rate (60%+) & compound step-up SIP for early financial independence',
    badge: 'High Velocity',
    plan: {
      schemaVersion: 2,
      income: { salary: 280_000, freelance: 45_000, other: 15_000 },
      expenses: { housing: 42_000, groceries: 16_000, utilities: 6_000, transport: 6_000, lifestyle: 15_000, insurance: 6_000 },
      savings: { emergencyFundBalance: 800_000, monthlySavings: 40_000, monthlySip: 160_000, stepUpSipPercent: 15, expectedReturnPercent: 13.5, inflationPercent: 6 },
      debt: { cardBalance: 0, aprPercent: 0, monthlyPayment: 0 },
      tax: { deductions80C: 150_000, deductions80D: 25_000 },
    },
  },
  {
    id: 'debt_crush',
    name: 'Debt Crusher',
    tagline: 'Rapid elimination of high-interest revolving card debt to restore positive surplus',
    badge: 'Freedom Plan',
    plan: {
      schemaVersion: 2,
      income: { salary: 95_000, freelance: 10_000, other: 0 },
      expenses: { housing: 24_000, groceries: 10_000, utilities: 4_500, transport: 5_000, lifestyle: 6_500, insurance: 3_000 },
      savings: { emergencyFundBalance: 75_000, monthlySavings: 5_000, monthlySip: 5_000, stepUpSipPercent: 5, expectedReturnPercent: 11, inflationPercent: 6 },
      debt: { cardBalance: 160_000, aprPercent: 36, monthlyPayment: 25_000 },
      tax: { deductions80C: 100_000, deductions80D: 15_000 },
    },
  },
];


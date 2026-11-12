import type {
  BudgetRuleAnalysis,
  CustomExpenseItem,
  DebtPayoffResult,
  EmergencyStressTestResult,
  ExpenseBreakdown,
  FinancePlan,
  FinanceSummary,
  FireAnalysis,
  FireMilestone,
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
    custom: [],
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
    deductionsNPS: 50_000,
    rentPaidMonthly: 28_000,
    isMetroCity: true,
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
    custom: [],
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
    deductionsNPS: 0,
    rentPaidMonthly: 0,
    isMetroCity: false,
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

export function calculateTotalMonthlyExpenses(expenses: ExpenseBreakdown): number {
  const base =
    expenses.housing +
    expenses.groceries +
    expenses.utilities +
    expenses.transport +
    expenses.lifestyle +
    expenses.insurance;
  const customTotal = (expenses.custom ?? []).reduce(
    (sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0),
    0
  );
  return base + customTotal;
}

export function calculateSummary(plan: FinancePlan): FinanceSummary {
  const monthlyIncome = sumValues(plan.income as unknown as Record<string, number>);
  const monthlyExpenses = calculateTotalMonthlyExpenses(plan.expenses);
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

export function calculateFireAnalysis(plan: FinancePlan): FireAnalysis {
  const summary = calculateSummary(plan);
  const annualLivingExpenses = summary.monthlyExpenses * 12;
  const fireTarget = Math.round(annualLivingExpenses * 25);
  const leanFireTarget = Math.round(annualLivingExpenses * 20);
  const fatFireTarget = Math.round(annualLivingExpenses * 35);
  const currentLiquidNetWorth = plan.savings.emergencyFundBalance;

  const milestoneConfigs = [
    { id: '10l', label: '₹10 Lakhs (First Milestone)', targetAmount: 1_000_000 },
    { id: '25l', label: '₹25 Lakhs (Quarter Crore)', targetAmount: 2_500_000 },
    { id: '50l', label: '₹50 Lakhs (Half Crore)', targetAmount: 5_000_000 },
    { id: '1cr', label: '₹1 Crore (The Landmark)', targetAmount: 10_000_000 },
    { id: 'fire', label: `FIRE Target (${formatINR(fireTarget)})`, targetAmount: fireTarget },
    { id: '2.5cr', label: '₹2.5 Crores (Executive Freedom)', targetAmount: 25_000_000 },
  ];

  const monthlyRate = plan.savings.expectedReturnPercent / 100 / 12;
  const stepUpFactor = 1 + plan.savings.stepUpSipPercent / 100;
  let corpus = currentLiquidNetWorth;
  let currentSip = plan.savings.monthlySip;

  const milestoneMonths: Record<string, number | null> = {};
  for (const m of milestoneConfigs) {
    milestoneMonths[m.id] = corpus >= m.targetAmount ? 0 : null;
  }

  const maxMonths = 360; // 30 years simulation
  for (let m = 1; m <= maxMonths; m++) {
    if (m > 1 && (m - 1) % 12 === 0) {
      currentSip *= stepUpFactor;
    }
    const monthlyContribution = plan.savings.monthlySavings + currentSip;
    corpus = corpus * (1 + monthlyRate) + monthlyContribution;

    for (const target of milestoneConfigs) {
      if (milestoneMonths[target.id] === null && corpus >= target.targetAmount) {
        milestoneMonths[target.id] = m;
      }
    }
  }

  const milestones: FireMilestone[] = milestoneConfigs.map((t) => {
    const month = milestoneMonths[t.id];
    return {
      id: t.id,
      label: t.label,
      targetAmount: t.targetAmount,
      month,
      years: month !== null ? Number((month / 12).toFixed(1)) : null,
      achieved: currentLiquidNetWorth >= t.targetAmount,
    };
  });

  const fireMilestone = milestones.find((m) => m.id === 'fire');
  const fireProgressPercent =
    fireTarget > 0 ? Math.min(100, (currentLiquidNetWorth / fireTarget) * 100) : 0;

  return {
    annualLivingExpenses,
    fireTarget,
    leanFireTarget,
    fatFireTarget,
    currentLiquidNetWorth,
    fireProgressPercent,
    fireEtaMonths: fireMilestone?.month ?? null,
    fireEtaYears: fireMilestone?.years ?? null,
    milestones,
  };
}

export function calculateEmergencyStressTest(plan: FinancePlan): EmergencyStressTestResult {
  const liquidReserve = plan.savings.emergencyFundBalance;
  const debtPayment = plan.debt.cardBalance > 0 ? plan.debt.monthlyPayment : 0;

  // 1. Barebones: Housing + Groceries + Utilities + Min Debt
  const barebonesMonthly =
    plan.expenses.housing + plan.expenses.groceries + plan.expenses.utilities + debtPayment;

  // 2. Standard: Essential needs + Term insurance + Transport + Debt
  const standardMonthly =
    barebonesMonthly + plan.expenses.insurance + plan.expenses.transport;

  // 3. Full: Everything (including lifestyle & custom) + Debt
  const fullMonthly = calculateTotalMonthlyExpenses(plan.expenses) + debtPayment;

  const barebonesRunwayMonths =
    barebonesMonthly > 0 ? Number((liquidReserve / barebonesMonthly).toFixed(1)) : 0;
  const standardRunwayMonths =
    standardMonthly > 0 ? Number((liquidReserve / standardMonthly).toFixed(1)) : 0;
  const fullRunwayMonths =
    fullMonthly > 0 ? Number((liquidReserve / fullMonthly).toFixed(1)) : 0;

  let status: 'critical' | 'moderate' | 'fortified' = 'moderate';
  if (fullRunwayMonths < 3) status = 'critical';
  else if (fullRunwayMonths >= 6) status = 'fortified';

  return {
    liquidReserve,
    barebonesMonthly,
    barebonesRunwayMonths,
    standardMonthly,
    standardRunwayMonths,
    fullMonthly,
    fullRunwayMonths,
    status,
  };
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

  const monthlyRate = aprPercent / 100 / 12;
  const initialMonthlyInterest = balance * monthlyRate;

  if (monthlyPayment <= initialMonthlyInterest) {
    return {
      months: null,
      totalInterest: null,
      totalPaid: null,
      monthlyInterestAtStart: Math.round(initialMonthlyInterest),
      warning: `Monthly payment (${formatINR(monthlyPayment)}) does not exceed initial monthly interest (${formatINR(initialMonthlyInterest)}). Debt will never amortize.`,
    };
  }

  let remBalance = balance;
  let totalInterest = 0;
  let totalPaid = 0;
  let months = 0;
  const maxMonths = 360;

  while (remBalance > 0 && months < maxMonths) {
    months += 1;
    const interest = remBalance * monthlyRate;
    totalInterest += interest;
    if (remBalance + interest <= monthlyPayment) {
      totalPaid += remBalance + interest;
      remBalance = 0;
      break;
    } else {
      remBalance = remBalance + interest - monthlyPayment;
      totalPaid += monthlyPayment;
    }
  }

  return {
    months,
    totalInterest: Math.round(totalInterest),
    totalPaid: Math.round(totalPaid),
    monthlyInterestAtStart: Math.round(initialMonthlyInterest),
    warning:
      months >= maxMonths ? 'Payoff exceeds 30-year horizon. Increase monthly allocation.' : null,
  };
}

function computeSlabs(income: number, slabs: [number, number][]): number {
  let tax = 0;
  let previousLimit = 0;

  for (const [limit, rate] of slabs) {
    if (income > previousLimit) {
      const taxableInSlab = Math.min(income, limit) - previousLimit;
      tax += taxableInSlab * rate;
      previousLimit = limit;
    } else {
      break;
    }
  }
  return tax;
}

/**
 * Estimates Indian personal income tax under New vs Old regimes (FY 2024-25 / AY 2025-26 baseline).
 * Enhanced with NPS 80CCD(1B) and HRA exemptions under the Old Regime.
 */
export function estimateIndianIncomeTax(
  annualGrossIncome: number,
  deductions80C = 0,
  deductions80D = 0,
  deductionsNPS = 0,
  rentPaidMonthly = 0,
  isMetroCity = false
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

  // Old Regime: Rs 50,000 standard deduction + 80C (1.5L) + 80D (75k) + NPS 80CCD(1B) (50k) + HRA
  const capped80C = Math.min(150_000, Math.max(0, deductions80C));
  const capped80D = Math.min(75_000, Math.max(0, deductions80D));
  const cappedNPS = Math.min(50_000, Math.max(0, deductionsNPS));

  let hraExemption = 0;
  if (rentPaidMonthly > 0 && gross > 0) {
    const annualRent = rentPaidMonthly * 12;
    const basicEst = gross * 0.5; // typical basic salary ~50% of gross
    const rentMinusTenPctBasic = Math.max(0, annualRent - basicEst * 0.1);
    const metroCap = basicEst * (isMetroCity ? 0.5 : 0.4);
    hraExemption = Math.round(Math.min(rentMinusTenPctBasic, metroCap));
  }

  const oldTaxable = Math.max(
    0,
    gross - 50_000 - capped80C - capped80D - cappedNPS - hraExemption
  );
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
  const recommended =
    newRegimeTax < oldRegimeTax ? 'new' : oldRegimeTax < newRegimeTax ? 'old' : 'tie';

  return {
    annualGrossIncome: Math.round(gross),
    oldRegimeTax,
    newRegimeTax,
    recommended,
    savings: diff,
    hraExemption,
    npsDeduction: cappedNPS,
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

  // Parse custom expenses safely
  let customExpenses: CustomExpenseItem[] = [];
  if (Array.isArray(exp.custom)) {
    customExpenses = exp.custom
      .filter((c) => c && typeof c === 'object')
      .map((c) => ({
        id: String(c.id ?? Math.random().toString(36).substring(2, 7)),
        name: String(c.name ?? 'Custom Expense'),
        amount: finiteNonNeg(c.amount, 0),
      }));
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
      custom: customExpenses,
    },
    savings: {
      emergencyFundBalance: finiteNonNeg(
        sav.emergencyFundBalance,
        DEFAULT_PLAN.savings.emergencyFundBalance
      ),
      monthlySavings: finiteNonNeg(sav.monthlySavings, DEFAULT_PLAN.savings.monthlySavings),
      monthlySip: finiteNonNeg(sav.monthlySip, DEFAULT_PLAN.savings.monthlySip),
      stepUpSipPercent: finiteNonNeg(sav.stepUpSipPercent, DEFAULT_PLAN.savings.stepUpSipPercent),
      expectedReturnPercent: finiteNonNeg(
        sav.expectedReturnPercent,
        DEFAULT_PLAN.savings.expectedReturnPercent
      ),
      inflationPercent: finiteNonNeg(sav.inflationPercent, DEFAULT_PLAN.savings.inflationPercent),
      epfMonthly: sav.epfMonthly ? finiteNonNeg(sav.epfMonthly, 0) : undefined,
      ppfAnnual: sav.ppfAnnual ? finiteNonNeg(sav.ppfAnnual, 0) : undefined,
    },
    debt: {
      cardBalance: finiteNonNeg(debt.cardBalance, DEFAULT_PLAN.debt.cardBalance),
      aprPercent: finiteNonNeg(debt.aprPercent, DEFAULT_PLAN.debt.aprPercent),
      monthlyPayment: finiteNonNeg(debt.monthlyPayment, DEFAULT_PLAN.debt.monthlyPayment),
    },
    tax: {
      deductions80C: finiteNonNeg(tax.deductions80C, DEFAULT_PLAN.tax.deductions80C),
      deductions80D: finiteNonNeg(tax.deductions80D, DEFAULT_PLAN.tax.deductions80D),
      deductionsNPS: finiteNonNeg(tax.deductionsNPS, 0),
      rentPaidMonthly: finiteNonNeg(tax.rentPaidMonthly, 0),
      isMetroCity: Boolean(tax.isMetroCity),
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

  const customTotal = (plan.expenses.custom ?? []).reduce((sum, item) => sum + item.amount, 0);
  const needsAmount =
    plan.expenses.housing +
    plan.expenses.groceries +
    plan.expenses.utilities +
    plan.expenses.transport +
    plan.expenses.insurance;
  const wantsAmount = plan.expenses.lifestyle + customTotal;
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
      expenses: { housing: 18_000, groceries: 8_000, utilities: 3_500, transport: 4_500, lifestyle: 9_000, insurance: 2_000, custom: [] },
      savings: { emergencyFundBalance: 120_000, monthlySavings: 10_000, monthlySip: 15_000, stepUpSipPercent: 12, expectedReturnPercent: 13, inflationPercent: 6 },
      debt: { cardBalance: 15_000, aprPercent: 18, monthlyPayment: 5_000 },
      tax: { deductions80C: 50_000, deductions80D: 15_000, deductionsNPS: 0, rentPaidMonthly: 18_000, isMetroCity: true },
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
      expenses: { housing: 48_000, groceries: 20_000, utilities: 8_000, transport: 9_500, lifestyle: 18_000, insurance: 7_500, custom: [] },
      savings: { emergencyFundBalance: 450_000, monthlySavings: 25_000, monthlySip: 40_000, stepUpSipPercent: 10, expectedReturnPercent: 12, inflationPercent: 6 },
      debt: { cardBalance: 0, aprPercent: 0, monthlyPayment: 0 },
      tax: { deductions80C: 150_000, deductions80D: 50_000, deductionsNPS: 50_000, rentPaidMonthly: 0, isMetroCity: true },
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
      expenses: { housing: 42_000, groceries: 16_000, utilities: 6_000, transport: 6_000, lifestyle: 15_000, insurance: 6_000, custom: [] },
      savings: { emergencyFundBalance: 800_000, monthlySavings: 40_000, monthlySip: 160_000, stepUpSipPercent: 15, expectedReturnPercent: 13.5, inflationPercent: 6 },
      debt: { cardBalance: 0, aprPercent: 0, monthlyPayment: 0 },
      tax: { deductions80C: 150_000, deductions80D: 25_000, deductionsNPS: 50_000, rentPaidMonthly: 42_000, isMetroCity: true },
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
      expenses: { housing: 24_000, groceries: 10_000, utilities: 4_500, transport: 5_000, lifestyle: 6_500, insurance: 3_000, custom: [] },
      savings: { emergencyFundBalance: 75_000, monthlySavings: 5_000, monthlySip: 5_000, stepUpSipPercent: 5, expectedReturnPercent: 11, inflationPercent: 6 },
      debt: { cardBalance: 160_000, aprPercent: 36, monthlyPayment: 25_000 },
      tax: { deductions80C: 100_000, deductions80D: 15_000, deductionsNPS: 0, rentPaidMonthly: 24_000, isMetroCity: false },
    },
  },
];

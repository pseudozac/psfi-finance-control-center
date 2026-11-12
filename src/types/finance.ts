export type ViewPeriod = 'monthly' | 'annual';

export interface CustomExpenseItem {
  id: string;
  name: string;
  amount: number;
}

export interface IncomeBreakdown {
  salary: number;
  freelance: number;
  other: number;
}

export interface ExpenseBreakdown {
  housing: number;
  groceries: number;
  utilities: number;
  transport: number;
  lifestyle: number;
  insurance: number;
  custom?: CustomExpenseItem[];
}

export interface FinancePlan {
  schemaVersion: 2;
  income: IncomeBreakdown;
  expenses: ExpenseBreakdown;
  savings: {
    emergencyFundBalance: number;
    monthlySavings: number;
    monthlySip: number;
    stepUpSipPercent: number;
    expectedReturnPercent: number;
    inflationPercent: number;
    epfMonthly?: number;
    ppfAnnual?: number;
  };
  debt: {
    cardBalance: number;
    aprPercent: number;
    monthlyPayment: number;
  };
  tax: {
    deductions80C: number;
    deductions80D: number;
    deductionsNPS?: number;
    rentPaidMonthly?: number;
    isMetroCity?: boolean;
  };
}

export interface FinanceSummary {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySurplus: number;
  savingsRatePercent: number;
  emergencyRunwayMonths: number;
}

export interface MonthlyProjectionPoint {
  month: number;
  label: string;
  nominalCorpus: number;
  realCorpus: number;
  totalContributed: number;
  baselineCorpus?: number;
}

export interface DebtPayoffResult {
  months: number | null; // null when payment <= monthly interest
  totalInterest: number | null;
  totalPaid: number | null;
  monthlyInterestAtStart: number;
  warning: string | null;
}

export interface TaxComparisonResult {
  annualGrossIncome: number;
  oldRegimeTax: number;
  newRegimeTax: number;
  recommended: 'new' | 'old' | 'tie';
  savings: number;
  hraExemption?: number;
  npsDeduction?: number;
}

export interface BudgetRuleAnalysis {
  needsAmount: number;
  needsPercent: number;
  wantsAmount: number;
  wantsPercent: number;
  savingsAmount: number;
  savingsPercent: number;
  score: number;
  rating: 'Optimal' | 'Healthy' | 'Attention Needed';
}

export interface FireMilestone {
  id: string;
  label: string;
  targetAmount: number;
  month: number | null;
  years: number | null;
  achieved: boolean;
}

export interface FireAnalysis {
  annualLivingExpenses: number;
  fireTarget: number; // 25x annual expenses
  leanFireTarget: number; // 20x annual expenses
  fatFireTarget: number; // 35x annual expenses
  currentLiquidNetWorth: number;
  fireProgressPercent: number;
  fireEtaMonths: number | null;
  fireEtaYears: number | null;
  milestones: FireMilestone[];
}

export interface EmergencyStressTestResult {
  liquidReserve: number;
  barebonesMonthly: number;
  barebonesRunwayMonths: number;
  standardMonthly: number;
  standardRunwayMonths: number;
  fullMonthly: number;
  fullRunwayMonths: number;
  status: 'critical' | 'moderate' | 'fortified';
}

export interface PlanPreset {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  plan: FinancePlan;
}

export interface ExportEnvelope {
  app: 'psfi-finance-control-center';
  exportedAt: string;
  plan: FinancePlan;
}

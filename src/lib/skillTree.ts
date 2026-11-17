import type { FinancePlan, FinanceSummary } from '../types/finance';
import type { SkillNode, SkillTreeState, SkillStatus, SovereignBadge } from '../types/skills';
import { formatINR } from './finance';

export const RANK_LORE_PERKS: Record<string, { perks: string[]; lore: string }> = {
  'Apprentice of Capital': {
    perks: ['Cashflow balance sheet mapped', 'Basic discretionary bleed monitored'],
    lore: 'Taking the first conscious steps into sovereign personal finance and cashflow discipline.',
  },
  'Prudent Capital Guardian': {
    perks: ['Short-term liquidity core active', 'Immunity to 1-month delayed paychecks', 'Debt containment initialized'],
    lore: 'Establishing initial defensive moats around the household balance sheet.',
  },
  'Fortress Architect': {
    perks: ['Full 6-month iron shock absorption', 'Zero high-interest debt drag', 'Family catastrophic risk neutralized via term & health shield'],
    lore: 'Your household is structurally immune to sudden economic freezes, medical shocks, and layoffs.',
  },
  'High-Velocity Compounder': {
    perks: ['30%+ net savings velocity', 'Every 2.3 years worked buys 1 full year of retirement', 'Rupee tax drag minimized under Section 87A / Old vs New audit'],
    lore: 'Your capital has escaped velocity drag; compounding returns begin accelerating faster than lifestyle creep.',
  },
  'Independence Pathfinder (FIRE)': {
    perks: ['Coast FIRE equilibrium achieved', 'Compounding returns rival active labor income', 'Career pivot & sabbatical optionality unlocked'],
    lore: 'You can walk away from toxic workplaces at any moment; your retirement is mathematically guaranteed.',
  },
  'Sovereign Titan': {
    perks: ['Complete financial sovereignty (25x–50x annual burn)', 'Working is 100% voluntary', 'Multi-generational dynastic endowment established'],
    lore: 'The apex of sovereign personal finance. Your wealth generates generational independence beyond sovereign economic cycles.',
  },
};

export interface TreeConduit {
  from: string;
  to: string;
}

export const SOVEREIGN_TREE_CONDUITS: TreeConduit[] = [
  { from: 'debt_elimination', to: 'liquidity_3m' },
  { from: 'debt_elimination', to: 'budget_equilibrium' },
  { from: 'liquidity_3m', to: 'term_life_shield' },
  { from: 'liquidity_3m', to: 'health_insurance_armor' },
  { from: 'term_life_shield', to: 'iron_fortress_6m' },
  { from: 'health_insurance_armor', to: 'iron_fortress_6m' },
  { from: 'liquidity_3m', to: 'iron_fortress_6m' },
  { from: 'iron_fortress_6m', to: 'first_10l_core' },
  { from: 'budget_equilibrium', to: 'high_velocity_30' },
  { from: 'budget_equilibrium', to: 'tax_regime_shield' },
  { from: 'high_velocity_30', to: 'step_up_compounding' },
  { from: 'tax_regime_shield', to: 'quarter_crore_hub' },
  { from: 'first_10l_core', to: 'quarter_crore_hub' },
  { from: 'step_up_compounding', to: 'quarter_crore_hub' },
  { from: 'quarter_crore_hub', to: 'coast_fire_equil' },
  { from: 'quarter_crore_hub', to: 'half_crore_inflection' },
  { from: 'coast_fire_equil', to: 'full_sovereign_fire' },
  { from: 'half_crore_inflection', to: 'full_sovereign_fire' },
  { from: 'full_sovereign_fire', to: 'antifragile_dynasty' },
];

/**
 * Returns a set of all prerequisite ancestor node IDs feeding into the given node.
 */
export function getPrerequisiteAncestors(
  targetId: string,
  conduits: readonly TreeConduit[] = SOVEREIGN_TREE_CONDUITS
): Set<string> {
  const ancestors = new Set<string>();
  const queue = [targetId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const c of conduits) {
      if (c.to === current && !ancestors.has(c.from)) {
        ancestors.add(c.from);
        queue.push(c.from);
      }
    }
  }

  return ancestors;
}

/**
 * Generates an organic, flowing cubic Bezier curve conduit between two node coordinates.
 */
export function generateCurvedPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx1 = x1 + dx * 0.15;
  const cy1 = y1 + dy * 0.65;
  const cx2 = x2 - dx * 0.15;
  const cy2 = y2 - dy * 0.35;
  return `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
}

export interface SovereignLevelInfo {
  level: number;
  title: string;
  minXP: number;
  maxXP: number;
}

export const SOVEREIGN_LEVELS: SovereignLevelInfo[] = [
  { level: 1, title: 'Novice Explorer', minXP: 0, maxXP: 500 },
  { level: 2, title: 'Apprentice Saver', minXP: 500, maxXP: 1100 },
  { level: 3, title: 'Prudent Guardian', minXP: 1100, maxXP: 1850 },
  { level: 4, title: 'Fortress Builder', minXP: 1850, maxXP: 2750 },
  { level: 5, title: 'Capital Shield', minXP: 2750, maxXP: 3800 },
  { level: 6, title: 'Velocity Compounder', minXP: 3800, maxXP: 4950 },
  { level: 7, title: 'Wealth Strategist', minXP: 4950, maxXP: 6100 },
  { level: 8, title: 'Financial Sovereign', minXP: 6100, maxXP: 7200 },
  { level: 9, title: 'FIRE Vanguard', minXP: 7200, maxXP: 8100 },
  { level: 10, title: 'Sovereign Titan Grandmaster', minXP: 8100, maxXP: 8250 },
];

export function computeSovereignBadges(
  plan: FinancePlan,
  summary: FinanceSummary,
  optimalTaxSavings: number = 0
): SovereignBadge[] {
  const monthlyExpenses = summary.monthlyExpenses ?? 0;
  const monthlyInflow = summary.monthlyIncome ?? 0;
  const annualExpenses = monthlyExpenses * 12;
  const annualIncome = monthlyInflow * 12;
  const currentSavings = plan.savings.emergencyFundBalance ?? 0;
  const debtBalance = plan.debt.cardBalance ?? 0;
  const savingsRate = summary.savingsRatePercent ?? 0;
  const runwayMonths = summary.emergencyRunwayMonths ?? 0;
  const stepUpRate = plan.savings.stepUpSipPercent ?? 0;

  const isDebtFree = debtBalance === 0;
  const isRunway3m = runwayMonths >= 3;
  const isRunway6m = runwayMonths >= 6;
  const isCatastrophicShield = plan.expenses.insurance > 0 || plan.tax.deductions80D > 0;
  const is503020 = savingsRate >= 20;
  const isVelocity30 = savingsRate >= 30;
  const isStepUp10 = stepUpRate >= 10;
  const isTaxArbitrage = true;
  const isFirstMillion = currentSavings >= 1_000_000;
  const isQuarterCrore = currentSavings >= 2_500_000;
  const isCoastFire = currentSavings >= annualExpenses * 15 && annualExpenses > 0;
  const isHalfCrore = currentSavings >= 5_000_000;
  const isSovereignFire = currentSavings >= annualExpenses * 25 && annualExpenses > 0;
  const isAntifragileDynasty = currentSavings >= annualExpenses * 50 && annualExpenses > 0;

  return [
    {
      id: 'debt_free_fortress',
      title: 'Debt-Free Bastion',
      category: 'defense',
      icon: 'ShieldAlert',
      tagline: 'Zero High-APR Revolving Debt Drag',
      requirement: 'Eliminate all revolving credit card and personal debt (₹0 balance)',
      isUnlocked: isDebtFree,
      unlockedAtLabel: isDebtFree ? 'Active: ₹0 Debt' : undefined,
      progressPercent: isDebtFree ? 100 : Math.max(5, Math.round(100 - (debtBalance / (monthlyInflow || 1)) * 50)),
      currentValueLabel: isDebtFree ? '₹0 Debt' : `${formatINR(debtBalance)} Balance`,
      targetValueLabel: '₹0 Debt',
      xpReward: 450,
      tier: 1,
      suggestedAction: {
        field: 'debt.cardBalance',
        targetValue: 0,
        description: 'Zero out revolving credit card debt',
      },
    },
    {
      id: 'sentinel_runway_3m',
      title: 'Sentinel Runway (3M)',
      category: 'defense',
      icon: 'ShieldCheck',
      tagline: '3-Month Liquid Survival Core',
      requirement: 'Fund at least 3.0 months of basic living expenses in liquid reserves',
      isUnlocked: isRunway3m,
      unlockedAtLabel: isRunway3m ? `${runwayMonths.toFixed(1)} Mos Runway` : undefined,
      progressPercent: Math.min(100, Math.round((runwayMonths / 3) * 100)),
      currentValueLabel: `${runwayMonths.toFixed(1)} Mos Runway`,
      targetValueLabel: '3.0 Mos Buffer',
      xpReward: 350,
      tier: 1,
      suggestedAction: {
        field: 'savings.emergencyFundBalance',
        targetValue: Math.round(3 * monthlyExpenses),
        description: `Set emergency fund to 3 months (${formatINR(Math.round(3 * monthlyExpenses))})`,
      },
    },
    {
      id: 'iron_fortress_6m',
      title: 'Iron Fortress (6M)',
      category: 'defense',
      icon: 'Castle',
      tagline: 'The Golden Actuarial Benchmark',
      requirement: 'Fund 6.0 full months of living expenses in emergency reserves',
      isUnlocked: isRunway6m,
      unlockedAtLabel: isRunway6m ? `${runwayMonths.toFixed(1)} Mos Runway` : undefined,
      progressPercent: Math.min(100, Math.round((runwayMonths / 6) * 100)),
      currentValueLabel: `${runwayMonths.toFixed(1)} Mos Runway`,
      targetValueLabel: '6.0 Mos Buffer',
      xpReward: 500,
      tier: 1,
      suggestedAction: {
        field: 'savings.emergencyFundBalance',
        targetValue: Math.round(6 * monthlyExpenses),
        description: `Expand liquid fortress to 6 full months (${formatINR(Math.round(6 * monthlyExpenses))})`,
      },
    },
    {
      id: 'catastrophic_shield',
      title: 'Catastrophic Armor',
      category: 'defense',
      icon: 'Umbrella',
      tagline: 'Term Life & Independent Health Protection',
      requirement: 'Log pure term life insurance and comprehensive health cover',
      isUnlocked: isCatastrophicShield,
      unlockedAtLabel: isCatastrophicShield ? 'Shield Active' : undefined,
      progressPercent: (plan.expenses.insurance > 0 && plan.tax.deductions80D > 0) ? 100 : isCatastrophicShield ? 65 : 20,
      currentValueLabel: plan.expenses.insurance > 0 ? `${formatINR(plan.expenses.insurance)}/mo Cover` : 'No Cover Logged',
      targetValueLabel: 'Term + Health Shield',
      xpReward: 350,
      tier: 1,
      suggestedAction: {
        field: 'expenses.insurance',
        targetValue: Math.max(1500, Math.round(annualIncome * 0.003 / 12)),
        description: 'Add standard term life insurance premium allocation',
      },
    },
    {
      id: 'equilibrium_50_30_20',
      title: '50/30/20 Equilibrium',
      category: 'discipline',
      icon: 'PieChart',
      tagline: 'Actuarial Balance Standard',
      requirement: 'Maintain at least a 20% net savings rate',
      isUnlocked: is503020,
      unlockedAtLabel: is503020 ? `${savingsRate.toFixed(0)}% Savings Rate` : undefined,
      progressPercent: Math.min(100, Math.round((savingsRate / 20) * 100)),
      currentValueLabel: `${savingsRate.toFixed(0)}% Savings Rate`,
      targetValueLabel: '≥ 20% Savings Rate',
      xpReward: 450,
      tier: 1,
      suggestedAction: {
        field: 'savings.monthlySip',
        targetValue: Math.round(monthlyInflow * 0.2),
        description: `Set monthly SIP to 20% of inflow (${formatINR(Math.round(monthlyInflow * 0.2))})`,
      },
    },
    {
      id: 'velocity_30_club',
      title: '30% Velocity Club',
      category: 'velocity',
      icon: 'Zap',
      tagline: 'High-Speed Compounding',
      requirement: 'Achieve a net savings rate ≥ 30% of monthly income',
      isUnlocked: isVelocity30,
      unlockedAtLabel: isVelocity30 ? `${savingsRate.toFixed(0)}% Velocity` : undefined,
      progressPercent: Math.min(100, Math.round((savingsRate / 30) * 100)),
      currentValueLabel: `${savingsRate.toFixed(0)}% Savings Rate`,
      targetValueLabel: '≥ 30% Savings Rate',
      xpReward: 550,
      tier: 2,
      suggestedAction: {
        field: 'savings.monthlySip',
        targetValue: Math.round(monthlyInflow * 0.35),
        description: `Boost monthly SIP to 35% (${formatINR(Math.round(monthlyInflow * 0.35))})`,
      },
    },
    {
      id: 'step_up_accelerator',
      title: 'Compounding Accelerator',
      category: 'velocity',
      icon: 'TrendingUp',
      tagline: 'Annual SIP Step-Up ≥ 10%',
      requirement: 'Commit to stepping up monthly SIPs by at least 10% annually',
      isUnlocked: isStepUp10,
      unlockedAtLabel: isStepUp10 ? `${stepUpRate}% Step-Up` : undefined,
      progressPercent: Math.min(100, Math.round((stepUpRate / 10) * 100)),
      currentValueLabel: `${stepUpRate}% Step-Up`,
      targetValueLabel: '≥ 10% Step-Up Rate',
      xpReward: 450,
      tier: 2,
      suggestedAction: {
        field: 'savings.stepUpSipPercent',
        targetValue: 12,
        description: 'Lock in a 12% annual step-up protocol',
      },
    },
    {
      id: 'tax_arbitrage_master',
      title: 'Tax Arbitrage Master',
      category: 'discipline',
      icon: 'Scale',
      tagline: 'Zero Leakage to the Exchequer',
      requirement: 'Audit tax regime across 80C, 80D, and NPS for optimal tax efficiency',
      isUnlocked: isTaxArbitrage,
      unlockedAtLabel: 'Regime Audited',
      progressPercent: 100,
      currentValueLabel: optimalTaxSavings > 0 ? `₹${optimalTaxSavings.toLocaleString('en-IN')} Saved` : 'Fully Audited',
      targetValueLabel: 'Optimal Net Tax',
      xpReward: 400,
      tier: 2,
      suggestedAction: {
        field: 'tax.deductions80D',
        targetValue: 25000,
        description: 'Audit Section 80D health deduction for optimal tax regime delta',
      },
    },
    {
      id: 'first_million_10l',
      title: 'The First Million (₹10L)',
      category: 'autonomy',
      icon: 'Coins',
      tagline: 'The Psychological Compounding Barrier',
      requirement: 'Accumulate ₹10,00,000 in liquid investment/emergency reserves',
      isUnlocked: isFirstMillion,
      unlockedAtLabel: isFirstMillion ? formatINR(currentSavings) : undefined,
      progressPercent: Math.min(100, Math.round((currentSavings / 1_000_000) * 100)),
      currentValueLabel: formatINR(currentSavings),
      targetValueLabel: '₹10,00,000 Liquid Core',
      xpReward: 600,
      tier: 2,
      suggestedAction: {
        field: 'savings.emergencyFundBalance',
        targetValue: 1_000_000,
        description: 'Fund liquid portfolio to ₹10,00,000 milestone',
      },
    },
    {
      id: 'quarter_crore_25l',
      title: 'Quarter-Crore Pivot (₹25L)',
      category: 'autonomy',
      icon: 'Rocket',
      tagline: 'Gains Rivaling Fresh Inflows',
      requirement: 'Cross ₹25,00,000 liquid portfolio',
      isUnlocked: isQuarterCrore,
      unlockedAtLabel: isQuarterCrore ? formatINR(currentSavings) : undefined,
      progressPercent: Math.min(100, Math.round((currentSavings / 2_500_000) * 100)),
      currentValueLabel: formatINR(currentSavings),
      targetValueLabel: '₹25,00,000 Corpus',
      xpReward: 700,
      tier: 2,
      suggestedAction: {
        field: 'savings.emergencyFundBalance',
        targetValue: 2_500_000,
        description: 'Simulate reaching the ₹25,00,000 Quarter-Crore Hub',
      },
    },
    {
      id: 'coast_fire_achiever',
      title: 'Coast FIRE Sentinel',
      category: 'autonomy',
      icon: 'Anchor',
      tagline: 'Retirement Mathematically Locked',
      requirement: 'Invested net worth ≥ 15x annual living expenses',
      isUnlocked: isCoastFire,
      unlockedAtLabel: isCoastFire ? `${((currentSavings / Math.max(1, annualExpenses * 15)) * 100).toFixed(0)}% Coast` : undefined,
      progressPercent: Math.min(100, Math.round((currentSavings / Math.max(1, annualExpenses * 15)) * 100)),
      currentValueLabel: `${((currentSavings / Math.max(1, annualExpenses * 15)) * 100).toFixed(0)}% Coast Core`,
      targetValueLabel: '15.0x Annual Expenses',
      xpReward: 750,
      tier: 3,
      suggestedAction: {
        field: 'savings.emergencyFundBalance',
        targetValue: Math.round(annualExpenses * 15),
        description: `Fund 15x annual burn for Coast FIRE (${formatINR(Math.round(annualExpenses * 15))})`,
      },
    },
    {
      id: 'half_crore_50l',
      title: 'Half-Crore Inflection (₹50L)',
      category: 'autonomy',
      icon: 'Flame',
      tagline: 'Capital Earnings Outpace Active Labor',
      requirement: 'Cross ₹50,00,000 liquid portfolio',
      isUnlocked: isHalfCrore,
      unlockedAtLabel: isHalfCrore ? formatINR(currentSavings) : undefined,
      progressPercent: Math.min(100, Math.round((currentSavings / 5_000_000) * 100)),
      currentValueLabel: formatINR(currentSavings),
      targetValueLabel: '₹50,00,000 Milestone',
      xpReward: 800,
      tier: 3,
      suggestedAction: {
        field: 'savings.emergencyFundBalance',
        targetValue: 5_000_000,
        description: 'Simulate Half-Crore milestone (₹50 Lakhs)',
      },
    },
    {
      id: 'full_sovereign_fire',
      title: 'Full Sovereign FIRE (25x)',
      category: 'autonomy',
      icon: 'Crown',
      tagline: 'Complete Financial Independence',
      requirement: 'Accumulate ≥ 25x annual living expenses (4% Bengen Rule)',
      isUnlocked: isSovereignFire,
      unlockedAtLabel: isSovereignFire ? `${(currentSavings / Math.max(1, annualExpenses)).toFixed(1)}x Burn` : undefined,
      progressPercent: Math.min(100, Math.round((currentSavings / Math.max(1, annualExpenses * 25)) * 100)),
      currentValueLabel: `${(currentSavings / Math.max(1, annualExpenses)).toFixed(1)}x Annual Burn`,
      targetValueLabel: '25.0x Annual Expenses',
      xpReward: 900,
      tier: 3,
      suggestedAction: {
        field: 'savings.emergencyFundBalance',
        targetValue: Math.round(annualExpenses * 25),
        description: `Fund 25x annual burn for FIRE (${formatINR(Math.round(annualExpenses * 25))})`,
      },
    },
    {
      id: 'antifragile_dynasty_50x',
      title: 'Antifragile Dynasty (50x)',
      category: 'autonomy',
      icon: 'Sparkles',
      tagline: 'Generational Sovereign Endowment',
      requirement: 'Accumulate ≥ 50x annual burn for dynastic resilience',
      isUnlocked: isAntifragileDynasty,
      unlockedAtLabel: isAntifragileDynasty ? `${(currentSavings / Math.max(1, annualExpenses)).toFixed(1)}x Burn` : undefined,
      progressPercent: Math.min(100, Math.round((currentSavings / Math.max(1, annualExpenses * 50)) * 100)),
      currentValueLabel: `${(currentSavings / Math.max(1, annualExpenses)).toFixed(1)}x Annual Burn`,
      targetValueLabel: '50.0x Annual Burn',
      xpReward: 1000,
      tier: 3,
      suggestedAction: {
        field: 'savings.emergencyFundBalance',
        targetValue: Math.round(annualExpenses * 50),
        description: `Fund 50x annual burn for generational endowment (${formatINR(Math.round(annualExpenses * 50))})`,
      },
    },
  ];
}

export function computeSovereignLevel(badges: SovereignBadge[]) {
  let totalXP = 0;
  for (const badge of badges) {
    if (badge.isUnlocked) {
      totalXP += badge.xpReward;
    } else if (badge.progressPercent > 0) {
      totalXP += Math.round(badge.xpReward * (badge.progressPercent / 100) * 0.5);
    }
  }
  const maxPossibleXP = badges.reduce((acc, b) => acc + b.xpReward, 0);

  let currentLevel = SOVEREIGN_LEVELS[0];
  for (const lvl of SOVEREIGN_LEVELS) {
    if (totalXP >= lvl.minXP) {
      currentLevel = lvl;
    }
  }

  let nextLevelXP = currentLevel.maxXP;
  let currentLevelProgressPercent = 100;
  if (currentLevel.level < 10) {
    const span = currentLevel.maxXP - currentLevel.minXP;
    const gained = Math.max(0, Math.min(span, totalXP - currentLevel.minXP));
    currentLevelProgressPercent = Math.round((gained / span) * 100);
  } else {
    currentLevelProgressPercent = 100;
    nextLevelXP = maxPossibleXP;
  }

  const unlockedBadgesCount = badges.filter((b) => b.isUnlocked).length;

  return {
    totalXP,
    maxPossibleXP,
    level: currentLevel.level,
    levelTitle: currentLevel.title,
    nextLevelXP,
    currentLevelProgressPercent,
    unlockedBadgesCount,
  };
}

export function calculateSkillTree(
  plan: FinancePlan,
  summary: FinanceSummary,
  optimalTaxSavings: number = 0
): SkillTreeState {
  const monthlyExpenses = summary.monthlyExpenses ?? 0;
  const monthlyInflow = summary.monthlyIncome ?? 0;
  const annualExpenses = monthlyExpenses * 12;
  const annualIncome = monthlyInflow * 12;
  const currentSavings = plan.savings.emergencyFundBalance ?? 0;
  const debtBalance = plan.debt.cardBalance ?? 0;
  const debtAPR = plan.debt.aprPercent || 18;
  const savingsRate = summary.savingsRatePercent ?? 0;
  const runwayMonths = summary.emergencyRunwayMonths ?? 0;
  const stepUpRate = plan.savings.stepUpSipPercent ?? 0;

  // 15 Actuarial Nodes with Constellation Coordinates & What-If Actions
  const rawNodes: Omit<SkillNode, 'status'>[] = [
    // -------------------------------------------------------------------------
    // TIER 1: SURVIVAL FORTRESS (Wing 1 - Left)
    // -------------------------------------------------------------------------
    {
      id: 'debt_elimination',
      tier: 'tier1_survival',
      title: 'High-Interest Debt Elimination',
      badge: 'DEFENSE I',
      category: 'defense',
      description: 'Eradicate all credit card balances, personal loans, and revolving debt to prevent wealth bleed.',
      actuarialPrinciple: debtBalance > 0
        ? `Unsecured debt at ${debtAPR}% APR mathematically creates severe drag against compounding wealth (~12% CAGR). Eradicating high-cost debt (${debtAPR}% APR) delivers an unconditional, guaranteed post-tax return.`
        : 'Zero high-interest debt frees 100% of cashflow surplus to compound into wealth assets.',
      iconName: 'ShieldAlert',
      requiredParentIds: [],
      currentMetricLabel: debtBalance === 0 ? '₹0 Debt' : `${formatINR(debtBalance)} @ ${debtAPR}% APR`,
      targetMetricLabel: '₹0 Balance',
      progressPercent: debtBalance === 0 ? 100 : Math.max(5, Math.round(100 - (debtBalance / (monthlyInflow || 1)) * 50)),
      gapRupeesOrMonths: debtBalance > 0 ? `Pay off ${formatINR(debtBalance)}` : undefined,
      actionableStep: debtBalance > 0
        ? `Direct surplus cashflow into clearing this ${debtAPR}% APR principal immediately.`
        : 'Fortress established: Zero high-interest debt dragging cashflow.',
      evidenceType: debtBalance > 0 ? 'budgeted' : 'assumed',
      evidenceDescription: debtBalance > 0
        ? `[BUDGET ALLOCATION]: Profile contains ${formatINR(debtBalance)} balance at ${debtAPR}% APR with ₹${(plan.debt.monthlyPayment || 0).toLocaleString('en-IN')}/mo payment. Unverified: Requires credit bureau pull or loan statement upload.`
        : 'Assumed zero debt balance based on self-reported profile inputs.',
      gridColumn: 1,
      gridRow: 1,
      treeX: 680,
      treeY: 740,
      shortLabel: 'Debt Free',
      suggestedAction: {
        field: 'debt.cardBalance',
        targetValue: 0,
        description: 'Zero out revolving debt balance',
      },
    },
    {
      id: 'liquidity_3m',
      tier: 'tier1_survival',
      title: '3-Month Liquidity Core',
      badge: 'DEFENSE II',
      category: 'defense',
      description: 'Accumulate a baseline 3-month survival runway in instant-access savings or liquid arbitrage funds.',
      actuarialPrinciple: 'Protects equity SIPs from being liquidated during sudden medical delays or payroll lapses.',
      iconName: 'ShieldCheck',
      requiredParentIds: ['debt_elimination'],
      currentMetricLabel: `${runwayMonths.toFixed(1)} Months Runway`,
      targetMetricLabel: '3.0 Months Reserves',
      progressPercent: Math.min(100, Math.round((runwayMonths / 3) * 100)),
      gapRupeesOrMonths: runwayMonths < 3 ? `${formatINR(Math.max(0, 3 * monthlyExpenses - currentSavings))} needed` : undefined,
      actionableStep: runwayMonths < 3 ? `Park ${formatINR(Math.max(0, 3 * monthlyExpenses - currentSavings))} in liquid funds.` : '3-Month survival baseline fully secured.',
      evidenceType: 'budgeted',
      evidenceDescription: `[BUDGET ALLOCATION]: Self-reported liquid emergency balance of ${formatINR(currentSavings)} against monthly living expenses of ${formatINR(monthlyExpenses)}. Unverified: Pending bank account statement reconciliation.`,
      gridColumn: 2,
      gridRow: 1,
      treeX: 420,
      treeY: 620,
      shortLabel: '3M Runway',
      suggestedAction: {
        field: 'savings.emergencyFundBalance',
        targetValue: Math.round(3 * monthlyExpenses),
        description: `Set emergency reserves to 3x monthly burn (${formatINR(Math.round(3 * monthlyExpenses))})`,
      },
    },
    {
      id: 'term_life_shield',
      tier: 'tier1_survival',
      title: 'Pure Term Insurance Shield',
      badge: 'DEFENSE III',
      category: 'defense',
      description: 'Ensure dedicated life term protection (10x–15x annual income) to shield family dependents.',
      actuarialPrinciple: `Pure term insurance is risk-transfer, not an investment. Target cover is 10x–15x gross annual income (Sum Assured: ${formatINR(annualIncome * 10)}). Avoid endowment and ULIP traps.`,
      iconName: 'Umbrella',
      requiredParentIds: ['liquidity_3m'],
      currentMetricLabel: plan.expenses.insurance > 0 ? `${formatINR(plan.expenses.insurance)}/mo Budgeted Premium` : 'No Term Cover Logged',
      targetMetricLabel: `10x Income Term Cover (${formatINR(annualIncome * 10)})`,
      progressPercent: plan.expenses.insurance > 0 ? 60 : 15,
      gapRupeesOrMonths: plan.expenses.insurance > 0 ? 'Policy certificate unverified' : `Target cover: ${formatINR(annualIncome * 10)}`,
      actionableStep: plan.expenses.insurance > 0
        ? `Monthly budget allocation of ${formatINR(plan.expenses.insurance)} logged [BUDGET ALLOCATION]. To achieve [VERIFIED] milestone status, verify active pure term policy schedule confirming Sum Assured >= ${formatINR(annualIncome * 10)}.`
        : `Secure a pure term insurance policy with zero return of premium (target 10x income: ${formatINR(annualIncome * 10)}).`,
      evidenceType: plan.expenses.insurance > 0 ? 'budgeted' : 'assumed',
      evidenceDescription: plan.expenses.insurance > 0
        ? `[BUDGET ALLOCATION]: ${formatINR(plan.expenses.insurance)}/mo allocated under expense budget. Unverified: Requires active term policy certificate confirming Sum Assured ≥ ${formatINR(annualIncome * 10)}.`
        : 'Assumed no active term life cover logged in profile.',
      policyDetails: {
        policyType: 'Pure Term Life Insurance (Zero Return-of-Premium)',
        targetCoverage: `${formatINR(annualIncome * 10)} (10x Annual Gross Income)`,
        verifiedStatus: false,
        verificationRequirements: 'Requires active insurer policy schedule confirming minimum 10x annual gross income sum assured with family nominee designation and pure term structure (no ULIP/endowment).',
        evidenceNotes: plan.expenses.insurance > 0
          ? `Plan includes ${formatINR(plan.expenses.insurance)}/mo in budgeted premiums. Policy documents and coverage multiple remain unverified.`
          : 'No term insurance policy or premium logged.',
      },
      gridColumn: 3,
      gridRow: 1,
      treeX: 220,
      treeY: 500,
      shortLabel: 'Term Shield',
      suggestedAction: {
        field: 'expenses.insurance',
        targetValue: Math.max(1500, Math.round(annualIncome * 0.003 / 12)),
        description: 'Add standard term life insurance premium allocation',
      },
    },
    {
      id: 'health_insurance_armor',
      tier: 'tier1_survival',
      title: 'Comprehensive Health Armor',
      badge: 'DEFENSE IV',
      category: 'defense',
      description: 'Independent family health cover with zero room-rent capping and adequate super top-up.',
      actuarialPrinciple: 'Corporate group insurance ends the day you leave your job. Personal health cover with no room-rent limits is non-negotiable.',
      iconName: 'HeartPulse',
      requiredParentIds: ['term_life_shield'],
      currentMetricLabel: (plan.tax.deductions80D > 0 || plan.expenses.insurance > 0)
        ? `${plan.tax.deductions80D > 0 ? `${formatINR(plan.tax.deductions80D)} entered deduction` : `${formatINR(plan.expenses.insurance)}/mo budgeted premium`}`
        : 'No Health Cover Logged',
      targetMetricLabel: 'Verified Family Policy + Super Top-Up',
      progressPercent: (plan.tax.deductions80D > 0 || plan.expenses.insurance > 0) ? 60 : 25,
      gapRupeesOrMonths: (!plan.tax.deductions80D && !plan.expenses.insurance) ? 'Missing Personal Health Cover' : 'Policy schedule unverified',
      actionableStep: (plan.tax.deductions80D > 0 || plan.expenses.insurance > 0)
        ? 'Budget allocation logged [BUDGET ALLOCATION]. To achieve [VERIFIED] status, confirm independent policy schedule: Base cover (₹5L–₹10L) + Super Top-up (₹20L–₹50L) with zero room rent cap.'
        : 'Acquire an independent base cover + super top-up policy with zero room cap.',
      evidenceType: (plan.tax.deductions80D > 0 || plan.expenses.insurance > 0) ? 'budgeted' : 'assumed',
      evidenceDescription: (plan.tax.deductions80D > 0 || plan.expenses.insurance > 0)
        ? `[BUDGET ALLOCATION]: Claimed via Section 80D (₹${(plan.tax.deductions80D || 0).toLocaleString('en-IN')}) or health expense budget. Unverified: Requires active family policy schedule with zero room-rent copay.`
        : 'Assumed no independent family health cover logged in profile.',
      policyDetails: {
        policyType: 'Independent Comprehensive Health + Super Top-Up',
        targetCoverage: '₹25,00,000+ Family Floater (Zero Room Rent Copay)',
        verifiedStatus: false,
        verificationRequirements: 'Requires active personal/family floater policy schedule separate from employer group cover, with zero room-rent sub-limit and cashless hospital network.',
        evidenceNotes: (plan.tax.deductions80D > 0 || plan.expenses.insurance > 0)
          ? `Tax deduction / expense budget of ${formatINR(plan.tax.deductions80D || plan.expenses.insurance)} logged. Policy terms, exclusions, and sub-limits remain unverified without insurance certificate upload.`
          : 'No health insurance premium or Section 80D deduction logged.',
      },
      gridColumn: 4,
      gridRow: 1,
      treeX: 460,
      treeY: 460,
      shortLabel: 'Health Shield',
      suggestedAction: {
        field: 'tax.deductions80D',
        targetValue: 25000,
        description: 'Utilize Section 80D health insurance deduction (₹25,000)',
      },
    },
    {
      id: 'iron_fortress_6m',
      tier: 'tier1_survival',
      title: '6-Month Iron Fortress',
      badge: 'DEFENSE V',
      category: 'defense',
      description: 'Achieve the golden Indian actuarial standard: 6 full months of living expenses safely preserved.',
      actuarialPrinciple: 'Absorbs extended tech hiring freezes, medical crises, and market bear cycles without panicking.',
      iconName: 'Castle',
      requiredParentIds: ['liquidity_3m'],
      currentMetricLabel: `${runwayMonths.toFixed(1)} Months Runway`,
      targetMetricLabel: '6.0 Months Buffer',
      progressPercent: Math.min(100, Math.round((runwayMonths / 6) * 100)),
      gapRupeesOrMonths: runwayMonths < 6 ? `${formatINR(Math.max(0, 6 * monthlyExpenses - currentSavings))} needed` : undefined,
      actionableStep: runwayMonths < 6 ? `Build up reserves by ${formatINR(Math.max(0, 6 * monthlyExpenses - currentSavings))}.` : 'Your budgeted reserves cover six months of current expenses.',
      evidenceType: 'budgeted',
      evidenceDescription: `[BUDGET ALLOCATION]: Self-reported emergency reserves (${formatINR(currentSavings)}) vs 6 months living expenses (${formatINR(6 * monthlyExpenses)}). Unverified via bank account clearing.`,
      gridColumn: 5,
      gridRow: 1,
      treeX: 220,
      treeY: 320,
      shortLabel: '6M Fortress',
      suggestedAction: {
        field: 'savings.emergencyFundBalance',
        targetValue: Math.round(6 * monthlyExpenses),
        description: `Expand liquid fortress to 6 full months (${formatINR(Math.round(6 * monthlyExpenses))})`,
      },
    },

    // -------------------------------------------------------------------------
    // TIER 2: VELOCITY ENGINE (Wing 2 - Center)
    // -------------------------------------------------------------------------
    {
      id: 'budget_equilibrium',
      tier: 'tier2_velocity',
      title: '50/30/20 Budget Equilibrium',
      badge: 'VELOCITY I',
      category: 'offense',
      description: 'Align living overhead so Needs ≤ 50%, Wants ≤ 30%, and Wealth Savings ≥ 20%.',
      actuarialPrinciple: 'Restrains lifestyle creep while preserving guilt-free discretionary lifestyle spending.',
      iconName: 'PieChart',
      requiredParentIds: ['liquidity_3m'],
      currentMetricLabel: `${savingsRate.toFixed(0)}% Savings Rate`,
      targetMetricLabel: '≥ 20% Net Savings Rate',
      progressPercent: Math.min(100, Math.round((savingsRate / 20) * 100)),
      gapRupeesOrMonths: savingsRate < 20 ? `${(20 - savingsRate).toFixed(1)}% gap to equilibrium` : undefined,
      actionableStep: savingsRate < 20 ? 'Trim non-essential wants or increase inflows to restore the 20% investment baseline.' : 'Equilibrium achieved: Your balance sheet compounds naturally.',
      evidenceType: 'budgeted',
      evidenceDescription: `[BUDGET ALLOCATION]: Calculated from self-reported monthly income and expense category budgets (${savingsRate.toFixed(0)}% savings rate).`,
      gridColumn: 1,
      gridRow: 2,
      treeX: 680,
      treeY: 570,
      shortLabel: '50/30/20 Rule',
      suggestedAction: {
        field: 'savings.monthlySip',
        targetValue: Math.round(monthlyInflow * 0.2),
        description: `Set monthly SIP to at least 20% of inflow (${formatINR(Math.round(monthlyInflow * 0.2))})`,
      },
    },
    {
      id: 'high_velocity_30',
      tier: 'tier2_velocity',
      title: 'High-Velocity Wealth Engine (30%+)',
      badge: 'VELOCITY II',
      category: 'offense',
      description: 'Propel your net savings rate past 30%, entering the elite tier of rapid financial independence.',
      actuarialPrinciple: 'At a 30% savings rate, every 2.3 years worked buys you 1 full year of passive retirement runway.',
      iconName: 'Zap',
      requiredParentIds: ['budget_equilibrium'],
      currentMetricLabel: `${savingsRate.toFixed(0)}% Savings Rate`,
      targetMetricLabel: '≥ 30% Savings Rate',
      progressPercent: Math.min(100, Math.round((savingsRate / 30) * 100)),
      gapRupeesOrMonths: savingsRate < 30 ? `${(30 - savingsRate).toFixed(1)}% gap` : undefined,
      actionableStep: savingsRate < 30 ? 'Step up SIP contributions or monetize freelance secondary inflows.' : 'Elite compounding: 30%+ cashflow velocity achieved.',
      evidenceType: 'budgeted',
      evidenceDescription: `[BUDGET ALLOCATION]: Calculated from self-reported monthly net cashflow velocity (${savingsRate.toFixed(0)}% savings rate).`,
      gridColumn: 2,
      gridRow: 2,
      treeX: 800,
      treeY: 440,
      shortLabel: '30% Velocity',
      suggestedAction: {
        field: 'savings.monthlySip',
        targetValue: Math.round(monthlyInflow * 0.35),
        description: `Boost monthly SIP to 35% of inflow (${formatINR(Math.round(monthlyInflow * 0.35))})`,
      },
    },
    {
      id: 'first_10l_core',
      tier: 'tier2_velocity',
      title: 'The First ₹10 Lakhs Core',
      badge: 'VELOCITY III',
      category: 'offense',
      description: 'Accumulate your first ₹10,00,000 liquid net worth. The hardest milestone in Indian compounding.',
      actuarialPrinciple: 'Charlie Munger: "The first $100k is a bitch, but you gotta do it." Once reached, compounding does the heavy lifting.',
      iconName: 'Coins',
      requiredParentIds: ['iron_fortress_6m'],
      currentMetricLabel: formatINR(currentSavings),
      targetMetricLabel: '₹10,00,000 Liquid Core',
      progressPercent: Math.min(100, Math.round((currentSavings / 1_000_000) * 100)),
      gapRupeesOrMonths: currentSavings < 1_000_000 ? `${formatINR(1_000_000 - currentSavings)} to go` : undefined,
      actionableStep: currentSavings < 1_000_000 ? 'Maintain aggressive monthly SIPs to cross the 7-digit psychological threshold.' : 'Milestone crushed: First ₹10L compounding core is generating organic momentum.',
      evidenceType: 'budgeted',
      evidenceDescription: `[BUDGET ALLOCATION]: Based on self-reported liquid emergency balance of ${formatINR(currentSavings)}.`,
      gridColumn: 3,
      gridRow: 2,
      treeX: 360,
      treeY: 180,
      shortLabel: 'First ₹10L',
      suggestedAction: {
        field: 'savings.emergencyFundBalance',
        targetValue: 1_000_000,
        description: 'Fund liquid portfolio to ₹10,00,000 milestone',
      },
    },
    {
      id: 'tax_regime_shield',
      tier: 'tier2_velocity',
      title: 'Indian Tax Regime Optimization',
      badge: 'VELOCITY IV',
      category: 'tax',
      description: 'Audit deductions across 80C, 80D, 80CCD(1B) NPS, and Section 87A rebate to eliminate rupee tax drag.',
      actuarialPrinciple: 'Rupees saved in tax earn an immediate 100% risk-free return in your compounding portfolio.',
      iconName: 'Scale',
      requiredParentIds: ['first_10l_core'],
      currentMetricLabel: optimalTaxSavings > 0 ? `₹${optimalTaxSavings.toLocaleString('en-IN')} Delta` : 'Audited Regime',
      targetMetricLabel: 'Optimal Net Regime',
      progressPercent: 100, // Always audited by PsFi's integrated engine
      actionableStep: 'Keep regime deductions synced to maintain zero unneeded rupee leakage to the exchequer.',
      evidenceType: 'assumed',
      evidenceDescription: '[STATUTORY ASSUMPTION]: Evaluated under Income-tax Act, 1961 vs Income-tax Act, 2025 applied to self-reported gross salary.',
      gridColumn: 4,
      gridRow: 2,
      treeX: 580,
      treeY: 410,
      shortLabel: 'Tax Shield',
      suggestedAction: {
        field: 'tax.deductions80D',
        targetValue: 25000,
        description: 'Optimize Section 80D health deduction for optimal tax regime delta',
      },
    },
    {
      id: 'step_up_compounding',
      tier: 'tier2_velocity',
      title: '10%+ Annual Step-Up Protocol',
      badge: 'VELOCITY V',
      category: 'offense',
      description: 'Commit to stepping up mutual fund SIPs by at least 10% annually with every appraisal and bonus.',
      actuarialPrinciple: 'A 10% annual step-up SIP doubles your 15-year final corpus compared to a flat, stagnant SIP.',
      iconName: 'TrendingUp',
      requiredParentIds: ['high_velocity_30'],
      currentMetricLabel: `${stepUpRate}% Annual Step-Up`,
      targetMetricLabel: '≥ 10% Step-Up',
      progressPercent: Math.min(100, Math.round((stepUpRate / 10) * 100)),
      gapRupeesOrMonths: stepUpRate < 10 ? `${10 - stepUpRate}% step-up delta` : undefined,
      actionableStep: stepUpRate < 10 ? 'Increase your annual step-up lever to at least 10% to outrun lifestyle inflation.' : 'Exponential curve locked in: Step-up protocol active.',
      evidenceType: 'assumed',
      evidenceDescription: `[PLAN ASSUMPTION]: Assumed annual step-up rate of ${stepUpRate}% configured in compounding plan.`,
      gridColumn: 5,
      gridRow: 2,
      treeX: 760,
      treeY: 290,
      shortLabel: '10% Step-Up',
      suggestedAction: {
        field: 'savings.stepUpSipPercent',
        targetValue: 12,
        description: 'Lock in a 12% annual step-up protocol',
      },
    },

    // -------------------------------------------------------------------------
    // TIER 3: SOVEREIGN AUTONOMY (Wing 3 - Right)
    // -------------------------------------------------------------------------
    {
      id: 'quarter_crore_hub',
      tier: 'tier3_autonomy',
      title: 'The ₹25 Lakh Acceleration Hub',
      badge: 'SOVEREIGN I',
      category: 'autonomy',
      description: 'Reach a ₹25,00,000 liquid portfolio where annual market compounding begins rivaling your fresh SIP deposits.',
      actuarialPrinciple: 'At ₹25L, a 12% market year generates ₹3 Lakhs in pure capital gains without you lifting a finger.',
      iconName: 'Rocket',
      requiredParentIds: ['first_10l_core', 'step_up_compounding'],
      currentMetricLabel: formatINR(currentSavings),
      targetMetricLabel: '₹25,00,000 Corpus',
      progressPercent: Math.min(100, Math.round((currentSavings / 2_500_000) * 100)),
      gapRupeesOrMonths: currentSavings < 2_500_000 ? `${formatINR(2_500_000 - currentSavings)} to go` : undefined,
      actionableStep: currentSavings < 2_500_000 ? `Maintain SIPs to bridge ${formatINR(2_500_000 - currentSavings)}.` : 'Crucial milestone crossed: Organic returns are now accelerating your net worth.',
      evidenceType: 'budgeted',
      evidenceDescription: `[BUDGET ALLOCATION]: Based on self-reported liquid portfolio balance (${formatINR(currentSavings)}).`,
      gridColumn: 1,
      gridRow: 3,
      treeX: 640,
      treeY: 160,
      shortLabel: '₹25L Hub',
      suggestedAction: {
        field: 'savings.emergencyFundBalance',
        targetValue: 2_500_000,
        description: 'Simulate reaching the ₹25,00,000 Quarter-Crore Hub',
      },
    },
    {
      id: 'coast_fire_equil',
      tier: 'tier3_autonomy',
      title: 'Coast FIRE Equilibrium',
      badge: 'SOVEREIGN II',
      category: 'autonomy',
      description: 'Your existing invested corpus will compound into full retirement without ever needing another rupee deposited.',
      actuarialPrinciple: 'You now only need to work to cover current living expenses; your retirement is already mathematically funded.',
      iconName: 'Anchor',
      requiredParentIds: ['quarter_crore_hub'],
      currentMetricLabel: `${((currentSavings / Math.max(1, annualExpenses * 15)) * 100).toFixed(0)}% of Coast Core`,
      targetMetricLabel: '15x Annual Expenses',
      progressPercent: Math.min(100, Math.round((currentSavings / Math.max(1, annualExpenses * 15)) * 100)),
      gapRupeesOrMonths: currentSavings < annualExpenses * 15 ? `${formatINR(Math.max(0, annualExpenses * 15 - currentSavings))} needed` : undefined,
      actionableStep: currentSavings < annualExpenses * 15 ? 'Accumulate 15x annual expenses to unlock permanent career flexibility.' : 'Coast FIRE unlocked: You can take low-stress jobs or sabbaticals without endangering retirement.',
      evidenceType: 'assumed',
      evidenceDescription: '[ACTUARIAL ASSUMPTION]: Projection based on 15x annual expenses and 12% equity CAGR assumptions.',
      gridColumn: 2,
      gridRow: 3,
      treeX: 920,
      treeY: 320,
      shortLabel: 'Coast FIRE',
      suggestedAction: {
        field: 'savings.emergencyFundBalance',
        targetValue: Math.round(annualExpenses * 15),
        description: `Fund 15x annual burn for Coast FIRE (${formatINR(Math.round(annualExpenses * 15))})`,
      },
    },
    {
      id: 'half_crore_inflection',
      tier: 'tier3_autonomy',
      title: 'The Half-Crore Inflection (₹50L)',
      badge: 'SOVEREIGN III',
      category: 'autonomy',
      description: 'Cross ₹50,00,000 liquid net worth. The gravitational tipping point where compound interest outpaces active labor.',
      actuarialPrinciple: 'At ₹50 Lakhs, your money earns more while you sleep than typical entry-level corporate salaries.',
      iconName: 'Flame',
      requiredParentIds: ['quarter_crore_hub'],
      currentMetricLabel: formatINR(currentSavings),
      targetMetricLabel: '₹50,00,000 Milestone',
      progressPercent: Math.min(100, Math.round((currentSavings / 5_000_000) * 100)),
      gapRupeesOrMonths: currentSavings < 5_000_000 ? `${formatINR(5_000_000 - currentSavings)} to go` : undefined,
      actionableStep: currentSavings < 5_000_000 ? `Stay the course; ${formatINR(5_000_000 - currentSavings)} to reach the Half-Crore mark.` : 'Half-Crore inflection secured: Financial gravity works in your favor.',
      evidenceType: 'budgeted',
      evidenceDescription: `[BUDGET ALLOCATION]: Based on self-reported liquid net worth (${formatINR(currentSavings)}).`,
      gridColumn: 3,
      gridRow: 3,
      treeX: 1020,
      treeY: 460,
      shortLabel: 'Half-Crore',
      suggestedAction: {
        field: 'savings.emergencyFundBalance',
        targetValue: 5_000_000,
        description: 'Simulate Half-Crore milestone (₹50 Lakhs)',
      },
    },
    {
      id: 'full_sovereign_fire',
      tier: 'tier3_autonomy',
      title: 'Full Sovereign FIRE (25x Expenses)',
      badge: 'SOVEREIGN IV',
      category: 'autonomy',
      description: 'Complete financial independence. Invested corpus exceeds 25x–30x annual expenses under the Trinity/Bengen Rule.',
      actuarialPrinciple: 'At a 3.5%–4% Safe Withdrawal Rate (SWR), your corpus mathematically funds your life indefinitely.',
      iconName: 'Crown',
      requiredParentIds: ['half_crore_inflection', 'coast_fire_equil'],
      currentMetricLabel: `${(currentSavings / Math.max(1, annualExpenses)).toFixed(1)}x Annual Burn`,
      targetMetricLabel: '25.0x Annual Living Expenses',
      progressPercent: Math.min(100, Math.round((currentSavings / Math.max(1, annualExpenses * 25)) * 100)),
      gapRupeesOrMonths: currentSavings < annualExpenses * 25 ? `${formatINR(Math.max(0, annualExpenses * 25 - currentSavings))} remaining` : undefined,
      actionableStep: currentSavings < annualExpenses * 25 ? `Target corpus: ${formatINR(annualExpenses * 25)}. Compounding will close this gap.` : 'Complete Sovereign Independence: Working is now 100% optional.',
      evidenceType: 'assumed',
      evidenceDescription: '[ACTUARIAL ASSUMPTION]: Bengen/Trinity model assuming 3.5%–4.0% SWR against reported annual expenses.',
      gridColumn: 4,
      gridRow: 3,
      treeX: 1100,
      treeY: 240,
      shortLabel: 'FIRE (25x)',
      suggestedAction: {
        field: 'savings.emergencyFundBalance',
        targetValue: Math.round(annualExpenses * 25),
        description: `Fund 25x annual living expenses (${formatINR(Math.round(annualExpenses * 25))})`,
      },
    },
    {
      id: 'antifragile_dynasty',
      tier: 'tier3_autonomy',
      title: 'Antifragile Dynastic Wealth (50x+)',
      badge: 'SOVEREIGN V',
      category: 'autonomy',
      description: 'Corpus exceeds 50x annual burn. Generational wealth immune to sovereign currency devaluations or regime shifts.',
      actuarialPrinciple: 'Generational wealth can absorb multi-decade black swans, fund family trusts, and build enduring legacy.',
      iconName: 'Sparkles',
      requiredParentIds: ['full_sovereign_fire'],
      currentMetricLabel: `${(currentSavings / Math.max(1, annualExpenses)).toFixed(1)}x Annual Burn`,
      targetMetricLabel: '50.0x Annual Burn',
      progressPercent: Math.min(100, Math.round((currentSavings / Math.max(1, annualExpenses * 50)) * 100)),
      gapRupeesOrMonths: currentSavings < annualExpenses * 50 ? `${formatINR(Math.max(0, annualExpenses * 50 - currentSavings))} remaining` : undefined,
      actionableStep: currentSavings < annualExpenses * 50 ? 'Scale enterprise equity and asset diversification to establish a generational endowment.' : 'Sovereign Pinnacle: Antifragile dynastic wealth achieved.',
      evidenceType: 'assumed',
      evidenceDescription: '[ACTUARIAL ASSUMPTION]: Endowment model assuming 50x annual living burn.',
      gridColumn: 5,
      gridRow: 3,
      treeX: 1220,
      treeY: 110,
      shortLabel: 'Dynasty (50x)',
      suggestedAction: {
        field: 'savings.emergencyFundBalance',
        targetValue: Math.round(annualExpenses * 50),
        description: `Fund 50x annual burn for generational endowment (${formatINR(Math.round(annualExpenses * 50))})`,
      },
    },
  ];

  // Resolve status based on parents and progressPercent
  const nodesMap = new Map<string, SkillStatus>();
  const nodes: SkillNode[] = [];

  for (const raw of rawNodes) {
    let status: SkillStatus = 'locked';

    // Are all required parent nodes mastered?
    const parentsSatisfied = raw.requiredParentIds.every(
      (pid) => nodesMap.get(pid) === 'mastered'
    );

    if (raw.requiredParentIds.length === 0 || parentsSatisfied) {
      if (raw.progressPercent >= 100) {
        status = 'mastered';
      } else {
        status = 'in_progress';
      }
    } else {
      if (raw.progressPercent >= 100) {
        status = 'mastered';
      } else if (raw.progressPercent > 20) {
        status = 'in_progress';
      } else {
        status = 'locked';
      }
    }

    nodesMap.set(raw.id, status);
    nodes.push({
      ...raw,
      status,
    });
  }

  const masteredCount = nodes.filter((n) => n.status === 'mastered').length;
  const masteryPercent = Math.round((masteredCount / nodes.length) * 100);

  const tier1Mastered = nodes.filter((n) => n.tier === 'tier1_survival' && n.status === 'mastered').length;
  const tier2Mastered = nodes.filter((n) => n.tier === 'tier2_velocity' && n.status === 'mastered').length;
  const tier3Mastered = nodes.filter((n) => n.tier === 'tier3_autonomy' && n.status === 'mastered').length;

  // Derive title ranks
  let currentRank = 'Apprentice of Capital';
  let nextRank = 'Fortress Architect';

  if (masteredCount >= 14) {
    currentRank = 'Sovereign Titan';
    nextRank = 'Sovereign Titan (Max Rank)';
  } else if (masteredCount >= 11) {
    currentRank = 'Independence Pathfinder (FIRE)';
    nextRank = 'Sovereign Titan';
  } else if (masteredCount >= 8) {
    currentRank = 'High-Velocity Compounder';
    nextRank = 'Independence Pathfinder (FIRE)';
  } else if (masteredCount >= 5) {
    currentRank = 'Fortress Architect';
    nextRank = 'High-Velocity Compounder';
  } else if (masteredCount >= 2) {
    currentRank = 'Prudent Capital Guardian';
    nextRank = 'Fortress Architect';
  }

  const rawRankPerks = RANK_LORE_PERKS[currentRank]?.perks || ['Cashflow balance sheet mapped'];
  
  // Dynamically audit perks to ensure claims match real underlying financial values
  const currentRankPerks = rawRankPerks.map((perk) => {
    if (perk.toLowerCase().includes('zero high-interest debt drag')) {
      return debtBalance <= 0
        ? 'Zero high-interest debt drag'
        : `Active debt liquidation (${formatINR(debtBalance)} balance remaining)`;
    }
    if (perk.toLowerCase().includes('6-month iron shock absorption')) {
      return runwayMonths >= 6
        ? 'Full 6-month iron shock absorption'
        : runwayMonths >= 3
        ? `3-Month core liquidity buffer (${runwayMonths.toFixed(1)} mos)`
        : `Building liquidity core (${runwayMonths.toFixed(1)} / 6 mos)`;
    }
    if (perk.toLowerCase().includes('term & health shield')) {
      return plan.expenses.insurance > 0
        ? 'Family catastrophic risk neutralized via term & health shield'
        : 'Insurance shield pending activation';
    }
    return perk;
  });

  const nextRankPerks = RANK_LORE_PERKS[nextRank]?.perks || ['Sovereign Autonomy'];

  const badges = computeSovereignBadges(plan, summary, optimalTaxSavings);
  const levelInfo = computeSovereignLevel(badges);

  return {
    nodes,
    overallMasteryPercent: masteryPercent,
    unlockedCount: masteredCount,
    totalCount: nodes.length,
    currentRank,
    nextRank,
    currentRankPerks,
    nextRankPerks,
    tier1MasteredCount: tier1Mastered,
    tier2MasteredCount: tier2Mastered,
    tier3MasteredCount: tier3Mastered,
    totalXP: levelInfo.totalXP,
    maxPossibleXP: levelInfo.maxPossibleXP,
    level: levelInfo.level,
    levelTitle: levelInfo.levelTitle,
    nextLevelXP: levelInfo.nextLevelXP,
    currentLevelProgressPercent: levelInfo.currentLevelProgressPercent,
    badges,
    unlockedBadgesCount: levelInfo.unlockedBadgesCount,
  };
}

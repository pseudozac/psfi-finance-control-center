import type { FinancePlan, FinanceSummary } from '../types/finance';
import type { SkillNode, SkillTreeState, SkillStatus } from '../types/skills';
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
  const savingsRate = summary.savingsRatePercent ?? 0;
  const runwayMonths = summary.emergencyRunwayMonths ?? 0;
  const stepUpRate = plan.savings.stepUpSipPercent ?? 0;

  // 15 Actuarial Nodes with Constellation Coordinates & What-If Actions
  const rawNodes: Omit<SkillNode, 'status'>[] = [
    // -------------------------------------------------------------------------
    // TIER 1: SURVIVAL FORTRESS (Row 1)
    // -------------------------------------------------------------------------
    {
      id: 'debt_elimination',
      tier: 'tier1_survival',
      title: 'High-Interest Debt Elimination',
      badge: 'DEFENSE I',
      category: 'defense',
      description: 'Eradicate all credit card balances, personal loans, and revolving debt to prevent wealth bleed.',
      actuarialPrinciple: 'Revolving credit card debt at 36%–42% APR mathematically destroys any 12% equity investment.',
      iconName: 'ShieldAlert',
      requiredParentIds: [],
      currentMetricLabel: debtBalance === 0 ? '₹0 Revolving Debt' : `${formatINR(debtBalance)} Balance`,
      targetMetricLabel: '₹0 Balance',
      progressPercent: debtBalance === 0 ? 100 : Math.max(5, Math.round(100 - (debtBalance / (monthlyInflow || 1)) * 50)),
      gapRupeesOrMonths: debtBalance > 0 ? `Pay off ${formatINR(debtBalance)}` : undefined,
      actionableStep: debtBalance > 0 ? 'Direct all surplus cashflow into clearing this revolving principal immediately.' : 'Fortress established: Zero high-interest debt dragging cashflow.',
      gridColumn: 1,
      gridRow: 1,
      treeX: 470,
      treeY: 580,
      shortLabel: 'Debt Free',
      suggestedAction: {
        field: 'debt.cardBalance',
        targetValue: 0,
        description: 'Zero out revolving credit card debt',
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
      gridColumn: 2,
      gridRow: 1,
      treeX: 280,
      treeY: 490,
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
      actuarialPrinciple: 'Pure term insurance is risk-transfer, not an investment. Avoid endowment and ULIP traps.',
      iconName: 'Umbrella',
      requiredParentIds: ['liquidity_3m'],
      currentMetricLabel: plan.expenses.insurance > 0 ? `${formatINR(plan.expenses.insurance)}/mo premium` : 'No Term Cover Logged',
      targetMetricLabel: '10x Annual Income Cover',
      progressPercent: plan.expenses.insurance > 0 ? 100 : 20,
      gapRupeesOrMonths: plan.expenses.insurance === 0 ? `Target cover: ${formatINR(annualIncome * 10)}` : undefined,
      actionableStep: plan.expenses.insurance === 0 ? 'Secure a pure term insurance policy with zero return of premium.' : 'Family life protection verified and active.',
      gridColumn: 3,
      gridRow: 1,
      treeX: 130,
      treeY: 395,
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
      actuarialPrinciple: 'Corporate group insurance ends the day you leave your job. Personal health cover is non-negotiable.',
      iconName: 'HeartPulse',
      requiredParentIds: ['term_life_shield'],
      currentMetricLabel: (plan.tax.deductions80D > 0 || plan.expenses.insurance > 0) ? `${formatINR(plan.tax.deductions80D || plan.expenses.insurance)} Cover/Ded` : 'No Health Cover Logged',
      targetMetricLabel: 'Independent Family Policy',
      progressPercent: (plan.tax.deductions80D > 0 || plan.expenses.insurance > 0) ? 100 : 25,
      gapRupeesOrMonths: (!plan.tax.deductions80D && !plan.expenses.insurance) ? 'Missing Personal Health Cover' : undefined,
      actionableStep: (!plan.tax.deductions80D && !plan.expenses.insurance) ? 'Acquire a personal base cover + super top-up policy with zero room cap.' : 'Personal health defense fortified.',
      gridColumn: 4,
      gridRow: 1,
      treeX: 270,
      treeY: 395,
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
      actionableStep: runwayMonths < 6 ? `Build up reserves by ${formatINR(Math.max(0, 6 * monthlyExpenses - currentSavings))}.` : 'Iron Fortress unlocked: Immune to short-term economic shocks.',
      gridColumn: 5,
      gridRow: 1,
      treeX: 200,
      treeY: 295,
      shortLabel: '6M Fortress',
      suggestedAction: {
        field: 'savings.emergencyFundBalance',
        targetValue: Math.round(6 * monthlyExpenses),
        description: `Expand liquid fortress to 6 full months (${formatINR(Math.round(6 * monthlyExpenses))})`,
      },
    },

    // -------------------------------------------------------------------------
    // TIER 2: VELOCITY ENGINE (Row 2)
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
      gridColumn: 1,
      gridRow: 2,
      treeX: 660,
      treeY: 490,
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
      gridColumn: 2,
      gridRow: 2,
      treeX: 660,
      treeY: 395,
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
      gridColumn: 3,
      gridRow: 2,
      treeX: 310,
      treeY: 210,
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
      gridColumn: 4,
      gridRow: 2,
      treeX: 470,
      treeY: 395,
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
      gridColumn: 5,
      gridRow: 2,
      treeX: 740,
      treeY: 295,
      shortLabel: '10% Step-Up',
      suggestedAction: {
        field: 'savings.stepUpSipPercent',
        targetValue: 12,
        description: 'Lock in a 12% annual step-up protocol',
      },
    },

    // -------------------------------------------------------------------------
    // TIER 3: SOVEREIGN AUTONOMY (Row 3)
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
      gridColumn: 1,
      gridRow: 3,
      treeX: 470,
      treeY: 210,
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
      gridColumn: 2,
      gridRow: 3,
      treeX: 250,
      treeY: 120,
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
      gridColumn: 3,
      gridRow: 3,
      treeX: 690,
      treeY: 120,
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
      gridColumn: 4,
      gridRow: 3,
      treeX: 470,
      treeY: 85,
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
      gridColumn: 5,
      gridRow: 3,
      treeX: 470,
      treeY: 24,
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

  const currentRankPerks = RANK_LORE_PERKS[currentRank]?.perks || ['Cashflow mapping active'];
  const nextRankPerks = RANK_LORE_PERKS[nextRank]?.perks || ['Sovereign Autonomy'];

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
  };
}

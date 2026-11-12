import type { FinancePlan, FinanceSummary } from '../types/finance';
import type { SkillNode, SkillTreeState, SkillStatus } from '../types/skills';
import { formatINR } from './finance';

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

  // 15 Actuarial Nodes
  const rawNodes: Omit<SkillNode, 'status'>[] = [
    // -------------------------------------------------------------------------
    // TIER 1: SURVIVAL FORTRESS (Defense)
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
    },

    // -------------------------------------------------------------------------
    // TIER 2: VELOCITY ENGINE (Compounding & Acceleration)
    // -------------------------------------------------------------------------
    {
      id: 'first_10l_core',
      tier: 'tier2_velocity',
      title: 'The First ₹10 Lakhs Core',
      badge: 'VELOCITY I',
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
    },
    {
      id: 'budget_equilibrium',
      tier: 'tier2_velocity',
      title: '50/30/20 Budget Equilibrium',
      badge: 'VELOCITY II',
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
    },
    {
      id: 'high_velocity_30',
      tier: 'tier2_velocity',
      title: 'High-Velocity Wealth Engine (30%+)',
      badge: 'VELOCITY III',
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
    },

    // -------------------------------------------------------------------------
    // TIER 3: SOVEREIGN AUTONOMY (Independence & Legacy)
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
    },
    {
      id: 'half_crore_inflection',
      tier: 'tier3_autonomy',
      title: 'The Half-Crore Inflection (₹50L)',
      badge: 'SOVEREIGN II',
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
    },
    {
      id: 'coast_fire_equil',
      tier: 'tier3_autonomy',
      title: 'Coast FIRE Equilibrium',
      badge: 'SOVEREIGN III',
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
      // Even if parents aren't fully mastered, if this node has organic progress > 0, show in_progress
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

  // Derive title ranks
  let currentRank = 'Apprentice of Capital';
  let nextRank = 'Fortress Architect';

  if (masteredCount >= 14) {
    currentRank = 'Sovereign Sovereign';
    nextRank = 'Dynastic Patriarch / Matriarch';
  } else if (masteredCount >= 11) {
    currentRank = 'Independence Pathfinder (FIRE)';
    nextRank = 'Sovereign Sovereign';
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

  return {
    nodes,
    overallMasteryPercent: masteryPercent,
    unlockedCount: masteredCount,
    totalCount: nodes.length,
    currentRank,
    nextRank,
  };
}

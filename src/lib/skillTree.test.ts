import { describe, it, expect } from 'vitest';
import { calculateSkillTree } from './skillTree';
import { calculateSummary, DEFAULT_PLAN } from './finance';
import type { FinancePlan } from '../types/finance';

describe('Sovereign Skill Tree Actuarial Engine', () => {
  it('correctly maps default plan to baseline skill tree state', () => {
    const summary = calculateSummary(DEFAULT_PLAN);
    const tree = calculateSkillTree(DEFAULT_PLAN, summary, 12500);

    expect(tree.nodes.length).toBe(15);
    expect(tree.totalCount).toBe(15);
    expect(tree.overallMasteryPercent).toBeGreaterThanOrEqual(0);
    expect(tree.currentRank).toBeDefined();

    // In default plan, debt is 45,000, so debt elimination should be in_progress
    const debtNode = tree.nodes.find((n) => n.id === 'debt_elimination');
    expect(debtNode).toBeDefined();
    expect(debtNode?.status).toBe('in_progress');
    expect(debtNode?.progressPercent).toBeLessThan(100);

    // When debt is 0, it should be mastered
    const zeroDebtPlan = { ...DEFAULT_PLAN, debt: { ...DEFAULT_PLAN.debt, cardBalance: 0 } };
    const zeroDebtSummary = calculateSummary(zeroDebtPlan);
    const zeroDebtTree = calculateSkillTree(zeroDebtPlan, zeroDebtSummary);
    const zeroDebtNode = zeroDebtTree.nodes.find((n) => n.id === 'debt_elimination');
    expect(zeroDebtNode?.status).toBe('mastered');
    expect(zeroDebtNode?.progressPercent).toBe(100);
  });

  it('detects high-interest debt and locks downstream velocity nodes', () => {
    const debtPlan: FinancePlan = {
      ...DEFAULT_PLAN,
      debt: {
        cardBalance: 250000,
        aprPercent: 38,
        monthlyPayment: 15000,
      },
      savings: {
        ...DEFAULT_PLAN.savings,
        emergencyFundBalance: 50000,
      },
    };

    const summary = calculateSummary(debtPlan);
    const tree = calculateSkillTree(debtPlan, summary);

    const debtNode = tree.nodes.find((n) => n.id === 'debt_elimination');
    expect(debtNode?.status).toBe('in_progress');
    expect(debtNode?.progressPercent).toBeLessThan(100);

    // Quarter crore node should be locked
    const quarterCrore = tree.nodes.find((n) => n.id === 'quarter_crore_hub');
    expect(quarterCrore?.status).toBe('locked');
  });

  it('promotes user to high ranks when wealth and savings metrics scale up', () => {
    const sovereignPlan: FinancePlan = {
      ...DEFAULT_PLAN,
      income: {
        salary: 350000,
        freelance: 50000,
        other: 0,
      },
      expenses: {
        ...DEFAULT_PLAN.expenses,
        insurance: 8000,
      },
      tax: {
        ...DEFAULT_PLAN.tax,
        deductions80D: 50000,
      },
      savings: {
        ...DEFAULT_PLAN.savings,
        emergencyFundBalance: 15000000, // 1.5 Crore
        monthlySip: 150000,
        stepUpSipPercent: 15,
        expectedReturnPercent: 12,
      },
      debt: {
        cardBalance: 0,
        aprPercent: 0,
        monthlyPayment: 0,
      },
    };

    const summary = calculateSummary(sovereignPlan);
    const tree = calculateSkillTree(sovereignPlan, summary, 50000);

    expect(tree.unlockedCount).toBeGreaterThanOrEqual(10);
    expect(tree.overallMasteryPercent).toBeGreaterThanOrEqual(60);

    const fireNode = tree.nodes.find((n) => n.id === 'full_sovereign_fire');
    expect(fireNode).toBeDefined();
    expect(fireNode?.progressPercent).toBeGreaterThan(0);
  });

  it('provides constellation coordinates, suggested what-if actions, and rank perks', () => {
    const summary = calculateSummary(DEFAULT_PLAN);
    const tree = calculateSkillTree(DEFAULT_PLAN, summary);

    expect(tree.currentRankPerks.length).toBeGreaterThan(0);
    expect(tree.nextRankPerks.length).toBeGreaterThan(0);

    // Verify all 15 nodes have valid constellation coordinates and suggested actions
    tree.nodes.forEach((node) => {
      expect(node.gridColumn).toBeGreaterThanOrEqual(1);
      expect(node.gridColumn).toBeLessThanOrEqual(5);
      expect(node.gridRow).toBeGreaterThanOrEqual(1);
      expect(node.gridRow).toBeLessThanOrEqual(3);
      expect(node.suggestedAction).toBeDefined();
      expect(node.suggestedAction?.field).toBeDefined();
    });
  });
});

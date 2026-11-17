import { describe, it, expect } from 'vitest';
import { runMonteCarloSimulation } from './monteCarlo';

describe('Reverse Monte Carlo FIRE Stress-Testing Engine', () => {
  it('uses the same sampled paths for the planned burn and an equal matrix withdrawal', () => {
    const result = runMonteCarloSimulation({
      currentCorpus: 12_000_000,
      monthlySavings: 0,
      monthlyRetirementBurn: 30_000,
      yearsToRetire: 0,
      yearsInRetirement: 30,
      numSimulations: 500,
      randomSeed: 42,
    });
    const withdrawal = result.swrScenarios.find((point) => point.swrPercent === 3);
    expect(withdrawal?.annualWithdrawalRupees).toBe(360_000);
    expect(withdrawal?.ruinProbabilityPercent).toBe(result.ruinProbabilityPercent);
  });

  it('runs deterministic simulation with valid trajectories and percentiles', () => {
    const result = runMonteCarloSimulation({
      currentCorpus: 2500000,
      monthlySavings: 50000,
      monthlyRetirementBurn: 60000,
      yearsToRetire: 10,
      yearsInRetirement: 20,
      numSimulations: 500,
      randomSeed: 42,
    });

    expect(result.simulationsRun).toBe(500);
    expect(result.totalYears).toBe(30);
    expect(result.accumulationYears).toBe(10);
    expect(result.retirementYears).toBe(20);
    expect(result.trajectories.length).toBe(31);

    // Initial corpus at year 0 matches starting capital
    expect(result.trajectories[0].p50).toBe(2500000);
    expect(result.trajectories[0].p5).toBe(2500000);
    expect(result.trajectories[0].p95).toBe(2500000);

    // Monotonic percentile ordering at retirement year
    const retTraj = result.trajectories[10];
    expect(retTraj.p5).toBeLessThanOrEqual(retTraj.p25);
    expect(retTraj.p25).toBeLessThanOrEqual(retTraj.p50);
    expect(retTraj.p50).toBeLessThanOrEqual(retTraj.p75);
    expect(retTraj.p75).toBeLessThanOrEqual(retTraj.p95);

    expect(result.antifragilityScore).toBeGreaterThanOrEqual(0);
    expect(result.antifragilityScore).toBeLessThanOrEqual(100);
    expect(result.ruinProbabilityPercent).toBeGreaterThanOrEqual(0);
    expect(result.ruinProbabilityPercent).toBeLessThanOrEqual(100);
    expect(['LOW', 'MODERATE', 'ELEVATED', 'CRITICAL']).toContain(result.srrRiskRating);
  });

  it('correctly models 2008 Lehman shock scenario with higher ruin risk', () => {
    const baseline = runMonteCarloSimulation({
      currentCorpus: 1000000,
      monthlySavings: 20000,
      monthlyRetirementBurn: 80000,
      yearsToRetire: 5,
      yearsInRetirement: 25,
      scenario: 'baseline',
      numSimulations: 400,
      randomSeed: 123,
    });

    const lehman = runMonteCarloSimulation({
      currentCorpus: 1000000,
      monthlySavings: 20000,
      monthlyRetirementBurn: 80000,
      yearsToRetire: 5,
      yearsInRetirement: 25,
      scenario: 'lehman_2008',
      numSimulations: 400,
      randomSeed: 123,
    });

    // Lehman scenario should produce lower or equal median retirement corpus
    expect(lehman.medianRetirementCorpus).toBeLessThanOrEqual(baseline.medianRetirementCorpus);
  });

  it('safely handles zero savings and rapid retirement with high ruin rate', () => {
    const stressed = runMonteCarloSimulation({
      currentCorpus: 500000,
      monthlySavings: 0,
      monthlyRetirementBurn: 150000,
      yearsToRetire: 1,
      yearsInRetirement: 25,
      numSimulations: 300,
      randomSeed: 999,
    });

    expect(stressed.ruinProbabilityPercent).toBeGreaterThan(50);
    expect(['ELEVATED', 'CRITICAL']).toContain(stressed.srrRiskRating);
    expect(stressed.antifragilityScore).toBeLessThan(50);
  });

  it('calculates recommended cash wedge cushion and Safe Withdrawal Rate (SWR) scenarios', () => {
    const result = runMonteCarloSimulation({
      currentCorpus: 3000000,
      monthlySavings: 60000,
      monthlyRetirementBurn: 50000,
      yearsToRetire: 8,
      yearsInRetirement: 25,
      numSimulations: 500,
      randomSeed: 777,
    });

    expect(result.recommendedCashWedgeMonths).toBeGreaterThanOrEqual(12);
    expect(result.recommendedCashWedgeRupees).toBe(50000 * result.recommendedCashWedgeMonths);
    expect(result.swrScenarios).toHaveLength(5);

    const swr3 = result.swrScenarios.find((s) => s.swrPercent === 3.0);
    expect(swr3).toBeDefined();
    expect(swr3?.successProbabilityPercent).toBeGreaterThanOrEqual(70);

    const swr5 = result.swrScenarios.find((s) => s.swrPercent === 5.0);
    expect(swr5).toBeDefined();
    expect(swr5?.verdict).toBeDefined();
  });

  it('supports historical Indian crisis regimes (Ketan Parekh, NBFC crisis, BOP 1991)', () => {
    const dotCom = runMonteCarloSimulation({
      currentCorpus: 2000000,
      monthlySavings: 30000,
      monthlyRetirementBurn: 40000,
      yearsToRetire: 5,
      yearsInRetirement: 20,
      scenario: 'ketan_parekh_2001',
      numSimulations: 300,
      randomSeed: 42,
    });
    expect(dotCom.simulationsRun).toBe(300);

    const nbfc = runMonteCarloSimulation({
      currentCorpus: 2000000,
      monthlySavings: 30000,
      monthlyRetirementBurn: 40000,
      yearsToRetire: 5,
      yearsInRetirement: 20,
      scenario: 'demonetisation_nbfc_2016',
      numSimulations: 300,
      randomSeed: 42,
    });
    expect(nbfc.simulationsRun).toBe(300);

    const bop1991 = runMonteCarloSimulation({
      currentCorpus: 2000000,
      monthlySavings: 30000,
      monthlyRetirementBurn: 40000,
      yearsToRetire: 5,
      yearsInRetirement: 20,
      scenario: 'bop_crisis_1991',
      numSimulations: 300,
      randomSeed: 42,
    });
    expect(bop1991.simulationsRun).toBe(300);
  });

  it('reconciles scenario stress with safe withdrawal rates and SWR matrix survival', () => {
    const lehman = runMonteCarloSimulation({
      currentCorpus: 1500000,
      monthlySavings: 35000,
      monthlyRetirementBurn: 50000,
      yearsToRetire: 10,
      yearsInRetirement: 30,
      scenario: 'lehman_2008',
      numSimulations: 500,
      randomSeed: 42,
    });

    // Safe withdrawal rate ceiling should be compressed under Lehman shock
    expect(lehman.safeWithdrawalRatePercent).toBeLessThanOrEqual(2.5);
    expect(lehman.plannedWithdrawalRatePercent).toBeGreaterThan(0);

    // 5.0% SWR must be marked DANGEROUS with high ruin probability
    const swr5 = lehman.swrScenarios.find((s) => s.swrPercent === 5.0);
    expect(swr5?.verdict).toBe('DANGEROUS');
    expect(swr5?.ruinProbabilityPercent).toBeGreaterThanOrEqual(70);
  });
});

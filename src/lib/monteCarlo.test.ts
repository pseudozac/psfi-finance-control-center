import { describe, it, expect } from 'vitest';
import { runMonteCarloSimulation } from './monteCarlo';

describe('Reverse Monte Carlo FIRE Stress-Testing Engine', () => {
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
});

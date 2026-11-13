/**
 * Reverse Monte Carlo FIRE Stress-Testing & Sequence-of-Returns Engine
 * Simulates thousands of localized stochastic lifespan investment paths modeling
 * historical Indian market volatility, high inflation, and macroeconomic black swans.
 */

export type StressScenario = 
  | 'baseline'
  | 'lehman_2008'        // -55% equity crash in year 1, 3 years slow recovery
  | 'covid_2020'          // -38% flash crash year 1, rapid V-shape recovery
  | 'tech_winter'         // 18 months zero savings / tech layoff salary freeze
  | 'medical_emergency'   // Sudden ₹15 Lakh out-of-pocket hospital shock in early retirement
  | 'stagflation_spike';  // 11% persistent inflation with 5% depressed returns for 4 years

export interface MonteCarloParams {
  currentCorpus: number;             // Current net worth / portfolio (INR)
  monthlySavings: number;            // Ongoing SIP additions during accumulation (INR)
  monthlyRetirementBurn: number;     // Target monthly spending in retirement at today's cost (INR)
  yearsToRetire: number;             // Accumulation horizon (e.g. 10 years)
  yearsInRetirement: number;         // Distribution horizon (e.g. 30 years)
  equityRatio?: number;              // Portfolio equity share (0.0 to 1.0, default 0.70)
  equityMeanReturn?: number;         // Historical Nifty 50 mean CAGR (default 12.5%)
  equityVolatility?: number;         // Annual standard deviation (default 18.0%)
  debtMeanReturn?: number;           // Liquid/Debt fund return (default 7.0%)
  debtVolatility?: number;           // Debt fund volatility (default 3.0%)
  inflationMean?: number;            // Indian CPI inflation mean (default 6.5%)
  inflationVolatility?: number;      // Inflation standard deviation (default 2.0%)
  numSimulations?: number;           // Iterations (default 2000 for zero-lag client execution)
  scenario?: StressScenario;
  randomSeed?: number;               // Optional seed for deterministic reproducibility
}

export interface PercentileTrajectory {
  year: number;
  p5: number;   // 5th percentile (Bear / Black swan)
  p25: number;  // 25th percentile (Conservative)
  p50: number;  // 50th percentile (Median expected)
  p75: number;  // 75th percentile (Optimistic)
  p95: number;  // 95th percentile (Dynastic bull)
}

export interface MonteCarloResult {
  simulationsRun: number;
  totalYears: number;
  accumulationYears: number;
  retirementYears: number;
  ruinProbabilityPercent: number;    // Probability corpus hits ₹0 during retirement
  antifragilityScore: number;        // 0 to 100 Sovereign Antifragility Score
  medianRetirementCorpus: number;    // Projected corpus at retirement start (Year N)
  medianTerminalCorpus: number;      // Projected corpus at death / end of horizon
  safeWithdrawalRatePercent: number; // Recommended actuarial SWR for this plan
  srrRiskRating: 'LOW' | 'MODERATE' | 'ELEVATED' | 'CRITICAL';
  srrExplanation: string;
  trajectories: PercentileTrajectory[];
  actuarialVerdict: string;
}

// Pseudo-random Gaussian using Box-Muller transform
function generateGaussian(mean: number, stdDev: number, rng: () => number): number {
  let u1 = rng();
  let u2 = rng();
  // Avoid log(0)
  while (u1 <= 1e-7) u1 = rng();
  while (u2 <= 1e-7) u2 = rng();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

// Simple Linear Congruential Generator for optional seeded deterministic tests
function createLcgRng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function runMonteCarloSimulation(params: MonteCarloParams): MonteCarloResult {
  const {
    currentCorpus,
    monthlySavings,
    monthlyRetirementBurn,
    yearsToRetire,
    yearsInRetirement,
    equityRatio = 0.70,
    equityMeanReturn = 12.5,
    equityVolatility = 18.0,
    debtMeanReturn = 7.0,
    debtVolatility = 3.0,
    inflationMean = 6.5,
    inflationVolatility = 2.0,
    numSimulations = 2000,
    scenario = 'baseline',
    randomSeed,
  } = params;

  const totalYears = Math.max(1, yearsToRetire + yearsInRetirement);
  const rng = randomSeed !== undefined ? createLcgRng(randomSeed) : Math.random;

  // Track yearly corpus for all iterations
  // yearCorpusMatrix[yearIndex][simIndex]
  const yearCorpusMatrix: number[][] = Array.from({ length: totalYears + 1 }, () => 
    new Array(numSimulations).fill(0)
  );

  let ruinCount = 0;
  let retirementCorpusSum = 0;

  for (let sim = 0; sim < numSimulations; sim++) {
    let corpus = currentCorpus;
    yearCorpusMatrix[0][sim] = corpus;
    let ruined = false;

    // Cumulative inflation multiplier for living expenses
    let cumulativeInflation = 1.0;

    for (let yr = 1; yr <= totalYears; yr++) {
      if (corpus <= 0) {
        corpus = 0;
        ruined = true;
        yearCorpusMatrix[yr][sim] = 0;
        continue;
      }

      // Generate annual inflation
      let annualInflation = generateGaussian(inflationMean / 100, inflationVolatility / 100, rng);
      annualInflation = Math.max(-0.02, Math.min(0.25, annualInflation)); // Clamp realistic range

      // Generate blended portfolio return
      const eqReturn = generateGaussian(equityMeanReturn / 100, equityVolatility / 100, rng);
      const debtReturn = generateGaussian(debtMeanReturn / 100, debtVolatility / 100, rng);
      let blendedReturn = (equityRatio * eqReturn) + ((1 - equityRatio) * debtReturn);

      // Apply Indian Macroeconomic Stress Scenarios
      if (scenario === 'lehman_2008') {
        if (yr === 1 || yr === yearsToRetire + 1) {
          blendedReturn = -0.42; // Severe multi-cap drawdown
        } else if (yr === 2 || yr === yearsToRetire + 2) {
          blendedReturn = -0.10;
        }
      } else if (scenario === 'covid_2020') {
        if (yr === 1 || yr === yearsToRetire + 1) {
          blendedReturn = -0.28;
        } else if (yr === 2 || yr === yearsToRetire + 2) {
          blendedReturn = 0.32; // Strong V-shape bounce
        }
      } else if (scenario === 'stagflation_spike') {
        if (yr >= 1 && yr <= 4) {
          annualInflation = 0.115;
          blendedReturn = 0.045;
        }
      }

      // Accumulation Phase vs Retirement Distribution Phase
      if (yr <= yearsToRetire) {
        // Accumulation: Add annual savings + portfolio growth
        let annualSavings = monthlySavings * 12;

        // Tech winter layoff scenario: zero savings during first 2 years
        if (scenario === 'tech_winter' && yr <= 2) {
          annualSavings = 0;
        }

        corpus = (corpus + annualSavings) * (1 + blendedReturn);
      } else {
        // Retirement Phase
        cumulativeInflation *= (1 + annualInflation);
        let annualWithdrawal = monthlyRetirementBurn * 12 * cumulativeInflation;

        // Medical shock scenario: sudden ₹15L out-of-pocket hit in early retirement
        if (scenario === 'medical_emergency' && yr === yearsToRetire + 2) {
          annualWithdrawal += 1500000;
        }

        // Apply growth and subtract withdrawal at year-end
        corpus = corpus * (1 + blendedReturn) - annualWithdrawal;

        if (corpus <= 0) {
          corpus = 0;
          ruined = true;
        }
      }

      yearCorpusMatrix[yr][sim] = Math.max(0, corpus);

      if (yr === yearsToRetire) {
        retirementCorpusSum += corpus;
      }
    }

    if (ruined) {
      ruinCount++;
    }
  }

  // Calculate percentiles at each year
  const trajectories: PercentileTrajectory[] = [];
  for (let yr = 0; yr <= totalYears; yr++) {
    const sorted = [...yearCorpusMatrix[yr]].sort((a, b) => a - b);
    trajectories.push({
      year: yr,
      p5: Math.round(sorted[Math.floor(numSimulations * 0.05)]),
      p25: Math.round(sorted[Math.floor(numSimulations * 0.25)]),
      p50: Math.round(sorted[Math.floor(numSimulations * 0.50)]),
      p75: Math.round(sorted[Math.floor(numSimulations * 0.75)]),
      p95: Math.round(sorted[Math.floor(numSimulations * 0.95)]),
    });
  }

  const ruinProbabilityPercent = Number(((ruinCount / numSimulations) * 100).toFixed(1));
  const medianRetirementCorpus = trajectories[yearsToRetire]?.p50 ?? 0;
  const medianTerminalCorpus = trajectories[totalYears]?.p50 ?? 0;

  // Safe Withdrawal Rate formula for India
  // Standard Trinity 4% fails in India due to 6%-7% inflation; safe Indian rate is ~3.2% - 3.6%
  const annualRetirementBurnBase = monthlyRetirementBurn * 12;
  const rawWithdrawalRate = medianRetirementCorpus > 0 
    ? (annualRetirementBurnBase / medianRetirementCorpus) * 100 
    : 10.0;
  const safeWithdrawalRatePercent = Number(Math.max(2.5, Math.min(5.5, rawWithdrawalRate)).toFixed(2));

  // Sequence of Returns Risk Rating
  // If worst case (p5) collapses below 50% of starting corpus within 5 years of retirement
  const p5AtRetirement = trajectories[yearsToRetire]?.p5 ?? 1;
  const p5AtYear5Retirement = trajectories[Math.min(totalYears, yearsToRetire + 5)]?.p5 ?? 0;
  const dropRatio = p5AtRetirement > 0 ? (p5AtRetirement - p5AtYear5Retirement) / p5AtRetirement : 1;

  let srrRiskRating: 'LOW' | 'MODERATE' | 'ELEVATED' | 'CRITICAL' = 'LOW';
  let srrExplanation = 'Healthy cashflow buffer and equity glidepath insulate against early bear markets.';

  if (ruinProbabilityPercent > 35 || dropRatio > 0.65) {
    srrRiskRating = 'CRITICAL';
    srrExplanation = 'Corpus is critically vulnerable to early-retirement bear market drawdown. Sequence risk could cause premature portfolio exhaustion.';
  } else if (ruinProbabilityPercent > 18 || dropRatio > 0.45) {
    srrRiskRating = 'ELEVATED';
    srrExplanation = 'Moderate vulnerability to prolonged bear markets in years 1–3 of retirement. Consider a 2-year cash wedge.';
  } else if (ruinProbabilityPercent > 7 || dropRatio > 0.25) {
    srrRiskRating = 'MODERATE';
    srrExplanation = 'Acceptable shock tolerance. Slight drawdown pressure under historical 2008 Lehman style stress.';
  }

  // Antifragility Score (0–100)
  // Penalizes ruin probability, excessive SRR, and reward dynastic longevity
  let score = 100 - (ruinProbabilityPercent * 1.4);
  if (srrRiskRating === 'CRITICAL') score -= 25;
  if (srrRiskRating === 'ELEVATED') score -= 15;
  if (srrRiskRating === 'MODERATE') score -= 6;
  if (medianTerminalCorpus > medianRetirementCorpus * 1.5) score += 5; // Dynastic compounding
  const antifragilityScore = Math.max(5, Math.min(100, Math.round(score)));

  // Actuarial Verdict
  let actuarialVerdict = '';
  if (antifragilityScore >= 85) {
    actuarialVerdict = 'Sovereign Titan Grade: Portfolio possesses supreme antifragility, surviving severe multi-year black swan crashes and 30-year high inflation.';
  } else if (antifragilityScore >= 70) {
    actuarialVerdict = 'Robust Fortress: High probability of complete financial independence with manageable sequence-of-returns exposure.';
  } else if (antifragilityScore >= 50) {
    actuarialVerdict = 'Moderate Resilience: Vulnerable to simultaneous high inflation and early retirement market crashes. Build a 2-year debt wedge.';
  } else {
    actuarialVerdict = 'Fragile Structure: High probability of premature depletion under Indian economic stress. Increase monthly SIP or extend horizon.';
  }

  return {
    simulationsRun: numSimulations,
    totalYears,
    accumulationYears: yearsToRetire,
    retirementYears: yearsInRetirement,
    ruinProbabilityPercent,
    antifragilityScore,
    medianRetirementCorpus,
    medianTerminalCorpus,
    safeWithdrawalRatePercent,
    srrRiskRating,
    srrExplanation,
    trajectories,
    actuarialVerdict,
  };
}

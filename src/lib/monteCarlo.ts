/**
 * Reverse Monte Carlo FIRE Stress-Testing & Sequence-of-Returns Engine
 * Simulates thousands of localized stochastic lifespan investment paths modeling
 * historical Indian market volatility, high inflation, and macroeconomic black swans.
 */

export type StressScenario = 
  | 'baseline'
  | 'lehman_2008'            // -55% equity crash in year 1, 3 years slow recovery
  | 'covid_2020'              // -38% flash crash year 1, rapid V-shape recovery
  | 'tech_winter'             // 18 months zero savings / tech layoff salary freeze
  | 'medical_emergency'       // Sudden ₹15 Lakh out-of-pocket hospital shock in early retirement
  | 'stagflation_spike'       // 11% persistent inflation with 5% depressed returns for 4 years
  | 'ketan_parekh_2001'       // -45% tech collapse, 4-year sideways grind (2000-2003 dot-com/Ketan Parekh)
  | 'demonetisation_nbfc_2016'// IL&FS / NBFC liquidity squeeze, debt returns crater to 2.5%, equity sideways
  | 'bop_crisis_1991';        // 13.8% runaway inflation spike, 18% rupee devaluation shock

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

export interface SwrScenarioPoint {
  swrPercent: number; // e.g. 3.0, 3.5, 4.0, 4.5
  annualWithdrawalRupees: number;
  successProbabilityPercent: number;
  ruinProbabilityPercent: number;
  verdict: 'SAFE' | 'CAUTION' | 'DANGEROUS';
}

export interface DepletionHorizon {
  worstCaseDepletionYear: number | null;
  worstCaseRetirementSolvencyYears: number;
  medianDepletionYear: number | null;
  medianSolvencyYears: number;
  medianTerminalSurplusRupees: number;
}

export interface MonteCarloResult {
  simulationsRun: number;
  totalYears: number;
  accumulationYears: number;
  retirementYears: number;
  ruinProbabilityPercent: number;    // Probability planned burn depletes corpus
  plannedWithdrawalRatePercent: number; // User's planned annual burn as % of median retirement corpus
  antifragilityScore: number;        // 0 to 100 Sovereign Antifragility Score
  medianRetirementCorpus: number;    // Projected corpus at retirement start (Year N)
  medianTerminalCorpus: number;      // Projected corpus at death / end of horizon
  safeWithdrawalRatePercent: number; // Actuarially recommended safe withdrawal rate ceiling under this scenario
  srrRiskRating: 'LOW' | 'MODERATE' | 'ELEVATED' | 'CRITICAL';
  srrExplanation: string;
  recommendedCashWedgeMonths: number;
  recommendedCashWedgeRupees: number;
  swrScenarios: SwrScenarioPoint[];
  trajectories: PercentileTrajectory[];
  actuarialVerdict: string;
  depletionHorizon: DepletionHorizon;
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
  const sustainableAnnualBurns: number[] = [];

  for (let sim = 0; sim < numSimulations; sim++) {
    let corpus = currentCorpus;
    yearCorpusMatrix[0][sim] = corpus;
    let ruined = false;
    let retirementGrowth = 1;
    let discountedInflation = 0;
    let discountedShock = 0;
    let sustainableAnnualBurn = Infinity;

    // Cumulative inflation multiplier for living expenses
    let cumulativeInflation = 1.0;

    for (let yr = 1; yr <= totalYears; yr++) {
      if (corpus <= 0 && yr === yearsToRetire + 1) {
        corpus = 0;
        ruined = true;
        yearCorpusMatrix[yr][sim] = 0;
        sustainableAnnualBurn = 0;
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
      } else if (scenario === 'ketan_parekh_2001') {
        // Dot-Com / Ketan Parekh crash: -45% year 1, -12% year 2, flat recovery
        if (yr === 1 || yr === yearsToRetire + 1) {
          blendedReturn = -0.45;
        } else if (yr === 2 || yr === yearsToRetire + 2) {
          blendedReturn = -0.12;
        } else if (yr === 3 || yr === yearsToRetire + 3) {
          blendedReturn = 0.02;
        }
      } else if (scenario === 'demonetisation_nbfc_2016') {
        // IL&FS / NBFC liquidity squeeze: debt returns compressed to 2%, equity choppy
        if (yr >= 1 && yr <= 2) {
          blendedReturn = equityRatio * 0.04 + (1 - equityRatio) * 0.02;
          annualInflation = 0.045;
        }
      } else if (scenario === 'bop_crisis_1991') {
        // 1991 Balance-of-payments crisis: 13.8% runaway CPI inflation, 6% muted return
        if (yr >= 1 && yr <= 3) {
          annualInflation = 0.138;
          blendedReturn = 0.06;
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
        let shock = 0;

        // Medical shock scenario: sudden ₹15L out-of-pocket hit in early retirement
        if (scenario === 'medical_emergency' && yr === yearsToRetire + 2) {
          shock = 1500000;
        }

        // Discount each withdrawal to the start of retirement. The tightest
        // year gives the maximum starting annual withdrawal this path supports.
        retirementGrowth *= Math.max(0.01, 1 + blendedReturn);
        discountedInflation += cumulativeInflation / retirementGrowth;
        discountedShock += shock / retirementGrowth;
        const startingCorpus = yearCorpusMatrix[yearsToRetire][sim];
        sustainableAnnualBurn = Math.min(
          sustainableAnnualBurn,
          (startingCorpus - discountedShock) / discountedInflation
        );

        const annualWithdrawal = monthlyRetirementBurn * 12 * cumulativeInflation + shock;
        // Apply growth and subtract withdrawal at year-end
        corpus = ruined ? 0 : corpus * Math.max(0.01, 1 + blendedReturn) - annualWithdrawal;

        if (corpus <= 0) {
          corpus = 0;
          ruined = true;
        }
      }

      yearCorpusMatrix[yr][sim] = Math.max(0, corpus);

    }
    sustainableAnnualBurns.push(sustainableAnnualBurn);

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

  // 1. User's Planned Withdrawal Rate (Burn relative to projected corpus)
  const annualRetirementBurnBase = monthlyRetirementBurn * 12;
  const plannedWithdrawalRatePercent = medianRetirementCorpus > 0 
    ? Number(((annualRetirementBurnBase / medianRetirementCorpus) * 100).toFixed(2))
    : 10.0;

  // Strictly positive balances in at least 90% of the same sampled paths.
  const survivalAt = (annualBurn: number) =>
    100 * sustainableAnnualBurns.filter((limit) => annualBurn < limit).length / numSimulations;
  const sortedBurnLimits = [...sustainableAnnualBurns].sort((a, b) => a - b);
  const burnLimit = sortedBurnLimits[numSimulations - Math.ceil(numSimulations * 0.9)];
  const safeWithdrawalRatePercent = medianRetirementCorpus > 0 && Number.isFinite(burnLimit)
    ? Math.max(0, (Math.ceil((burnLimit / medianRetirementCorpus) * 10_000) - 1) / 100)
    : 0;

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
    srrExplanation = 'Acceptable shock tolerance. Slight drawdown pressure under historical stress.';
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

  // Dynamic Cash Wedge / Buffer Sizer
  // Recommends non-equity cushion in liquid/arbitrage funds to survive early bear markets without selling equities
  const recommendedCashWedgeMonths = srrRiskRating === 'CRITICAL'
    ? 36
    : srrRiskRating === 'ELEVATED'
    ? 24
    : srrRiskRating === 'MODERATE'
    ? 18
    : 12;
  const recommendedCashWedgeRupees = Math.round(monthlyRetirementBurn * recommendedCashWedgeMonths);

  // Safe Withdrawal Rate (SWR) Actuarial Matrix (3.0% to 5.0%)
  // Probability responds consistently to scenario shock and inflation
  const swrRates = [3.0, 3.5, 4.0, 4.5, 5.0];
  const swrScenarios: SwrScenarioPoint[] = swrRates.map((rate) => {
    const annualWithdrawalRupees = Math.round(medianRetirementCorpus * (rate / 100));

    const survival = survivalAt(annualWithdrawalRupees);
    const successProbabilityPercent = Number(survival.toFixed(1));
    const ruinProb = Number((100 - survival).toFixed(1));
    const verdict: SwrScenarioPoint['verdict'] =
      survival >= 90 ? 'SAFE' : survival >= 50 ? 'CAUTION' : 'DANGEROUS';

    return {
      swrPercent: rate,
      annualWithdrawalRupees,
      successProbabilityPercent,
      ruinProbabilityPercent: ruinProb,
      verdict,
    };
  });

  // Depletion Horizon & Solvency Lifespan Calculation
  let worstCaseDepletionYear: number | null = null;
  let worstCaseRetirementSolvencyYears = yearsInRetirement;
  let medianDepletionYear: number | null = null;
  let medianSolvencyYears = yearsInRetirement;

  for (let yr = yearsToRetire + 1; yr <= totalYears; yr++) {
    const t = trajectories[yr];
    if (worstCaseDepletionYear === null && t.p5 <= 0) {
      worstCaseDepletionYear = yr;
      worstCaseRetirementSolvencyYears = Math.max(0, yr - yearsToRetire);
    }
    if (medianDepletionYear === null && t.p50 <= 0) {
      medianDepletionYear = yr;
      medianSolvencyYears = Math.max(0, yr - yearsToRetire);
    }
  }

  const depletionHorizon: DepletionHorizon = {
    worstCaseDepletionYear,
    worstCaseRetirementSolvencyYears,
    medianDepletionYear,
    medianSolvencyYears,
    medianTerminalSurplusRupees: medianTerminalCorpus,
  };

  return {
    simulationsRun: numSimulations,
    totalYears,
    accumulationYears: yearsToRetire,
    retirementYears: yearsInRetirement,
    ruinProbabilityPercent,
    plannedWithdrawalRatePercent,
    antifragilityScore,
    medianRetirementCorpus,
    medianTerminalCorpus,
    safeWithdrawalRatePercent,
    srrRiskRating,
    srrExplanation,
    recommendedCashWedgeMonths,
    recommendedCashWedgeRupees,
    swrScenarios,
    trajectories,
    actuarialVerdict,
    depletionHorizon,
  };
}

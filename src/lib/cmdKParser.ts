import { formatINR } from './finance';

/**
 * Parses colloquial Indian currency shorthands like:
 * - '1.5L', '2lac', '3.2lakhs' -> 150000, 200000, 320000
 * - '50k', '25thousand' -> 50000, 25000
 * - '1cr', '2.5crore' -> 10000000, 25000000
 * - '45000' -> 45000
 */
export function parseIndianAmount(input: string): number | null {
  const clean = input.trim().toLowerCase().replace(/[,\s₹]/g, '');
  if (!clean) return null;

  if (clean.endsWith('cr') || clean.endsWith('crore')) {
    const numStr = clean.replace(/(crore|cr)/g, '');
    const val = parseFloat(numStr);
    return isNaN(val) ? null : Math.round(val * 10000000);
  }

  if (clean.endsWith('l') || clean.endsWith('lakh') || clean.endsWith('lac') || clean.endsWith('lakhs')) {
    const numStr = clean.replace(/(lakhs|lakh|lac|l)/g, '');
    const val = parseFloat(numStr);
    return isNaN(val) ? null : Math.round(val * 100000);
  }

  if (clean.endsWith('k') || clean.endsWith('thousand')) {
    const numStr = clean.replace(/(thousand|k)/g, '');
    const val = parseFloat(numStr);
    return isNaN(val) ? null : Math.round(val * 1000);
  }

  const val = parseFloat(clean);
  return isNaN(val) ? null : Math.round(val);
}

// --------------------------------------------------------------------------
// 1. SIP Compounding Calculator
// --------------------------------------------------------------------------
export interface SipCalculationResult {
  monthlyInvestment: number;
  years: number;
  annualRatePercent: number;
  totalInvested: number;
  futureValue: number;
  wealthGain: number;
}

export function calculateSipFutureValue(
  monthlyInvestment: number,
  years: number,
  annualRatePercent: number
): SipCalculationResult {
  const n = Math.max(1, Math.round(years * 12));
  const r = annualRatePercent / 100 / 12;
  const totalInvested = monthlyInvestment * n;

  let futureValue = 0;
  if (r === 0) {
    futureValue = totalInvested;
  } else {
    futureValue = monthlyInvestment * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
  }

  const roundedFV = Math.round(futureValue);
  const roundedInvested = Math.round(totalInvested);
  return {
    monthlyInvestment,
    years,
    annualRatePercent,
    totalInvested: roundedInvested,
    futureValue: roundedFV,
    wealthGain: Math.max(0, roundedFV - roundedInvested),
  };
}

// --------------------------------------------------------------------------
// 2. Loan EMI Calculator
// --------------------------------------------------------------------------
export interface EmiCalculationResult {
  principal: number;
  years: number;
  annualRatePercent: number;
  monthlyEmi: number;
  totalInterest: number;
  totalRepayment: number;
}

export function calculateLoanEmi(
  principal: number,
  years: number,
  annualRatePercent: number
): EmiCalculationResult {
  const n = Math.max(1, Math.round(years * 12));
  const r = annualRatePercent / 100 / 12;

  let emi = 0;
  if (r === 0) {
    emi = principal / n;
  } else {
    const factor = Math.pow(1 + r, n);
    emi = (principal * r * factor) / (factor - 1);
  }

  const monthlyEmi = Math.round(emi);
  const totalRepayment = Math.round(monthlyEmi * n);
  const totalInterest = Math.max(0, totalRepayment - principal);

  return {
    principal,
    years,
    annualRatePercent,
    monthlyEmi,
    totalInterest,
    totalRepayment,
  };
}

// --------------------------------------------------------------------------
// 3. FIRE Target Corpus Calculator (4% SWR / 25x, 33x, 40x)
// --------------------------------------------------------------------------
export interface FireTargetResult {
  monthlyExpense: number;
  annualExpense: number;
  fire25x: number; // 4% SWR (Standard)
  lean33x: number; // 3% SWR (Conservative)
  fat40x: number;  // 2.5% SWR (Abundance)
}

export function calculateFireTarget(monthlyExpense: number): FireTargetResult {
  const annualExpense = monthlyExpense * 12;
  return {
    monthlyExpense,
    annualExpense,
    fire25x: annualExpense * 25,
    lean33x: annualExpense * 33,
    fat40x: annualExpense * 40,
  };
}

// --------------------------------------------------------------------------
// 4. Rule of 72 Doubling Time
// --------------------------------------------------------------------------
export interface Rule72Result {
  annualRatePercent: number;
  doublingYears: number;
}

export function calculateRule72(annualRatePercent: number): Rule72Result {
  const rate = Math.max(0.1, annualRatePercent);
  const doublingYears = parseFloat((72 / rate).toFixed(1));
  return {
    annualRatePercent,
    doublingYears,
  };
}

// --------------------------------------------------------------------------
// 5. Inflation Purchasing Power Erosion
// --------------------------------------------------------------------------
export interface InflationErosionResult {
  presentAmount: number;
  years: number;
  inflationPercent: number;
  futurePurchasingPower: number;
  erodedPercentage: number;
}

export function calculateInflationErosion(
  presentAmount: number,
  years: number,
  inflationPercent: number
): InflationErosionResult {
  const i = inflationPercent / 100;
  const factor = Math.pow(1 + i, years);
  const futurePurchasingPower = Math.round(presentAmount / factor);
  const erodedPercentage = parseFloat((((presentAmount - futurePurchasingPower) / presentAmount) * 100).toFixed(1));

  return {
    presentAmount,
    years,
    inflationPercent,
    futurePurchasingPower,
    erodedPercentage,
  };
}

// --------------------------------------------------------------------------
// 6. Macro / Power Actions
// --------------------------------------------------------------------------
export type MacroActionType =
  | { type: 'raise'; percent?: number; amount?: number; label: string }
  | { type: 'boost_sip'; percent?: number; amount?: number; label: string }
  | { type: 'cut_lifestyle'; percent?: number; amount?: number; label: string }
  | { type: 'max_80c'; label: string }
  | { type: 'max_nps'; label: string }
  | { type: 'zero_debt'; label: string };

// --------------------------------------------------------------------------
// Discriminated Union for All Parsed Omnibar Commands
// --------------------------------------------------------------------------
export type ParsedCommand =
  | { type: 'set_lever'; lever: 'salary' | 'freelance' | 'sip' | 'rent' | 'groceries' | 'utilities' | 'lifestyle' | 'cagr' | 'stepup' | 'inflation'; value: number; label: string }
  | { type: 'sip_calc'; result: SipCalculationResult }
  | { type: 'emi_calc'; result: EmiCalculationResult }
  | { type: 'fire_calc'; result: FireTargetResult }
  | { type: 'rule72_calc'; result: Rule72Result }
  | { type: 'inf_calc'; result: InflationErosionResult }
  | { type: 'macro_action'; macro: MacroActionType }
  | null;

/**
 * Universal Omnibar Query Intelligence Parser
 */
export function parseQuickCommand(query: string): ParsedCommand {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  // 1. Macro: Zero Debt / Clear Debt
  if (/^(?:zero\s*debt|clear\s*debt|wipe\s*debt|payoff\s*debt)$/i.test(q)) {
    return {
      type: 'macro_action',
      macro: {
        type: 'zero_debt',
        label: 'Zero Out Revolving Credit Card Debt',
      },
    };
  }

  // 2. Macro: Max 80C
  if (/^(?:max\s*80c|80c\s*max|full\s*80c)$/i.test(q)) {
    return {
      type: 'macro_action',
      macro: {
        type: 'max_80c',
        label: 'Maximize 80C Deductions (₹1,50,000 / yr)',
      },
    };
  }

  // 3. Macro: Max NPS
  if (/^(?:max\s*nps|nps\s*max|full\s*nps)$/i.test(q)) {
    return {
      type: 'macro_action',
      macro: {
        type: 'max_nps',
        label: 'Maximize NPS 80CCD(1B) Deductions (₹50,000 / yr)',
      },
    };
  }

  // 4. Macro: Raise / Increment
  // e.g. "raise 15%", "raise 20k", "hike 10%"
  const raiseMatch = q.match(/^(?:raise|hike|increment)\s+([0-9.a-z₹,%]+)$/i);
  if (raiseMatch) {
    const raw = raiseMatch[1];
    if (raw.endsWith('%')) {
      const pct = parseFloat(raw.replace('%', ''));
      if (!isNaN(pct) && pct > 0) {
        return {
          type: 'macro_action',
          macro: {
            type: 'raise',
            percent: pct,
            label: `Apply +${pct}% Salary Raise to Active Vault`,
          },
        };
      }
    } else {
      const amt = parseIndianAmount(raw);
      if (amt !== null && amt > 0) {
        return {
          type: 'macro_action',
          macro: {
            type: 'raise',
            amount: amt,
            label: `Add +${formatINR(amt)} Monthly Raise to Primary Salary`,
          },
        };
      }
    }
  }

  // 5. Macro: Boost SIP
  // e.g. "boost sip 20%", "boost sip 10k"
  const boostSipMatch = q.match(/^(?:boost\s*sip|increase\s*sip)\s+([0-9.a-z₹,%]+)$/i);
  if (boostSipMatch) {
    const raw = boostSipMatch[1];
    if (raw.endsWith('%')) {
      const pct = parseFloat(raw.replace('%', ''));
      if (!isNaN(pct) && pct > 0) {
        return {
          type: 'macro_action',
          macro: {
            type: 'boost_sip',
            percent: pct,
            label: `Boost Monthly SIP by +${pct}%`,
          },
        };
      }
    } else {
      const amt = parseIndianAmount(raw);
      if (amt !== null && amt > 0) {
        return {
          type: 'macro_action',
          macro: {
            type: 'boost_sip',
            amount: amt,
            label: `Add +${formatINR(amt)} to Monthly Step-Up SIP`,
          },
        };
      }
    }
  }

  // 6. Macro: Cut Lifestyle / Cut Expenses
  // e.g. "cut lifestyle 15%", "cut expenses 10%"
  const cutMatch = q.match(/^(?:cut\s*lifestyle|cut\s*expenses|trim\s*lifestyle|save\s*lifestyle)\s+([0-9.a-z₹,%]+)$/i);
  if (cutMatch) {
    const raw = cutMatch[1];
    if (raw.endsWith('%')) {
      const pct = parseFloat(raw.replace('%', ''));
      if (!isNaN(pct) && pct > 0 && pct <= 100) {
        return {
          type: 'macro_action',
          macro: {
            type: 'cut_lifestyle',
            percent: pct,
            label: `Reduce Discretionary Lifestyle by -${pct}%`,
          },
        };
      }
    } else {
      const amt = parseIndianAmount(raw);
      if (amt !== null && amt > 0) {
        return {
          type: 'macro_action',
          macro: {
            type: 'cut_lifestyle',
            amount: amt,
            label: `Trim -${formatINR(amt)} from Discretionary Lifestyle`,
          },
        };
      }
    }
  }

  // 7. FIRE Corpus Calculator:
  // e.g. "fire 50k", "fire 1.2L", "fire 75000"
  const fireMatch = q.match(/^(?:fire|corpus)\s+([0-9.a-z₹,]+)$/i);
  if (fireMatch) {
    const amt = parseIndianAmount(fireMatch[1]);
    if (amt && amt > 0) {
      return {
        type: 'fire_calc',
        result: calculateFireTarget(amt),
      };
    }
  }

  // 8. Loan EMI Calculator:
  // e.g. "emi 40L 15y 8.5%", "loan 50L 20y 9%", "emi 2500000 10y 8%"
  const emiMatch = q.match(/^(?:emi|loan|mortgage)\s+([0-9.a-z₹,]+)(?:\s+([0-9.]+)(?:y|yr|years?)?)?(?:\s+([0-9.]+)(?:%|apr)?)?$/i);
  if (emiMatch) {
    const principal = parseIndianAmount(emiMatch[1]);
    const years = parseFloat(emiMatch[2] || '20'); // default 20y
    const rate = parseFloat(emiMatch[3] || '8.5');  // default 8.5%
    if (principal && principal > 0 && !isNaN(years) && years > 0 && !isNaN(rate) && rate >= 0) {
      return {
        type: 'emi_calc',
        result: calculateLoanEmi(principal, years, rate),
      };
    }
  }

  // 9. Rule of 72 Doubling Time:
  // e.g. "double 12%", "rule72 15%", "double 14"
  const rule72Match = q.match(/^(?:double|rule72|doubling)\s+([0-9.]+)(?:%|cagr)?$/i);
  if (rule72Match) {
    const rate = parseFloat(rule72Match[1]);
    if (!isNaN(rate) && rate > 0) {
      return {
        type: 'rule72_calc',
        result: calculateRule72(rate),
      };
    }
  }

  // 10. Inflation Purchasing Power Erosion:
  // e.g. "inf 1cr 20y 6%", "inflation 50L 15y 7%"
  const infMatch = q.match(/^(?:inf|inflation|erosion)\s+([0-9.a-z₹,]+)(?:\s+([0-9.]+)(?:y|yr|years?)?)?(?:\s+([0-9.]+)(?:%)?)?$/i);
  if (infMatch) {
    const presentAmt = parseIndianAmount(infMatch[1]);
    const years = parseFloat(infMatch[2] || '20');
    const rate = parseFloat(infMatch[3] || '6');
    if (presentAmt && presentAmt > 0 && !isNaN(years) && years > 0 && !isNaN(rate) && rate >= 0) {
      return {
        type: 'inf_calc',
        result: calculateInflationErosion(presentAmt, years, rate),
      };
    }
  }

  // 11. SIP Compounding Calculator:
  // e.g. "sip 25k 10y 12%", "calc 50000 15y 14%", "sip 30k 10y"
  const sipMatch = q.match(/^(?:sip|calc|compound)\s+([0-9.a-z₹,]+)(?:\s+([0-9.]+)(?:y|yr|years?)?)?(?:\s+([0-9.]+)(?:%|cagr)?)?$/i);
  if (sipMatch) {
    const rawAmt = sipMatch[1];
    const rawYears = sipMatch[2] || '10'; // default 10 years if omitted
    const rawCagr = sipMatch[3] || '12';  // default 12% if omitted

    const monthlyAmt = parseIndianAmount(rawAmt);
    const years = parseFloat(rawYears);
    const cagr = parseFloat(rawCagr);

    if (monthlyAmt && monthlyAmt > 0 && !isNaN(years) && years > 0 && !isNaN(cagr) && cagr >= 0) {
      return {
        type: 'sip_calc',
        result: calculateSipFutureValue(monthlyAmt, years, cagr),
      };
    }
  }

  // 12. Direct Single Lever Tweak:
  // e.g. "salary 1.5L", "rent 30k", "groceries 15000", "sip 45k", "cagr 14%", "stepup 10%"
  const leverMatch = q.match(/^(salary|freelance|sip|rent|groceries|utilities|lifestyle|cagr|stepup|inflation)(?:\s*(?:=|to|:)?\s*)([0-9.a-z₹,%]+)$/i);
  if (leverMatch) {
    const leverName = leverMatch[1].toLowerCase();
    const rawVal = leverMatch[2];

    if (leverName === 'cagr' || leverName === 'stepup' || leverName === 'inflation') {
      const pctVal = parseFloat(rawVal.replace('%', ''));
      if (!isNaN(pctVal) && pctVal >= 0 && pctVal <= 100) {
        return {
          type: 'set_lever',
          lever: leverName as 'cagr' | 'stepup' | 'inflation',
          value: pctVal,
          label: `Set ${leverName.toUpperCase()} to ${pctVal}%`,
        };
      }
    } else {
      const amount = parseIndianAmount(rawVal);
      if (amount !== null && amount >= 0) {
        const readableLever = {
          salary: 'Monthly Primary Salary',
          freelance: 'Monthly Freelance Inflow',
          sip: 'Monthly Step-Up SIP',
          rent: 'Monthly Rent / Housing EMI',
          groceries: 'Monthly Groceries & Essentials',
          utilities: 'Monthly Utilities & Transit',
          lifestyle: 'Monthly Discretionary Lifestyle',
        }[leverName] || leverName;

        return {
          type: 'set_lever',
          lever: leverName as 'salary' | 'freelance' | 'sip' | 'rent' | 'groceries' | 'utilities' | 'lifestyle',
          value: amount,
          label: `Set ${readableLever} to ${formatINR(amount)}`,
        };
      }
    }
  }

  return null;
}

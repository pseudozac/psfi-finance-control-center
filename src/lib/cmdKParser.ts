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

export interface SipCalculationResult {
  monthlyInvestment: number;
  years: number;
  annualRatePercent: number;
  totalInvested: number;
  futureValue: number;
  wealthGain: number;
}

/**
 * Calculates Future Value of monthly compounding SIP:
 * FV = P * [((1 + r)^n - 1) / r] * (1 + r)
 */
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

export type ParsedCommand =
  | { type: 'set_lever'; lever: 'salary' | 'freelance' | 'sip' | 'rent' | 'groceries' | 'utilities' | 'lifestyle' | 'cagr' | 'stepup' | 'inflation'; value: number; label: string }
  | { type: 'sip_calc'; result: SipCalculationResult }
  | null;

/**
 * Detects whether the user query is a quick lever command or a SIP calculation
 */
export function parseQuickCommand(query: string): ParsedCommand {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  // 1. Check for SIP calculator pattern:
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

  // 2. Check for lever adjustment:
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

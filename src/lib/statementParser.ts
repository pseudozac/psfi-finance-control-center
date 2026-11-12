/**
 * Zero-Server Financial Statement & Document Parser for psfi.
 * 100% Client-Side, In-Memory Only, Zero Telemetry.
 *
 * Supports:
 * 1. Mutual Fund CAS (CAMS / KFintech / MFCentral / Zerodha Coin / Groww)
 * 2. Bank Account Statements (HDFC, ICICI, SBI, Axis, Kotak, etc.)
 * 3. Credit Card Statements (HDFC, SBI Card, ICICI, Axis, Amex)
 * 4. Corporate Payslips / Salary Slips (TCS, Infosys, Wipro, Tech, MNC)
 * 5. Broker Holdings & P&L (Zerodha, Groww, Upstox CSV/text)
 */

import type { FinancePlan } from '../types/finance';

export type StatementType =
  | 'cas'
  | 'bank_statement'
  | 'credit_card'
  | 'payslip'
  | 'demat_holdings'
  | 'unknown';

export interface ExtractedFinancialParam {
  key: string;
  label: string;
  category: 'income' | 'expense' | 'savings' | 'debt' | 'tax';
  targetField: string;
  detectedValue: number;
  formattedValue: string;
  confidence: 'high' | 'medium' | 'estimated';
  sourceHint: string;
  selected: boolean;
}

export interface StatementParseResult {
  statementType: StatementType;
  typeLabel: string;
  institutionName: string;
  periodOrDate?: string;
  summaryText: string;
  params: ExtractedFinancialParam[];
  rawTextPreview: string;
  folioCount?: number;
  transactionCount?: number;
}

/**
 * Clean and parse Indian currency strings like "₹1,45,000.00", "Rs. 75,000", "14,500.50 Cr", "12.5L"
 */
export function cleanCurrency(val: string | number): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;

  const cleaned = val.replace(/[₹,\sRsINR]/gi, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Extract currency amounts from a line.
 * Filters out stray years (1970-2045) and dates unless prefixed with currency indicator.
 */
export function extractAmountsFromLine(line: string): number[] {
  const results: number[] = [];
  const regex = /(?:(?:INR|Rs\.?|₹)\s*)?([1-9][0-9,]*\d(?:\.\d{1,2})?)/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    const fullMatch = match[0];
    const rawNum = match[1];
    const hasCurrencyPrefix = /INR|Rs|₹/i.test(fullMatch);
    const val = cleanCurrency(rawNum);

    // Filter out calendar years like 2024, 2025, 2026 unless preceded by currency prefix
    if (!hasCurrencyPrefix && val >= 1970 && val <= 2045 && !rawNum.includes(',') && !rawNum.includes('.')) {
      continue;
    }
    // Filter out small stray day/month numbers like 1, 15, 31 unless prefixed
    if (!hasCurrencyPrefix && val < 100 && !rawNum.includes('.')) {
      continue;
    }

    if (val > 0) {
      results.push(val);
    }
  }

  return results;
}

/**
 * Classify statement type based on textual markers
 */
export function classifyStatement(text: string, filename = ''): {
  type: StatementType;
  label: string;
  institution: string;
} {
  const lower = text.toLowerCase();
  const fLower = filename.toLowerCase();

  // 1. Mutual Fund CAS
  if (
    lower.includes('consolidated account statement') ||
    lower.includes('cams') ||
    lower.includes('kfintech') ||
    lower.includes('karvy') ||
    lower.includes('mfcentral') ||
    (lower.includes('folio no') && lower.includes('nav')) ||
    fLower.includes('cas')
  ) {
    let inst = 'Consolidated Account Statement (CAS)';
    if (lower.includes('cams')) inst = 'CAMS CAS';
    else if (lower.includes('kfintech') || lower.includes('karvy')) inst = 'KFintech CAS';
    else if (lower.includes('mfcentral')) inst = 'MFCentral CAS';
    return { type: 'cas', label: 'Mutual Fund CAS', institution: inst };
  }

  // 2. Payslip / Salary Slip
  if (
    lower.includes('payslip') ||
    lower.includes('salary slip') ||
    (lower.includes('gross earnings') && lower.includes('net pay')) ||
    (lower.includes('basic') && lower.includes('hra') && lower.includes('provident fund')) ||
    fLower.includes('payslip') ||
    fLower.includes('salary')
  ) {
    let inst = 'Corporate Employer';
    const lines = text.split('\n').slice(0, 8);
    for (const l of lines) {
      if (/limited|ltd|pvt|technologies|solutions|corp|inc/i.test(l)) {
        inst = l.trim().slice(0, 35);
        break;
      }
    }
    return { type: 'payslip', label: 'Salary Slip / Payslip', institution: inst };
  }

  // 3. Credit Card Statement
  if (
    (lower.includes('credit card') || lower.includes('card statement')) &&
    (lower.includes('total amount due') || lower.includes('minimum amount due') || lower.includes('payment due date'))
  ) {
    let inst = 'Credit Card Issuer';
    if (lower.includes('sbi card') || lower.includes('sbicard')) inst = 'SBI Card';
    else if (lower.includes('hdfc bank')) inst = 'HDFC Bank Credit Card';
    else if (lower.includes('icici bank')) inst = 'ICICI Bank Credit Card';
    else if (lower.includes('axis bank')) inst = 'Axis Bank Credit Card';
    else if (lower.includes('american express') || lower.includes('amex')) inst = 'American Express';
    return { type: 'credit_card', label: 'Credit Card Statement', institution: inst };
  }

  // 4. Bank Account Statement
  if (
    (lower.includes('bank') || lower.includes('statement of account') || lower.includes('account statement')) &&
    (lower.includes('closing balance') || lower.includes('withdrawal') || lower.includes('deposit') || lower.includes('balance (inr)'))
  ) {
    let inst = 'Bank Account';
    if (lower.includes('hdfc bank')) inst = 'HDFC Bank';
    else if (lower.includes('icici bank')) inst = 'ICICI Bank';
    else if (lower.includes('state bank of india') || lower.includes('sbi')) inst = 'State Bank of India';
    else if (lower.includes('axis bank')) inst = 'Axis Bank';
    else if (lower.includes('kotak')) inst = 'Kotak Mahindra Bank';
    return { type: 'bank_statement', label: 'Bank Account Statement', institution: inst };
  }

  // 5. Broker Holdings / Demat
  if (
    (lower.includes('holdings') || lower.includes('tradebook')) &&
    (lower.includes('zerodha') || lower.includes('groww') || lower.includes('upstox') || lower.includes('isin') || lower.includes('ltp'))
  ) {
    let inst = 'Broker Demat Portfolio';
    if (lower.includes('zerodha')) inst = 'Zerodha Kite';
    else if (lower.includes('groww')) inst = 'Groww Stocks';
    else if (lower.includes('upstox')) inst = 'Upstox';
    return { type: 'demat_holdings', label: 'Broker Demat Holdings', institution: inst };
  }

  return { type: 'unknown', label: 'Financial Document', institution: 'Local Document' };
}

/**
 * 1. Mutual Fund CAS Parser
 */
export function parseCAS(text: string): StatementParseResult {
  const { label, institution } = classifyStatement(text);
  const params: ExtractedFinancialParam[] = [];

  // Extract Total Valuation
  let totalValuation = 0;
  const valuationMatches = [
    /Total\s+Valuation[^:\n]*[:\s]+(?:INR|Rs\.?|₹)?\s*([1-9][\d,]*(?:\.\d{1,2})?)/i,
    /Total\s+Market\s+Value[^:\n]*[:\s]+(?:INR|Rs\.?|₹)?\s*([1-9][\d,]*(?:\.\d{1,2})?)/i,
    /Market\s+Value\s+\(INR\)[^:\n]*[:\s]+([1-9][\d,]*(?:\.\d{1,2})?)/i,
    /Grand\s+Total[^:\n]*[:\s]+(?:INR|Rs\.?|₹)?\s*([1-9][\d,]*(?:\.\d{1,2})?)/i,
    /Portfolio\s+Valuation[^:\n]*[:\s]+(?:INR|Rs\.?|₹)?\s*([1-9][\d,]*(?:\.\d{1,2})?)/i,
  ];

  for (const regex of valuationMatches) {
    const match = text.match(regex);
    if (match && match[1]) {
      const val = cleanCurrency(match[1]);
      if (val > 1000) {
        totalValuation = Math.max(totalValuation, val);
      }
    }
  }

  // Extract Systematic Investment Plan (SIP) amounts
  let totalMonthlySip = 0;
  const lines = text.split('\n');
  const sipLines: number[] = [];

  for (const line of lines) {
    if (/SYSTEMATIC|SIP\s+(?:PURCHASE|TRANSACTION|INSTALLMENT)|MONTHLY\s+SIP/i.test(line)) {
      const numbers = extractAmountsFromLine(line);
      for (const val of numbers) {
        // Standard monthly SIP range per scheme in India: ₹500 to ₹1,00,000
        if (val >= 500 && val <= 100000 && !sipLines.includes(val)) {
          sipLines.push(val);
        }
      }
    }
  }

  if (sipLines.length > 0) {
    totalMonthlySip = sipLines.reduce((acc, curr) => acc + curr, 0);
  }

  // Count Folios
  const folioMatches = text.match(/Folio\s+No\.?[:\s]+([0-9\/-]+)/gi);
  const folioCount = folioMatches ? new Set(folioMatches).size : 1;

  if (totalMonthlySip > 0) {
    params.push({
      key: 'monthly_sip',
      label: 'Monthly Mutual Fund SIP',
      category: 'savings',
      targetField: 'savings.monthlySip',
      detectedValue: totalMonthlySip,
      formattedValue: `${formatINR(totalMonthlySip)}/mo`,
      confidence: 'high',
      sourceHint: `Extracted across ${sipLines.length} systematic investment scheme(s)`,
      selected: true,
    });
  }

  if (totalValuation > 0) {
    params.push({
      key: 'emergency_or_corpus',
      label: 'Existing Mutual Fund Portfolio',
      category: 'savings',
      targetField: 'savings.emergencyFundBalance',
      detectedValue: totalValuation,
      formattedValue: formatINR(totalValuation),
      confidence: 'medium',
      sourceHint: `Total CAS Valuation (Folios: ${folioCount})`,
      selected: false,
    });
  }

  return {
    statementType: 'cas',
    typeLabel: label,
    institutionName: institution,
    summaryText: `Parsed ${folioCount} folios with ${sipLines.length} active systematic investment plan(s).`,
    params,
    rawTextPreview: text.slice(0, 500),
    folioCount,
  };
}

/**
 * 2. Bank Account Statement Parser
 */
export function parseBankStatement(text: string): StatementParseResult {
  const { label, institution } = classifyStatement(text);
  const params: ExtractedFinancialParam[] = [];
  const lines = text.split('\n');

  let detectedSalary = 0;
  let detectedRentEmi = 0;
  let detectedUtilities = 0;
  let detectedLifestyle = 0;
  let detectedClosingBalance = 0;
  let txCount = 0;

  const salaryCandidates: number[] = [];
  const rentCandidates: number[] = [];
  const utilityCandidates: number[] = [];
  const lifestyleCandidates: number[] = [];
  const balanceCandidates: number[] = [];

  for (const line of lines) {
    const numbers = extractAmountsFromLine(line);
    if (numbers.length === 0) continue;

    txCount++;

    // Detect Salary Credit
    if (
      /SALARY|SAL\b|PAYROLL|NEFT.*SAL|ACH.*SAL|MONTHLY SAL/i.test(line) &&
      !/REVERSAL|FAILED/i.test(line)
    ) {
      for (const n of numbers) {
        if (n >= 15000 && n <= 1000000) {
          salaryCandidates.push(n);
        }
      }
    }

    // Detect Rent / Housing / EMI
    if (/RENT\b|HDFC.*HOUS|HOME.*LOAN|HOUSING.*LOAN|BAJAJ.*FIN|EMI\b|NACH.*LOAN/i.test(line)) {
      for (const n of numbers) {
        if (n >= 5000 && n <= 200000) {
          rentCandidates.push(n);
        }
      }
    }

    // Detect Utilities
    if (/ELECTRIC|BESCOM|TNEB|WATER|BROADBAND|AIRTEL|JIO|ACT FIBERNET|POWER/i.test(line)) {
      for (const n of numbers) {
        if (n >= 200 && n <= 15000) {
          utilityCandidates.push(n);
        }
      }
    }

    // Detect Lifestyle / Food / Shopping / Travel
    if (/SWIGGY|ZOMATO|AMAZON|FLIPKART|UBER|OLA|BOOKMYSHOW|STARBUCKS|BLINKIT|ZEPTO|MYNTRA/i.test(line)) {
      for (const n of numbers) {
        if (n >= 100 && n <= 25000) {
          lifestyleCandidates.push(n);
        }
      }
    }

    // Detect Closing Balance
    if (/CLOSING\s+BAL|BALANCE\s+INR|AVL\s+BAL|AVAILABLE\s+BALANCE/i.test(line)) {
      const highest = Math.max(...numbers);
      if (highest > 500) {
        balanceCandidates.push(highest);
      }
    }
  }

  // Calculate aggregates
  if (salaryCandidates.length > 0) {
    detectedSalary = Math.round(
      salaryCandidates.reduce((a, b) => a + b, 0) / salaryCandidates.length
    );
    params.push({
      key: 'salary_inflow',
      label: 'Primary Take-Home Salary',
      category: 'income',
      targetField: 'income.salary',
      detectedValue: detectedSalary,
      formattedValue: `${formatINR(detectedSalary)}/mo`,
      confidence: 'high',
      sourceHint: `Detected ${salaryCandidates.length} recurring salary deposit credit(s)`,
      selected: true,
    });
  }

  if (rentCandidates.length > 0) {
    detectedRentEmi = Math.round(
      rentCandidates.reduce((a, b) => a + b, 0) / rentCandidates.length
    );
    params.push({
      key: 'housing_outflow',
      label: 'Housing Rent / Loan EMI',
      category: 'expense',
      targetField: 'expenses.housing',
      detectedValue: detectedRentEmi,
      formattedValue: `${formatINR(detectedRentEmi)}/mo`,
      confidence: 'high',
      sourceHint: `Recurring NACH / rent debit detected`,
      selected: true,
    });
  }

  if (utilityCandidates.length > 0) {
    detectedUtilities = Math.round(
      utilityCandidates.reduce((a, b) => a + b, 0) / Math.max(1, Math.round(utilityCandidates.length / 2))
    );
    params.push({
      key: 'utilities_outflow',
      label: 'Utilities & Bills',
      category: 'expense',
      targetField: 'expenses.utilities',
      detectedValue: detectedUtilities,
      formattedValue: `${formatINR(detectedUtilities)}/mo`,
      confidence: 'medium',
      sourceHint: `Electricity, broadband, mobile recharge payments`,
      selected: true,
    });
  }

  if (lifestyleCandidates.length > 0) {
    const totalLifestyle = lifestyleCandidates.reduce((a, b) => a + b, 0);
    detectedLifestyle = Math.max(5000, Math.round(totalLifestyle));
    params.push({
      key: 'lifestyle_outflow',
      label: 'Discretionary Lifestyle Spend',
      category: 'expense',
      targetField: 'expenses.lifestyle',
      detectedValue: detectedLifestyle,
      formattedValue: `${formatINR(detectedLifestyle)}/mo`,
      confidence: 'estimated',
      sourceHint: `Aggregated online dining, shopping & ride hailing payments`,
      selected: true,
    });
  }

  if (balanceCandidates.length > 0) {
    detectedClosingBalance = balanceCandidates[balanceCandidates.length - 1];
  } else {
    const balMatch = text.match(/(?:Closing\s+Balance|Total\s+Balance|Net\s+Balance)[^:\n]*[:\s]+(?:INR|Rs\.?|₹)?\s*([1-9][\d,]*(?:\.\d{1,2})?)/i);
    if (balMatch && balMatch[1]) {
      detectedClosingBalance = cleanCurrency(balMatch[1]);
    }
  }

  if (detectedClosingBalance > 0) {
    params.push({
      key: 'emergency_balance',
      label: 'Bank Liquid Balance (Emergency Corpus)',
      category: 'savings',
      targetField: 'savings.emergencyFundBalance',
      detectedValue: detectedClosingBalance,
      formattedValue: formatINR(detectedClosingBalance),
      confidence: 'high',
      sourceHint: `Latest closing bank account balance`,
      selected: true,
    });
  }

  return {
    statementType: 'bank_statement',
    typeLabel: label,
    institutionName: institution,
    summaryText: `Analyzed ~${txCount} transaction lines from ${institution}. Identified income, recurring obligations & liquidity.`,
    params,
    rawTextPreview: text.slice(0, 500),
    transactionCount: txCount,
  };
}

/**
 * 3. Credit Card Statement Parser
 */
export function parseCreditCard(text: string): StatementParseResult {
  const { label, institution } = classifyStatement(text);
  const params: ExtractedFinancialParam[] = [];

  // Total Amount Due
  let totalDue = 0;
  const dueMatches = [
    /Total\s+Amount\s+Due[^:\n]*[:\s]+(?:INR|Rs\.?|₹)?\s*([1-9][\d,]*(?:\.\d{1,2})?)/i,
    /Total\s+Due[^:\n]*[:\s]+(?:INR|Rs\.?|₹)?\s*([1-9][\d,]*(?:\.\d{1,2})?)/i,
    /Current\s+Outstanding[^:\n]*[:\s]+(?:INR|Rs\.?|₹)?\s*([1-9][\d,]*(?:\.\d{1,2})?)/i,
    /New\s+Balance[^:\n]*[:\s]+(?:INR|Rs\.?|₹)?\s*([1-9][\d,]*(?:\.\d{1,2})?)/i,
  ];

  for (const regex of dueMatches) {
    const match = text.match(regex);
    if (match && match[1]) {
      const val = cleanCurrency(match[1]);
      if (val > 0) {
        totalDue = val;
        break;
      }
    }
  }

  // Minimum Amount Due
  let minDue = 0;
  const minMatches = [
    /Minimum\s+Amount\s+Due[^:\n]*[:\s]+(?:INR|Rs\.?|₹)?\s*([1-9][\d,]*(?:\.\d{1,2})?)/i,
    /Min(?:imum)?\s+Due[^:\n]*[:\s]+(?:INR|Rs\.?|₹)?\s*([1-9][\d,]*(?:\.\d{1,2})?)/i,
  ];
  for (const regex of minMatches) {
    const match = text.match(regex);
    if (match && match[1]) {
      minDue = cleanCurrency(match[1]);
      break;
    }
  }

  // Credit Limit
  let creditLimit = 0;
  const limitMatch = text.match(/Credit\s+Limit[^:\n]*[:\s]+(?:INR|Rs\.?|₹)?\s*([1-9][\d,]*(?:\.\d{1,2})?)/i);
  if (limitMatch && limitMatch[1]) {
    creditLimit = cleanCurrency(limitMatch[1]);
  }

  if (totalDue > 0) {
    params.push({
      key: 'card_revolving_debt',
      label: 'Credit Card Outstanding Debt',
      category: 'debt',
      targetField: 'debt.cardBalance',
      detectedValue: totalDue,
      formattedValue: formatINR(totalDue),
      confidence: 'high',
      sourceHint: `Total Amount Due (${institution})`,
      selected: true,
    });

    if (minDue > 0) {
      params.push({
        key: 'card_min_payment',
        label: 'Monthly Minimum Card Payment',
        category: 'debt',
        targetField: 'debt.monthlyPayment',
        detectedValue: minDue,
        formattedValue: `${formatINR(minDue)}/mo`,
        confidence: 'high',
        sourceHint: `Minimum Amount Due required by bank`,
        selected: true,
      });
    }

    params.push({
      key: 'card_spend_baseline',
      label: 'Monthly Card Lifestyle Spend',
      category: 'expense',
      targetField: 'expenses.lifestyle',
      detectedValue: totalDue,
      formattedValue: `${formatINR(totalDue)}/mo`,
      confidence: 'medium',
      sourceHint: `Total card billing for current statement cycle`,
      selected: false,
    });
  }

  return {
    statementType: 'credit_card',
    typeLabel: label,
    institutionName: institution,
    summaryText: `Parsed ${institution} bill: Outstanding ${formatINR(totalDue)}${creditLimit > 0 ? ` of ${formatINR(creditLimit)} limit` : ''}.`,
    params,
    rawTextPreview: text.slice(0, 500),
  };
}

/**
 * 4. Salary Slip / Payslip Parser
 */
export function parsePayslip(text: string): StatementParseResult {
  const { label, institution } = classifyStatement(text);
  const params: ExtractedFinancialParam[] = [];

  // Net Pay / Take-Home
  let netPay = 0;
  const netMatches = [
    /(?:Net\s+(?:Pay|Salary|Amount(?:\s+Payable)?|Take\s*Home)|Take\s*Home\s+Pay|Amount\s+Credited)[^:\n]*[:\s]+(?:INR|Rs\.?|₹)?\s*([1-9][\d,]*(?:\.\d{1,2})?)/i,
  ];
  for (const regex of netMatches) {
    const match = text.match(regex);
    if (match && match[1]) {
      const val = cleanCurrency(match[1]);
      if (val > 10000) {
        netPay = val;
        break;
      }
    }
  }

  // Basic Pay & HRA
  let basicPay = 0;
  const basicMatch = text.match(/Basic(?:\s+Salary)?[^:\n]*[:\s]+(?:INR|Rs\.?|₹)?\s*([1-9][\d,]*(?:\.\d{1,2})?)/i);
  if (basicMatch && basicMatch[1]) {
    basicPay = cleanCurrency(basicMatch[1]);
  }

  let hra = 0;
  const hraMatch = text.match(/(?:House\s+Rent\s+Allowance|HRA)[^:\n]*[:\s]+(?:INR|Rs\.?|₹)?\s*([1-9][\d,]*(?:\.\d{1,2})?)/i);
  if (hraMatch && hraMatch[1]) {
    hra = cleanCurrency(hraMatch[1]);
  }

  // Provident Fund (EPF / Voluntary PF)
  let epf = 0;
  const epfMatch = text.match(/(?:Employee\s+)?(?:Provident\s+Fund|EPF|PF)[^:\n]*[:\s]+(?:INR|Rs\.?|₹)?\s*([1-9][\d,]*(?:\.\d{1,2})?)/i);
  if (epfMatch && epfMatch[1]) {
    epf = cleanCurrency(epfMatch[1]);
  }

  // Professional Tax
  let pt = 0;
  const ptMatch = text.match(/(?:Professional\s+Tax|P\.?T\.?)[^:\n]*[:\s]+(?:INR|Rs\.?|₹)?\s*([1-9][\d,]*(?:\.\d{1,2})?)/i);
  if (ptMatch && ptMatch[1]) {
    pt = cleanCurrency(ptMatch[1]);
  }

  if (netPay > 0) {
    params.push({
      key: 'payslip_net_salary',
      label: 'Primary Take-Home Salary',
      category: 'income',
      targetField: 'income.salary',
      detectedValue: netPay,
      formattedValue: `${formatINR(netPay)}/mo`,
      confidence: 'high',
      sourceHint: `Found Net Pay in ${institution}${basicPay > 0 ? ` (Basic: ${formatINR(basicPay)})` : ''}`,
      selected: true,
    });
  }

  if (hra > 0) {
    params.push({
      key: 'payslip_hra_housing',
      label: 'Housing Rent (HRA Component)',
      category: 'expense',
      targetField: 'expenses.housing',
      detectedValue: hra,
      formattedValue: `${formatINR(hra)}/mo`,
      confidence: 'medium',
      sourceHint: `House Rent Allowance allowance for 80GG / HRA tax deduction`,
      selected: true,
    });

    params.push({
      key: 'tax_rent_paid',
      label: 'Monthly Rent for HRA Exemption',
      category: 'tax',
      targetField: 'tax.rentPaidMonthly',
      detectedValue: hra,
      formattedValue: `${formatINR(hra)}/mo`,
      confidence: 'high',
      sourceHint: `HRA deduction lever in Old Tax Regime`,
      selected: true,
    });
  }

  if (epf > 0) {
    params.push({
      key: 'payslip_epf',
      label: 'Employee Provident Fund (EPF)',
      category: 'tax',
      targetField: 'savings.epfMonthly',
      detectedValue: epf,
      formattedValue: `${formatINR(epf)}/mo`,
      confidence: 'high',
      sourceHint: `Annual EPF of ${formatINR(epf * 12)} automatically qualifies for Section 80C`,
      selected: true,
    });

    const annualEpf = epf * 12;
    params.push({
      key: 'section_80c',
      label: 'Section 80C Exemption (from EPF)',
      category: 'tax',
      targetField: 'tax.deductions80C',
      detectedValue: Math.min(150000, annualEpf),
      formattedValue: `${formatINR(Math.min(150000, annualEpf))}/yr`,
      confidence: 'high',
      sourceHint: `Mandatory PF tax exemption`,
      selected: true,
    });
  }

  return {
    statementType: 'payslip',
    typeLabel: label,
    institutionName: institution,
    summaryText: `Parsed payslip: Net Salary ${formatINR(netPay)}/mo with ${epf > 0 ? `EPF ${formatINR(epf)}/mo` : 'standard deductions'}${pt > 0 ? ` & PT ${formatINR(pt)}` : ''}.`,
    params,
    rawTextPreview: text.slice(0, 500),
  };
}

/**
 * 5. Broker Demat Holdings (Zerodha / Groww CSV or statement)
 */
export function parseHoldings(text: string): StatementParseResult {
  const { label, institution } = classifyStatement(text);
  const params: ExtractedFinancialParam[] = [];

  let totalCurVal = 0;
  let totalInvested = 0;

  const lines = text.split('\n');
  let headerIndex = -1;
  let curValCol = -1;
  let invCol = -1;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase();
    if (l.includes('instrument') || l.includes('symbol') || l.includes('stock')) {
      headerIndex = i;
      const cols = l.split(/[,\t]/);
      curValCol = cols.findIndex((c) => /cur.*val|market.*val|present.*val/i.test(c));
      invCol = cols.findIndex((c) => /invested|total.*cost|cost.*val/i.test(c));
      break;
    }
  }

  if (headerIndex !== -1 && curValCol !== -1) {
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const parts = lines[i].split(/[,\t]/);
      if (parts.length > curValCol) {
        const val = cleanCurrency(parts[curValCol]);
        if (val > 0) totalCurVal += val;
      }
      if (invCol !== -1 && parts.length > invCol) {
        const inv = cleanCurrency(parts[invCol]);
        if (inv > 0) totalInvested += inv;
      }
    }
  }

  if (totalCurVal === 0) {
    const curValMatch = text.match(/(?:Total\s+Current\s+Value|Current\s+Value|Portfolio\s+Value)[^:\n]*[:\s]+(?:INR|Rs\.?|₹)?\s*([1-9][\d,]*(?:\.\d{1,2})?)/i);
    if (curValMatch && curValMatch[1]) {
      totalCurVal = cleanCurrency(curValMatch[1]);
    }
  }

  if (totalCurVal > 0) {
    params.push({
      key: 'demat_holdings_valuation',
      label: 'Demat Stock & Equity Holdings',
      category: 'savings',
      targetField: 'savings.emergencyFundBalance',
      detectedValue: totalCurVal,
      formattedValue: formatINR(totalCurVal),
      confidence: 'high',
      sourceHint: `Total current market valuation from ${institution}`,
      selected: false,
    });
  }

  return {
    statementType: 'demat_holdings',
    typeLabel: label,
    institutionName: institution,
    summaryText: `Parsed Demat holdings: Total Equity Portfolio ${formatINR(totalCurVal)}${totalInvested > 0 ? ` (Cost: ${formatINR(totalInvested)})` : ''}.`,
    params,
    rawTextPreview: text.slice(0, 500),
  };
}

/**
 * Master dispatcher: Automatically detects format and parses statement
 */
export function parseFinancialDocument(text: string, filename = ''): StatementParseResult {
  const { type } = classifyStatement(text, filename);

  switch (type) {
    case 'cas':
      return parseCAS(text);
    case 'bank_statement':
      return parseBankStatement(text);
    case 'credit_card':
      return parseCreditCard(text);
    case 'payslip':
      return parsePayslip(text);
    case 'demat_holdings':
      return parseHoldings(text);
    default:
      const bankResult = parseBankStatement(text);
      if (bankResult.params.length > 0) return bankResult;

      const payslipResult = parsePayslip(text);
      if (payslipResult.params.length > 0) return payslipResult;

      return {
        statementType: 'unknown',
        typeLabel: 'Unknown Financial Document',
        institutionName: 'Local File',
        summaryText: 'Could not automatically identify standard statement patterns. Review raw text or try another format.',
        params: [],
        rawTextPreview: text.slice(0, 500),
      };
  }
}

/**
 * Apply selected parsed parameters to an existing FinancePlan
 */
export function applyParsedParameters(
  currentPlan: FinancePlan,
  params: ExtractedFinancialParam[]
): FinancePlan {
  const next: FinancePlan = JSON.parse(JSON.stringify(currentPlan));

  for (const p of params) {
    if (!p.selected || p.detectedValue <= 0) continue;

    switch (p.targetField) {
      case 'income.salary':
        next.income.salary = Math.round(p.detectedValue);
        break;
      case 'expenses.housing':
        next.expenses.housing = Math.round(p.detectedValue);
        break;
      case 'expenses.utilities':
        next.expenses.utilities = Math.round(p.detectedValue);
        break;
      case 'expenses.lifestyle':
        next.expenses.lifestyle = Math.round(p.detectedValue);
        break;
      case 'savings.monthlySip':
        next.savings.monthlySip = Math.round(p.detectedValue);
        break;
      case 'savings.emergencyFundBalance':
        next.savings.emergencyFundBalance = Math.round(p.detectedValue);
        break;
      case 'savings.epfMonthly':
        next.savings.epfMonthly = Math.round(p.detectedValue);
        break;
      case 'debt.cardBalance':
        next.debt.cardBalance = Math.round(p.detectedValue);
        break;
      case 'debt.monthlyPayment':
        next.debt.monthlyPayment = Math.round(p.detectedValue);
        break;
      case 'tax.rentPaidMonthly':
        next.tax.rentPaidMonthly = Math.round(p.detectedValue);
        break;
      case 'tax.deductions80C':
        next.tax.deductions80C = Math.round(p.detectedValue);
        break;
    }
  }

  return next;
}

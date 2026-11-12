import { describe, it, expect } from 'vitest';
import { parseIndianAmount, calculateSipFutureValue, parseQuickCommand } from './cmdKParser';

describe('parseIndianAmount', () => {
  it('parses plain numbers correctly', () => {
    expect(parseIndianAmount('50000')).toBe(50000);
    expect(parseIndianAmount('₹1,40,000')).toBe(140000);
  });

  it('parses k (thousand) correctly', () => {
    expect(parseIndianAmount('25k')).toBe(25000);
    expect(parseIndianAmount('40 thousand')).toBe(40000);
  });

  it('parses L / Lakh correctly', () => {
    expect(parseIndianAmount('1.5L')).toBe(150000);
    expect(parseIndianAmount('2.05lakh')).toBe(205000);
    expect(parseIndianAmount('3lac')).toBe(300000);
  });

  it('parses Cr / Crore correctly', () => {
    expect(parseIndianAmount('1cr')).toBe(10000000);
    expect(parseIndianAmount('2.5crore')).toBe(25000000);
  });

  it('handles invalid inputs gracefully', () => {
    expect(parseIndianAmount('')).toBeNull();
    expect(parseIndianAmount('abc')).toBeNull();
  });
});

describe('calculateSipFutureValue', () => {
  it('calculates future value accurately for 10 years @ 12%', () => {
    // 25,000 / mo for 10 years @ 12%
    const res = calculateSipFutureValue(25000, 10, 12);
    expect(res.monthlyInvestment).toBe(25000);
    expect(res.years).toBe(10);
    expect(res.totalInvested).toBe(3000000); // 25,000 * 120 = 30L
    // Future value should be approx ~58.08 Lakhs
    expect(res.futureValue).toBeGreaterThan(5700000);
    expect(res.futureValue).toBeLessThan(5900000);
    expect(res.wealthGain).toBe(res.futureValue - res.totalInvested);
  });
});

describe('parseQuickCommand', () => {
  it('parses lever setting commands', () => {
    const salaryCmd = parseQuickCommand('salary 1.8L');
    expect(salaryCmd).not.toBeNull();
    if (salaryCmd?.type === 'set_lever') {
      expect(salaryCmd.lever).toBe('salary');
      expect(salaryCmd.value).toBe(180000);
    }

    const sipCmd = parseQuickCommand('sip 40k');
    expect(sipCmd).not.toBeNull();
    if (sipCmd?.type === 'set_lever') {
      expect(sipCmd.lever).toBe('sip');
      expect(sipCmd.value).toBe(40000);
    }

    const cagrCmd = parseQuickCommand('cagr 14%');
    expect(cagrCmd).not.toBeNull();
    if (cagrCmd?.type === 'set_lever') {
      expect(cagrCmd.lever).toBe('cagr');
      expect(cagrCmd.value).toBe(14);
    }
  });

  it('parses compound SIP calculations', () => {
    const calcCmd = parseQuickCommand('sip 30k 15y 12%');
    expect(calcCmd).not.toBeNull();
    if (calcCmd?.type === 'sip_calc') {
      expect(calcCmd.result.monthlyInvestment).toBe(30000);
      expect(calcCmd.result.years).toBe(15);
      expect(calcCmd.result.annualRatePercent).toBe(12);
      expect(calcCmd.result.futureValue).toBeGreaterThan(15000000); // > 1.5 Cr
    }
  });
});

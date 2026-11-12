import { describe, it, expect } from 'vitest';
import {
  parseIndianAmount,
  calculateSipFutureValue,
  calculateLoanEmi,
  calculateFireTarget,
  calculateRule72,
  calculateInflationErosion,
  parseQuickCommand,
} from './cmdKParser';

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
    const res = calculateSipFutureValue(25000, 10, 12);
    expect(res.monthlyInvestment).toBe(25000);
    expect(res.years).toBe(10);
    expect(res.totalInvested).toBe(3000000);
    expect(res.futureValue).toBeGreaterThan(5700000);
    expect(res.futureValue).toBeLessThan(5900000);
    expect(res.wealthGain).toBe(res.futureValue - res.totalInvested);
  });
});

describe('calculateLoanEmi', () => {
  it('calculates standard home loan EMI accurately', () => {
    // 50 Lakhs for 20 years @ 8.5%
    const res = calculateLoanEmi(5000000, 20, 8.5);
    expect(res.principal).toBe(5000000);
    expect(res.years).toBe(20);
    // EMI should be around ₹43,391
    expect(res.monthlyEmi).toBeGreaterThan(43000);
    expect(res.monthlyEmi).toBeLessThan(44000);
    expect(res.totalRepayment).toBeGreaterThan(10000000); // > 1 Crore total
    expect(res.totalInterest).toBe(res.totalRepayment - res.principal);
  });
});

describe('calculateFireTarget', () => {
  it('calculates 25x, 33x, and 40x FIRE targets', () => {
    const res = calculateFireTarget(60000); // 60k / mo = 7.2L / yr
    expect(res.monthlyExpense).toBe(60000);
    expect(res.annualExpense).toBe(720000);
    expect(res.fire25x).toBe(720000 * 25); // 1.80 Cr
    expect(res.lean33x).toBe(720000 * 33); // 2.376 Cr
    expect(res.fat40x).toBe(720000 * 40);  // 2.88 Cr
  });
});

describe('calculateRule72', () => {
  it('calculates doubling years correctly', () => {
    expect(calculateRule72(12).doublingYears).toBe(6.0);
    expect(calculateRule72(15).doublingYears).toBe(4.8);
    expect(calculateRule72(8).doublingYears).toBe(9.0);
  });
});

describe('calculateInflationErosion', () => {
  it('calculates purchasing power erosion over 20 years @ 6%', () => {
    const res = calculateInflationErosion(10000000, 20, 6);
    expect(res.presentAmount).toBe(10000000);
    // Future purchasing power should be ~31.18 Lakhs
    expect(res.futurePurchasingPower).toBeGreaterThan(3100000);
    expect(res.futurePurchasingPower).toBeLessThan(3200000);
    expect(res.erodedPercentage).toBeGreaterThan(68);
  });
});

describe('parseQuickCommand Advanced Capabilities', () => {
  it('parses loan EMI commands', () => {
    const cmd = parseQuickCommand('emi 50L 20y 8.5%');
    expect(cmd).not.toBeNull();
    if (cmd?.type === 'emi_calc') {
      expect(cmd.result.principal).toBe(5000000);
      expect(cmd.result.years).toBe(20);
      expect(cmd.result.annualRatePercent).toBe(8.5);
    }
  });

  it('parses FIRE corpus commands', () => {
    const cmd = parseQuickCommand('fire 80k');
    expect(cmd).not.toBeNull();
    if (cmd?.type === 'fire_calc') {
      expect(cmd.result.monthlyExpense).toBe(80000);
      expect(cmd.result.fire25x).toBe(80000 * 12 * 25);
    }
  });

  it('parses Rule of 72 commands', () => {
    const cmd = parseQuickCommand('double 12%');
    expect(cmd).not.toBeNull();
    if (cmd?.type === 'rule72_calc') {
      expect(cmd.result.annualRatePercent).toBe(12);
      expect(cmd.result.doublingYears).toBe(6.0);
    }
  });

  it('parses Inflation erosion commands', () => {
    const cmd = parseQuickCommand('inf 1cr 20y 6%');
    expect(cmd).not.toBeNull();
    if (cmd?.type === 'inf_calc') {
      expect(cmd.result.presentAmount).toBe(10000000);
    }
  });

  it('parses Macro commands: raise, boost sip, cut lifestyle, max 80c, zero debt', () => {
    const raiseCmd = parseQuickCommand('raise 15%');
    expect(raiseCmd?.type).toBe('macro_action');
    if (raiseCmd?.type === 'macro_action') {
      expect(raiseCmd.macro.type).toBe('raise');
      if (raiseCmd.macro.type === 'raise') expect(raiseCmd.macro.percent).toBe(15);
    }

    const sipBoostCmd = parseQuickCommand('boost sip 25%');
    expect(sipBoostCmd?.type).toBe('macro_action');

    const cutCmd = parseQuickCommand('cut lifestyle 20%');
    expect(cutCmd?.type).toBe('macro_action');

    const max80cCmd = parseQuickCommand('max 80c');
    expect(max80cCmd?.type).toBe('macro_action');

    const zeroDebtCmd = parseQuickCommand('zero debt');
    expect(zeroDebtCmd?.type).toBe('macro_action');
  });
});

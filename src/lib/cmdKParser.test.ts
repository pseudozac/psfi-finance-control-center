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

  it('parses Macro commands: raise, boost sip, cut lifestyle, max 80c, zero debt, max 80d, max nps, metro, reset, demo', () => {
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
    if (max80cCmd?.type === 'macro_action') expect(max80cCmd.macro.type).toBe('max_80c');

    const max80dCmd = parseQuickCommand('max 80d');
    expect(max80dCmd?.type).toBe('macro_action');
    if (max80dCmd?.type === 'macro_action') expect(max80dCmd.macro.type).toBe('max_80d');

    const maxNpsCmd = parseQuickCommand('max nps');
    expect(maxNpsCmd?.type).toBe('macro_action');
    if (maxNpsCmd?.type === 'macro_action') expect(maxNpsCmd.macro.type).toBe('max_nps');

    const zeroDebtCmd = parseQuickCommand('zero debt');
    expect(zeroDebtCmd?.type).toBe('macro_action');
    if (zeroDebtCmd?.type === 'macro_action') expect(zeroDebtCmd.macro.type).toBe('zero_debt');

    const metroCmd = parseQuickCommand('metro');
    expect(metroCmd?.type).toBe('macro_action');
    if (metroCmd?.type === 'macro_action') {
      expect(metroCmd.macro.type).toBe('toggle_metro');
      if (metroCmd.macro.type === 'toggle_metro') expect(metroCmd.macro.isMetro).toBe(true);
    }

    const nonMetroCmd = parseQuickCommand('non metro');
    expect(nonMetroCmd?.type).toBe('macro_action');
    if (nonMetroCmd?.type === 'macro_action') {
      expect(nonMetroCmd.macro.type).toBe('toggle_metro');
      if (nonMetroCmd.macro.type === 'toggle_metro') expect(nonMetroCmd.macro.isMetro).toBe(false);
    }

    const resetCmd = parseQuickCommand('reset defaults');
    expect(resetCmd?.type).toBe('macro_action');
    if (resetCmd?.type === 'macro_action') expect(resetCmd.macro.type).toBe('reset_defaults');

    const demoCmd = parseQuickCommand('load demo');
    expect(demoCmd?.type).toBe('macro_action');
    if (demoCmd?.type === 'macro_action') expect(demoCmd.macro.type).toBe('load_demo');
  });

  it('parses quick tax estimation commands', () => {
    const cmd = parseQuickCommand('tax 18L');
    expect(cmd).not.toBeNull();
    expect(cmd?.type).toBe('tax_calc');
    if (cmd?.type === 'tax_calc') {
      expect(cmd.annualGross).toBe(1800000);
      expect(cmd.result.annualGrossIncome).toBe(1800000);
      expect(cmd.result.newRegimeTax).toBeGreaterThan(0);
      expect(cmd.result.oldRegimeTax).toBeGreaterThan(0);
    }

    const regimeCmd = parseQuickCommand('regime 24L');
    expect(regimeCmd?.type).toBe('tax_calc');
    if (regimeCmd?.type === 'tax_calc') {
      expect(regimeCmd.annualGross).toBe(2400000);
    }
  });

  it('evaluates safe inline arithmetic math commands', () => {
    const addCmd = parseQuickCommand('45000 + 12000');
    expect(addCmd?.type).toBe('math_calc');
    if (addCmd?.type === 'math_calc') {
      expect(addCmd.result.result).toBe(57000);
    }

    const multCmd = parseQuickCommand('1.5L * 0.2');
    expect(multCmd?.type).toBe('math_calc');
    if (multCmd?.type === 'math_calc') {
      expect(multCmd.result.result).toBe(30000);
    }

    const divCmd = parseQuickCommand('1800000 / 12');
    expect(divCmd?.type).toBe('math_calc');
    if (divCmd?.type === 'math_calc') {
      expect(divCmd.result.result).toBe(150000);
    }

    const parenCmd = parseQuickCommand('(45000 + 15000) * 1.15');
    expect(parenCmd?.type).toBe('math_calc');
    if (parenCmd?.type === 'math_calc') {
      expect(parenCmd.result.result).toBe(69000);
    }

    const shorthandCmd = parseQuickCommand('25k - 5k');
    expect(shorthandCmd?.type).toBe('math_calc');
    if (shorthandCmd?.type === 'math_calc') {
      expect(shorthandCmd.result.result).toBe(20000);
    }
  });

  it('parses all direct single balance sheet levers without missing any', () => {
    const testCases: Array<{ input: string; expectedLever: string; expectedVal: number }> = [
      { input: 'salary 1.5L', expectedLever: 'salary', expectedVal: 150000 },
      { input: 'freelance 40k', expectedLever: 'freelance', expectedVal: 40000 },
      { input: 'other 10k', expectedLever: 'other', expectedVal: 10000 },
      { input: 'sip 35k', expectedLever: 'sip', expectedVal: 35000 },
      { input: 'rent 25k', expectedLever: 'rent', expectedVal: 25000 },
      { input: 'housing 30k', expectedLever: 'rent', expectedVal: 30000 },
      { input: 'groceries 15000', expectedLever: 'groceries', expectedVal: 15000 },
      { input: 'grocery 12k', expectedLever: 'groceries', expectedVal: 12000 },
      { input: 'utilities 6k', expectedLever: 'utilities', expectedVal: 6000 },
      { input: 'bills 5k', expectedLever: 'utilities', expectedVal: 5000 },
      { input: 'transport 5k', expectedLever: 'transport', expectedVal: 5000 },
      { input: 'commute 4k', expectedLever: 'transport', expectedVal: 4000 },
      { input: 'lifestyle 20k', expectedLever: 'lifestyle', expectedVal: 20000 },
      { input: 'fun 15k', expectedLever: 'lifestyle', expectedVal: 15000 },
      { input: 'insurance 3k', expectedLever: 'insurance', expectedVal: 3000 },
      { input: 'cagr 14%', expectedLever: 'cagr', expectedVal: 14 },
      { input: 'returns 12%', expectedLever: 'cagr', expectedVal: 12 },
      { input: 'stepup 10%', expectedLever: 'stepup', expectedVal: 10 },
      { input: 'inflation 6%', expectedLever: 'inflation', expectedVal: 6 },
      { input: 'emergency 3L', expectedLever: 'emergency', expectedVal: 300000 },
      { input: 'emergencyfund 5L', expectedLever: 'emergency', expectedVal: 500000 },
      { input: 'card 50k', expectedLever: 'card', expectedVal: 50000 },
      { input: 'debt 1L', expectedLever: 'card', expectedVal: 100000 },
      { input: 'apr 36%', expectedLever: 'apr', expectedVal: 36 },
      { input: 'payment 12k', expectedLever: 'payment', expectedVal: 12000 },
      { input: '80c 1.5L', expectedLever: '80c', expectedVal: 150000 },
      { input: '80d 25k', expectedLever: '80d', expectedVal: 25000 },
      { input: 'nps 50k', expectedLever: 'nps', expectedVal: 50000 },
    ];

    testCases.forEach(({ input, expectedLever, expectedVal }) => {
      const parsed = parseQuickCommand(input);
      expect(parsed, `Command '${input}' should be parsed`).not.toBeNull();
      expect(parsed?.type).toBe('set_lever');
      if (parsed?.type === 'set_lever') {
        expect(parsed.lever).toBe(expectedLever);
        expect(parsed.value).toBe(expectedVal);
      }
    });
  });
});

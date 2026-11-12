import { describe, expect, it } from 'vitest';
import {
  classifyStatement,
  parseCAS,
  parseBankStatement,
  parseCreditCard,
  parsePayslip,
  parseHoldings,
  parseFinancialDocument,
  applyParsedParameters,
} from './statementParser';
import type { FinancePlan } from '../types/finance';

const basePlan: FinancePlan = {
  schemaVersion: 2,
  income: { salary: 100000, freelance: 0, other: 0 },
  expenses: {
    housing: 25000,
    groceries: 15000,
    utilities: 5000,
    transport: 5000,
    lifestyle: 15000,
    insurance: 3000,
  },
  savings: {
    emergencyFundBalance: 150000,
    monthlySavings: 10000,
    monthlySip: 20000,
    stepUpSipPercent: 10,
    expectedReturnPercent: 12,
    inflationPercent: 6,
    epfMonthly: 0,
  },
  debt: {
    cardBalance: 0,
    aprPercent: 36,
    monthlyPayment: 0,
  },
  tax: {
    deductions80C: 0,
    deductions80D: 25000,
    rentPaidMonthly: 25000,
  },
};

describe('statementParser - Classification & Ingestion', () => {
  it('correctly classifies a CAMS Consolidated Account Statement (CAS)', () => {
    const text = `
      CAMS Consolidated Account Statement
      Folio No: 1234567/89
      ISIN: INF200K01123
      HDFC Mid-Cap Opportunities Fund - Growth
      NAV: 145.20
      Total Valuation: INR 12,50,000.00
    `;
    const res = classifyStatement(text, 'cams_cas_nov2026.pdf');
    expect(res.type).toBe('cas');
    expect(res.institution).toContain('CAMS');
  });

  it('correctly classifies an HDFC Bank Statement', () => {
    const text = `
      HDFC BANK LIMITED
      Statement of Account for Period 01/10/2026 to 31/10/2026
      Account Number: 50100234567890
      Closing Balance: INR 3,45,670.50
    `;
    const res = classifyStatement(text, 'hdfc_statement.pdf');
    expect(res.type).toBe('bank_statement');
    expect(res.institution).toBe('HDFC Bank');
  });

  it('correctly classifies an SBI Credit Card Statement', () => {
    const text = `
      SBI Card Statement
      Credit Card Number: 4591-XXXX-XXXX-1234
      Total Amount Due: INR 34,890.00
      Minimum Amount Due: INR 2,500.00
      Payment Due Date: 15/11/2026
    `;
    const res = classifyStatement(text, 'sbicard_oct2026.pdf');
    expect(res.type).toBe('credit_card');
    expect(res.institution).toBe('SBI Card');
  });

  it('correctly classifies a Corporate Salary Slip', () => {
    const text = `
      Acme Technologies Pvt Ltd
      Payslip for the month of October 2026
      Employee Name: Alex Doe
      Gross Earnings: 1,80,000
      Net Pay: 1,42,000
      Basic Salary: 70,000
      House Rent Allowance: 35,000
      Provident Fund: 8,400
    `;
    const res = classifyStatement(text, 'payslip_oct.pdf');
    expect(res.type).toBe('payslip');
    expect(res.institution).toContain('Acme');
  });

  it('correctly parses CAS SIP amounts and valuation', () => {
    const casText = `
      Consolidated Account Statement - CAMS
      Folio No: 101/4567
      Scheme: Parag Parikh Flexi Cap Fund
      Valuation on 31-Oct-2026: INR 15,40,000.00
      Transaction Details:
      05-Oct-2026 SYSTEMATIC INVESTMENT PURCHASE: Rs. 15,000.00
      05-Oct-2026 SIP PURCHASE Mirae Asset Large Cap: Rs. 10,000.00
      Total Valuation: INR 25,40,000.00
    `;
    const parsed = parseCAS(casText);
    expect(parsed.statementType).toBe('cas');

    const sipParam = parsed.params.find((p) => p.key === 'monthly_sip');
    expect(sipParam).toBeDefined();
    // 15,000 + 10,000 = 25,000
    expect(sipParam?.detectedValue).toBe(25000);

    const valParam = parsed.params.find((p) => p.key === 'emergency_or_corpus');
    expect(valParam).toBeDefined();
    expect(valParam?.detectedValue).toBe(2540000);
  });

  it('correctly parses HDFC Bank salary credits and rent outflows', () => {
    const bankText = `
      HDFC BANK
      Account Statement: 01/10/2026 to 31/10/2026
      30/09/2026 ACH-CR-COMPANY PAYROLL SALARY OCT-2026: INR 1,65,000.00
      03/10/2026 NACH-HDFC HOUSING LOAN EMI: INR 42,000.00
      08/10/2026 UPI-BESCOM ELECTRICITY BILL: INR 1,850.00
      12/10/2026 SWIGGY BANGALORE: INR 650.00
      15/10/2026 ZOMATO RESTAURANT: INR 1,200.00
      31/10/2026 Closing Balance: INR 4,20,500.00
    `;
    const parsed = parseBankStatement(bankText);
    expect(parsed.statementType).toBe('bank_statement');

    const salaryParam = parsed.params.find((p) => p.key === 'salary_inflow');
    expect(salaryParam).toBeDefined();
    expect(salaryParam?.detectedValue).toBe(165000);

    const rentParam = parsed.params.find((p) => p.key === 'housing_outflow');
    expect(rentParam).toBeDefined();
    expect(rentParam?.detectedValue).toBe(42000);

    const balanceParam = parsed.params.find((p) => p.key === 'emergency_balance');
    expect(balanceParam).toBeDefined();
    expect(balanceParam?.detectedValue).toBe(420500);
  });

  it('correctly parses credit card total amount due and min due', () => {
    const ccText = `
      HDFC Bank Credit Card Statement
      Card Number: 4591-XXXX-XXXX-9900
      Statement Date: 20/10/2026
      Total Amount Due: INR 54,200.00
      Minimum Amount Due: INR 3,200.00
      Credit Limit: INR 3,00,000.00
    `;
    const parsed = parseCreditCard(ccText);
    expect(parsed.statementType).toBe('credit_card');

    const debtParam = parsed.params.find((p) => p.key === 'card_revolving_debt');
    expect(debtParam?.detectedValue).toBe(54200);

    const minParam = parsed.params.find((p) => p.key === 'card_min_payment');
    expect(minParam?.detectedValue).toBe(3200);
  });

  it('correctly parses corporate payslip take-home, HRA and EPF 80C', () => {
    const payslipText = `
      TechCorp Solutions India Pvt Ltd
      Payslip for October 2026
      Earnings:
      Basic Salary: INR 60,000
      House Rent Allowance (HRA): INR 30,000
      Special Allowance: INR 45,000
      Gross Earnings: INR 1,35,000
      Deductions:
      Employee Provident Fund (EPF): INR 7,200
      Professional Tax: INR 200
      Income Tax (TDS): INR 12,000
      Net Pay: INR 1,15,600
    `;
    const parsed = parsePayslip(payslipText);
    expect(parsed.statementType).toBe('payslip');

    const netSalary = parsed.params.find((p) => p.key === 'payslip_net_salary');
    expect(netSalary?.detectedValue).toBe(115600);

    const epf = parsed.params.find((p) => p.key === 'payslip_epf');
    expect(epf?.detectedValue).toBe(7200);

    const c80 = parsed.params.find((p) => p.key === 'section_80c');
    // 7200 * 12 = 86,400 (under 1.5L cap)
    expect(c80?.detectedValue).toBe(86400);
  });

  it('correctly parses Zerodha / broker demat holdings CSV', () => {
    const holdingsCsv = `
      Instrument,Qty,Avg. cost,LTP,Cur. val,P&L,Net chg
      RELIANCE,25,2400.00,2800.00,70000.00,10000.00,16.67%
      TCS,15,3500.00,3900.00,58500.00,6000.00,11.43%
      INFY,40,1400.00,1850.00,74000.00,18000.00,32.14%
    `;
    const parsed = parseHoldings(holdingsCsv);
    expect(parsed.statementType).toBe('demat_holdings');

    const val = parsed.params.find((p) => p.key === 'demat_holdings_valuation');
    // 70000 + 58500 + 74000 = 202500
    expect(val?.detectedValue).toBe(202500);
  });

  it('applies parsed parameters to a FinancePlan cleanly', () => {
    const parsed = parseBankStatement(`
      HDFC BANK
      SALARY CREDIT: INR 1,80,000.00
      NACH HOUSING LOAN: INR 38,000.00
      Closing Balance: INR 5,00,000.00
    `);

    const updatedPlan = applyParsedParameters(basePlan, parsed.params);
    expect(updatedPlan.income.salary).toBe(180000);
    expect(updatedPlan.expenses.housing).toBe(38000);
    expect(updatedPlan.savings.emergencyFundBalance).toBe(500000);
    // Untouched fields remain intact
    expect(updatedPlan.savings.stepUpSipPercent).toBe(basePlan.savings.stepUpSipPercent);
  });

  it('master dispatcher parseFinancialDocument handles any supported document', () => {
    const casDoc = parseFinancialDocument('CAMS Consolidated Account Statement Total Valuation: INR 5,00,000');
    expect(casDoc.statementType).toBe('cas');

    const cardDoc = parseFinancialDocument('Credit Card Statement Total Amount Due: INR 12,000 Minimum Amount Due: 1000');
    expect(cardDoc.statementType).toBe('credit_card');
  });
});

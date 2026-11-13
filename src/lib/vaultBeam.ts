import type { FinancePlan } from '../types/finance';

export interface CompactBeamPayload {
  v: 2;
  n: string; // vault name
  i: [number, number, number]; // salary, freelance, other
  e: [number, number, number, number, number, number]; // housing, groceries, utilities, transport, lifestyle, insurance
  c: [string, number][]; // custom expenses [[name, amount]]
  s: [number, number, number, number, number, number]; // emergency, savings, sip, stepUp, return, inflation
  d: [number, number, number]; // cardBalance, apr, monthlyPayment
  t: [number, number, number, number, number]; // 80C, 80D, NPS, rentPaid, isMetro (1/0)
  p?: boolean; // is PIN protected
}

// Isomorphic Base64 encoder/decoder (works seamlessly in Browser & Node/Vitest)
function toBase64(str: string): string {
  if (typeof btoa === 'function') {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch {
      // Fallback
    }
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf-8').toString('base64');
  }
  return str;
}

function fromBase64(b64: string): string {
  if (typeof atob === 'function') {
    try {
      return decodeURIComponent(escape(atob(b64)));
    } catch {
      // Fallback
    }
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64, 'base64').toString('utf-8');
  }
  return b64;
}

// Simple deterministic cipher for 4-digit PIN
function xorCipher(text: string, pin: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ pin.charCodeAt(i % pin.length);
    result += String.fromCharCode(charCode);
  }
  return result;
}

/**
 * Encodes a FinancePlan into an ultra-compact string (typically < 200 chars)
 * for high-speed, instant QR code scanning and direct URL hash sharing.
 */
export function encodeVaultBeam(plan: FinancePlan, vaultName: string, pin?: string): string {
  const compact: CompactBeamPayload = {
    v: 2,
    n: vaultName || 'Vault',
    i: [plan.income.salary, plan.income.freelance, plan.income.other],
    e: [
      plan.expenses.housing,
      plan.expenses.groceries,
      plan.expenses.utilities,
      plan.expenses.transport,
      plan.expenses.lifestyle,
      plan.expenses.insurance,
    ],
    c: (plan.expenses.custom || []).map((x) => [x.name, x.amount]),
    s: [
      plan.savings.emergencyFundBalance,
      plan.savings.monthlySavings,
      plan.savings.monthlySip,
      plan.savings.stepUpSipPercent,
      plan.savings.expectedReturnPercent,
      plan.savings.inflationPercent,
    ],
    d: [plan.debt.cardBalance, plan.debt.aprPercent, plan.debt.monthlyPayment],
    t: [
      plan.tax.deductions80C,
      plan.tax.deductions80D,
      plan.tax.deductionsNPS || 0,
      plan.tax.rentPaidMonthly || 0,
      plan.tax.isMetroCity ? 1 : 0,
    ],
    p: Boolean(pin && pin.length >= 4),
  };

  let json = JSON.stringify(compact);
  if (pin && pin.length >= 4) {
    json = xorCipher(json, pin);
  }

  return `psfi:${toBase64(json)}`;
}

/**
 * Decodes a vault beam string back into a full FinancePlan.
 * Supports compact v2 schema, legacy raw JSON, and PIN-protected payloads.
 */
export function decodeVaultBeam(
  rawInput: string,
  pin?: string
): { success: boolean; plan?: FinancePlan; vaultName?: string; needsPin?: boolean; error?: string } {
  try {
    let clean = rawInput.trim();

    // Extract beam payload from URL hash if a full URL was scanned or pasted
    if (clean.includes('#beam=')) {
      clean = clean.split('#beam=')[1];
    } else if (clean.includes('beam=')) {
      clean = clean.split('beam=')[1];
    }

    // Direct JSON string detection (e.g. legacy clipboard or raw paste)
    if (clean.startsWith('{') && clean.endsWith('}')) {
      try {
        const directParsed = JSON.parse(clean);
        if (directParsed.plan && directParsed.app === 'psfi') {
          return {
            success: true,
            plan: directParsed.plan,
            vaultName: directParsed.name || 'Imported Vault',
          };
        }
      } catch {
        // Continue to base64 decoding
      }
    }

    // Strip psfi: prefix
    if (clean.startsWith('psfi:')) {
      clean = clean.slice(5);
    }

    let jsonStr: string;
    try {
      jsonStr = fromBase64(clean);
    } catch {
      jsonStr = clean;
    }

    // Try parsing as JSON first
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // If parsing fails and a PIN was supplied, try decrypting with PIN
      if (pin) {
        const decrypted = xorCipher(jsonStr, pin);
        try {
          parsed = JSON.parse(decrypted);
        } catch {
          return { success: false, error: 'Incorrect 4-digit PIN.' };
        }
      } else {
        return { success: false, needsPin: true, error: 'This vault is PIN-protected. Please enter the 4-digit PIN.' };
      }
    }

    const payload = parsed as Partial<CompactBeamPayload> & {
      app?: string;
      plan?: FinancePlan;
      name?: string;
    };

    // Case 1: Legacy v1 full JSON format
    if (payload.plan && payload.app === 'psfi') {
      return {
        success: true,
        plan: payload.plan,
        vaultName: payload.name || 'Imported Vault',
      };
    }

    // Case 2: Compact v2 format
    if (payload.v === 2 && payload.i && payload.e) {
      if (payload.p && !pin) {
        return { success: false, needsPin: true, error: 'This vault is PIN-protected. Please enter the 4-digit PIN.' };
      }

      const plan: FinancePlan = {
        schemaVersion: 2,
        income: {
          salary: payload.i[0] || 0,
          freelance: payload.i[1] || 0,
          other: payload.i[2] || 0,
        },
        expenses: {
          housing: payload.e[0] || 0,
          groceries: payload.e[1] || 0,
          utilities: payload.e[2] || 0,
          transport: payload.e[3] || 0,
          lifestyle: payload.e[4] || 0,
          insurance: payload.e[5] || 0,
          custom: (payload.c || []).map(([name, amount], index) => ({
            id: `custom_${Date.now()}_${index}`,
            name,
            amount,
          })),
        },
        savings: {
          emergencyFundBalance: payload.s?.[0] || 0,
          monthlySavings: payload.s?.[1] || 0,
          monthlySip: payload.s?.[2] || 0,
          stepUpSipPercent: payload.s?.[3] || 10,
          expectedReturnPercent: payload.s?.[4] || 12,
          inflationPercent: payload.s?.[5] || 6,
        },
        debt: {
          cardBalance: payload.d?.[0] || 0,
          aprPercent: payload.d?.[1] || 18,
          monthlyPayment: payload.d?.[2] || 0,
        },
        tax: {
          deductions80C: payload.t?.[0] || 150000,
          deductions80D: payload.t?.[1] || 25000,
          deductionsNPS: payload.t?.[2] || 50000,
          rentPaidMonthly: payload.t?.[3] || 0,
          isMetroCity: Boolean(payload.t?.[4]),
        },
      };

      return {
        success: true,
        plan,
        vaultName: payload.n || 'Beamed Vault',
      };
    }

    return { success: false, error: 'Unrecognized vault data format.' };
  } catch (err: unknown) {
    const e = err as Error;
    return { success: false, error: e.message || 'Failed to decode vault beam.' };
  }
}

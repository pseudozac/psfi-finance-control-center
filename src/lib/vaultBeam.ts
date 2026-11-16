import type { FinancePlan } from '../types/finance';
import {
  deriveWrappingKeyFromSecret,
  bytesToBase64,
  base64ToBytes,
  generateRandomBytes,
} from './vaultCrypto';

export interface CompactBeamPayload {
  v: 2 | 3;
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

// Legacy deterministic cipher for v2 backwards compatibility
function xorCipher(text: string, pin: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ pin.charCodeAt(i % pin.length);
    result += String.fromCharCode(charCode);
  }
  return result;
}

export function buildCompactPayload(plan: FinancePlan, vaultName: string, isProtected = false): CompactBeamPayload {
  return {
    v: 3,
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
    p: isProtected,
  };
}

export function reconstructPlanFromCompact(payload: CompactBeamPayload): FinancePlan {
  return {
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
}

/**
 * Synchronous beam encoder (backward-compatible).
 */
export function encodeVaultBeam(plan: FinancePlan, vaultName: string, pin?: string): string {
  const compact = buildCompactPayload(plan, vaultName, Boolean(pin && pin.length >= 4));
  compact.v = 2; // Keep v2 for legacy sync compatibility

  let json = JSON.stringify(compact);
  if (pin && pin.length >= 4) {
    json = xorCipher(json, pin);
  }

  return `psfi:${toBase64(json)}`;
}

/**
 * Modern AES-256-GCM authenticated beam encoder.
 */
export async function encodeVaultBeamSecure(
  plan: FinancePlan,
  vaultName: string,
  secret?: string
): Promise<string> {
  const compact = buildCompactPayload(plan, vaultName, Boolean(secret && secret.length >= 4));
  const json = JSON.stringify(compact);

  if (!secret || secret.length < 4) {
    return `psfi:v3:plain:${toBase64(json)}`;
  }

  const salt = generateRandomBytes(16);
  const iv = generateRandomBytes(12);
  const key = await deriveWrappingKeyFromSecret(secret, salt, 20_000); // 20k rounds for instant QR generation

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource, tagLength: 128 },
    key,
    new TextEncoder().encode(json)
  );

  const ciphertext = new Uint8Array(encrypted);
  return `psfi:v3:${bytesToBase64(salt)}:${bytesToBase64(iv)}:${bytesToBase64(ciphertext)}`;
}

export interface BeamDecodeResult {
  success: boolean;
  plan?: FinancePlan;
  vaultName?: string;
  needsPin?: boolean;
  error?: string;
}

/**
 * Asynchronous beam decoder supporting modern AES-256-GCM v3 and legacy v2/v1 payloads.
 */
export async function decodeVaultBeamSecure(
  rawInput: string,
  secret?: string
): Promise<BeamDecodeResult> {
  try {
    let clean = rawInput.trim();
    if (clean.includes('#beam=')) clean = clean.split('#beam=')[1];
    else if (clean.includes('beam=')) clean = clean.split('beam=')[1];
    if (clean.startsWith('psfi:')) clean = clean.slice(5);

    // Modern v3 payload handling
    if (clean.startsWith('v3:')) {
      const parts = clean.split(':');
      if (parts[1] === 'plain') {
        const json = fromBase64(parts[2]);
        const compact = JSON.parse(json) as CompactBeamPayload;
        return {
          success: true,
          plan: reconstructPlanFromCompact(compact),
          vaultName: compact.n || 'Beamed Vault',
        };
      }

      if (parts.length >= 4) {
        if (!secret || secret.length < 4) {
          return { success: false, needsPin: true, error: 'Vault is protected. Please enter PIN or recovery key.' };
        }

        const salt = base64ToBytes(parts[1]);
        const iv = base64ToBytes(parts[2]);
        const ciphertext = base64ToBytes(parts[3]);

        const key = await deriveWrappingKeyFromSecret(secret, salt, 20_000);
        try {
          const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv as unknown as BufferSource, tagLength: 128 },
            key,
            ciphertext as unknown as BufferSource
          );
          const json = new TextDecoder().decode(decryptedBuffer);
          const compact = JSON.parse(json) as CompactBeamPayload;
          return {
            success: true,
            plan: reconstructPlanFromCompact(compact),
            vaultName: compact.n || 'Beamed Vault',
          };
        } catch {
          return { success: false, error: 'Incorrect PIN or recovery key.' };
        }
      }
    }

    // Fall back to synchronous decoder for v2 and v1 formats
    return decodeVaultBeam(rawInput, secret);
  } catch (err: unknown) {
    const e = err as Error;
    return { success: false, error: e.message || 'Failed to decode vault beam.' };
  }
}

/**
 * Synchronous decoder for legacy v2 and v1 formats.
 */
export function decodeVaultBeam(rawInput: string, pin?: string): BeamDecodeResult {
  try {
    let clean = rawInput.trim();
    if (clean.includes('#beam=')) clean = clean.split('#beam=')[1];
    else if (clean.includes('beam=')) clean = clean.split('beam=')[1];

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
        // Continue
      }
    }

    if (clean.startsWith('psfi:')) {
      clean = clean.slice(5);
    }

    // If it's a v3 payload handed to sync decoder without secret
    if (clean.startsWith('v3:')) {
      return { success: false, needsPin: true, error: 'Vault requires secure decryption.' };
    }

    let jsonStr: string;
    try {
      jsonStr = fromBase64(clean);
    } catch {
      jsonStr = clean;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
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

    if (payload.plan && payload.app === 'psfi') {
      return {
        success: true,
        plan: payload.plan,
        vaultName: payload.name || 'Imported Vault',
      };
    }

    if ((payload.v === 2 || payload.v === 3) && payload.i && payload.e) {
      if (payload.p && !pin) {
        return { success: false, needsPin: true, error: 'This vault is PIN-protected. Please enter the 4-digit PIN.' };
      }

      return {
        success: true,
        plan: reconstructPlanFromCompact(payload as CompactBeamPayload),
        vaultName: payload.n || 'Beamed Vault',
      };
    }

    return { success: false, error: 'Unrecognized vault data format.' };
  } catch (err: unknown) {
    const e = err as Error;
    return { success: false, error: e.message || 'Failed to decode vault beam.' };
  }
}

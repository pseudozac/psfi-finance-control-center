import { describe, it, expect } from 'vitest';
import { encodeVaultBeam, decodeVaultBeam } from './vaultBeam';
import { DEFAULT_PLAN } from './finance';

describe('vaultBeam compact compression and decryption', () => {
  it('encodes and decodes a FinancePlan with exact fidelity', () => {
    const original = DEFAULT_PLAN;
    const encoded = encodeVaultBeam(original, 'Test Vault');

    expect(encoded.startsWith('psfi:')).toBe(true);
    expect(encoded.length).toBeLessThan(450); // Under 450 chars for high-speed QR blocks!

    const decoded = decodeVaultBeam(encoded);
    expect(decoded.success).toBe(true);
    expect(decoded.vaultName).toBe('Test Vault');
    expect(decoded.plan?.income.salary).toBe(original.income.salary);
    expect(decoded.plan?.expenses.housing).toBe(original.expenses.housing);
    expect(decoded.plan?.savings.monthlySip).toBe(original.savings.monthlySip);
  });

  it('correctly handles optional 4-digit PIN protection', () => {
    const original = DEFAULT_PLAN;
    const pin = '4821';
    const encoded = encodeVaultBeam(original, 'Secret Vault', pin);

    // Attempt decoding without PIN
    const withoutPin = decodeVaultBeam(encoded);
    expect(withoutPin.success).toBe(false);
    expect(withoutPin.needsPin).toBe(true);

    // Attempt decoding with wrong PIN
    const wrongPin = decodeVaultBeam(encoded, '9999');
    expect(wrongPin.success).toBe(false);

    // Decode with correct PIN
    const correctPin = decodeVaultBeam(encoded, pin);
    expect(correctPin.success).toBe(true);
    expect(correctPin.vaultName).toBe('Secret Vault');
    expect(correctPin.plan?.income.salary).toBe(original.income.salary);
  });

  it('handles backwards compatibility for legacy v1 raw JSON payloads', () => {
    const legacy = JSON.stringify({
      v: 1,
      app: 'psfi',
      name: 'Legacy Vault',
      plan: DEFAULT_PLAN,
    });

    const decoded = decodeVaultBeam(legacy);
    expect(decoded.success).toBe(true);
    expect(decoded.vaultName).toBe('Legacy Vault');
    expect(decoded.plan?.income.salary).toBe(DEFAULT_PLAN.income.salary);
  });

  it('correctly decodes full URLs containing #beam= hash fragment', () => {
    const original = DEFAULT_PLAN;
    const encoded = encodeVaultBeam(original, 'Mobile Beam');
    const fullUrl = `https://pseudo-fi.vercel.app/#beam=${encoded}`;

    const decoded = decodeVaultBeam(fullUrl);
    expect(decoded.success).toBe(true);
    expect(decoded.vaultName).toBe('Mobile Beam');
    expect(decoded.plan?.income.salary).toBe(original.income.salary);
  });
});

import { describe, it, expect } from 'vitest';
import { generatePinSalt, hashVaultPin, verifyVaultPin } from './vaultSecurity';

describe('vaultSecurity (Master PIN Enclave)', () => {
  it('generates 32-character hex salt (16 bytes)', () => {
    const salt1 = generatePinSalt();
    const salt2 = generatePinSalt();
    expect(salt1).toHaveLength(32);
    expect(salt2).toHaveLength(32);
    expect(salt1).not.toBe(salt2);
  });

  it('hashes a 4-digit PIN deterministically with given salt', async () => {
    const salt = 'abcdef1234567890abcdef1234567890';
    const hash1 = await hashVaultPin('1234', salt);
    const hash2 = await hashVaultPin('1234', salt);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 is 64 hex chars
  });

  it('different PINs produce different hashes', async () => {
    const salt = generatePinSalt();
    const hash1 = await hashVaultPin('1234', salt);
    const hash2 = await hashVaultPin('4321', salt);
    expect(hash1).not.toBe(hash2);
  });

  it('verifies correct PIN against salt and expected hash', async () => {
    const salt = generatePinSalt();
    const pin = '9876';
    const hash = await hashVaultPin(pin, salt);

    const valid = await verifyVaultPin('9876', salt, hash);
    expect(valid).toBe(true);

    const wrongPin = await verifyVaultPin('0000', salt, hash);
    expect(wrongPin).toBe(false);
  });

  it('handles empty or malformed inputs safely', async () => {
    expect(await verifyVaultPin('', 'salt', 'hash')).toBe(false);
    expect(await verifyVaultPin('1234', '', 'hash')).toBe(false);
    expect(await verifyVaultPin('1234', 'salt', '')).toBe(false);
  });
});

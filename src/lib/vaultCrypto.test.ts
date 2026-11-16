import { describe, it, expect } from 'vitest';
import {
  generateMnemonic12,
  validateMnemonic,
  deriveWrappingKeyFromSecret,
  generateMasterVaultKey,
  wrapMasterVaultKey,
  unwrapMasterVaultKey,
  encryptWithKey,
  decryptWithKey,
  createEncryptedEnvelope,
  decryptEncryptedEnvelope,
  bytesToBase64,
  base64ToBytes,
} from './vaultCrypto';

describe('Sovereign Vault Cryptography Core (vaultCrypto)', () => {
  it('encodes and decodes base64 reliably', () => {
    const raw = new Uint8Array([0, 1, 2, 255, 128, 64, 32]);
    const b64 = bytesToBase64(raw);
    const decoded = base64ToBytes(b64);
    expect(decoded).toEqual(raw);
  });

  it('generates a valid 12-word BIP-39 mnemonic with valid checksum', async () => {
    const mnemonic = await generateMnemonic12();
    const words = mnemonic.split(' ');
    expect(words).toHaveLength(12);

    const isValid = await validateMnemonic(mnemonic);
    expect(isValid).toBe(true);
  });

  it('rejects invalid or corrupted mnemonic phrases', async () => {
    // Too few words
    expect(await validateMnemonic('abandon abandon abandon')).toBe(false);

    // Non-dictionary words
    expect(
      await validateMnemonic(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon xyzfake'
      )
    ).toBe(false);

    // Valid words but corrupted checksum
    const valid = await generateMnemonic12();
    const words = valid.split(' ');
    // Swap last word with another dictionary word (violates checksum)
    words[11] = words[11] === 'abandon' ? 'ability' : 'abandon';
    const corrupted = words.join(' ');
    expect(await validateMnemonic(corrupted)).toBe(false);
  });

  it('performs AES-256-GCM authenticated encryption and decryption', async () => {
    const key = await generateMasterVaultKey();
    const secretMessage = JSON.stringify({ salary: 150000, emergencyFund: 500000 });

    const encrypted = await encryptWithKey(key, secretMessage);
    expect(encrypted.ciphertext.length).toBeGreaterThan(0);
    expect(encrypted.iv.length).toBe(12);

    const decrypted = await decryptWithKey(key, encrypted.ciphertext, encrypted.iv);
    expect(decrypted).toBe(secretMessage);
  });

  it('detects tampering and rejects modified ciphertext or IV (Authenticated Encryption)', async () => {
    const key = await generateMasterVaultKey();
    const secretMessage = 'Confidential Financial Vault';

    const encrypted = await encryptWithKey(key, secretMessage);

    // Tamper with one bit in the ciphertext
    const tamperedCiphertext = new Uint8Array(encrypted.ciphertext);
    tamperedCiphertext[0] ^= 0x01;

    await expect(
      decryptWithKey(key, tamperedCiphertext, encrypted.iv)
    ).rejects.toThrow();

    // Tamper with IV
    const tamperedIv = new Uint8Array(encrypted.iv);
    tamperedIv[0] ^= 0x01;

    await expect(
      decryptWithKey(key, encrypted.ciphertext, tamperedIv)
    ).rejects.toThrow();
  });

  it('wraps and unwraps the Master Vault Key (MVK) using PBKDF2 derived key', async () => {
    const mnemonic = await generateMnemonic12();
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);

    // Use lower iterations in unit tests for speed (e.g. 5,000)
    const wrappingKey = await deriveWrappingKeyFromSecret(mnemonic, salt, 5_000);
    const originalMvk = await generateMasterVaultKey();

    // Wrap
    const wrapped = await wrapMasterVaultKey(originalMvk, wrappingKey);
    expect(wrapped.wrappedKey.length).toBeGreaterThan(0);
    expect(wrapped.iv.length).toBe(12);

    // Unwrap
    const unwrappedMvk = await unwrapMasterVaultKey(wrapped.wrappedKey, wrappingKey, wrapped.iv);

    // Verify unwrapped key can encrypt and decrypt data
    const payload = 'PsFi Sovereign Independence';
    const encrypted = await encryptWithKey(originalMvk, payload);
    const decrypted = await decryptWithKey(unwrappedMvk, encrypted.ciphertext, encrypted.iv);
    expect(decrypted).toBe(payload);
  });

  it('creates and decrypts a portable EncryptedVaultEnvelope end-to-end', async () => {
    const mnemonic = await generateMnemonic12();
    const vaultData = JSON.stringify({
      vaultName: 'Retirement Fortress',
      netWorth: 25000000,
      fireTarget: 50000000,
    });

    const envelope = await createEncryptedEnvelope(vaultData, mnemonic, 5_000);
    expect(envelope.psfi_version).toBe(3);
    expect(envelope.type).toBe('encrypted_vault');

    // Decrypt with correct seed
    const restored = await decryptEncryptedEnvelope(envelope, mnemonic);
    expect(restored).toBe(vaultData);

    // Fails with wrong seed
    const wrongMnemonic = await generateMnemonic12();
    await expect(decryptEncryptedEnvelope(envelope, wrongMnemonic)).rejects.toThrow();
  });
});

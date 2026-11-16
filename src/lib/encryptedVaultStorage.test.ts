import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearSecureStorage,
  isVaultInitialized,
  initializeSecureVault,
  unlockVaultWithSecret,
  saveAccountEncrypted,
  loadAllAccountsEncrypted,
  deleteAccountEncrypted,
  migrateLegacyAccountsToEncrypted,
  exportEncryptedVaultBundle,
  importEncryptedVaultBundle,
} from './encryptedVaultStorage';
import type { UserAccount } from '../types/account';
import { DEFAULT_PLAN } from './finance';

describe('Encrypted Vault Storage Engine (encryptedVaultStorage)', () => {
  beforeEach(async () => {
    await clearSecureStorage();
  });

  it('reports uninitialized on clean state and initialized after setup', async () => {
    expect(await isVaultInitialized()).toBe(false);

    const { masterKey, mnemonic } = await initializeSecureVault(undefined, 5_000);
    expect(masterKey).toBeDefined();
    expect(mnemonic.split(' ')).toHaveLength(12);

    expect(await isVaultInitialized()).toBe(true);
  });

  it('encrypts accounts at rest with AES-256-GCM and restores them cleanly', async () => {
    const { masterKey } = await initializeSecureVault(undefined, 5_000);

    const account: UserAccount = {
      id: 'vault_test_1',
      name: 'High Net Worth Portfolio',
      avatarColor: 'solstice',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      plan: {
        ...structuredClone(DEFAULT_PLAN),
        income: { salary: 280000, freelance: 50000, other: 15000 },
        expenses: {
          housing: 45000,
          groceries: 20000,
          utilities: 8000,
          transport: 12000,
          lifestyle: 30000,
          insurance: 15000,
          custom: [{ id: '1', name: 'Golf Club', amount: 5000 }],
        },
      },
      baseline: null,
    };

    await saveAccountEncrypted(masterKey, account);

    const loaded = await loadAllAccountsEncrypted(masterKey);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('vault_test_1');
    expect(loaded[0].name).toBe('High Net Worth Portfolio');
    expect(loaded[0].plan.income.salary).toBe(280000);
    expect(loaded[0].plan.expenses.housing).toBe(45000);
    expect(loaded[0].plan.expenses.custom?.[0]?.name).toBe('Golf Club');
  });

  it('unlocks an existing vault using the 12-word mnemonic', async () => {
    const { mnemonic, masterKey } = await initializeSecureVault(undefined, 5_000);

    const account: UserAccount = {
      id: 'vault_secure',
      name: 'Confidential Vault',
      avatarColor: 'nebula',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      plan: structuredClone(DEFAULT_PLAN),
      baseline: null,
    };
    await saveAccountEncrypted(masterKey, account);

    // Simulate reopening app with secret
    const unlockedMvk = await unlockVaultWithSecret(mnemonic);
    const restored = await loadAllAccountsEncrypted(unlockedMvk);
    expect(restored).toHaveLength(1);
    expect(restored[0].name).toBe('Confidential Vault');

    // Fails with wrong secret
    await expect(unlockVaultWithSecret('wrong secret phrase')).rejects.toThrow();
  });

  it('deletes an account cleanly from encrypted store', async () => {
    const { masterKey } = await initializeSecureVault(undefined, 5_000);

    const account: UserAccount = {
      id: 'vault_to_delete',
      name: 'Temporary Vault',
      avatarColor: 'quasar',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      plan: structuredClone(DEFAULT_PLAN),
      baseline: null,
    };

    await saveAccountEncrypted(masterKey, account);
    expect(await loadAllAccountsEncrypted(masterKey)).toHaveLength(1);

    await deleteAccountEncrypted('vault_to_delete');
    expect(await loadAllAccountsEncrypted(masterKey)).toHaveLength(0);
  });

  it('performs non-destructive migration from legacy accounts', async () => {
    const result = await migrateLegacyAccountsToEncrypted(undefined, 5_000);
    expect(result.success).toBe(true);
    expect(result.accountsCount).toBeGreaterThanOrEqual(1);
    expect(result.mnemonic.split(' ')).toHaveLength(12);

    const loaded = await loadAllAccountsEncrypted(result.masterKey);
    expect(loaded.length).toBe(result.accountsCount);
  });

  it('exports all vaults into an encrypted master bundle and imports them cleanly', async () => {
    const { masterKey } = await initializeSecureVault(undefined, 5_000);

    const vault1: UserAccount = {
      id: 'vault_alpha',
      name: 'Alpha Corporate Vault',
      avatarColor: 'nebula',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      plan: { ...DEFAULT_PLAN, income: { ...DEFAULT_PLAN.income, salary: 250000 } },
      baseline: null,
    };
    const vault2: UserAccount = {
      id: 'vault_beta',
      name: 'Beta Family Vault',
      avatarColor: 'solstice',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      plan: { ...DEFAULT_PLAN, income: { ...DEFAULT_PLAN.income, salary: 180000 } },
      baseline: null,
    };

    await saveAccountEncrypted(masterKey, vault1);
    await saveAccountEncrypted(masterKey, vault2);

    const exportPassword = 'MasterPassphrase#2026';
    const bundleJson = await exportEncryptedVaultBundle(masterKey, exportPassword, 2_000);

    const parsedEnvelope = JSON.parse(bundleJson);
    expect(parsedEnvelope.type).toBe('encrypted_vault_bundle');
    expect(parsedEnvelope.accounts_count).toBe(2);
    expect(parsedEnvelope.mbk.wrapped).toBeDefined();
    expect(parsedEnvelope.payload.ciphertext).toBeDefined();

    // Wrong password should reject decryption
    await expect(
      importEncryptedVaultBundle(bundleJson, 'WrongPassword', masterKey)
    ).rejects.toThrow();

    // Clean destination storage and import bundle
    await clearSecureStorage();
    const { masterKey: freshMasterKey } = await initializeSecureVault(undefined, 5_000);

    const importResult = await importEncryptedVaultBundle(bundleJson, exportPassword, freshMasterKey);
    expect(importResult.accountsImported).toBe(2);
    expect(importResult.accounts).toHaveLength(2);

    const restoredVaults = await loadAllAccountsEncrypted(freshMasterKey);
    expect(restoredVaults).toHaveLength(2);
    expect(restoredVaults.some((v) => v.name === 'Alpha Corporate Vault')).toBe(true);
    expect(restoredVaults.some((v) => v.name === 'Beta Family Vault')).toBe(true);
  });
});

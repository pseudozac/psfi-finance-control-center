/**
 * Encrypted Vault Storage Engine (IndexedDB + Web Crypto AES-256-GCM)
 *
 * Provides:
 * - High-capacity, non-blocking asynchronous storage in IndexedDB (`psfi_secure_db`)
 * - Transparent fallback for Node/Vitest test environments and restricted WebViews
 * - Encryption of all accounts, plans, and baselines at rest using the Master Vault Key (MVK)
 * - Safe, non-destructive migration from legacy plaintext localStorage (`psfi_accounts_v1`)
 */

import type { UserAccount, AccountAvatarColor } from '../types/account';
import { SCRATCH_PLAN, validateImportedPlan } from './finance';
import {
  generateMasterVaultKey,
  wrapMasterVaultKey,
  unwrapMasterVaultKey,
  deriveWrappingKeyFromSecret,
  encryptWithKey,
  decryptWithKey,
  generateMnemonic12,
  bytesToBase64,
  base64ToBytes,
  generateRandomBytes,
  CURRENT_CRYPTO_VERSION,
  PBKDF2_RECOMMENDED_ITERATIONS,
} from './vaultCrypto';

const DB_NAME = 'psfi_secure_db';
const DB_VERSION = 1;
const STORE_META = 'vault_meta';
const STORE_ACCOUNTS = 'vault_accounts';

const LEGACY_STORAGE_KEY_ACCOUNTS = 'psfi_accounts_v1';
const MIGRATION_FLAG_KEY = 'psfi_vault_migrated_v3';

export interface StoredVaultMeta {
  version: number;
  salt: string; // base64
  wrappedMvk: string; // base64
  mvkIv: string; // base64
  iterations: number;
  recoveryHint?: string;
  deviceUnlock?: { key: CryptoKey; ciphertext: Uint8Array; iv: Uint8Array };
  createdAt: string;
  updatedAt: string;
}

export interface StoredEncryptedAccount {
  id: string;
  name: string;
  avatarColor: AccountAvatarColor;
  ciphertext: string; // base64
  iv: string; // base64
  createdAt: string;
  updatedAt: string;
}

// In-memory fallback store when IndexedDB is unavailable (e.g. Node.js Vitest runner)
const memoryMeta = new Map<string, StoredVaultMeta>();
const memoryAccounts = new Map<string, StoredEncryptedAccount>();

function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDB()) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
      if (!db.objectStoreNames.contains(STORE_ACCOUNTS)) {
        db.createObjectStore(STORE_ACCOUNTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================================
// Low-Level Storage Primitives (IndexedDB with memory fallback)
// ============================================================================

async function dbGetMeta(): Promise<StoredVaultMeta | null> {
  if (!hasIndexedDB()) {
    return memoryMeta.get('config') || null;
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readonly');
    const store = tx.objectStore(STORE_META);
    const req = store.get('config');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function dbSetMeta(meta: StoredVaultMeta): Promise<void> {
  if (!hasIndexedDB()) {
    memoryMeta.set('config', meta);
    return;
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readwrite');
    const store = tx.objectStore(STORE_META);
    const req = store.put(meta, 'config');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAllEncryptedAccounts(): Promise<StoredEncryptedAccount[]> {
  if (!hasIndexedDB()) {
    return Array.from(memoryAccounts.values());
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ACCOUNTS, 'readonly');
    const store = tx.objectStore(STORE_ACCOUNTS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbPutEncryptedAccount(acc: StoredEncryptedAccount): Promise<void> {
  if (!hasIndexedDB()) {
    memoryAccounts.set(acc.id, acc);
    return;
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ACCOUNTS, 'readwrite');
    const store = tx.objectStore(STORE_ACCOUNTS);
    const req = store.put(acc);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function dbDeleteEncryptedAccount(id: string): Promise<void> {
  if (!hasIndexedDB()) {
    memoryAccounts.delete(id);
    return;
  }
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ACCOUNTS, 'readwrite');
    const store = tx.objectStore(STORE_ACCOUNTS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Clear all storage (for test resets)
export async function clearSecureStorage(): Promise<void> {
  memoryMeta.clear();
  memoryAccounts.clear();
  if (hasIndexedDB()) {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_META, STORE_ACCOUNTS], 'readwrite');
      tx.objectStore(STORE_META).clear();
      tx.objectStore(STORE_ACCOUNTS).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// ============================================================================
// High-Level Secure Vault Management
// ============================================================================

/**
 * Checks whether an encrypted vault has already been initialized on this device.
 */
export async function isVaultInitialized(): Promise<boolean> {
  const meta = await dbGetMeta();
  return meta !== null;
}

/**
 * Initializes a new encrypted vault with a 12-word recovery mnemonic or user passphrase.
 * Returns the generated Master Vault Key (in-memory) and the 12-word mnemonic.
 */
export async function initializeSecureVault(
  passphraseOrMnemonic?: string,
  iterations: number = PBKDF2_RECOMMENDED_ITERATIONS
): Promise<{ masterKey: CryptoKey; mnemonic: string }> {
  const mnemonic = passphraseOrMnemonic || (await generateMnemonic12());
  const salt = generateRandomBytes(16);
  const wrappingKey = await deriveWrappingKeyFromSecret(mnemonic, salt, iterations);
  const masterKey = await generateMasterVaultKey();

  const wrapped = await wrapMasterVaultKey(masterKey, wrappingKey);

  const meta: StoredVaultMeta = {
    version: CURRENT_CRYPTO_VERSION,
    salt: bytesToBase64(salt),
    wrappedMvk: bytesToBase64(wrapped.wrappedKey),
    mvkIv: bytesToBase64(wrapped.iv),
    iterations,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await rememberDeviceUnlock(meta, mnemonic);
  return { masterKey, mnemonic };
}

/**
 * Unlocks an existing secure vault using the recovery mnemonic or passphrase.
 * Derives the wrapping key, unwraps the MVK, and returns the live in-memory CryptoKey.
 */
export async function unlockVaultWithSecret(secret: string): Promise<CryptoKey> {
  const meta = await dbGetMeta();
  if (!meta) {
    throw new Error('Vault has not been initialized on this device.');
  }

  const salt = base64ToBytes(meta.salt);
  const iterations = meta.iterations || PBKDF2_RECOMMENDED_ITERATIONS;
  const wrappingKey = await deriveWrappingKeyFromSecret(secret, salt, iterations);

  const wrappedMvk = base64ToBytes(meta.wrappedMvk);
  const mvkIv = base64ToBytes(meta.mvkIv);

  return unwrapMasterVaultKey(wrappedMvk, wrappingKey, mvkIv);
}

/**
 * Encrypts and writes an account to the secure store.
 */
export async function saveAccountEncrypted(
  masterKey: CryptoKey,
  account: UserAccount
): Promise<void> {
  const sensitivePayload = JSON.stringify({
    plan: account.plan,
    baseline: account.baseline,
    pinHash: account.pinHash,
    pinSalt: account.pinSalt,
    autoLockMinutes: account.autoLockMinutes,
  });

  const encrypted = await encryptWithKey(masterKey, sensitivePayload);

  const record: StoredEncryptedAccount = {
    id: account.id,
    name: account.name,
    avatarColor: account.avatarColor,
    ciphertext: bytesToBase64(encrypted.ciphertext),
    iv: bytesToBase64(encrypted.iv),
    createdAt: account.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await dbPutEncryptedAccount(record);
}

/**
 * Loads and decrypts all accounts from the secure store using the active Master Vault Key.
 */
export async function loadAllAccountsEncrypted(masterKey: CryptoKey): Promise<UserAccount[]> {
  const stored = await dbGetAllEncryptedAccounts();
  const accounts: UserAccount[] = [];

  for (const item of stored) {
    try {
      const ciphertext = base64ToBytes(item.ciphertext);
      const iv = base64ToBytes(item.iv);
      const decryptedJson = await decryptWithKey(masterKey, ciphertext, iv);
      const parsed = JSON.parse(decryptedJson);

      accounts.push({
        id: item.id,
        name: item.name,
        avatarColor: item.avatarColor,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        plan: validateImportedPlan(parsed.plan),
        baseline: parsed.baseline ? validateImportedPlan(parsed.baseline) : null,
        pinHash: typeof parsed.pinHash === "string" ? parsed.pinHash : undefined,
        pinSalt: typeof parsed.pinSalt === "string" ? parsed.pinSalt : undefined,
        autoLockMinutes: typeof parsed.autoLockMinutes === "number" ? parsed.autoLockMinutes : undefined,
      });
    } catch {
      // Skip corrupt or un-decryptable records
    }
  }

  return accounts;
}

/**
 * Deletes an account from the secure store.
 */
export async function deleteAccountEncrypted(id: string): Promise<void> {
  await dbDeleteEncryptedAccount(id);
}

// ============================================================================
// Safe Non-Destructive Plaintext Migration
// ============================================================================

/**
 * Checks whether legacy plaintext accounts exist in localStorage that have not yet been migrated.
 */
export function hasLegacyPlaintextAccounts(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY_ACCOUNTS);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

/**
 * Reads legacy accounts directly from localStorage without modifying them.
 */
export function readLegacyPlaintextAccounts(): UserAccount[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY_ACCOUNTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((acc) => ({
        ...acc,
        plan: validateImportedPlan(acc.plan),
        baseline: acc.baseline ? validateImportedPlan(acc.baseline) : null,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Performs atomic, non-destructive migration from localStorage plaintext to encrypted IndexedDB.
 *
 * 1. Reads plaintext accounts from localStorage.
 * 2. If no secure vault is initialized, initializes one with the provided secret or a fresh 12-word seed.
 * 3. Encrypts each account with AES-256-GCM and stores in IndexedDB.
 * 4. Verifies round-trip decryption.
 * 5. Only after verification succeeds, marks migration as complete and removes the unencrypted localStorage key.
 */
export async function migrateLegacyAccountsToEncrypted(
  passphraseOrMnemonic?: string,
  iterations: number = PBKDF2_RECOMMENDED_ITERATIONS,
  initialAccounts: UserAccount[] = []
): Promise<{ success: boolean; accountsCount: number; mnemonic: string; masterKey: CryptoKey }> {
  const storedLegacyAccounts = readLegacyPlaintextAccounts();
  const legacyAccounts = storedLegacyAccounts.length ? storedLegacyAccounts : initialAccounts;
  if (legacyAccounts.length === 0) {
    // No legacy data; initialize clean initial account
    const { masterKey, mnemonic } = await initializeSecureVault(passphraseOrMnemonic, iterations);
    const initialAccount: UserAccount = {
      id: 'vault_default',
      name: 'Primary Vault',
      avatarColor: 'nebula',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      plan: structuredClone(SCRATCH_PLAN),
      baseline: null,
    };
    await saveAccountEncrypted(masterKey, initialAccount);
    return { success: true, accountsCount: 1, mnemonic, masterKey };
  }

  // Initialize vault with secret or generated seed
  const { masterKey, mnemonic } = await initializeSecureVault(passphraseOrMnemonic, iterations);

  // Encrypt all legacy accounts into secure storage
  for (const acc of legacyAccounts) {
    await saveAccountEncrypted(masterKey, acc);
  }

  // Verification step: Ensure all accounts decrypt successfully
  const verified = await loadAllAccountsEncrypted(masterKey);
  if (verified.length !== legacyAccounts.length) {
    throw new Error('Migration verification failed: account count mismatch');
  }

  // Successful verification: mark migration and safely clean up plaintext
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      window.localStorage.removeItem('psfi_accounts_pre_encryption_backup');
      window.localStorage.removeItem(LEGACY_STORAGE_KEY_ACCOUNTS);
    }
  } catch {
    // Ignore storage errors
  }

  return { success: true, accountsCount: verified.length, mnemonic, masterKey };
}


// ============================================================================
// Active Session Key & Recovery Management
// ============================================================================

let liveSessionMasterKey: CryptoKey | null = null;
let liveSessionMnemonic: string | null = null;

export function setLiveSessionKey(key: CryptoKey, mnemonic?: string): void {
  liveSessionMasterKey = key;
  if (mnemonic) {
    liveSessionMnemonic = mnemonic;
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('psfi_session_recovery_mnemonic');
      }
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
  }
}

export function getLiveSessionKey(): CryptoKey | null {
  return liveSessionMasterKey;
}

export function getLiveSessionMnemonic(): string | null {
  if (liveSessionMnemonic) return liveSessionMnemonic;
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const saved = window.sessionStorage.getItem('psfi_session_recovery_mnemonic');
      if (saved) {
        liveSessionMnemonic = saved;
        return saved;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

/**
 * Ensures an active Master Vault Key is ready.
 * Reconnects in-memory session key, unlocks via session token, or triggers non-destructive migration.
 */
async function rememberDeviceUnlock(meta: StoredVaultMeta, mnemonic: string): Promise<void> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
  const encrypted = await encryptWithKey(key, mnemonic);
  await dbSetMeta({ ...meta, deviceUnlock: { key, ...encrypted } });
}

export async function recoverDeviceUnlock(secret: string): Promise<void> {
  const meta = await dbGetMeta();
  if (!meta || meta.deviceUnlock) throw new Error('Device recovery is unavailable.');
  await unlockVaultWithSecret(secret);
  await rememberDeviceUnlock(meta, secret);
}

let pendingMasterKey: Promise<{ masterKey: CryptoKey; mnemonic: string }> | null = null;

export async function ensureActiveMasterKey(initialAccounts: UserAccount[] = []): Promise<{ masterKey: CryptoKey; mnemonic: string }> {
  if (liveSessionMasterKey && liveSessionMnemonic) {
    return { masterKey: liveSessionMasterKey, mnemonic: liveSessionMnemonic };
  }
  pendingMasterKey ??= (async () => typeof navigator !== "undefined" && navigator.locks
    ? await navigator.locks.request("psfi-device-initialization", () => openOrInitializeMasterKey(initialAccounts))
    : await openOrInitializeMasterKey(initialAccounts))().finally(() => {
    pendingMasterKey = null;
  });
  return pendingMasterKey;
}

async function openOrInitializeMasterKey(initialAccounts: UserAccount[]): Promise<{ masterKey: CryptoKey; mnemonic: string }> {
  const meta = await dbGetMeta();
  if (meta) {
    const device = meta.deviceUnlock;
    const mnemonic = device
      ? await decryptWithKey(device.key, device.ciphertext, device.iv)
      : getLiveSessionMnemonic();
    if (!mnemonic) {
      throw new Error('Open the original vault tab to finish upgrading device storage.');
    }
    const masterKey = await unlockVaultWithSecret(mnemonic);
    if (!device) await rememberDeviceUnlock(meta, mnemonic);
    setLiveSessionKey(masterKey, mnemonic);
    return { masterKey, mnemonic };
  }
  const result = await migrateLegacyAccountsToEncrypted(undefined, undefined, initialAccounts);
  setLiveSessionKey(result.masterKey, result.mnemonic);
  return result;
}


// ============================================================================
// Multi-Vault Unified Encrypted Bundle Export & Import
// ============================================================================

export interface EncryptedVaultBundleEnvelope {
  psfi_version: number;
  type: 'encrypted_vault_bundle';
  created_at: string;
  accounts_count: number;
  kdf: {
    algorithm: 'PBKDF2-HMAC-SHA256';
    iterations: number;
    salt: string; // base64
  };
  mbk: {
    wrapped: string; // base64
    iv: string; // base64
  };
  payload: {
    ciphertext: string; // base64
    iv: string; // base64
  };
}

/**
 * Exports all user vaults (accounts, plans, baselines) into an AES-256-GCM encrypted
 * master archive bundle wrapped with the user's secret passphrase or 12-word mnemonic.
 */
export async function exportEncryptedVaultBundle(
  masterKey: CryptoKey,
  passphraseOrMnemonic: string,
  iterations: number = PBKDF2_RECOMMENDED_ITERATIONS
): Promise<string> {
  const accounts = await loadAllAccountsEncrypted(masterKey);
  if (accounts.length === 0) {
    throw new Error('No accounts found to export');
  }

  // 1. Generate fresh salt and derive wrapping key from passphrase/mnemonic
  const salt = generateRandomBytes(16);
  const wrappingKey = await deriveWrappingKeyFromSecret(passphraseOrMnemonic, salt, iterations);

  // 2. Generate random Master Bundle Key (MBK)
  const mbk = await generateMasterVaultKey();

  // 3. Encrypt accounts JSON payload with MBK
  const payloadJson = JSON.stringify({
    accounts,
    exported_at: new Date().toISOString(),
  });
  const encryptedPayload = await encryptWithKey(mbk, payloadJson);

  // 4. Wrap MBK with the wrapping key
  const wrappedMbk = await wrapMasterVaultKey(mbk, wrappingKey);

  // 5. Construct envelope
  const envelope: EncryptedVaultBundleEnvelope = {
    psfi_version: CURRENT_CRYPTO_VERSION,
    type: 'encrypted_vault_bundle',
    created_at: new Date().toISOString(),
    accounts_count: accounts.length,
    kdf: {
      algorithm: 'PBKDF2-HMAC-SHA256',
      iterations,
      salt: bytesToBase64(salt),
    },
    mbk: {
      wrapped: bytesToBase64(wrappedMbk.wrappedKey),
      iv: bytesToBase64(wrappedMbk.iv),
    },
    payload: {
      ciphertext: bytesToBase64(encryptedPayload.ciphertext),
      iv: bytesToBase64(encryptedPayload.iv),
    },
  };

  return JSON.stringify(envelope, null, 2);
}

/**
 * Decrypts and validates an encrypted master vault bundle archive, then persists
 * all restored accounts encrypted with the active Master Vault Key.
 */
export async function importEncryptedVaultBundle(
  bundleJson: string,
  passphraseOrMnemonic: string,
  activeMasterKey: CryptoKey
): Promise<{ accountsImported: number; accounts: UserAccount[] }> {
  let envelope: EncryptedVaultBundleEnvelope;
  try {
    envelope = JSON.parse(bundleJson);
  } catch {
    throw new Error('Invalid bundle file: corrupted JSON format');
  }

  if (envelope.type !== 'encrypted_vault_bundle') {
    throw new Error('Invalid file type: expected an encrypted PsFi vault bundle');
  }

  // 1. Recreate wrapping key from salt and passphrase/mnemonic
  const salt = base64ToBytes(envelope.kdf.salt);
  const wrappingKey = await deriveWrappingKeyFromSecret(
    passphraseOrMnemonic,
    salt,
    envelope.kdf.iterations
  );

  // 2. Unwrap Master Bundle Key (MBK)
  let mbk: CryptoKey;
  try {
    mbk = await unwrapMasterVaultKey(
      base64ToBytes(envelope.mbk.wrapped),
      wrappingKey,
      base64ToBytes(envelope.mbk.iv)
    );
  } catch {
    throw new Error('Decryption failed: Incorrect passphrase or recovery mnemonic');
  }

  // 3. Decrypt payload
  let decryptedPayload: string;
  try {
    decryptedPayload = await decryptWithKey(
      mbk,
      base64ToBytes(envelope.payload.ciphertext),
      base64ToBytes(envelope.payload.iv)
    );
  } catch {
    throw new Error('Corrupted bundle payload or integrity check failed');
  }

  const parsed = JSON.parse(decryptedPayload);
  const rawAccounts: UserAccount[] = parsed.accounts || [];
  if (!Array.isArray(rawAccounts) || rawAccounts.length === 0) {
    throw new Error('Bundle contains no valid accounts');
  }

  // 4. Validate and save accounts encrypted under the activeMasterKey
  const validatedAccounts: UserAccount[] = [];
  for (const raw of rawAccounts) {
    const validatedPlan = validateImportedPlan(raw.plan);
    const validatedBaseline = raw.baseline ? validateImportedPlan(raw.baseline) : null;
    const account: UserAccount = {
      id: raw.id || `vault_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: raw.name || 'Restored Vault',
      avatarColor: raw.avatarColor || 'nebula',
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      plan: validatedPlan,
      baseline: validatedBaseline,
    };
    await saveAccountEncrypted(activeMasterKey, account);
    validatedAccounts.push(account);
  }

  return {
    accountsImported: validatedAccounts.length,
    accounts: validatedAccounts,
  };
}

import type { UserAccount, AccountAvatarColor } from '../types/account';
import type { FinancePlan } from '../types/finance';
import { DEFAULT_PLAN, SCRATCH_PLAN, validateImportedPlan } from './finance';
import {
  ensureActiveMasterKey,
  saveAccountEncrypted,
  loadAllAccountsEncrypted,
  deleteAccountEncrypted,
} from './encryptedVaultStorage';

const STORAGE_KEY_ACCOUNTS = 'psfi_accounts_v1';
const STORAGE_KEY_ACTIVE = 'psfi_active_account_id';
const STORAGE_KEY_SESSION_ACCOUNTS = 'psfi_session_accounts';
const LEGACY_STORAGE_KEY = 'psfi_finance_plan_v2';
const LEGACY_BASELINE_KEY = 'psfi_finance_baseline_v2';

let cachedAccounts: UserAccount[] | null = null;

function loadLegacyPlan(): FinancePlan | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return validateImportedPlan(JSON.parse(raw));
  } catch {
    return null;
  }
}

function loadLegacyBaseline(): FinancePlan | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(LEGACY_BASELINE_KEY);
    if (!raw) return null;
    return validateImportedPlan(JSON.parse(raw));
  } catch {
    return null;
  }
}

function isOldSamplePlan(plan: FinancePlan): boolean {
  return plan.income.salary === 120_000 && plan.expenses.housing === 28_000 && plan.savings.monthlySip === 25_000;
}

export function loadAllAccounts(): UserAccount[] {
  if (cachedAccounts && cachedAccounts.length > 0) {
    return cachedAccounts;
  }

  // 1. Check ephemeral session cache
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const sessionRaw = window.sessionStorage.getItem(STORAGE_KEY_SESSION_ACCOUNTS);
      if (sessionRaw) {
        const parsed = JSON.parse(sessionRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedAccounts = parsed.map((acc) => ({
            ...acc,
            plan: validateImportedPlan(acc.plan),
            baseline: acc.baseline ? validateImportedPlan(acc.baseline) : null,
          }));
          return cachedAccounts;
        }
      }
    }
  } catch {
    // Fall through
  }

  // 2. Check persistent storage / legacy storage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedAccounts = parsed.map((acc) => {
            const validated = validateImportedPlan(acc.plan);
            const finalPlan = (acc.id === 'vault_default' && isOldSamplePlan(validated))
              ? structuredClone(SCRATCH_PLAN)
              : validated;
            return {
              ...acc,
              plan: finalPlan,
              baseline: acc.baseline ? validateImportedPlan(acc.baseline) : null,
            };
          });
          return cachedAccounts;
        }
      }
    }
  } catch {
    // Fall through
  }

  // 3. Fallback to initial "Primary Vault" clean state
  const legacyPlan = loadLegacyPlan();
  const legacyBaseline = loadLegacyBaseline();
  const initialPlan = legacyPlan && !isOldSamplePlan(legacyPlan) ? legacyPlan : structuredClone(SCRATCH_PLAN);

  const initialAccount: UserAccount = {
    id: 'vault_default',
    name: 'Primary Vault',
    avatarColor: 'nebula',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plan: initialPlan,
    baseline: legacyBaseline,
  };

  cachedAccounts = [initialAccount];
  saveAllAccounts([initialAccount]);
  setActiveAccountId(initialAccount.id);
  return [initialAccount];
}

/**
 * Asynchronously synchronizes the UI with the encrypted IndexedDB vault.
 */
export async function syncEncryptedVault(): Promise<UserAccount[]> {
  try {
    const { masterKey } = await ensureActiveMasterKey();
    const accounts = await loadAllAccountsEncrypted(masterKey);
    if (accounts.length > 0) {
      cachedAccounts = accounts;
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(STORAGE_KEY_SESSION_ACCOUNTS, JSON.stringify(accounts));
        }
      } catch {
        // Ignore
      }
      return accounts;
    }
  } catch {
    // Ignore error in offline or headless mode
  }
  return cachedAccounts || loadAllAccounts();
}

/**
 * Saves all accounts into memory cache, ephemeral session storage, and encrypted IndexedDB.
 */
export function saveAllAccounts(accounts: UserAccount[]): void {
  cachedAccounts = accounts;

  // Ephemeral tab-level session cache
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(STORAGE_KEY_SESSION_ACCOUNTS, JSON.stringify(accounts));
    }
  } catch {
    // Ignore quota errors in private browsing
  }

  // Asynchronous encrypted persistence to IndexedDB (AES-256-GCM)
  ensureActiveMasterKey()
    .then(({ masterKey }) => {
      for (const acc of accounts) {
        saveAccountEncrypted(masterKey, acc).catch(() => {});
      }
    })
    .catch(() => {});
}

export function getActiveAccountId(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const active = window.localStorage.getItem(STORAGE_KEY_ACTIVE);
      if (active) return active;
    }
  } catch {
    // Ignore
  }
  return 'vault_default';
}

export function setActiveAccountId(id: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY_ACTIVE, id);
    }
  } catch {
    // Ignore
  }
}

export function loadOrCreateDemoAccount(): UserAccount {
  const accounts = loadAllAccounts();
  const existing = accounts.find((a) => a.id === 'vault_demo');
  if (existing) {
    if (existing.plan.income.salary === 0) {
      existing.plan = structuredClone(DEFAULT_PLAN);
      updateExistingAccount(existing);
    }
    setActiveAccountId(existing.id);
    return existing;
  }
  const demoAccount: UserAccount = {
    id: 'vault_demo',
    name: 'Interactive Demo Vault',
    avatarColor: 'solstice',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plan: structuredClone(DEFAULT_PLAN),
    baseline: null,
  };
  const updated = [...accounts, demoAccount];
  saveAllAccounts(updated);
  setActiveAccountId(demoAccount.id);
  return demoAccount;
}

export function createNewAccount(
  name: string,
  plan: FinancePlan,
  avatarColor: AccountAvatarColor = 'quasar'
): UserAccount {
  const accounts = loadAllAccounts();
  const newAccount: UserAccount = {
    id: `vault_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim() || 'My Vault',
    avatarColor,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plan,
    baseline: null,
  };

  const updated = [...accounts, newAccount];
  saveAllAccounts(updated);
  setActiveAccountId(newAccount.id);
  return newAccount;
}

export function updateExistingAccount(updatedAccount: UserAccount): void {
  const accounts = loadAllAccounts();
  const next = accounts.map((acc) =>
    acc.id === updatedAccount.id ? { ...updatedAccount, updatedAt: new Date().toISOString() } : acc
  );
  saveAllAccounts(next);
}

export function setAccountPin(accountId: string, pinHash: string, pinSalt: string, autoLockMinutes: number = 0): void {
  const accounts = loadAllAccounts();
  const next = accounts.map((acc) => {
    if (acc.id === accountId) {
      return {
        ...acc,
        pinHash,
        pinSalt,
        autoLockMinutes,
        updatedAt: new Date().toISOString(),
      };
    }
    return acc;
  });
  saveAllAccounts(next);
}

export function removeAccountPin(accountId: string): void {
  const accounts = loadAllAccounts();
  const next = accounts.map((acc) => {
    if (acc.id === accountId) {
      const copy = { ...acc };
      delete copy.pinHash;
      delete copy.pinSalt;
      delete copy.autoLockMinutes;
      copy.updatedAt = new Date().toISOString();
      return copy;
    }
    return acc;
  });
  saveAllAccounts(next);
}

export function removeAccount(id: string): UserAccount[] {
  const accounts = loadAllAccounts();
  const filtered = accounts.filter((acc) => acc.id !== id);
  if (filtered.length === 0) {
    const fresh: UserAccount = {
      id: 'vault_default',
      name: 'Primary Vault',
      avatarColor: 'nebula',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      plan: SCRATCH_PLAN,
      baseline: null,
    };
    saveAllAccounts([fresh]);
    setActiveAccountId(fresh.id);
    return [fresh];
  }

  saveAllAccounts(filtered);
  deleteAccountEncrypted(id).catch(() => {});
  const activeId = getActiveAccountId();
  if (activeId === id) {
    setActiveAccountId(filtered[0].id);
  }
  return filtered;
}

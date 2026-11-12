import type { UserAccount, AccountAvatarColor } from '../types/account';
import type { FinancePlan } from '../types/finance';
import { DEFAULT_PLAN, validateImportedPlan } from './finance';

const STORAGE_KEY_ACCOUNTS = 'psfi_accounts_v1';
const STORAGE_KEY_ACTIVE = 'psfi_active_account_id';
const LEGACY_STORAGE_KEY = 'psfi_finance_plan_v2';
const LEGACY_BASELINE_KEY = 'psfi_finance_baseline_v2';

function loadLegacyPlan(): FinancePlan | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    return validateImportedPlan(JSON.parse(raw));
  } catch {
    return null;
  }
}

function loadLegacyBaseline(): FinancePlan | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_BASELINE_KEY);
    if (!raw) return null;
    return validateImportedPlan(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function loadAllAccounts(): UserAccount[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((acc) => ({
          ...acc,
          plan: validateImportedPlan(acc.plan),
          baseline: acc.baseline ? validateImportedPlan(acc.baseline) : null,
        }));
      }
    }
  } catch {
    // fallback to legacy or default
  }

  // Migrate legacy data if available, or create initial "Primary Vault"
  const legacyPlan = loadLegacyPlan();
  const legacyBaseline = loadLegacyBaseline();
  const initialAccount: UserAccount = {
    id: 'vault_default',
    name: 'Primary Vault',
    avatarColor: 'nebula',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plan: legacyPlan ?? DEFAULT_PLAN,
    baseline: legacyBaseline,
  };

  saveAllAccounts([initialAccount]);
  setActiveAccountId(initialAccount.id);
  return [initialAccount];
}

export function saveAllAccounts(accounts: UserAccount[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  } catch {
    // Ignore quota errors in private browsing
  }
}

export function getActiveAccountId(): string {
  try {
    const active = window.localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (active) return active;
  } catch {
    // Ignore
  }
  return 'vault_default';
}

export function setActiveAccountId(id: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_ACTIVE, id);
  } catch {
    // Ignore
  }
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

export function removeAccount(id: string): UserAccount[] {
  const accounts = loadAllAccounts();
  const filtered = accounts.filter((acc) => acc.id !== id);
  if (filtered.length === 0) {
    // Always keep at least one account
    const fresh: UserAccount = {
      id: 'vault_default',
      name: 'Primary Vault',
      avatarColor: 'nebula',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      plan: DEFAULT_PLAN,
      baseline: null,
    };
    saveAllAccounts([fresh]);
    setActiveAccountId(fresh.id);
    return [fresh];
  }

  saveAllAccounts(filtered);
  const activeId = getActiveAccountId();
  if (activeId === id) {
    setActiveAccountId(filtered[0].id);
  }
  return filtered;
}

import { useCallback, useEffect, useState } from 'react';
import type { ExportEnvelope, FinancePlan } from '../types/finance';
import type { UserAccount, AccountAvatarColor } from '../types/account';
import {
  DEFAULT_PLAN,
  calculateProjections,
  planToCSV,
  validateImportedPlan,
} from '../lib/finance';
import {
  loadAllAccounts,
  saveAllAccounts,
  getActiveAccountId,
  setActiveAccountId,
  createNewAccount,
  removeAccount,
  loadOrCreateDemoAccount,
} from '../lib/accountStorage';

export function useFinancePlan() {
  const [accounts, setAccounts] = useState<UserAccount[]>(() => loadAllAccounts());
  const [activeId, setActiveIdState] = useState<string>(() => getActiveAccountId());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Current active account
  const activeAccount = accounts.find((a) => a.id === activeId) ?? accounts[0];

  const plan = activeAccount?.plan ?? DEFAULT_PLAN;
  const baseline = activeAccount?.baseline ?? null;

  // Sync active account whenever accounts or activeId change
  useEffect(() => {
    saveAllAccounts(accounts);
  }, [accounts]);

  const setPlan = useCallback(
    (nextPlan: FinancePlan) => {
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === activeId
            ? { ...acc, plan: nextPlan, updatedAt: new Date().toISOString() }
            : acc
        )
      );
    },
    [activeId]
  );

  const setBaseline = useCallback(
    (nextBaseline: FinancePlan | null) => {
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === activeId
            ? { ...acc, baseline: nextBaseline, updatedAt: new Date().toISOString() }
            : acc
        )
      );
    },
    [activeId]
  );

  const pinBaseline = useCallback(() => {
    setBaseline(structuredClone(plan));
    setStatusMessage('Pinned current plan as Baseline for comparison.');
  }, [plan, setBaseline]);

  const clearBaseline = useCallback(() => {
    setBaseline(null);
    setStatusMessage('Cleared Baseline comparison.');
  }, [setBaseline]);

  const resetToDefaults = useCallback(() => {
    setPlan(DEFAULT_PLAN);
    setStatusMessage('Reset vault to default values.');
  }, [setPlan]);

  const switchAccount = useCallback((id: string) => {
    setActiveIdState(id);
    setActiveAccountId(id);
    const target = accounts.find((a) => a.id === id);
    if (target) {
      setStatusMessage(`Switched to "${target.name}".`);
    }
  }, [accounts]);

  const launchDemoVault = useCallback(() => {
    const demo = loadOrCreateDemoAccount();
    setAccounts(loadAllAccounts());
    setActiveIdState(demo.id);
    setActiveAccountId(demo.id);
    setStatusMessage('Loaded Interactive Demo Vault (pre-configured Indian tech professional profile).');
    return demo;
  }, []);

  const createVaultAndSwitch = useCallback(
    (name: string, initialPlan: FinancePlan, avatarColor: AccountAvatarColor = 'quasar') => {
      const created = createNewAccount(name, initialPlan, avatarColor);
      setAccounts(loadAllAccounts());
      setActiveIdState(created.id);
      setActiveAccountId(created.id);
      setStatusMessage(`Created and opened new vault "${created.name}".`);
      return created;
    },
    []
  );

  const deleteVault = useCallback(
    (id: string) => {
      const remaining = removeAccount(id);
      setAccounts(remaining);
      const newActive = getActiveAccountId();
      setActiveIdState(newActive);
      setStatusMessage('Vault deleted.');
    },
    []
  );

  const renameActiveVault = useCallback(
    (newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === activeId
            ? { ...acc, name: trimmed, updatedAt: new Date().toISOString() }
            : acc
        )
      );
      setStatusMessage(`Renamed vault to "${trimmed}".`);
    },
    [activeId]
  );

  const exportJSON = useCallback(() => {
    const payload: ExportEnvelope = {
      app: 'psfi-finance-control-center',
      exportedAt: new Date().toISOString(),
      plan,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `psfi-${activeAccount.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Exported JSON vault snapshot.');
  }, [plan, activeAccount.name]);

  const exportCSV = useCallback(
    (months: number) => {
      const projections = calculateProjections(plan, months, baseline);
      const csv = planToCSV(plan, projections);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `psfi-${activeAccount.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-projections-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('Exported CSV summary & projections.');
    },
    [plan, baseline, activeAccount.name]
  );

  const importJSON = useCallback(
    async (file: File) => {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const validated = validateImportedPlan(parsed);
      setPlan(validated);
      setStatusMessage(`Imported plan into "${activeAccount.name}".`);
    },
    [setPlan, activeAccount.name]
  );

  return {
    plan,
    setPlan,
    baseline,
    pinBaseline,
    clearBaseline,
    resetToDefaults,
    exportJSON,
    exportCSV,
    importJSON,
    accounts,
    activeAccount,
    switchAccount,
    launchDemoVault,
    createVaultAndSwitch,
    deleteVault,
    renameActiveVault,
    refreshAccounts: () => setAccounts(loadAllAccounts()),
    statusMessage,
    setStatusMessage,
  };
}

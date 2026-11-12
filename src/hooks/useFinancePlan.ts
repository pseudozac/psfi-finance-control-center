import { useCallback, useEffect, useState } from 'react';
import type { ExportEnvelope, FinancePlan } from '../types/finance';
import { DEFAULT_PLAN, calculateProjections, planToCSV, validateImportedPlan } from '../lib/finance';

const STORAGE_KEY = 'psfi_finance_plan_v2';
const BASELINE_KEY = 'psfi_finance_baseline_v2';

function loadStoredPlan(key: string): FinancePlan | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return validateImportedPlan(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function useFinancePlan() {
  const [plan, setPlan] = useState<FinancePlan>(() => loadStoredPlan(STORAGE_KEY) ?? DEFAULT_PLAN);
  const [baseline, setBaseline] = useState<FinancePlan | null>(() => loadStoredPlan(BASELINE_KEY));
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    } catch {
      // Ignore storage quota errors in private browsing
    }
  }, [plan]);

  useEffect(() => {
    try {
      if (baseline) {
        window.localStorage.setItem(BASELINE_KEY, JSON.stringify(baseline));
      } else {
        window.localStorage.removeItem(BASELINE_KEY);
      }
    } catch {
      // Ignore storage quota errors
    }
  }, [baseline]);

  const pinBaseline = useCallback(() => {
    setBaseline(structuredClone(plan));
    setStatusMessage('Pinned current plan as Baseline for What-If comparison.');
  }, [plan]);

  const clearBaseline = useCallback(() => {
    setBaseline(null);
    setStatusMessage('Cleared Baseline comparison.');
  }, []);

  const resetToDefaults = useCallback(() => {
    setPlan(DEFAULT_PLAN);
    setStatusMessage('Reset plan to default values.');
  }, []);

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
    a.download = `psfi-plan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Exported JSON plan snapshot.');
  }, [plan]);

  const exportCSV = useCallback(
    (months: number) => {
      const projections = calculateProjections(plan, months, baseline);
      const csv = planToCSV(plan, projections);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `psfi-projections-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('Exported CSV summary & projections.');
    },
    [plan, baseline]
  );

  const importJSON = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const validated = validateImportedPlan(parsed);
    setPlan(validated);
    setStatusMessage(`Imported plan from ${file.name}.`);
  }, []);

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
    statusMessage,
    setStatusMessage,
  };
}

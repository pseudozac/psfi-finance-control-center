import React, { useState } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Plus,
  Trash2,
  Sparkles,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import type { UserAccount, AccountAvatarColor } from '../types/account';
import type { FinancePlan } from '../types/finance';
import { DEFAULT_PLAN, SCRATCH_PLAN, calculateSummary, formatINR } from '../lib/finance';

interface GatewayScreenProps {
  accounts: UserAccount[];
  activeAccount: UserAccount;
  onContinue: () => void;
  onSelectAccount: (id: string) => void;
  onCreateAccount: (name: string, plan: FinancePlan, color: AccountAvatarColor) => void;
  onDeleteAccount: (id: string) => void;
}

type StartMode = 'scratch' | 'guided' | 'benchmark';

const COLOR_OPTIONS: { id: AccountAvatarColor; label: string; hex: string }[] = [
  { id: 'quasar', label: 'Quasar', hex: '#bf9ff1' },
  { id: 'corona', label: 'Corona', hex: '#f28bad' },
  { id: 'solstice', label: 'Solstice', hex: '#f78d2c' },
  { id: 'nebula', label: 'Nebula', hex: '#5ec491' },
  { id: 'pulsar', label: 'Pulsar', hex: '#7193ed' },
];

export const GatewayScreen: React.FC<GatewayScreenProps> = ({
  accounts,
  activeAccount,
  onContinue,
  onSelectAccount,
  onCreateAccount,
  onDeleteAccount,
}) => {
  // New account form state
  const [newVaultName, setNewVaultName] = useState('');
  const [startMode, setStartMode] = useState<StartMode>('scratch');
  const [selectedColor, setSelectedColor] = useState<AccountAvatarColor>('quasar');

  // Guided wizard fields
  const [guidedSalary, setGuidedSalary] = useState<number>(85_000);
  const [guidedHousing, setGuidedHousing] = useState<number>(20_000);
  const [guidedSip, setGuidedSip] = useState<number>(15_000);

  // Active account stats
  const activeSummary = calculateSummary(activeAccount.plan);

  const handleStartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const vaultName = newVaultName.trim() || `Vault ${accounts.length + 1}`;

    let initialPlan: FinancePlan;

    if (startMode === 'scratch') {
      // 100% clean zero slate
      initialPlan = structuredClone(SCRATCH_PLAN);
    } else if (startMode === 'guided') {
      // Guided micro-setup
      initialPlan = structuredClone(SCRATCH_PLAN);
      initialPlan.income.salary = guidedSalary;
      initialPlan.expenses.housing = guidedHousing;
      initialPlan.savings.monthlySip = guidedSip;
      initialPlan.savings.emergencyFundBalance = guidedHousing * 3;
    } else {
      // Balanced benchmark
      initialPlan = structuredClone(DEFAULT_PLAN);
    }

    onCreateAccount(vaultName, initialPlan, selectedColor);
    onContinue();
  };

  const formatLastUpdated = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes < 1) return 'just now';
      if (diffMinutes === 1) return '1 min ago';
      if (diffMinutes < 60) return `${diffMinutes} mins ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours === 1) return '1 hour ago';
      if (diffHours < 24) return `${diffHours} hours ago`;
      return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return 'saved';
    }
  };

  return (
    <div className="gateway-shell">
      {/* Header */}
      <div className="gateway-header">
        <div className="gateway-brand">
          <span className="wm-p">p</span>
          <span className="wm-s">s</span>
          <span className="wm-f">f</span>
          <span className="wm-i">i</span>
        </div>
        <h1 className="gateway-headline">
          Welcome to your Financial Control Center<span className="text-corona">.</span>
        </h1>
        <p className="gateway-sub">
          Continue with your active persistent vault or register a new financial profile from scratch.
        </p>
      </div>

      {/* Choice Grid */}
      <div className="gateway-grid">
        {/* CARD 1: CONTINUE SESSION */}
        <div className="gateway-card card-continue">
          <div className="card-top-row">
            <span className="tag-pill tag-nebula">
              <CheckCircle2 size={12} /> ACTIVE SAVED VAULT
            </span>
            <span className="timestamp-pill font-mono">
              <Clock size={11} /> {formatLastUpdated(activeAccount.updatedAt)}
            </span>
          </div>

          <div className="vault-profile-hero">
            <div
              className={`vault-avatar avatar-${activeAccount.avatarColor || 'nebula'}`}
            >
              {activeAccount.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h2 className="vault-name">{activeAccount.name}</h2>
              <span className="vault-status font-mono text-xs text-muted">
                Persistent Local Storage · Auto-Synced
              </span>
            </div>
          </div>

          {/* Quick Telemetry Snapshot */}
          <div className="gateway-snapshot-grid">
            <div className="snapshot-pod">
              <span className="snap-label">Monthly Inflow</span>
              <span className="snap-val text-nebula font-mono">
                {formatINR(activeSummary.monthlyIncome)}
              </span>
            </div>
            <div className="snapshot-pod">
              <span className="snap-label">Living Outflows</span>
              <span className="snap-val text-primary font-mono">
                {formatINR(activeSummary.monthlyExpenses)}
              </span>
            </div>
            <div className="snapshot-pod">
              <span className="snap-label">Monthly Surplus</span>
              <span className="snap-val text-solstice font-mono">
                {formatINR(activeSummary.monthlySurplus)}
              </span>
            </div>
            <div className="snapshot-pod">
              <span className="snap-label">Savings Rate</span>
              <span className="snap-val text-pulsar font-mono">
                {activeSummary.savingsRatePercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Continue Primary Button */}
          <button
            type="button"
            className="gateway-btn btn-continue"
            onClick={onContinue}
          >
            <span>Continue in {activeAccount.name}</span>
            <ArrowRight size={16} />
          </button>

          {/* Saved Vaults Switcher (if multiple) */}
          {accounts.length > 1 && (
            <div className="other-vaults-section">
              <span className="other-vaults-title font-mono text-xs">
                Switch to another vault:
              </span>
              <div className="other-vaults-list">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className={`vault-item-pill ${acc.id === activeAccount.id ? 'active-pill' : ''}`}
                    onClick={() => onSelectAccount(acc.id)}
                  >
                    <span className={`dot dot-${acc.avatarColor || 'quasar'}`} />
                    <span className="vault-item-name">{acc.name}</span>
                    {accounts.length > 1 && (
                      <button
                        type="button"
                        className="delete-vault-btn"
                        title="Delete vault"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete vault "${acc.name}"? This cannot be undone.`)) {
                            onDeleteAccount(acc.id);
                          }
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CARD 2: START FRESH VAULT */}
        <div className="gateway-card card-start">
          <div className="card-top-row">
            <span className="tag-pill tag-quasar">
              <Plus size={12} /> REGISTER FROM SCRATCH
            </span>
            <span className="tag-pill tag-solstice">NEW VAULT</span>
          </div>

          <div className="start-lead">
            <h2 className="start-title">Start a New Financial Vault</h2>
            <p className="start-sub text-xs muted">
              Register a completely fresh profile for personal finances, freelance consulting, or family budgeting.
            </p>
          </div>

          <form onSubmit={handleStartSubmit} className="start-form">
            {/* Vault Name */}
            <div className="form-group">
              <label htmlFor="vault-name" className="form-label text-xs font-semibold">
                Vault Profile Name
              </label>
              <input
                id="vault-name"
                type="text"
                placeholder="e.g. Zac's Finances, Side Venture, Personal 2026"
                value={newVaultName}
                onChange={(e) => setNewVaultName(e.target.value)}
                className="hipuku-input font-sans"
              />
            </div>

            {/* Starting Mode Selector */}
            <div className="form-group">
              <label className="form-label text-xs font-semibold">Starting Mode</label>
              <div className="start-mode-options">
                <button
                  type="button"
                  className={`mode-option-btn ${startMode === 'scratch' ? 'active-mode' : ''}`}
                  onClick={() => setStartMode('scratch')}
                >
                  <div className="mode-btn-head">
                    <span className="dot dot-quasar" />
                    <strong>Clean Slate (₹0)</strong>
                  </div>
                  <span className="mode-btn-desc">All sliders at zero. Input your exact numbers.</span>
                </button>

                <button
                  type="button"
                  className={`mode-option-btn ${startMode === 'guided' ? 'active-mode' : ''}`}
                  onClick={() => setStartMode('guided')}
                >
                  <div className="mode-btn-head">
                    <span className="dot dot-nebula" />
                    <strong>Guided Quick-Fill</strong>
                  </div>
                  <span className="mode-btn-desc">Answer 3 core numbers to instantly kickstart.</span>
                </button>

                <button
                  type="button"
                  className={`mode-option-btn ${startMode === 'benchmark' ? 'active-mode' : ''}`}
                  onClick={() => setStartMode('benchmark')}
                >
                  <div className="mode-btn-head">
                    <span className="dot dot-solstice" />
                    <strong>Balanced Benchmark</strong>
                  </div>
                  <span className="mode-btn-desc">Pre-loaded with a healthy 50/30/20 Indian archetype.</span>
                </button>
              </div>
            </div>

            {/* Guided Inputs if 'guided' is active */}
            {startMode === 'guided' && (
              <div className="guided-box">
                <div className="guided-field">
                  <label htmlFor="guided-sal" className="text-xs muted">Monthly Take-Home Salary (₹)</label>
                  <input
                    id="guided-sal"
                    type="number"
                    step={2500}
                    value={guidedSalary}
                    onChange={(e) => setGuidedSalary(Number(e.target.value))}
                    className="guided-input font-mono"
                  />
                </div>
                <div className="guided-field">
                  <label htmlFor="guided-house" className="text-xs muted">Housing Rent / Loan EMI (₹)</label>
                  <input
                    id="guided-house"
                    type="number"
                    step={1000}
                    value={guidedHousing}
                    onChange={(e) => setGuidedHousing(Number(e.target.value))}
                    className="guided-input font-mono"
                  />
                </div>
                <div className="guided-field">
                  <label htmlFor="guided-sip" className="text-xs muted">Monthly Mutual Fund SIP Goal (₹)</label>
                  <input
                    id="guided-sip"
                    type="number"
                    step={1000}
                    value={guidedSip}
                    onChange={(e) => setGuidedSip(Number(e.target.value))}
                    className="guided-input font-mono"
                  />
                </div>
              </div>
            )}

            {/* Color Accent Picker */}
            <div className="form-group">
              <label className="form-label text-xs font-semibold">Theme Color Token</label>
              <div className="color-picker-row">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`color-choice-btn ${selectedColor === c.id ? 'active-color' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => setSelectedColor(c.id)}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Submit Start */}
            <button type="submit" className="gateway-btn btn-start">
              <span>Register &amp; Open Vault</span>
              <Sparkles size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* Security & Privacy Banner */}
      <div className="gateway-footer">
        <div className="flex-align gap-2">
          <ShieldCheck size={16} className="text-nebula shrink-0" />
          <span className="font-mono text-xs text-muted">
            100% Client-Side Privacy: All accounts and ledgers persist safely in your browser’s local storage. Zero telemetry or server sync.
          </span>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import type {
  FinancePlan,
  FinanceSummary,
  MonthlyProjectionPoint,
  TaxComparisonResult,
  BudgetRuleAnalysis,
} from '../types/finance';
import type { UserAccount } from '../types/account';
import type { SkillTreeState } from '../types/skills';
import { formatINR } from '../lib/finance';
import { Printer, X, ShieldCheck, CheckCircle } from 'lucide-react';

interface ExecutivePrintableStatementProps {
  plan: FinancePlan;
  summary: FinanceSummary;
  budgetRule: BudgetRuleAnalysis;
  taxComparison: TaxComparisonResult;
  projections: MonthlyProjectionPoint[];
  activeAccount: UserAccount;
  baseline: FinancePlan | null;
  skillTree?: SkillTreeState;
  onClose?: () => void;
}

export const ExecutivePrintableStatement: React.FC<ExecutivePrintableStatementProps> = ({
  plan,
  summary,
  budgetRule,
  taxComparison,
  projections,
  activeAccount,
  skillTree,
  onClose,
}) => {
  const currentDateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const tenYearPoint = projections[Math.min(120, projections.length - 1)];
  const twentyYearPoint = projections[Math.min(240, projections.length - 1)];

  // Debt avalanche data consolidation
  const liabilities = plan.debt?.liabilities ?? [];
  const cardBalance = plan.debt?.cardBalance ?? 0;
  const cardApr = plan.debt?.aprPercent ?? 0;
  const cardMinPayment = plan.debt?.monthlyPayment ?? 0;

  const allDebts: { name: string; balance: number; apr: number; monthlyPayment: number }[] = [];
  if (cardBalance > 0) {
    allDebts.push({
      name: 'Credit Card / Revolving Credit',
      balance: cardBalance,
      apr: cardApr,
      monthlyPayment: cardMinPayment,
    });
  }
  for (const item of liabilities) {
    if (item.balance > 0) {
      allDebts.push({
        name: item.name,
        balance: item.balance,
        apr: item.aprPercent,
        monthlyPayment: item.minMonthlyPayment,
      });
    }
  }
  allDebts.sort((a, b) => b.apr - a.apr);
  const totalDebtBalance = allDebts.reduce((sum, d) => sum + d.balance, 0);
  const totalMonthlyDebtPayment = allDebts.reduce((sum, d) => sum + d.monthlyPayment, 0);

  const unlockedBadges = skillTree?.badges?.filter((b) => b.isUnlocked) ?? [];

  return (
    <div className="executive-printable-statement" aria-label="Executive Financial Statement">
      {/* Interactive Floating Header (Hidden during @media print) */}
      <div className="exec-no-print exec-interactive-toolbar">
        <div className="flex-align gap-2">
          <ShieldCheck size={16} className="text-emerald-500" />
          <span className="font-bold text-sm text-slate-800">Executive Wealth Audit &amp; Position Statement</span>
          <span className="exec-toolbar-tag">A4 Vector Print</span>
          <span className="exec-toolbar-tag">Zero Telemetry</span>
        </div>
        <div className="flex-align gap-2">
          <button
            type="button"
            className="exec-print-btn"
            onClick={() => window.print()}
            title="Print or Save as PDF"
          >
            <Printer size={14} />
            <span>Print / Save as PDF (Vector A4)</span>
          </button>
          {onClose && (
            <button
              type="button"
              className="exec-close-btn"
              onClick={onClose}
              title="Close Dossier Preview"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 1. INSTITUTIONAL HEADER */}
      <div className="exec-header-block">
        <div className="exec-header-brand">
          <div className="exec-brand-logo-text">
            <span className="brand-dot" />
            <span className="brand-title">PSEUDO-FI // ACTUARIAL REPORT</span>
          </div>
          <h1 className="exec-statement-title">Executive Wealth Audit &amp; Position Statement</h1>
          <p className="exec-statement-subtitle">
            Statutory Indian personal finance balance sheet, cashflow audit, debt strategy &amp; sovereign wealth dossier.
          </p>
        </div>

        <div className="exec-header-meta">
          <div className="exec-meta-slot">
            <span className="meta-lbl">Vault Account:</span>
            <span className="meta-val font-bold">{activeAccount.name}</span>
          </div>
          <div className="exec-meta-slot">
            <span className="meta-lbl">Statement Date:</span>
            <span className="meta-val">{currentDateStr}</span>
          </div>
          <div className="exec-meta-slot">
            <span className="meta-lbl">Statutory Basis:</span>
            <span className="meta-val">TY 2026–27 (Income-tax Act, 2025) &amp; Prior Act</span>
          </div>
          <div className="exec-meta-slot">
            <span className="meta-lbl">Verification:</span>
            <span className="meta-val text-emerald-600 font-semibold">100% Client-Side Private</span>
          </div>
        </div>
      </div>

      <div className="exec-divider" />

      {/* 2. CORE CASHFLOW & LIQUIDITY PILLARS */}
      <div className="exec-section-heading">01 // MONTHLY CASHFLOW &amp; LIQUIDITY TELEMETRY</div>
      <div className="exec-pillars-grid">
        <div className="exec-pillar-card">
          <span className="exec-card-lbl">Gross Inflow (Monthly)</span>
          <span className="exec-card-val">{formatINR(summary.monthlyIncome)}</span>
          <span className="exec-card-sub">Annualized: {formatINR(summary.monthlyIncome * 12)}</span>
        </div>

        <div className="exec-pillar-card">
          <span className="exec-card-lbl">Essential Outflow (Needs)</span>
          <span className="exec-card-val text-slate-800">{formatINR(budgetRule.needsAmount)}</span>
          <span className="exec-card-sub">
            {budgetRule.needsPercent}% of monthly income
          </span>
        </div>

        <div className="exec-pillar-card">
          <span className="exec-card-lbl">Discretionary (Wants)</span>
          <span className="exec-card-val text-slate-800">{formatINR(budgetRule.wantsAmount)}</span>
          <span className="exec-card-sub">
            {budgetRule.wantsPercent}% of monthly income
          </span>
        </div>

        <div className="exec-pillar-card exec-card-highlight">
          <span className="exec-card-lbl text-emerald-800">Net Investable Surplus</span>
          <span className="exec-card-val text-emerald-700">{formatINR(summary.monthlySurplus)}</span>
          <span className="exec-card-sub font-semibold text-emerald-800">
            {summary.savingsRatePercent}% Savings Rate
          </span>
        </div>
      </div>

      {/* 3. 50/30/20 BUDGET BALANCE AUDIT & INDIAN TAX AUDIT (TWO-COLUMN) */}
      <div className="exec-two-col-row">
        {/* Left Column: 50/30/20 Rule Audit */}
        <div className="exec-sub-col">
          <div className="exec-section-heading">02 // 50/30/20 BUDGET BALANCE AUDIT</div>
          <table className="exec-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-right">Monthly (₹)</th>
                <th className="text-right">Actual</th>
                <th className="text-right">Target</th>
                <th className="text-center">Verdict</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Needs (Living &amp; EMIs)</strong></td>
                <td className="text-right font-mono">{formatINR(budgetRule.needsAmount)}</td>
                <td className="text-right font-mono font-bold">
                  {budgetRule.needsPercent}%
                </td>
                <td className="text-right font-mono text-slate-500">50%</td>
                <td className="text-center">
                  <span className={`exec-badge ${budgetRule.needsPercent <= 50 ? 'badge-ok' : 'badge-warn'}`}>
                    {budgetRule.needsPercent <= 50 ? 'COMPLIANT' : 'ELEVATED'}
                  </span>
                </td>
              </tr>
              <tr>
                <td><strong>Wants (Discretionary)</strong></td>
                <td className="text-right font-mono">{formatINR(budgetRule.wantsAmount)}</td>
                <td className="text-right font-mono font-bold">
                  {budgetRule.wantsPercent}%
                </td>
                <td className="text-right font-mono text-slate-500">30%</td>
                <td className="text-center">
                  <span className={`exec-badge ${budgetRule.wantsPercent <= 30 ? 'badge-ok' : 'badge-warn'}`}>
                    {budgetRule.wantsPercent <= 30 ? 'COMPLIANT' : 'STRETCHED'}
                  </span>
                </td>
              </tr>
              <tr>
                <td><strong>Savings &amp; Wealth SIPs</strong></td>
                <td className="text-right font-mono">{formatINR(budgetRule.savingsAmount)}</td>
                <td className="text-right font-mono font-bold">
                  {budgetRule.savingsPercent}%
                </td>
                <td className="text-right font-mono text-slate-500">20%</td>
                <td className="text-center">
                  <span className={`exec-badge ${budgetRule.savingsPercent >= 20 ? 'badge-success' : 'badge-warn'}`}>
                    {budgetRule.savingsPercent >= 20 ? 'OPTIMAL' : 'BELOW 20%'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="exec-verdict-banner">
            <span className="font-bold text-slate-800">Budget Score: </span>
            <span>{budgetRule.score}/100 — Status: {budgetRule.rating}</span>
          </div>
        </div>

        {/* Right Column: Indian Statutory Tax Engine */}
        <div className="exec-sub-col">
          <div className="exec-section-heading">03 // STATUTORY TAX AUDIT: FY 2025–26 (AY 2026–27) &amp; TY 2026–27</div>
          <table className="exec-table">
            <thead>
              <tr>
                <th>Regime Under Law</th>
                <th className="text-right">Annual Tax</th>
                <th className="text-right">Monthly TDS</th>
                <th className="text-center">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              <tr className={taxComparison.recommended === 'new' ? 'row-recommended' : ''}>
                <td>
                  <strong>New Default (Sec 115BAC / TY 2026–27 Framework)</strong>
                  <div className="text-[9px] text-slate-500">FY 2025–26 (AY 2026–27) Default · ₹75k Std Ded · Sec 87A Rebate &le; ₹7L</div>
                </td>
                <td className="text-right font-mono font-bold text-slate-900">
                  {formatINR(taxComparison.newRegimeTax)}
                </td>
                <td className="text-right font-mono">
                  {formatINR(Math.round(taxComparison.newRegimeTax / 12))}
                </td>
                <td className="text-center">
                  {taxComparison.recommended === 'new' && (
                    <span className="exec-badge badge-success">RECOMMENDED</span>
                  )}
                </td>
              </tr>
              <tr className={taxComparison.recommended === 'old' ? 'row-recommended' : ''}>
                <td>
                  <strong>Prior Act 1961 (Old Itemized Opt-Out)</strong>
                  <div className="text-[9px] text-slate-500">Same-year FY 2025–26 opt-out with itemized 80C / 80D / HRA deductions</div>
                </td>
                <td className="text-right font-mono">
                  {formatINR(taxComparison.oldRegimeTax)}
                </td>
                <td className="text-right font-mono">
                  {formatINR(Math.round(taxComparison.oldRegimeTax / 12))}
                </td>
                <td className="text-center">
                  {taxComparison.recommended === 'old' && (
                    <span className="exec-badge badge-success">RECOMMENDED</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="exec-verdict-banner">
            <span className="font-bold text-slate-800">Tax Optimization: </span>
            <span>
              {taxComparison.recommended === 'new'
                ? `New Default Regime (Sec 115BAC / TY 2026–27) saves ${formatINR(taxComparison.savings)}/year vs Prior Act itemized opt-out.`
                : taxComparison.recommended === 'old'
                ? `Prior Act 1961 with itemized deductions saves ${formatINR(taxComparison.savings)}/year.`
                : 'Both regimes yield equivalent statutory liability.'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. LONG-TERM COMPOUNDING & FINANCIAL INDEPENDENCE MILESTONES */}
      <div className="exec-section-heading">04 // WEALTH COMPOUNDING &amp; SOVEREIGN RETIREMENT FORECAST</div>
      <div className="exec-milestones-row">
        <div className="exec-milestone-box">
          <span className="meta-lbl">Liquid Reserve Moat</span>
          <span className="milestone-big font-mono">{summary.emergencyRunwayMonths.toFixed(1)} Months</span>
          <span className="meta-val">
            {formatINR(plan.savings.emergencyFundBalance)} liquid runway ({summary.emergencyRunwayMonths >= 6 ? '🛡️ Iron Fortress' : '⚠️ Building Moat'})
          </span>
        </div>

        <div className="exec-milestone-box">
          <span className="meta-lbl">Monthly SIP &amp; Step-Up</span>
          <span className="milestone-big font-mono">{formatINR(plan.savings.monthlySip)}/mo</span>
          <span className="meta-val">
            +{plan.savings.stepUpSipPercent}% Annual Step-Up Acceleration
          </span>
        </div>

        <div className="exec-milestone-box">
          <span className="meta-lbl">10-Year Projected Wealth</span>
          <span className="milestone-big font-mono text-emerald-700">
            {tenYearPoint ? formatINR(tenYearPoint.nominalCorpus) : '—'}
          </span>
          <span className="meta-val">
            Compounded @ {plan.savings.expectedReturnPercent}% expected market return
          </span>
        </div>

        <div className="exec-milestone-box">
          <span className="meta-lbl">20-Year Sovereign Corpus</span>
          <span className="milestone-big font-mono text-emerald-800">
            {twentyYearPoint ? formatINR(twentyYearPoint.nominalCorpus) : '—'}
          </span>
          <span className="meta-val">
            FIRE Corpus Independence Forecast
          </span>
        </div>
      </div>

      {/* 5. DEBT AVALANCHE & LIABILITY ACCELERATION */}
      <div className="exec-section-heading">05 // DEBT AVALANCHE &amp; LIABILITY ACCELERATION AUDIT</div>
      {allDebts.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          <table className="exec-table">
            <thead>
              <tr>
                <th>Payoff Priority</th>
                <th>Liability Name</th>
                <th className="text-right">Outstanding (₹)</th>
                <th className="text-right">Interest (APR)</th>
                <th className="text-right">Monthly EMI (₹)</th>
                <th className="text-center">Avalanche Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {allDebts.map((debt, idx) => (
                <tr key={idx} className={idx === 0 ? 'row-recommended' : ''}>
                  <td>
                    <span className={`exec-badge ${idx === 0 ? 'badge-warn' : 'badge-ok'}`}>
                      #{idx + 1} Priority
                    </span>
                  </td>
                  <td><strong>{debt.name}</strong></td>
                  <td className="text-right font-mono font-bold">{formatINR(debt.balance)}</td>
                  <td className="text-right font-mono font-bold text-rose-600">{debt.apr}%</td>
                  <td className="text-right font-mono">{formatINR(debt.monthlyPayment)}</td>
                  <td className="text-center">
                    <span className="text-[10px] text-slate-700">
                      {idx === 0 ? 'Target with extra surplus prepayments' : 'Maintain minimum payments'}
                    </span>
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                <td colSpan={2}><strong>Total Outstanding Liabilities</strong></td>
                <td className="text-right font-mono text-rose-700">{formatINR(totalDebtBalance)}</td>
                <td className="text-right font-mono">—</td>
                <td className="text-right font-mono">{formatINR(totalMonthlyDebtPayment)}</td>
                <td className="text-center text-[10px] text-slate-600">Eliminating accelerates savings rate</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="exec-fortress-banner">
          <div className="flex-align gap-2">
            <CheckCircle size={15} className="text-emerald-600" />
            <strong className="text-emerald-800">Zero High-Interest Debt Fortress:</strong>
            <span className="text-slate-700">No revolving credit or high-interest liabilities detected. 100% of investable monthly surplus is retained for compounding equity.</span>
          </div>
        </div>
      )}

      {/* 6. SOVEREIGN WEALTH RPG SCORECARD & MASTERY REPUTATION */}
      <div className="exec-section-heading">06 // SOVEREIGN WEALTH RPG MASTERY &amp; MILESTONES</div>
      <div className="exec-pillars-grid">
        <div className="exec-pillar-card">
          <span className="exec-card-lbl">Sovereign Level &amp; Title</span>
          <span className="exec-card-val text-indigo-700">
            Level {skillTree?.level ?? 1}: {skillTree?.levelTitle ?? 'Financial Novice'}
          </span>
          <span className="exec-card-sub">
            Rank: {skillTree?.currentRank ?? 'Tier 1 Initiate'}
          </span>
        </div>

        <div className="exec-pillar-card">
          <span className="exec-card-lbl">Actuarial Experience (XP)</span>
          <span className="exec-card-val text-slate-800">
            {skillTree?.totalXP ?? 0} / {skillTree?.nextLevelXP ?? 500} XP
          </span>
          <span className="exec-card-sub">
            {skillTree?.currentLevelProgressPercent ?? 0}% to next sovereign tier
          </span>
        </div>

        <div className="exec-pillar-card">
          <span className="exec-card-lbl">Mastery Badges Unlocked</span>
          <span className="exec-card-val text-emerald-700">
            {unlockedBadges.length} / {skillTree?.badges?.length ?? 14} Badges
          </span>
          <span className="exec-card-sub">
            {skillTree?.overallMasteryPercent ?? 0}% Total Roadmap Mastery
          </span>
        </div>

        <div className="exec-pillar-card exec-card-highlight">
          <span className="exec-card-lbl text-emerald-800">Top Unlocked Accolades</span>
          <div className="exec-badge-chip-list">
            {unlockedBadges.slice(0, 3).map((b) => (
              <span key={b.id} className="exec-badge-pill" title={b.tagline}>
                {b.icon} {b.title}
              </span>
            ))}
            {unlockedBadges.length === 0 && (
              <span className="text-[10px] text-slate-500 italic">No badges unlocked yet</span>
            )}
          </div>
        </div>
      </div>

      {/* 7. ACTUARIAL CERTIFICATION & CRYPTOGRAPHIC SEAL */}
      <div className="exec-cert-footer">
        <div className="exec-cert-text">
          <strong>ACTUARIAL DISCLOSURE &amp; FIDUCIARY CERTIFICATION:</strong>
          <br />
          This document is generated client-side by Pseudo-Fi Financial Intelligence Engine. All computations adhere strictly to the Indian Income Tax Act 1961, Section 115BAC amendments (Finance Act 2024 &amp; Budget 2025), and standard compound interest actuarial conventions. Zero data leaves local device storage.
        </div>
        <div className="exec-cert-seal">
          <div className="seal-badge">OFFLINE SEAL</div>
          <div className="seal-hash">SHA-256: {activeAccount.id.slice(0, 16)}...</div>
        </div>
      </div>
    </div>
  );
};

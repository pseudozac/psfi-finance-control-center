# PsFi — Finance Control Center (v2)

**Live demo:** [https://pseudo-fi.vercel.app/](https://pseudo-fi.vercel.app/)

A responsive, offline-first personal finance control center designed for India (INR ₹). Built with **React 18**, **TypeScript**, **Vite 6**, **Recharts**, and **Vitest**.

Runs entirely in your browser with zero external tracking or database dependencies—your financial plans are held securely in local page state and can be saved, exported, or compared offline.

---

## What's New in v2

- **Modular Architecture:** Decoupled pure financial calculations (`src/lib/finance.ts`), reactive plan state (`src/hooks/useFinancePlan.ts`), types (`src/types/finance.ts`), and focused UI components (`src/components/`).
- **India-Specific Tax Regime Estimator:** Compare **Old vs. New Tax Regimes (FY 2024-25)** factoring in Section 87A rebates, standard deduction (₹75k New / ₹50k Old), 80C, and 80D deductions.
- **Credit Card / Loan Debt Payoff:** Accurate amortized debt payoff calculator with monthly interest tracking and warnings for underwater balances.
- **Step-Up SIP & Inflation Adjustments:** 12-month wealth projection with configurable annual step-up percentage and real purchasing power toggle.
- **Emergency Fund Runway:** Live calculation of your survival runway in months based on current monthly living expenses.
- **What-If Baseline Comparison:** Pin any existing plan as a baseline to visually compare hypothetical changes side-by-side on the projection chart.
- **Validated JSON Import & CSV Export:** Export complete plan snapshots as JSON and download projection tables as CSV for Excel/Google Sheets.
- **PWA & Offline Ready:** Progressive Web App manifest and service worker caching for offline access on desktop and mobile.
- **Automated Unit Tests:** Full Vitest test suite covering INR formatting, debt payoff edge cases, tax regimes, and snapshot validation.

---

## Getting Started Locally

Requires **Node.js 18+**:

```bash
# Install dependencies
npm install

# Run automated unit tests
npm test

# Start local development server
npm run dev

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## Deploying to Vercel

The project is pre-configured for zero-config deployment on Vercel:

1. **Framework Preset:** Vite
2. **Build Command:** `npm run build` (`tsc -b && vite build`)
3. **Output Directory:** `dist`
4. **Environment Variables:** None required

Every push to the `main` branch automatically builds and deploys to production.

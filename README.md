# PsFi — Tactile Personal Finance Control Center for India 🇮🇳

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Vitest-100%25%20Passed-5ec491.svg?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Offline PWA](https://img.shields.io/badge/PWA-100%25%20Offline%20Ready-f78d2c.svg)](https://pseudo-fi.vercel.app/)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Client--Side%20Enclave-bf9ff1.svg)](#security--privacy-architecture)

**Live Production Deployment:** [https://pseudo-fi.vercel.app/](https://pseudo-fi.vercel.app/)

**PsFi** is an offline-first, client-side personal finance control center engineered specifically for the Indian financial ecosystem (INR ₹). Inspired by the tactile editorial aesthetic of [hipuku.dev](https://www.hipuku.dev/), PsFi empowers individuals to model monthly cashflows, stress-test emergency runways, track FIRE milestones, project step-up SIP wealth curves, and compare FY 2024–25 tax regimes—with **100% client-side privacy** and zero cloud leakage.

---

## ⚡ Quick Links & Navigation

- [Live Application](https://pseudo-fi.vercel.app/)
- [Key Features & Capabilities](#key-features--capabilities)
- [Security & Privacy Architecture](#security--privacy-architecture)
- [Design Engineering (Hipuku Aesthetic)](#design-engineering-hipuku-aesthetic)
- [Mobile Browser & Density Views](#mobile-browser--density-views)
- [Interactive Demo Mode](#interactive-demo-mode)
- [Local Development & Testing](#local-development--testing)
- [License](#license)

---

## 🚀 Key Features & Capabilities

### 1. Multi-Vault Architecture & Zero-Slate Initializer
- **True Clean Slate (₹0):** Every new Primary Vault initializes cleanly with zeroes, allowing you to build your financial plan from the ground up without dummy numbers polluting your ledger.
- **Multiple Named Vaults:** Manage isolated ledgers for Personal Finances, Freelance Invoicing, Emergency Funds, or Side Ventures.
- **Persistent Local Storage:** All accounts, baselines, and custom expense lines are persisted automatically in browser `localStorage`.
- **Active Vault Dock Pill:** Fast 1-click switching and deletion between vaults with color-coded avatar tokens.

### 2. FIRE & Wealth Milestone Countdown Engine
- **Milestone Countdown Cards:** Live progress and ETA countdowns for classic Indian wealth markers:
  - ₹10 Lakh (First Serious Milestone)
  - ₹25 Lakh (Quarter-Crore Growth Anchor)
  - ₹50 Lakh (Half-Crore Stability Anchor)
  - ₹1.0 Crore (Crorepati Milestone)
  - ₹2.5 Crore (Quarter-Decacrore Independence)
- **25× Annual Expense FIRE Target:** Calculates your exact Financial Independence number based on current living expenses, displaying current coverage % and remaining capital deficit.

### 3. Emergency Runway 3-Tier Survival Stress Test
- **Tier 1 (Barebones Survival):** Essential housing and utilities only. Calculates maximum survival runway if catastrophic job loss occurs.
- **Tier 2 (Standard Lean Living):** Housing, groceries, utilities, and transport.
- **Tier 3 (Full Lifestyle Runway):** Uncompromised current lifestyle including discretionary wants and subscriptions.
- **Visual Runway Gauge:** Color-coded status badges (Danger `<3mo`, Caution `3-6mo`, Healthy `6-12mo`, Fortress `>12mo`).

### 4. "What-If" Crisis & Opportunity Sandbox
- **Modal Scenario Simulator:** Safely test hypothetical real-world shocks without altering your permanent vault:
  - Career advancement: +10% to +50% salary hike.
  - Rent / Relocation inflation: +10% to +40% housing spike.
  - New Loan EMI: ₹5,000 to ₹35,000 monthly debt commitment.
  - Market CAGR returns: 6% conservative debt to 16% aggressive equity.
- **Real-Time Delta Telemetry:** Instant comparison cards showing monthly cashflow delta, annual surplus delta, and projected wealth shifts.
- **1-Click Commit:** Apply simulated scenario directly into your active vault or discard with one click.

### 5. Indian Income Tax Engine (FY 2024–25 Union Budget)
- **Side-by-Side Old vs. New Regime Comparison:**
  - Automated calculation of Old vs New Tax Regimes for FY 2024–25.
  - Standard deduction applied (₹75,000 under New Regime, ₹50,000 under Old Regime).
  - Section 87A tax rebate engine (Zero tax up to ₹7.75 Lakhs taxable income under New Regime).
  - **Section 80CCD(1B) NPS Lever:** Dedicated tax deduction slider up to ₹50,000 exclusively under the Old Regime.
  - **House Rent Allowance (HRA) Exemption Calculator:** Computes minimum of:
    1. Actual HRA received.
    2. 50% of Basic Salary (Metro cities: Mumbai, Delhi, Kolkata, Chennai) or 40% (Non-Metro).
    3. Rent paid in excess of 10% of Basic Salary.

### 6. Dynamic Outflow Custom Categories
- Add arbitrary custom outflow categories (e.g., "Parent Support", "Pet Care", "Gym & Fitness", "SaaS Subscriptions") with custom names and rupee allocations.
- Real-time updates to 50/30/20 budget allocations and expense breakdown charts.

### 7. Executive 1-Page Printable Statement (`@media print`)
- Formatted specifically for A4 / Letter paper.
- Strips floating docks, interactive sliders, and background patterns.
- Formats clean monochrome financial summary suitable for bank loan applications, visa financial proof, or personal archiving.
- Accessible via the **Print** button in the dock or `Ctrl+P` / `Cmd+P`.

### 8. Privacy Masking Mode
- Click the **Eye icon** in the dock to frosted-blur all rupee figures, salaries, and net worth values.
- Enables safe usage in public cafes, co-working spaces, and open-plan offices without revealing sensitive numbers to passersby.

---

## 🔒 Security & Privacy Architecture

PsFi was intentionally engineered to eliminate the security and privacy risks common to modern financial applications:

| Threat Vector | Cloud Banking Apps / Mint / YNAB | PsFi Architecture |
| :--- | :--- | :--- |
| **Server-Side Data Breaches** | High risk (stored in remote SQL/NoSQL DBs) | **Zero Risk:** No server database exists. |
| **Telemetry / Spyware** | Mixpanel, Google Analytics, Datadog tracking | **Zero Telemetry:** Zero analytics or tracker scripts. |
| **Credential Phishing** | Net banking password scraping | **Zero Credentials:** PsFi never asks for bank credentials or OTPs. |
| **Network Sniffing** | REST/GraphQL APIs over the wire | **Zero API Transmission:** All data remains inside your browser. |
| **Offline Vulnerability** | Fails when offline or network drops | **100% Offline Capable:** Runs without internet via PWA Service Worker. |

> **Privacy Guarantee:** Your financial data is saved solely in your local browser storage (`window.localStorage`). It is never uploaded, transmitted, or synchronized to any external server or third-party service.

---

## 🎨 Design Engineering (Hipuku Aesthetic)

PsFi implements the **Hipuku Design Engineering System**, featuring:
- **Dark Void Canvas:** `#0d0e12` deep slate canvas with blueprint hairline grid overlay.
- **Cosmic Chroma Hierarchy:**
  - `Quasar` (`#bf9ff1` lilac) for equity, savings, and investments.
  - `Nebula` (`#5ec491` mint green) for cash inflow, surplus, and positive deltas.
  - `Solstice` (`#f78d2c` golden amber) for essential needs and warnings.
  - `Corona` (`#f28bad` coral pink) for lifestyle wants and tax optimizations.
  - `Pulsar` (`#7193ed` sky periwinkle) for debt and tax metrics.
- **Micro-Interactions & Playful Wordmarks:** Staggered letter bouncing on `psfi` logo and animated background money tokens.
- **Light Studio Mode:** Built-in clean light theme toggle with full high-contrast accessibility.

---

## 📱 Mobile Browser & Density Views

PsFi is fully responsive across all screen sizes (from 320px mobile viewports to 4K ultrawide monitors):

- **Mobile Touch Density:** Compact single-column card stacking, thumb-friendly slider controls, zero horizontal wiggling or body overflow.
- **Desktop Power View:** Multi-column comparison grids and dense telemetry capsules.
- **Interactive View Density Toggle:** Tap the **Smartphone / Monitor** icon in the dock to switch between Mobile Touch View and Desktop Power View at any time on any device.
- **Collapsible Action Strip:** On mobile screens, secondary tools (Import, Export, Print, Sandbox, Reset) are tucked into an elegant slide-out drawer, keeping the navbar clean and compact (~48px height).

---

## ⚡ Interactive Demo Mode

Want to test PsFi without typing numbers from scratch?
1. Open the [PsFi Gateway](https://pseudo-fi.vercel.app/).
2. Click **"Launch Interactive Demo Vault"** in the top banner.
3. You will immediately be dropped into a pre-configured, realistic profile of an Indian tech professional (₹1.25L monthly take-home salary, ₹25k mutual fund SIP, ₹28k rent, ₹15L existing net worth, 80C/80D/NPS deductions).
4. You can also load the demo anytime from inside the dashboard via the **"demo vault"** action button in the dock menu.

---

## 🛠️ Local Development & Testing

PsFi requires **Node.js 18+** and npm:

```bash
# 1. Clone the repository
git clone https://github.com/pseudozac/psfi-finance-control-center.git
cd psfi-finance-control-center

# 2. Install dependencies
npm install

# 3. Run unit tests
npm test

# 4. Start local development server (with HMR)
npm run dev

# 5. Build for production (TypeScript check + Vite bundle)
npm run build

# 6. Preview production build locally
npm run preview
```

---

## 📄 License

This repository is licensed under the **[MIT License](LICENSE)**.

```
Copyright (c) 2026 pseudozac (PsFi Project)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
...
```
Feel free to fork, customize, and self-host for your personal financial independence journey.
